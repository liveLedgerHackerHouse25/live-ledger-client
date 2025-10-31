"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/Web3Context';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const { 
    getStreamDetails, 
    withdrawFromStream, 
    getUserStreams, 
    isLoading: contractLoading, 
    error: contractError 
  } = useSmartContract();

  // State
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnectedToWs, setIsConnectedToWs] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  // Refs to track state without causing re-renders
  const isInitializedRef = useRef(false);
  const isLoadingStreamsRef = useRef(false);
  const isLoadingBalanceRef = useRef(false);
  const lastApiCallRef = useRef(0);
  const wsConnectionAttemptsRef = useRef(0);
  const lastConnectionAttemptRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const API_CALL_COOLDOWN = 3000; // 3 seconds between API calls
  const WS_RECONNECT_MAX_ATTEMPTS = 3;
  const WS_RECONNECT_DELAY = 5000;

  // Helper function to check if we can make API calls
  const canMakeApiCall = useCallback(() => {
    const now = Date.now();
    const cooldownPassed = now - lastApiCallRef.current > API_CALL_COOLDOWN;
    
    // Don't check authentication here since it might not be ready during initialization
    // The API client will handle auth internally
    if (!cooldownPassed) {
      console.log('API call skipped - cooldown active');
      return false;
    }
    
    return true;
  }, []);

  // Update user balance from API with rate limiting
  const updateUserBalance = useCallback(async () => {
    if (!isConnected || !account || isLoadingBalanceRef.current || !canMakeApiCall()) {
      return;
    }

    isLoadingBalanceRef.current = true;
    lastApiCallRef.current = Date.now();

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
      isLoadingBalanceRef.current = false;
    }
  }, [isConnected, account, streams, canMakeApiCall]);

  // Initialize WebSocket connection with improved error handling
  const initializeWebSocket = useCallback(() => {
    if (!isConnected || !account) return;
    
    // Rate limiting: prevent too many connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
    const minInterval = Math.min(WS_RECONNECT_DELAY * Math.pow(2, wsConnectionAttemptsRef.current), 30000);
    
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

    lastConnectionAttemptRef.current = now;
    wsConnectionAttemptsRef.current += 1;

    try {
      const ws = api.createWebSocketConnection();
      if (!ws) return;

      ws.onopen = () => {
        console.log('WebSocket connected for streaming updates');
        setIsConnectedToWs(true);
        setWsConnection(ws);
        wsConnectionAttemptsRef.current = 0; // Reset attempts on successful connection
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

            // Debounced balance update
            if (canMakeApiCall()) {
              updateUserBalance();
            }
          } else if (message.type === 'NOTIFICATION') {
            const notification = message.data as {
              type: string;
              streamId: string;
              message: string;
              timestamp: number;
            };
            
            console.log('Stream notification:', notification);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnectedToWs(false);
        setWsConnection(null);
        
        // Only attempt to reconnect if it wasn't a manual close and user is still connected
        if (event.code !== 1000 && isConnected && account && wsConnectionAttemptsRef.current < WS_RECONNECT_MAX_ATTEMPTS) {
          const backoffDelay = Math.min(WS_RECONNECT_DELAY * Math.pow(2, wsConnectionAttemptsRef.current), 30000);
          console.log(`Attempting to reconnect WebSocket in ${backoffDelay / 1000} seconds... (attempt ${wsConnectionAttemptsRef.current + 1}/${WS_RECONNECT_MAX_ATTEMPTS})`);
          setTimeout(() => {
            if (isConnected && account && !wsConnection) {
              initializeWebSocket();
            }
          }, backoffDelay);
        } else if (wsConnectionAttemptsRef.current >= WS_RECONNECT_MAX_ATTEMPTS) {
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
  }, [isConnected, account, wsConnection, updateUserBalance, canMakeApiCall]);

  // Load user streams from backend with rate limiting
  const loadUserStreams = useCallback(async () => {
    if (!isConnected || !account || isLoadingStreamsRef.current || !canMakeApiCall()) {
      console.log('Skipping loadUserStreams:', { isConnected, account: !!account, isLoading: isLoadingStreamsRef.current, canMakeCall: canMakeApiCall() });
      return;
    }

    isLoadingStreamsRef.current = true;
    setIsLoading(true);
    setError(null);
    lastApiCallRef.current = Date.now();

    console.log('🔄 Loading user streams...');

    try {
      // Get streams from backend API
      console.log('📡 Fetching streams from backend API...');
      const response = await api.getUserStreams();
      console.log('✅ Backend API response:', response);
      
      if (response.streams && response.streams.length > 0) {
        setStreams(response.streams);
        console.log(`📋 Found ${response.streams.length} streams from backend`);
      } else {
        console.log('📭 No streams found in backend, checking smart contract...');
        setStreams([]);
        
        // Fallback: try to get streams from smart contract directly
        try {
          console.log('🔗 Checking smart contract for streams...');
          const streamIds = await getUserStreams(account);
          console.log('🔍 Smart contract stream IDs:', streamIds);
          
          if (streamIds.length > 0) {
            const streamDetails = await Promise.all(
              streamIds.map((id: number) => getStreamDetails(id))
            );
            
            // Convert smart contract data to expected format
            const convertedStreams: StreamData[] = streamDetails.map((details: Record<string, unknown>, index: number) => ({
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
              status: (details.active ? 'ACTIVE' : 'COMPLETED') as StreamData['status'],
              startTime: Number(details.startTime),
              endTime: Number(details.endTime),
              calculation: {
                streamId: `chain_${streamIds[index]}`,
                currentBalance: String(details.totalAmount),
                claimableAmount: String(details.claimableAmount || '0'),
                totalStreamed: String(details.totalAmount),
                withdrawnAmount: String(details.withdrawn),
                progress: 0,
                isActive: Boolean(details.active),
                ratePerSecond: String(details.ratePerSecond),
                startTime: Number(details.startTime),
                endTime: Number(details.endTime),
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
            console.log(`⛓️ Found ${convertedStreams.length} streams from smart contract`);
          } else {
            console.log('📭 No streams found on smart contract either');
            setStreams([]);
          }
        } catch (fallbackError) {
          console.error('❌ Smart contract fallback failed:', fallbackError);
          setStreams([]);
          // Don't set error here, just log it - the user might genuinely have no streams
          console.log('ℹ️ User may not have any streams yet');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load user streams:', error);
      setError(error instanceof Error ? error.message : 'Failed to load streams');
      setStreams([]);
    } finally {
      setIsLoading(false);
      isLoadingStreamsRef.current = false;
    }
  }, [isConnected, account, canMakeApiCall, getUserStreams, getStreamDetails]);

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

      // Try backend API first (only for real database stream IDs, not synthetic ones)
      if (!streamId.startsWith('chain_')) {
        try {
          const response = await api.withdrawFromStream({ 
            streamId, 
            amount: claimableAmount.toString() 
          });
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
          return; // Success, exit early
          
        } catch (apiError) {
          console.log('Backend withdrawal failed, trying smart contract directly:', apiError);
        }
      } else {
        console.log('Synthetic stream ID detected, using smart contract directly');
      }
        
      // Fallback to direct smart contract interaction
      if (stream.onChainStreamId !== undefined && stream.onChainStreamId !== null) {
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
        throw new Error('No valid on-chain stream ID available for withdrawal');
      }

    } catch (error) {
      console.error('Withdrawal failed:', error);
      setError(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(null);
    }
  }, [isConnected, account, streams, withdrawing, withdrawFromStream, updateUserBalance]);

  // Only initialize if wallet is connected and we're not checking auth
  const shouldInitialize = isConnected && account && !isCheckingAuth;

  // Initialize when wallet connects
  useEffect(() => {
    if (shouldInitialize && !isInitializedRef.current) {
      console.log('Initializing streaming hook for account:', account, 'Auth status:', { isAuthenticated, isCheckingAuth });
      isInitializedRef.current = true;
      
      // Reset connection attempts
      wsConnectionAttemptsRef.current = 0;
      lastConnectionAttemptRef.current = 0;
      
      // Initialize with a delay to prevent rapid API calls
      const initTimeout = setTimeout(() => {
        if (shouldInitialize) {
          // Call functions directly to avoid dependency issues
          loadUserStreams();
          updateUserBalance();
          initializeWebSocket();
        }
      }, 1000); // Increased delay to 1 second

      return () => clearTimeout(initTimeout);
    } else if (!isConnected || !account) {
      console.log('Cleaning up streaming hook - wallet disconnected');
      isInitializedRef.current = false;
      
      // Clear data
      setStreams([]);
      setUserBalance(null);
      
      // Reset refs
      wsConnectionAttemptsRef.current = 0;
      lastConnectionAttemptRef.current = 0;
      isLoadingStreamsRef.current = false;
      isLoadingBalanceRef.current = false;
      
      // Close WebSocket
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
        setIsConnectedToWs(false);
      }

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldInitialize, account, isAuthenticated]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [wsConnection]);

  // Periodic refresh as backup (reduced frequency)
  useEffect(() => {
    if (!shouldInitialize || !isInitializedRef.current) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      // Only refresh if WebSocket is not connected and we can make API calls
      if (!isConnectedToWs && canMakeApiCall()) {
        console.log('Periodic refresh - WebSocket disconnected');
        loadUserStreams();
        updateUserBalance();
      }
    }, 60000); // Every 60 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldInitialize, isConnectedToWs, canMakeApiCall]);

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