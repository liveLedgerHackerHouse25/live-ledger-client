"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/Web3Context";
import styles from "@/app/_components/styling/mainContent.module.css";
import { api } from "@/lib/api";

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
  const [totalStreamed, setTotalStreamed] = useState<number>(0);
  const [totalLocked, setTotalLocked] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now - will be replaced with real blockchain data
  useEffect(() => {
    const loadUserStreams = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, attempt to get the user's profile to determine the address to query
        let addr: string | undefined = undefined;
        try {
          const profileRes: any = await api.get("/users/profile");
          // Support several response shapes
          addr = profileRes?.data?.user?.walletAddress ?? profileRes?.user?.walletAddress ?? profileRes?.walletAddress ?? profileRes?.address;
        } catch (profileErr) {
          // Non-fatal: fall back to connected wallet address from Web3Context
          console.debug("Could not load /users/profile, falling back to connected account", profileErr);
        }

        if (!addr && account) addr = account;

        if (!addr) {
          throw new Error("No wallet address available to load payer dashboard");
        }

  // Fetch payer dashboard data using ApiClient helper
  const res: any = await api.getPayerDashboard(addr);
  // api.request already unwraps common envelopes; handle both wrapped and raw shapes
  const payload = res?.data ?? res;

        const streamsFromApi: any[] = payload?.activeStreams ?? payload?.active_streams ?? [];
        const totalStreamedStr: string | undefined = payload?.totalStreamed ?? payload?.total_streamed ?? payload?.totalStreamed;
        const totalLockedStr: string | undefined = payload?.totalLocked ?? payload?.total_locked ?? payload?.totalLocked;
        const statsObj = payload?.stats ?? payload?.statistics ?? null;

        if (Array.isArray(streamsFromApi) && streamsFromApi.length > 0) {
          // Map API stream shape to PaymentStream if possible
          const mapped: PaymentStream[] = streamsFromApi.map((s: any, idx: number) => {
            // Try to normalize fields with fallbacks
            const start = s?.startTime ? new Date(s.startTime) : new Date();
            const end = s?.endTime ? new Date(s.endTime) : new Date(start.getTime() + 7 * 24 * 3600 * 1000);
            return {
              id: s?.id ?? `stream_${idx}`,
              recipient: s?.recipient ?? s?.recipientAddress ?? s?.to ?? "",
              rate: Number(s?.rate ?? s?.ratePerSecond ?? 0),
              totalAmount: Number(s?.totalAmount ?? s?.amount ?? 0),
              startTime: start,
              endTime: end,
              withdrawn: Number(s?.withdrawn ?? s?.withdrawnAmount ?? 0),
              active: Boolean(s?.active ?? (s?.status === "ACTIVE"))
            };
          });

          setActiveStreams(mapped);
          setTotalStreamed(mapped.reduce((sum, st) => sum + st.withdrawn, 0));
        } else {
          // No streams from API - set empty
          setActiveStreams([]);
          setTotalStreamed(Number(totalStreamedStr ?? 0));
        }

        setTotalLocked(totalLockedStr ?? null);
        setStats(statsObj ?? null);

      } catch (err: any) {
        console.error("Failed to load payer dashboard:", err);
        setError(err?.message ?? String(err));

        // Fallback to the previous mock behavior so the UI remains useful during development
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
          }
        ];
        setActiveStreams(mockStreams);
        setTotalStreamed(mockStreams.reduce((sum, stream) => sum + stream.withdrawn, 0));
      } finally {
        setLoading(false);
      }
    };

    // Only load when connected or if we can still resolve an address via profile
    loadUserStreams();
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
          backgroundColor: "var(--card-bg)",
          borderRadius: "12px",
          margin: "20px"
        }}>
          <h2 style={{ color: "var(--primary)", marginBottom: "16px" }}>Connect Your Wallet</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            Please connect your wallet to access the payer dashboard and manage your payment streams.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("openWallet"))}
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--button-text)",
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
          backgroundColor: "var(--card-bg)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid var(--card-border)"
        }}>
          <h3 style={{ color: "var(--primary)", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Wallet Balance
          </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
            {parseFloat(balance).toFixed(4)} ETH
          </p>
        </div>

        <div style={{ 
          backgroundColor: "var(--card-bg)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid var(--card-border)"
        }}>
          <h3 style={{ color: "var(--primary)", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Active Streams
          </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
            {activeStreams.length}
          </p>
        </div>

        <div style={{ 
          backgroundColor: "var(--card-bg)", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid var(--card-border)"
        }}>
          <h3 style={{ color: "var(--primary)", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
            Total Streamed
          </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
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
                        color: "var(--text)", 
                        margin: "0 0 8px 0", 
                        fontSize: "18px",
                        fontWeight: "600"
                      }}>
                        Stream to {formatAddress(stream.recipient)}
                      </h3>
                      <p style={{ 
                        color: "var(--muted)", 
                        margin: 0,
                        fontSize: "14px"
                      }}>
                        Rate: ${stream.rate}/sec • Total: ${stream.totalAmount}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ 
                        color: "var(--primary)", 
                        fontSize: "18px", 
                        fontWeight: "600" 
                      }}>
                        ${currentStreamed.toFixed(2)}
                      </div>
                      <div style={{ 
                        color: "var(--muted)", 
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