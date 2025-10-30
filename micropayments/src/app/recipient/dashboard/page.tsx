"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/Web3Context";
import styles from "@/app/_components/styling/mainContent.receipient.module.css";

interface ReceivedStream {
  id: string;
  payer: string;
  rate: number;
  totalAmount: number;
  startTime: Date;
  endTime: Date;
  withdrawn: number;
  lastWithdrawal: Date | null;
  active: boolean;
  dailyWithdrawalsUsed: number;
  maxWithdrawalsPerDay: number;
}

export default function RecipientDashboard(): React.ReactElement {
  const { isConnected, account } = useWallet();
  const [receivedStreams, setReceivedStreams] = useState<ReceivedStream[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  // Mock data for now - will be replaced with real blockchain data
  useEffect(() => {
    const loadReceivedStreams = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock streams data
        const mockStreams: ReceivedStream[] = [
          {
            id: "stream_1",
            payer: "0x742d35Cc6596C9c5E07c4",
            rate: 0.01,
            totalAmount: 100,
            startTime: new Date(Date.now() - 86400000), // 1 day ago
            endTime: new Date(Date.now() + 86400000 * 6), // 6 days from now
            withdrawn: 15.5,
            lastWithdrawal: new Date(Date.now() - 7200000), // 2 hours ago
            active: true,
            dailyWithdrawalsUsed: 2,
            maxWithdrawalsPerDay: 3
          },
          {
            id: "stream_2", 
            payer: "0x8B4c5f84B2C82a9C8E",
            rate: 0.005,
            totalAmount: 50,
            startTime: new Date(Date.now() - 43200000), // 12 hours ago
            endTime: new Date(Date.now() + 43200000 * 11), // 5.5 days from now
            withdrawn: 3.2,
            lastWithdrawal: new Date(Date.now() - 3600000), // 1 hour ago
            active: true,
            dailyWithdrawalsUsed: 1,
            maxWithdrawalsPerDay: 5
          }
        ];
        
        setReceivedStreams(mockStreams);
        setTotalWithdrawn(mockStreams.reduce((sum, stream) => sum + stream.withdrawn, 0));
        
        // Calculate total earned (including unwithdrawn)
        const totalEarned = mockStreams.reduce((sum, stream) => {
          const currentEarned = calculateCurrentEarned(stream);
          return sum + currentEarned;
        }, 0);
        setTotalEarned(totalEarned);
        
      } catch (error) {
        console.error("Failed to load streams:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && account) {
      loadReceivedStreams();
    } else {
      setLoading(false);
    }
  }, [isConnected, account]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateCurrentEarned = (stream: ReceivedStream) => {
    const now = new Date();
    const elapsed = Math.max(0, now.getTime() - stream.startTime.getTime()) / 1000; // seconds
    const earned = Math.min(elapsed * stream.rate, stream.totalAmount);
    return earned;
  };

  const calculateWithdrawable = (stream: ReceivedStream) => {
    const earned = calculateCurrentEarned(stream);
    return Math.max(0, earned - stream.withdrawn);
  };

  const canWithdraw = (stream: ReceivedStream) => {
    return stream.dailyWithdrawalsUsed < stream.maxWithdrawalsPerDay && calculateWithdrawable(stream) > 0;
  };

  const handleWithdraw = async (streamId: string) => {
    if (withdrawing) return;
    
    setWithdrawing(streamId);
    try {
      // Simulate withdrawal transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the stream state
      setReceivedStreams(prev => prev.map(stream => {
        if (stream.id === streamId) {
          const withdrawableAmount = calculateWithdrawable(stream);
          return {
            ...stream,
            withdrawn: stream.withdrawn + withdrawableAmount,
            dailyWithdrawalsUsed: stream.dailyWithdrawalsUsed + 1,
            lastWithdrawal: new Date()
          };
        }
        return stream;
      }));
      
      // Update totals
      const stream = receivedStreams.find(s => s.id === streamId);
      if (stream) {
        const withdrawableAmount = calculateWithdrawable(stream);
        setTotalWithdrawn(prev => prev + withdrawableAmount);
      }
      
    } catch (error) {
      console.error("Withdrawal failed:", error);
    } finally {
      setWithdrawing(null);
    }
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
          <h2 style={{ color: "#055F59", marginBottom: "16px" }}>
            Connect Your Wallet
           </h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
             Please connect your wallet to access the recipient dashboard and view your incoming payment streams.
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
           <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
             Total Earned
           </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
             ${totalEarned.toFixed(2)}
           </p>
         </div>
 
         <div style={{ 
          backgroundColor: "var(--card-bg)", 
           padding: "20px", 
           borderRadius: "12px",
          border: "1px solid var(--card-border)"
         }}>
           <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
             Total Withdrawn
           </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
             ${totalWithdrawn.toFixed(2)}
           </p>
         </div>
 
         <div style={{ 
          backgroundColor: "var(--card-bg)", 
           padding: "20px", 
           borderRadius: "12px",
          border: "1px solid var(--card-border)"
         }}>
           <h3 style={{ color: "#055F59", margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
             Available to Withdraw
           </h3>
          <p style={{ color: "var(--text)", margin: 0, fontSize: "24px", fontWeight: "600" }}>
             ${(totalEarned - totalWithdrawn).toFixed(2)}
           </p>
         </div>
       </div>
 
       {/* Received Streams */}
       <div style={{ padding: "0 20px" }}>
        <h2 style={{ color: "var(--primary)", marginBottom: "20px" }}>Incoming Payment Streams</h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "var(--muted)" }}>Loading your streams...</p>
          </div>
        ) : receivedStreams.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            backgroundColor: "var(--card-bg)",
            borderRadius: "12px"
          }}>
            <p style={{ color: "var(--muted)", marginBottom: "16px" }}>
              No incoming streams yet. Share your wallet address with payers to start receiving payments!
            </p>
            <div style={{
              backgroundColor: "var(--progress-bg)",
              padding: "12px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              color: "var(--text)",
              marginTop: "16px"
            }}>
              {account}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {receivedStreams.map((stream) => {
               const currentEarned = calculateCurrentEarned(stream);
               const withdrawable = calculateWithdrawable(stream);
               const progress = (currentEarned / stream.totalAmount) * 100;
               
               return (
                 <div 
                   key={stream.id}
                   style={{ 
                     backgroundColor: "var(--card-bg)", 
                     padding: "24px", 
                     borderRadius: "12px",
                     border: "1px solid var(--card-border)"
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
                         fontWeight: "600",
                         zIndex: 1000
                       }}>
                         Stream from {formatAddress(stream.payer)}
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
                         ${currentEarned.toFixed(2)}
                       </div>
                       <div style={{ 
                         color: "var(--muted)", 
                         fontSize: "12px" 
                       }}>
                         earned
                       </div>
                     </div>
                   </div>
                   
                   {/* Progress bar */}
                   <div style={{ 
                     backgroundColor: "var(--progress-bg)", 
                     borderRadius: "4px", 
                     height: "8px",
                     marginBottom: "16px"
                   }}>
                     <div style={{ 
                       backgroundColor: "var(--primary)", 
                       borderRadius: "4px", 
                       height: "100%",
                       width: `${Math.min(progress, 100)}%`,
                       transition: "width 0.3s ease"
                     }} />
                   </div>
                   
                   {/* Withdrawal section */}
                   <div style={{ 
                     display: "flex", 
                     justifyContent: "space-between", 
                     alignItems: "center",
                     marginBottom: "12px"
                   }}>
                     <div>
                       <div style={{ color: "var(--text)", fontSize: "14px", fontWeight: "500" }}>
                         Available: ${withdrawable.toFixed(2)}
                       </div>
                       <div style={{ 
                         color: "var(--muted)", 
                         fontSize: "12px" 
                       }}>
                         Daily withdrawals: {stream.dailyWithdrawalsUsed}/{stream.maxWithdrawalsPerDay}
                       </div>
                     </div>
                     
                     <button
                       onClick={() => handleWithdraw(stream.id)}
                       disabled={!canWithdraw(stream) || withdrawing === stream.id}
                       style={{
                         backgroundColor: canWithdraw(stream) ? "var(--primary)" : "var(--card-disabled)",
                         color: canWithdraw(stream) ? "var(--button-text)" : "var(--muted)",
                         padding: "8px 16px",
                         borderRadius: "6px",
                         border: "none",
                         cursor: canWithdraw(stream) ? "pointer" : "not-allowed",
                         fontSize: "14px",
                         fontWeight: "500"
                       }}
                     >
                       {withdrawing === stream.id ? "Withdrawing..." : "Withdraw"}
                     </button>
                   </div>
                   
                   <div style={{ 
                     display: "flex", 
                     justifyContent: "space-between", 
                     fontSize: "12px",
                     color: "var(--muted)"
                   }}>
                     <span>Started: {stream.startTime.toLocaleDateString()}</span>
                     <span>
                       {stream.lastWithdrawal 
                         ? `Last withdrawal: ${stream.lastWithdrawal.toLocaleString()}`
                         : "No withdrawals yet"
                       }
                     </span>
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