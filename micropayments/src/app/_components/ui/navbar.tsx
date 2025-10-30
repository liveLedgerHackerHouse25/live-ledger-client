"use client"
import React from "react";
import Link from "next/link";
import { useWallet } from "@/contexts/Web3Context";
import styles from "@/app/_components/styling/home.module.css";

export default function Navbar(): React.ReactElement {
  const { isConnected, isConnecting, account, connectWallet, disconnectWallet, error } = useWallet();

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandMark}>LIVE</Link>
          <Link href="/" className={styles.brandName}>LEDGER</Link>
        </div>

        <div className={styles.navLinks}>
          <a href="#contact" onClick={scrollToContact} className={styles.link}>Contact</a>
          
          {error && (
            <div style={{ color: 'red', fontSize: '0.8rem', marginRight: '1rem' }}>
              {error}
            </div>
          )}
          
          {!isConnected ? (
            <>
              <Link href="/auth/signup" className={styles.linkBtnAlt}>Sign up</Link>
              <button 
                onClick={handleConnectWallet} 
                disabled={isConnecting}
                className={styles.linkBtnAlt}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  opacity: isConnecting ? 0.6 : 1
                }}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className={styles.link}>
                {formatAddress(account!)}
              </span>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("openWallet"))}
                className={styles.linkBtnAlt}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Wallet
              </button>
              <button 
                onClick={disconnectWallet}
                className={styles.linkBtnAlt}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#ff6b6b'
                }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
