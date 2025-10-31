import { ethers } from 'ethers';

// Contract addresses on Arbitrum Sepolia
const LIVE_LEDGER_ADDRESS = "0xd454ccae2e500ae984149fa4cec6e78f0145fd56";
const MOCK_USDC_ADDRESS = "0xf6f61a82856981fe317df8c7e078332616b081ec";

// Simple ABIs for testing
const USDC_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

const LIVE_LEDGER_ABI = [
  "function getStreamCount() external view returns (uint256 count)",
  "function getStream(uint256 streamId) external view returns (tuple(address payer, address recipient, address token, uint128 totalAmount, uint128 withdrawn, uint64 startTime, uint64 endTime, uint8 maxWithdrawalsPerDay, bool active) stream)"
];

async function testContracts() {
  try {
    console.log('Testing contract deployment and connectivity...\n');
    
    // Setup provider for Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Test USDC contract
    console.log('🔍 Testing USDC Contract:', MOCK_USDC_ADDRESS);
    const usdcContract = new ethers.Contract(MOCK_USDC_ADDRESS, USDC_ABI, provider);
    
    try {
      const name = await usdcContract.name();
      const symbol = await usdcContract.symbol();
      const decimals = await usdcContract.decimals();
      console.log('✅ USDC Contract Info:');
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
    } catch (error) {
      console.log('❌ USDC Contract Error:', error.message);
      return;
    }
    
    // Test LiveLedger contract
    console.log('\n🔍 Testing LiveLedger Contract:', LIVE_LEDGER_ADDRESS);
    const liveLedgerContract = new ethers.Contract(LIVE_LEDGER_ADDRESS, LIVE_LEDGER_ABI, provider);
    
    try {
      const streamCount = await liveLedgerContract.getStreamCount();
      console.log('✅ LiveLedger Contract Info:');
      console.log(`   Total Streams: ${streamCount.toString()}`);
      
      // Check if there are any streams
      if (streamCount > 0) {
        console.log('\n📋 Existing Streams:');
        for (let i = 0; i < Math.min(Number(streamCount), 5); i++) {
          try {
            const stream = await liveLedgerContract.getStream(i);
            console.log(`   Stream ${i}:`);
            console.log(`     Payer: ${stream.payer}`);
            console.log(`     Recipient: ${stream.recipient}`);
            console.log(`     Amount: ${ethers.formatUnits(stream.totalAmount, 6)} USDC`);
            console.log(`     Active: ${stream.active}`);
          } catch (streamError) {
            console.log(`   Stream ${i}: Error reading - ${streamError.message}`);
          }
        }
      } else {
        console.log('   No streams found in contract');
      }
    } catch (error) {
      console.log('❌ LiveLedger Contract Error:', error.message);
      return;
    }
    
    console.log('\n✅ Contract test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test with a specific wallet address if provided
async function testWalletBalance(walletAddress) {
  if (!walletAddress) {
    console.log('\n⚠️  No wallet address provided for balance test');
    return;
  }
  
  try {
    console.log(`\n🔍 Testing wallet balance for: ${walletAddress}`);
    
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    const usdcContract = new ethers.Contract(MOCK_USDC_ADDRESS, USDC_ABI, provider);
    
    const balance = await usdcContract.balanceOf(walletAddress);
    const formattedBalance = ethers.formatUnits(balance, 6);
    
    console.log(`✅ USDC Balance: ${formattedBalance} USDC`);
    
    // Check ETH balance too
    const ethBalance = await provider.getBalance(walletAddress);
    const formattedEthBalance = ethers.formatEther(ethBalance);
    console.log(`✅ ETH Balance: ${formattedEthBalance} ETH`);
    
  } catch (error) {
    console.error('❌ Wallet balance test failed:', error);
  }
}

// Run tests
async function main() {
  await testContracts();
  
  // Test with a sample wallet address if you want to check a specific wallet
  // Replace with your actual wallet address
  const testWalletAddress = process.argv[2]; // Pass wallet address as command line argument
  if (testWalletAddress) {
    await testWalletBalance(testWalletAddress);
  }
}

main().catch(console.error);