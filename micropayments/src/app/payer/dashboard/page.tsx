"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/Web3Context";
import styles from "@/app/_components/styling/mainContent.module.css";

interface PaymentStream {
  id: string;
  recipient: string;
  rate: number;
  totalAmount: number;
  startTime: Date;
  endTime: Date;
  withdrawn: number;
  active: boolean;
}

export default function PayerDashboard(): React.ReactElement {
  const { isConnected, account, balance } = useWallet();
  const [activeStreams, setActiveStreams] = useState<PaymentStream[]>([]);
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mock data for now - will be replaced with real blockchain data
  useEffect(() => {
    const loadUserStreams = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock streams data
        const mockStreams: PaymentStream[] = [
          {
            id: "stream_1",
            recipient: "0x742d35Cc6596C9c5E07c4",
            rate: 0.01,
            totalAmount: 100,
            startTime: new Date(Date.now() - 86400000), // 1 day ago
            endTime: new Date(Date.now() + 86400000 * 6), // 6 days from now
            withdrawn: 25.5,
            active: true
          },
          {
            id: "stream_2", 
            recipient: "0x8B4c5f84B2C82a9C8E",
            rate: 0.005,
            totalAmount: 50,
            startTime: new Date(Date.now() - 43200000), // 12 hours ago
            endTime: new Date(Date.now() + 43200000 * 11), // 5.5 days from now
            withdrawn: 8.2,
            active: true
          }
        ];
        
        setActiveStreams(mockStreams);
        setTotalStreamed(mockStreams.reduce((sum, stream) => sum + stream.withdrawn, 0));
      } catch (error) {
        console.error("Failed to load streams:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && account) {
      loadUserStreams();
    } else {
      setLoading(false);
    }
  }, [isConnected, account]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateCurrentStreamed = (stream: PaymentStream) => {
    const now = new Date();
    const elapsed = Math.max(0, now.getTime() - stream.startTime.getTime()) / 1000; // seconds
    const streamed = Math.min(elapsed * stream.rate, stream.totalAmount);
    return streamed;
  };

  if (!isConnected) {
    return (
      <div className={styles.content}>
        <div style={{ 
          textAlign: "center", 
          padding: "60px 20px",
          backgroundColor: "rgba(255,255,255,0.02)",
          borderRadius: "12px",
          margin: "20px"
        }}>
          <h2 style={{ color: "#055F59", marginBottom: "16px" }}>Connect Your Wallet</h2>
          <p style={{ color: "rgba(230,238,240,0.8)", marginBottom: "24px" }}>
            Please connect your wallet to access the payer dashboard and manage your payment streams.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("openWallet"))}
            style={{
              backgroundColor: "#055F59",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      {/* Stats Overview */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px", 
        marginBottom: "32px",
        padding: "0 20px"
      }}>
        <div style={{ 
          backgroundColor: "rgba(255,255,255,0.02)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Wallet Balance
          </h3>
          <p style={{ color: "#ffffff", margin: 0, fontSize: "24px", fontWeight: "600" }}>
            {parseFloat(balance).toFixed(4)} ETH
          </p>
        </div>

        <div style={{ 
          backgroundColor: "rgba(255,255,255,0.02)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Active Streams
          </h3>
          <p style={{ color: "#ffffff", margin: 0, fontSize: "24px", fontWeight: "600" }}>
            {activeStreams.length}
          </p>
        </div>

        <div style={{ 
          backgroundColor: "rgba(255,255,255,0.02)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Total Streamed
          </h3>
          <p style={{ color: "#ffffff", margin: 0, fontSize: "24px", fontWeight: "600" }}>
            ${totalStreamed.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Active Streams */}
      <div style={{ padding: "0 20px" }}>
        <h2 style={{ color: "#055F59", marginBottom: "20px" }}>Active Payment Streams</h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "rgba(230,238,240,0.8)" }}>Loading your streams...</p>
          </div>
        ) : activeStreams.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px",
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: "12px"
          }}>
            <p style={{ color: "rgba(230,238,240,0.8)", marginBottom: "16px" }}>
              No active streams yet. Create your first payment stream to get started!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {activeStreams.map((stream) => {
              const currentStreamed = calculateCurrentStreamed(stream);
              const progress = (currentStreamed / stream.totalAmount) * 100;
              
              return (
                <div 
                  key={stream.id}
                  style={{ 
                    backgroundColor: "rgba(255,255,255,0.02)", 
                    padding: "24px", 
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "16px"
                  }}>
                    <div>
                      <h3 style={{ 
                        color: "#ffffff", 
                        margin: "0 0 8px 0", 
                        fontSize: "18px",
                        fontWeight: "600"
                      }}>
                        Stream to {formatAddress(stream.recipient)}
                      </h3>
                      <p style={{ 
                        color: "rgba(230,238,240,0.8)", 
                        margin: 0,
                        fontSize: "14px"
                      }}>
                        Rate: ${stream.rate}/sec • Total: ${stream.totalAmount}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ 
                        color: "#055F59", 
                        fontSize: "18px", 
                        fontWeight: "600" 
                      }}>
                        ${currentStreamed.toFixed(2)}
                      </div>
                      <div style={{ 
                        color: "rgba(230,238,240,0.6)", 
                        fontSize: "12px" 
                      }}>
                        streamed
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ 
                    backgroundColor: "rgba(255,255,255,0.1)", 
                    borderRadius: "4px", 
                    height: "8px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ 
                      backgroundColor: "#055F59", 
                      borderRadius: "4px", 
                      height: "100%",
                      width: `${Math.min(progress, 100)}%`,
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                  
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    fontSize: "12px",
                    color: "rgba(230,238,240,0.6)"
                  }}>
                    <span>Started: {stream.startTime.toLocaleDateString()}</span>
                    <span>Ends: {stream.endTime.toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}