import { Contract, BrowserProvider, JsonRpcSigner, parseUnits, formatUnits } from 'ethers';
import { CONTRACT_ADDRESSES, LIVE_LEDGER_ABI, MOCK_USDC_ABI } from './contracts';
// import { api, CreateStreamRequest, CreateStreamResponse } from './api';

export interface StreamCreationParams {
  recipientAddress: string;
  totalAmount: string;   // Total USDC amount (e.g., "36.00")
  duration: number;      // Duration in seconds
  maxWithdrawalsPerDay?: number; // Optional withdrawal limit
}

export interface StreamTransaction {
  hash: string;
  streamId?: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export class SmartContractService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private liveLedgerContract: Contract | null = null;
  private usdcContract: Contract | null = null;

  constructor(provider?: BrowserProvider, signer?: JsonRpcSigner) {
    if (provider && signer) {
      this.initialize(provider, signer);
    }
  }

  initialize(provider: BrowserProvider, signer: JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize contracts
    this.liveLedgerContract = new Contract(
      CONTRACT_ADDRESSES.LIVE_LEDGER,
      LIVE_LEDGER_ABI,
      signer
    );
    
    this.usdcContract = new Contract(
      CONTRACT_ADDRESSES.MOCK_USDC,
      MOCK_USDC_ABI,
      signer
    );
  }

  async createStream(params: StreamCreationParams): Promise<StreamTransaction> {
    if (!this.liveLedgerContract || !this.usdcContract || !this.signer) {
      throw new Error('Smart contracts not initialized');
    }

    // Convert duration to BigInt
    const duration = BigInt(params.duration);
    
    // First, convert total amount to wei
    const totalAmountWei = parseUnits(params.totalAmount, 6);
    
    // Calculate rate per second directly from wei to avoid precision issues
    const ratePerSecondWei = totalAmountWei / duration;
    const remainder = totalAmountWei % duration;
    
    let finalRatePerSecond = ratePerSecondWei;
    let finalTotalAmount = totalAmountWei;
    
    // If there's a remainder, we need to adjust
    if (remainder > 0n) {
      // Increase rate by 1 wei per second to cover the remainder
      finalRatePerSecond = ratePerSecondWei + BigInt(1);
      finalTotalAmount = finalRatePerSecond * duration;
      
      // Check if the adjustment is reasonable (less than $1)
      const difference = finalTotalAmount - totalAmountWei;
      const maxDifference = parseUnits("1.00", 6); // $1 in wei
      
      if (difference > maxDifference) {
        const suggestedAmount = formatUnits(finalRatePerSecond * duration, 6);
        throw new Error(`Cannot create stream: The amount $${params.totalAmount} doesn't divide evenly over ${params.duration} seconds. Try $${suggestedAmount} instead for perfect streaming.`);
      }
      
      console.log(`Adjusted stream: $${formatUnits(totalAmountWei, 6)} → $${formatUnits(finalTotalAmount, 6)} (difference: $${formatUnits(difference, 6)})`);
    }

    console.log('Final stream parameters:', {
      recipient: params.recipientAddress,
      token: CONTRACT_ADDRESSES.MOCK_USDC,
      totalAmount: formatUnits(finalTotalAmount, 6),
      ratePerSecond: formatUnits(finalRatePerSecond, 6),
      duration: duration.toString(),
      maxWithdrawalsPerDay: params.maxWithdrawalsPerDay || 5
    });

    // Step 1: Check and approve USDC allowance
    await this.ensureUSDCAllowance(finalTotalAmount);

    // For now, skip backend API call and do direct blockchain interaction
    // This allows immediate testing of smart contract functionality

    try {
      console.log('Creating stream directly on blockchain...');
      
      const tx = await this.liveLedgerContract.createStream(
        params.recipientAddress,
        CONTRACT_ADDRESSES.MOCK_USDC,
        finalTotalAmount,
        finalRatePerSecond,
        duration,
        params.maxWithdrawalsPerDay || 5
      );

      console.log('Transaction sent:', tx.hash);

      // Wait for confirmation and get the stream ID
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract stream ID from logs
      let streamId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.liveLedgerContract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          
          if (parsedLog?.name === 'StreamCreated') {
            streamId = Number(parsedLog.args.streamId);
            console.log('Stream created with ID:', streamId);
            break;
          }
        } catch {
          // Skip logs that can't be parsed
        }
      }

      return {
        hash: tx.hash,
        streamId,
        status: 'confirmed',
      };

    } catch (error) {
      console.error('Blockchain transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async ensureUSDCAllowance(amount: bigint): Promise<void> {
    if (!this.usdcContract || !this.signer) {
      throw new Error('USDC contract not initialized');
    }

    const userAddress = await this.signer.getAddress();
    const currentAllowance = await this.usdcContract.allowance(
      userAddress, 
      CONTRACT_ADDRESSES.LIVE_LEDGER
    );

    if (currentAllowance < amount) {
      console.log('Approving USDC allowance...');
      const approveTx = await this.usdcContract.approve(
        CONTRACT_ADDRESSES.LIVE_LEDGER,
        amount
      );
      await approveTx.wait();
      console.log('USDC allowance approved');
    }
  }

  async mintTestUSDC(amount: string = "1000"): Promise<string> {
    if (!this.usdcContract || !this.signer) {
      throw new Error('USDC contract not initialized');
    }

    const userAddress = await this.signer.getAddress();
    const mintAmount = parseUnits(amount, 6);

    const tx = await this.usdcContract.mintUSDC(userAddress, mintAmount);
    await tx.wait();
    
    return tx.hash;
  }

  async getUSDCBalance(address?: string): Promise<string> {
    if (!this.usdcContract || !this.signer) {
      throw new Error('USDC contract not initialized');
    }

    const targetAddress = address || await this.signer.getAddress();
    const balance = await this.usdcContract.balanceOf(targetAddress);
    
    return formatUnits(balance, 6);
  }

  async getStreamDetails(streamId: number) {
    if (!this.liveLedgerContract) {
      throw new Error('LiveLedger contract not initialized');
    }

    const streamData = await this.liveLedgerContract.getStream(streamId);
    const claimableAmount = await this.liveLedgerContract.getClaimable(streamId);
    const ratePerSecond = await this.liveLedgerContract.getRatePerSecond(streamId);

    return {
      payer: streamData.payer,
      recipient: streamData.recipient,
      token: streamData.token,
      totalAmount: formatUnits(streamData.totalAmount, 6),
      withdrawn: formatUnits(streamData.withdrawn, 6),
      startTime: Number(streamData.startTime),
      endTime: Number(streamData.endTime),
      maxWithdrawalsPerDay: Number(streamData.maxWithdrawalsPerDay),
      active: streamData.active,
      ratePerSecond: formatUnits(ratePerSecond, 6),
      claimableAmount: formatUnits(claimableAmount, 6),
    };
  }

  async getUserStreams(address?: string): Promise<number[]> {
    if (!this.liveLedgerContract || !this.signer) {
      throw new Error('LiveLedger contract not initialized');
    }

    // Since the contract doesn't have getStreamsByPayer/getStreamsByRecipient functions,
    // we need to get the total stream count and check each stream individually
    const streamCount = await this.liveLedgerContract.getStreamCount();
    const targetAddress = address || await this.signer.getAddress();
    const userStreams: number[] = [];

    for (let i = 0; i < Number(streamCount); i++) {
      try {
        const streamData = await this.liveLedgerContract.getStream(i);
        if (streamData.payer.toLowerCase() === targetAddress.toLowerCase() || 
            streamData.recipient.toLowerCase() === targetAddress.toLowerCase()) {
          userStreams.push(i);
        }
      } catch {
        // Stream might not exist, skip
        console.log(`Stream ${i} not found, skipping`);
      }
    }
    
    return userStreams;
  }

  async withdrawFromStream(streamId: number): Promise<string> {
    if (!this.liveLedgerContract) {
      throw new Error('LiveLedger contract not initialized');
    }

    const tx = await this.liveLedgerContract.withdraw(streamId);
    await tx.wait();
    
    return tx.hash;
  }

  async cancelStream(streamId: number): Promise<string> {
    if (!this.liveLedgerContract) {
      throw new Error('LiveLedger contract not initialized');
    }

    const tx = await this.liveLedgerContract.cancelStream(streamId);
    await tx.wait();
    
    return tx.hash;
  }

  // Helper method to check if contracts are initialized
  isInitialized(): boolean {
    return !!(this.provider && this.signer && this.liveLedgerContract && this.usdcContract);
  }
}

// Global instance that can be reused
export const contractService = new SmartContractService();