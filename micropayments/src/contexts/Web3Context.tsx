"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';

// Arbitrum Sepolia network configuration
const ARBITRUM_SEPOLIA = {
  chainId: '0x66eee', // 421614 in hex
  chainName: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
};

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  balance: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  
  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToArbitrumSepolia: () => Promise<boolean>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is already connected on load (without prompting)
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          // Check if accounts are already available without prompting
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' // This doesn't prompt, only returns already connected accounts
          }) as string[];
          
          if (accounts && accounts.length > 0) {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            
            setProvider(provider);
            setSigner(signer);
            setAccount(address);
            setIsConnected(true);
            
            const balance = await provider.getBalance(address);
            setBalance(formatEther(balance));
          }
        }
      } catch {
        // Silently fail - user just isn't connected yet
        console.log('No existing wallet connection found');
      }
    };

    checkExistingConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const updateBalance = async (address: string) => {
      try {
        if (provider) {
          const balance = await provider.getBalance(address);
          setBalance(formatEther(balance));
        }
      } catch (err) {
        console.error('Failed to update balance:', err);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        }
      };

      const handleChainChanged = () => {
        // Reload the page when chain changes
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [account, provider]);

  const updateBalance = async (address: string) => {
    try {
      if (provider) {
        const balance = await provider.getBalance(address);
        setBalance(formatEther(balance));
      }
    } catch (err) {
      console.error('Failed to update balance:', err);
    }
  };

  const switchToArbitrumSepolia = async (): Promise<boolean> => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA.chainId }],
      });
      return true;
    } catch (switchError: unknown) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError && typeof switchError === 'object' && 'code' in switchError && switchError.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [ARBITRUM_SEPOLIA],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Arbitrum Sepolia network:', addError);
          setError('Failed to add Arbitrum Sepolia network');
          return false;
        }
      } else {
        console.error('Failed to switch to Arbitrum Sepolia:', switchError);
        setError('Failed to switch to Arbitrum Sepolia network');
        return false;
      }
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Create provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 421614) {
        const switched = await switchToArbitrumSepolia();
        if (!switched) {
          throw new Error('Please switch to Arbitrum Sepolia network');
        }
      }

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setIsConnected(true);
      await updateBalance(address);

    } catch (err: unknown) {
      // Normalize error into a readable string for console + UI
      let normalized: string;
      try {
        if (err instanceof Error) normalized = err.message || String(err);
        else if (typeof err === "string") normalized = err;
        else {
          // attempt to stringify non-Error objects (handles {} and other shapes)
          normalized = JSON.stringify(err) || String(err);
        }
      } catch (e) {
        normalized = String(err);
      }
      // Log both the normalized message and the raw object for debugging
      console.error("Failed to connect wallet:", normalized, err);
      setError(normalized || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setBalance('0');
    setIsConnected(false);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value: Web3ContextType = {
    isConnected,
    isConnecting,
    account,
    balance,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchToArbitrumSepolia,
    error,
    clearError,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWallet(): Web3ContextType {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWallet must be used within a Web3Provider');
  }
  return context;
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}