"use client"
import React, { useEffect, useState } from "react";
import { useWallet } from "@/contexts/Web3Context";
import styles from "@/app/_components/styling/walletAside.module.css";

export default function WalletAside(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const { isConnected, account, balance, connectWallet, disconnectWallet, error, clearError } = useWallet();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("openWallet", onOpen as EventListener);
    window.addEventListener("closeWallet", onClose as EventListener);
    return () => {
      window.removeEventListener("openWallet", onOpen as EventListener);
      window.removeEventListener("closeWallet", onClose as EventListener);
    };
  }, []);

  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    clearError();
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} />
      <aside className={styles.aside} role="dialog" aria-modal="true" aria-label="Wallet panel">
        <header className={styles.header}>
          <h2 className={styles.title}>Wallet</h2>
          <button aria-label="Close" className={styles.closeBtn} onClick={handleClose}>×</button>
        </header>

        {error && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {!isConnected ? (
          <div className={styles.section}>
            <div className={styles.balanceLabel}>No wallet connected</div>
            <button 
              className={styles.addBtn} 
              type="button"
              onClick={handleConnectWallet}
            >
              Connect Wallet
            </button>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>
              Connect your MetaMask wallet to view balance and manage streams
            </p>
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <div className={styles.balanceLabel}>Wallet Address</div>
              <div style={{ 
                fontSize: '0.9rem', 
                fontFamily: 'monospace', 
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                {formatAddress(account!)}
              </div>
              
              <div className={styles.balanceLabel}>ETH Balance</div>
              <div className={styles.balanceValue}>
                {parseFloat(balance).toFixed(4)} ETH
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  className={styles.addBtn} 
                  type="button"
                  onClick={() => window.open(`https://sepolia.arbiscan.io/address/${account}`, '_blank')}
                  style={{ flex: 1, fontSize: '0.8rem' }}
                >
                  View on Explorer
                </button>
                <button 
                  className={styles.addBtn} 
                  type="button"
                  onClick={disconnectWallet}
                  style={{ 
                    flex: 1, 
                    fontSize: '0.8rem', 
                    backgroundColor: '#ff6b6b',
                    color: 'white'
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div className={styles.ActivitySection}>
              <h3 className={styles.sectionTitle}>Network Info</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div><strong>Network:</strong> Arbitrum Sepolia</div>
                <div><strong>Chain ID:</strong> 421614</div>
                <div><strong>Status:</strong> <span style={{ color: '#4caf50' }}>✓ Connected</span></div>
              </div>
              
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  🔗 Ready for Live Ledger
                </div>
                <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                  Your wallet is connected to Arbitrum Sepolia and ready to create payment streams or receive funds.
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
