# Live Ledger Web2/Web3 Streaming Payment Engine

## Overview

I've built a comprehensive real-time streaming payment engine that bridges off-chain calculations with on-chain settlement. This system enables instant UI updates while maintaining blockchain security and accuracy.

## Architecture Components

### 1. Core Services (Backend)

#### StreamingCalculationService (`streaming-calculation.service.ts`)
- **Purpose**: Performs real-time balance calculations off-chain
- **Key Features**:
  - Mirrors smart contract `getClaimable()` logic exactly
  - Calculates stream balances based on rate per second × elapsed time
  - Handles withdrawal limits and daily restrictions
  - Provides batch calculations for multiple streams
  - Syncs with blockchain to verify accuracy

**Key Methods**:
```typescript
calculateStreamBalance(streamId: string): Promise<StreamCalculation>
calculateWithdrawalLimits(streamId: string): Promise<WithdrawalLimits>
getStreamDetails(streamId: string): Promise<StreamDetails>
syncStreamWithBlockchain(streamId: string, onChainStreamId: number): Promise<boolean>
```

#### BlockchainSyncService (`blockchain-sync.service.ts`)
- **Purpose**: Synchronizes blockchain events with off-chain database
- **Key Features**:
  - Listens for `StreamCreated`, `Withdraw`, and `StreamCancelled` events
  - Updates database when on-chain state changes
  - Handles historical event synchronization
  - Manages user creation and balance updates

**Event Handlers**:
- `StreamCreated`: Creates/updates stream records, marks as ACTIVE
- `Withdraw`: Updates withdrawn amounts, creates transaction records
- `StreamCancelled`: Marks streams as STOPPED, handles refunds

#### RealTimeWorkerService (`real-time-worker.service.ts`)
- **Purpose**: Background service for periodic updates and WebSocket management
- **Key Features**:
  - Runs every 5 seconds to update all active streams
  - Manages WebSocket connections per user
  - Broadcasts real-time updates to connected clients
  - Handles stream completion detection
  - Periodic blockchain sync verification

**Core Functionality**:
- Updates stream balances in real-time
- Manages WebSocket subscriptions
- Detects and completes expired streams
- Sends notifications for important events

#### Updated StreamService (`stream.service.ts`)
- **Purpose**: Main API layer with full blockchain integration
- **Key Features**:
  - Creates streams with blockchain transaction preparation
  - Handles withdrawal requests with limit checking
  - Manages stream cancellation
  - Provides real-time stream details
  - Integrates all calculation and sync services

### 2. Frontend Integration

#### Enhanced API Client (`api.ts`)
- **New Types**: `StreamDetails`, `StreamCalculation`, `WithdrawalLimits`
- **New Methods**:
  - `createStream()`: Create payment stream with blockchain transaction
  - `getUserStreams()`: Get paginated streams with real-time data
  - `withdrawFromStream()`: Process withdrawal with limit checking
  - `confirmStreamTransaction()`: Confirm blockchain transaction
  - `createWebSocketConnection()`: Establish real-time connection

#### WebSocket Hook (`useWebSocket.ts`)
- **Purpose**: React hook for real-time updates
- **Features**:
  - Automatic reconnection with exponential backoff
  - Stream-specific subscriptions
  - Notification handling
  - Connection state management
  - Error handling and cleanup

**Usage Example**:
```typescript
const { subscribeToStream, isConnected } = useWebSocket();

useEffect(() => {
  const unsubscribe = subscribeToStream(streamId, (calculation) => {
    setStreamBalance(calculation.claimableAmount);
    setProgress(calculation.progress);
  });
  return unsubscribe;
}, [streamId]);
```

## How It Works

### 1. Stream Creation Flow
1. **Frontend**: User fills out stream creation form
2. **API Call**: `api.createStream()` sends request to backend
3. **Backend**: 
   - Creates PENDING stream in database
   - Prepares blockchain transaction using `blockchainService.prepareCreateStream()`
   - Returns transaction data to frontend
4. **Frontend**: User signs transaction with wallet
5. **Blockchain**: Transaction executes, emits `StreamCreated` event
6. **Sync Service**: Catches event, updates stream to ACTIVE status
7. **Real-time Worker**: Starts broadcasting balance updates

### 2. Real-time Balance Updates
1. **Background Worker**: Runs every 5 seconds
2. **Calculation**: Uses `streamingCalculationService.calculateStreamBalance()`
3. **Formula**: `claimableAmount = (ratePerSecond × elapsedTime) - withdrawnAmount`
4. **Broadcast**: Sends updates via WebSocket to connected users
5. **Frontend**: Receives updates, instantly updates UI

### 3. Withdrawal Process
1. **Frontend**: User clicks withdraw button
2. **Limits Check**: Backend validates daily withdrawal limits
3. **Balance Check**: Ensures sufficient claimable amount
4. **Transaction Prep**: Prepares `withdraw(streamId)` transaction
5. **Blockchain**: User signs and executes withdrawal
6. **Event Sync**: `Withdraw` event updates database
7. **Balance Update**: Real-time worker reflects new balance

### 4. Blockchain Synchronization
- **Event Listening**: Continuous monitoring of smart contract events
- **State Verification**: Periodic comparison of off-chain vs on-chain state
- **Automatic Correction**: Database updates when discrepancies detected
- **Historical Sync**: Catches up on missed events during downtime

## Key Features

### ✅ Real-time UI Updates
- Balances update every 5 seconds without page refresh
- Progress bars show streaming completion percentage
- Live earnings tracking for recipients

### ✅ Withdrawal Limits
- Daily withdrawal limits (3 per day by default)
- Time-based restrictions with countdown timers
- Automatic limit reset at midnight

### ✅ Blockchain Accuracy
- Off-chain calculations mirror smart contract logic exactly
- Periodic sync verification ensures data integrity
- Event-driven updates for instant blockchain state reflection

### ✅ Fault Tolerance
- WebSocket auto-reconnection with exponential backoff
- Historical event sync catches missed updates
- Graceful degradation when services are unavailable

### ✅ Performance Optimization
- Batch calculations for multiple streams
- Database indexing for fast queries
- WebSocket connection pooling
- Efficient event filtering and processing

## Usage in Dashboards

### Payer Dashboard Integration
```typescript
const { subscribeToStream } = useWebSocket();
const [streams, setStreams] = useState<StreamDetails[]>([]);

// Subscribe to all user streams
useEffect(() => {
  streams.forEach(stream => {
    subscribeToStream(stream.id, (calculation) => {
      setStreams(prev => prev.map(s => 
        s.id === stream.id 
          ? { ...s, calculation }
          : s
      ));
    });
  });
}, [streams]);
```

### Recipient Dashboard Integration
```typescript
// Real-time balance updates
const [claimableAmount, setClaimableAmount] = useState("0");

subscribeToStream(streamId, (calculation) => {
  setClaimableAmount(calculation.claimableAmount);
  setCanWithdraw(calculation.claimableAmount > 0);
});
```

## Environment Setup

### Backend Environment Variables
```bash
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
LIVE_LEDGER_CONTRACT_ADDRESS=your_contract_address
DATABASE_URL=your_postgres_connection_string
```

### Starting the Real-time Worker
```typescript
// In your server startup (server.ts or app.ts)
import { realTimeWorkerService } from './services/real-time-worker.service';

// Start the worker when server starts
await realTimeWorkerService.startWorker();
```

## Production Considerations

1. **Scaling**: Use Redis for WebSocket session management across multiple servers
2. **Monitoring**: Add metrics for calculation accuracy, sync latency, WebSocket connections
3. **Rate Limiting**: Implement API rate limiting for stream creation and withdrawals
4. **Error Alerting**: Monitor sync failures and calculation discrepancies
5. **Database Optimization**: Add proper indexing for high-frequency queries

## Testing

The engine includes comprehensive error handling and fallback mechanisms:
- Mock data integration for development
- Graceful degradation when blockchain is unavailable
- Transaction failure handling and retry logic
- WebSocket connection recovery

This system provides a production-ready foundation for real-time streaming payments with the security and finality of blockchain settlement.