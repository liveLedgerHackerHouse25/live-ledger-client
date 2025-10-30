// Smart contract addresses on Arbitrum Sepolia
export const CONTRACT_ADDRESSES = {
  LIVE_LEDGER: "0xd454ccae2e500ae984149fa4cec6e78f0145fd56",
  MOCK_USDC: "0xf6f61a82856981fe317df8c7e078332616b081ec",
} as const;

// Network configuration
export const ARBITRUM_SEPOLIA = {
  chainId: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorer: "https://sepolia.arbiscan.io",
} as const;

// LiveLedger contract ABI (main functions we need)
export const LIVE_LEDGER_ABI = [
  // Events
  "event StreamCreated(uint256 indexed streamId, address indexed payer, address indexed recipient, address token, uint128 totalAmount, uint128 ratePerSecond, uint64 startTime, uint64 endTime, uint8 maxWithdrawalsPerDay)",
  "event Withdraw(uint256 indexed streamId, address indexed recipient, uint128 amount, uint32 dayIndex, uint8 withdrawalCount)",
  "event StreamCancelled(uint256 indexed streamId, address indexed payer, uint128 refundAmount, uint128 claimableAmount)",
  
  // Create stream function
  "function createStream(address recipient, address token, uint128 totalAmount, uint128 ratePerSecond, uint64 duration, uint8 maxWithdrawalsPerDay) external returns (uint256 streamId)",
  
  // Stream management
  "function withdraw(uint256 streamId) external",
  "function cancelStream(uint256 streamId) external",
  
  // View functions
  "function getStream(uint256 streamId) external view returns (tuple(address payer, address recipient, address token, uint128 totalAmount, uint128 withdrawn, uint64 startTime, uint64 endTime, uint8 maxWithdrawalsPerDay, bool active) stream)",
  "function getClaimable(uint256 streamId) external view returns (uint128 claimable)",
  "function getWithdrawalsPerDay(uint256 streamId, uint32 dayIndex) external view returns (uint8 withdrawals)",
  "function getCurrentDayIndex(uint256 streamId) external view returns (uint32 dayIndex)",
  "function getStreamCount() external view returns (uint256 count)",
  "function getRatePerSecond(uint256 streamId) external view returns (uint128 ratePerSecond)",
  "function isStreamActive(uint256 streamId) external view returns (bool isActive)",
  "function getStreamStats(uint256 streamId) external view returns (uint128 totalAmount, uint128 withdrawn, uint128 claimable, uint128 remaining)",
] as const;

// MockUSDC contract ABI (ERC20 + mint function)
export const MOCK_USDC_ABI = [
  // Standard ERC20 functions
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  
  // Mint function for testing
  "function mint(address to, uint256 amount) external",
  "function mintUSDC(address to, uint256 amount) external", // Our custom mint function
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

// Helper function to format amounts for display
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

// Helper function to parse USDC amounts
export function parseUSDC(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * 1e6));
}

// Helper function to format ETH amounts
export function formatETH(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(4);
}