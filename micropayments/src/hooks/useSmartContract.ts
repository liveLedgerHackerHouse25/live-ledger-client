import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/contexts/Web3Context';
import { contractService, StreamCreationParams, StreamTransaction } from '@/lib/smartContract';

export interface UseSmartContractReturn {
  // State
  isInitialized: boolean;
  usdcBalance: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createStream: (params: StreamCreationParams) => Promise<StreamTransaction>;
  mintTestUSDC: (amount?: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  clearError: () => void;
}

export function useSmartContract(): UseSmartContractReturn {
  const { provider, signer, isConnected, account } = useWallet();
  const [isInitialized, setIsInitialized] = useState(false);
  const [usdcBalance, setUSDCBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!isInitialized) return;
    
    try {
      const balance = await contractService.getUSDCBalance();
      setUSDCBalance(balance);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      setError('Failed to fetch USDC balance');
    }
  }, [isInitialized]);

  // Initialize contract service when wallet connects
  useEffect(() => {
    if (provider && signer && isConnected) {
      try {
        contractService.initialize(provider, signer);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize contract service:', err);
        setError('Failed to initialize smart contracts');
        setIsInitialized(false);
      }
    } else {
      setIsInitialized(false);
      setUSDCBalance('0.00');
    }
  }, [provider, signer, isConnected]);

  // Load USDC balance when initialized
  useEffect(() => {
    if (isInitialized && account) {
      refreshBalance();
    }
  }, [isInitialized, account, refreshBalance]);

  const createStream = async (params: StreamCreationParams): Promise<StreamTransaction> => {
    if (!isInitialized) {
      throw new Error('Smart contracts not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await contractService.createStream(params);
      
      // Refresh balance after stream creation
      await refreshBalance();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stream';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const mintTestUSDC = async (amount = "1000"): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Smart contracts not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHash = await contractService.mintTestUSDC(amount);
      
      // Refresh balance after minting
      await refreshBalance();
      
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint test USDC';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isInitialized,
    usdcBalance,
    isLoading,
    error,
    createStream,
    mintTestUSDC,
    refreshBalance,
    clearError,
  };
}