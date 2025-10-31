"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/Web3Context';
import { useSmartContract } from './useSmartContract';
import { api } from '@/lib/api';

export interface StreamData {
  id: string;
  onChainStreamId?: number;
  payer: {
    id: string;
    walletAddress: string;
    name: string | null;
    email: string | null;
  };
  recipient: {
    id: string;
    walletAddress: string;
    name: string | null;
    email: string | null;
  };
  tokenAddress: string;
  totalAmount: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  startTime: number;
  endTime: number | null;
  calculation: {
    streamId: string;
    currentBalance: string;
    claimableAmount: string;
    totalStreamed: string;
    withdrawnAmount: string;
    progress: number;
    isActive: boolean;
    ratePerSecond: string;
    startTime: number;
    endTime: number | null;
    lastCalculated: number;
  };
  withdrawalLimits: {
    maxWithdrawalsPerDay: number;
    withdrawalsUsedToday: number;
    remainingWithdrawals: number;
    canWithdraw: boolean;
    dayIndex: number;
    nextWithdrawalTime: number | null;
  };
  createdAt: number;
  updatedAt: number;
}

export interface UserBalance {
  balances: Array<{
    tokenAddress: string;
    totalEarned: string;
    totalWithdrawn: string;
    availableBalance: string;
  }>;
  activeStreams: StreamData['calculation'][];
  totalActiveStreams: number;
}

export interface WebSocketMessage {
  type: 'STREAM_UPDATE' | 'NOTIFICATION';
  data: StreamData['calculation'] | {
    type: string;
    streamId: string;
    message: string;
    timestamp: number;
  };
  timestamp: number;
}

export function useStreaming() {
  const { isConnected, account } = useWallet();
  const { 
    getStreamDetails, 
    withdrawFromStream, 
    getUserStreams, 
    isLoading: contractLoading, 
    error: contractError 
  } = useSmartContract();

  const [streams, setStreams] = useState<StreamData[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnectedToWs, setIsConnectedToWs] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [wsConnectionAttempts, setWsConnectionAttempts] = useState(0);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Update user balance from API
  const updateUserBalance = useCallback(async () => {
    if (!isConnected || !account || isLoadingBalance) return;

    setIsLoadingBalance(true);
    try {
      const balance = await api.getUserBalance();
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to load user balance:', error);
      // Calculate balance from streams as fallback (only if streams are loaded)
      if (streams && streams.length > 0) {
        const totalEarned = streams.reduce((sum, stream) => 
          sum + parseFloat(stream.calculation?.totalStreamed || '0'), 0
        );
        const totalWithdrawn = streams.reduce((sum, stream) => 
          sum + parseFloat(stream.calculation?.withdrawnAmount || '0'), 0
        );
        const availableBalance = streams.reduce((sum, stream) => 
          sum + parseFloat(stream.calculation?.claimableAmount || '0'), 0
        );

        setUserBalance({
          balances: [{
            tokenAddress: '0xf6f61a82856981fe317df8c7e078332616b081ec', // Mock USDC
            totalEarned: totalEarned.toString(),
            totalWithdrawn: totalWithdrawn.toString(),
            availableBalance: availableBalance.toString()
          }],
          activeStreams: streams.map(s => s.calculation),
          totalActiveStreams: streams.filter(s => s.status === 'ACTIVE').length
        });
      } else {
        // Set empty balance if no streams or API fails
        setUserBalance({
          balances: [{
            tokenAddress: '0xf6f61a82856981fe317df8c7e078332616b081ec',
            totalEarned: '0',
            totalWithdrawn: '0',
            availableBalance: '0'
          }],
          activeStreams: [],
          totalActiveStreams: 0
        });
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, [isConnected, account, streams, isLoadingBalance]);

  // Initialize WebSocket connection for real-time updates
  const initializeWebSocket = useCallback(() => {
    if (!isConnected || !account) return;
    
    // Rate limiting: prevent too many connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt;
    const minInterval = Math.min(5000 * Math.pow(2, wsConnectionAttempts), 30000); // Exponential backoff, max 30s
    
    if (timeSinceLastAttempt < minInterval) {
      console.log(`WebSocket connection rate limited. Wait ${Math.ceil((minInterval - timeSinceLastAttempt) / 1000)}s`);
      return;
    }
    
    // Prevent multiple connections
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping initialization');
      return;
    }

    // Close existing connection if any
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }

    setLastConnectionAttempt(now);
    setWsConnectionAttempts(prev => prev + 1);

    try {
      const ws = api.createWebSocketConnection();
      if (!ws) return;

      ws.onopen = () => {
        console.log('WebSocket connected for streaming updates');
        setIsConnectedToWs(true);
        setWsConnection(ws);
        setWsConnectionAttempts(0); // Reset attempts on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'STREAM_UPDATE') {
            const calculation = message.data as StreamData['calculation'];
            
            // Update the specific stream calculation
            setStreams(prevStreams => 
              prevStreams.map(stream => 
                stream.id === calculation.streamId 
                  ? { ...stream, calculation }
                  : stream
              )
            );

            // Update user balance if this affects available balance
            updateUserBalance();
          } else if (message.type === 'NOTIFICATION') {
            const notification = message.data as {
              type: string;
              streamId: string;
              message: string;
              timestamp: number;
            };
            
            console.log('Stream notification:', notification);
            // You could show toast notifications here
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnectedToWs(false);
        setWsConnection(null);
        
        // Only attempt to reconnect if it wasn't a manual close (code 1000) and user is still connected
        if (event.code !== 1000 && isConnected && account && wsConnectionAttempts < 5) {
          const backoffDelay = Math.min(5000 * Math.pow(2, wsConnectionAttempts), 30000);
          console.log(`Attempting to reconnect WebSocket in ${backoffDelay / 1000} seconds... (attempt ${wsConnectionAttempts + 1}/5)`);
          setTimeout(() => {
            if (isConnected && account && !wsConnection) {
              initializeWebSocket();
            }
          }, backoffDelay);
        } else if (wsConnectionAttempts >= 5) {
          console.log('Max WebSocket reconnection attempts reached. Stopping auto-reconnect.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnectedToWs(false);
        
        // Close the problematic connection
        if (ws) {
          ws.close();
        }
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }, [isConnected, account, wsConnection, updateUserBalance, wsConnectionAttempts, lastConnectionAttempt]);

  // Load user streams from backend
  const loadUserStreams = useCallback(async () => {
    if (!isConnected || !account || isLoadingStreams) return;

    setIsLoadingStreams(true);
    setIsLoading(true);
    setError(null);

    try {
      // Get streams from backend API
      const response = await api.getUserStreams();
      setStreams(response.streams || []);
      
    } catch (error) {
      console.error('Failed to load user streams:', error);
      setError(error instanceof Error ? error.message : 'Failed to load streams');
      
      // Fallback: try to get streams from smart contract directly
      try {
        console.log('Falling back to smart contract data...');
        const streamIds = await getUserStreams(account);
        const streamDetails = await Promise.all(
          streamIds.map(id => getStreamDetails(id))
        );
        
        // Convert smart contract data to expected format
          const convertedStreams: StreamData[] = streamDetails.map((details, index) => ({
          id: `chain_${streamIds[index]}`,
          onChainStreamId: streamIds[index],
          payer: {
            id: String(details.payer),
            walletAddress: String(details.payer),
            name: null,
            email: null
          },
          recipient: {
            id: String(details.recipient),
            walletAddress: String(details.recipient),
            name: null,
            email: null
          },
          tokenAddress: String(details.token || ''),
          totalAmount: String(details.totalAmount),
          status: details.active ? 'ACTIVE' : 'COMPLETED',
          startTime: Number(details.startTime),
          endTime: details.endTime !== undefined && details.endTime !== null ? Number(details.endTime) : null,
          calculation: {
            streamId: `chain_${streamIds[index]}`,
            currentBalance: String(details.totalAmount),
            claimableAmount: String(details.claimableAmount || '0'),
            totalStreamed: String(details.totalAmount),
            withdrawnAmount: String(details.withdrawn ?? '0'),
            progress: 0,
            isActive: Boolean(details.active),
            ratePerSecond: String(details.ratePerSecond),
            startTime: Number(details.startTime),
            endTime: details.endTime !== undefined && details.endTime !== null ? Number(details.endTime) : null,
            lastCalculated: Date.now() / 1000
          },
          withdrawalLimits: {
            maxWithdrawalsPerDay: 5,
            withdrawalsUsedToday: 0,
            remainingWithdrawals: 5,
            canWithdraw: true,
            dayIndex: 0,
            nextWithdrawalTime: null
          },
          createdAt: Number(details.startTime),
          updatedAt: Date.now() / 1000
        }));

        setStreams(convertedStreams);
        setError(null);
        
      } catch (fallbackError) {
        console.error('Smart contract fallback also failed:', fallbackError);
        setError('Failed to load streams from both backend and blockchain');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingStreams(false);
    }
  }, [isConnected, account, getUserStreams, getStreamDetails, isLoadingStreams]);

  // Withdraw from stream
  const withdraw = useCallback(async (streamId: string) => {
    if (!isConnected || !account || withdrawing) return;

    setWithdrawing(streamId);
    setError(null);

    try {
      const stream = streams.find(s => s.id === streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Check if we can withdraw
      if (!stream.withdrawalLimits.canWithdraw) {
        throw new Error('Daily withdrawal limit reached');
      }

      const claimableAmount = parseFloat(stream.calculation.claimableAmount);
      if (claimableAmount <= 0) {
        throw new Error('No amount available to withdraw');
      }

      // Try backend API first
      try {
  const response = await api.withdrawFromStream({ streamId, amount: String(claimableAmount) });
        console.log('Withdrawal initiated via backend:', response);
        
        // Update stream state optimistically
        setStreams(prevStreams => 
          prevStreams.map(s => 
            s.id === streamId 
              ? {
                  ...s,
                  calculation: {
                    ...s.calculation,
                    withdrawnAmount: (parseFloat(s.calculation.withdrawnAmount) + claimableAmount).toString(),
                    claimableAmount: '0'
                  },
                  withdrawalLimits: {
                    ...s.withdrawalLimits,
                    withdrawalsUsedToday: s.withdrawalLimits.withdrawalsUsedToday + 1,
                    remainingWithdrawals: s.withdrawalLimits.remainingWithdrawals - 1,
                    canWithdraw: s.withdrawalLimits.remainingWithdrawals > 1
                  }
                }
              : s
          )
        );

        // Update balance
        updateUserBalance();
        
      } catch (apiError) {
        console.log('Backend withdrawal failed, trying smart contract directly:', apiError);
        
        // Fallback to direct smart contract interaction
        if (stream.onChainStreamId !== undefined) {
          const txHash = await withdrawFromStream(stream.onChainStreamId);
          console.log('Direct withdrawal successful:', txHash);
          
          // Update stream state
          setStreams(prevStreams => 
            prevStreams.map(s => 
              s.id === streamId 
                ? {
                    ...s,
                    calculation: {
                      ...s.calculation,
                      withdrawnAmount: (parseFloat(s.calculation.withdrawnAmount) + claimableAmount).toString(),
                      claimableAmount: '0'
                    }
                  }
                : s
            )
          );
        } else {
          throw new Error('No on-chain stream ID available for direct withdrawal');
        }
      }

    } catch (error) {
      console.error('Withdrawal failed:', error);
      setError(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(null);
    }
  }, [isConnected, account, streams, withdrawing, withdrawFromStream, updateUserBalance]);

  // Track initialization to prevent multiple calls
  const [isInitialized, setIsInitialized] = useState(false);

  // Debounced API calls to prevent rapid firing
  const [lastApiCall, setLastApiCall] = useState(0);
  const API_CALL_COOLDOWN = 2000; // 2 seconds between API calls

  // Debounced load streams function
  const debouncedLoadStreams = useCallback(async () => {
    const now = Date.now();
    if (now - lastApiCall < API_CALL_COOLDOWN) {
      console.log('API call rate limited, skipping streams load');
      return;
    }
    setLastApiCall(now);
    await loadUserStreams();
  }, [loadUserStreams, lastApiCall]);

  // Debounced update balance function  
  const debouncedUpdateBalance = useCallback(async () => {
    const now = Date.now();
    if (now - lastApiCall < API_CALL_COOLDOWN) {
      console.log('API call rate limited, skipping balance update');
      return;
    }
    setLastApiCall(now);
    await updateUserBalance();
  }, [updateUserBalance, lastApiCall]);

  // Initialize on mount and when wallet connects
  useEffect(() => {
    if (isConnected && account && !isInitialized) {
      console.log('Initializing streaming hook for account:', account);
      // Reset connection attempts when user connects
      setWsConnectionAttempts(0);
      setLastConnectionAttempt(0);
      setIsInitialized(true);
      
      // Use a timeout to prevent rapid firing during React development mode
      const timeoutId = setTimeout(() => {
        if (isConnected && account) {
          debouncedLoadStreams();
          debouncedUpdateBalance();
          initializeWebSocket();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } else if (!isConnected || !account) {
      console.log('Cleaning up streaming hook - wallet disconnected');
      setStreams([]);
      setUserBalance(null);
      setIsInitialized(false);
      
      // Reset connection attempts when user disconnects
      setWsConnectionAttempts(0);
      setLastConnectionAttempt(0);
      
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
        setIsConnectedToWs(false);
      }
    }
    // Only depend on wallet connection state to avoid circular dependencies
  }, [isConnected, account]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);

  // Periodically refresh data as backup - only when connected and initialized
  useEffect(() => {
    if (!isConnected || !account || !isInitialized) return;

    const interval = setInterval(() => {
      if (!isConnectedToWs) {
        // Only refresh if WebSocket is not connected
        loadUserStreams();
        updateUserBalance();
      }
    }, 30000); // Every 30 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [isConnected, account, isInitialized, isConnectedToWs]);

  return {
    // Data
    streams,
    userBalance,
    
    // State
    isLoading: isLoading || contractLoading,
    error: error || contractError,
    isConnectedToWs,
    withdrawing,
    
    // Actions
    withdraw,
    refreshStreams: loadUserStreams,
    refreshBalance: updateUserBalance
  };
}