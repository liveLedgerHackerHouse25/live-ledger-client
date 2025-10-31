"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/Web3Context";
import { useStreaming } from "@/hooks/useStreaming";
import { useSmartContract } from "@/hooks/useSmartContract";
import styles from "@/app/_components/styling/mainContent.receipient.module.css";

export default function RecipientDashboard(): React.ReactElement {
  const { isConnected, account } = useWallet();
  const { 
    streams, 
    userBalance, 
    isLoading, 
    error, 
    isConnectedToWs, 
    withdrawing, 
    withdraw,
    refreshStreams 
  } = useStreaming();
  
  const { 
    mintTestUSDC, 
    createStream,
    usdcBalance,
    refreshBalance,
    isLoading: contractLoading 
  } = useSmartContract();

  // Real-time calculation for display
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isCreatingTestStream, setIsCreatingTestStream] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [recentWithdrawal, setRecentWithdrawal] = useState(false);

  // Update current time every second for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateCurrentEarned = (stream: any) => {
    const now = currentTime / 1000; // Convert to seconds
    const elapsed = Math.max(0, now - stream.calculation.startTime);
    const ratePerSecond = parseFloat(stream.calculation.ratePerSecond);
    const totalAmount = parseFloat(stream.totalAmount);
    
    // Calculate current earned amount
    const earned = Math.min(elapsed * ratePerSecond, totalAmount);
    return earned;
  };

  const calculateWithdrawable = (stream: any) => {
    // Use real-time calculation or the latest from WebSocket
    const currentEarned = calculateCurrentEarned(stream);
    const withdrawn = parseFloat(stream.calculation.withdrawnAmount);
    return Math.max(0, currentEarned - withdrawn);
  };

  const canWithdraw = (stream: any) => {
    return (
      stream.withdrawalLimits.canWithdraw && 
      calculateWithdrawable(stream) > 0.000001 && // Minimum withdrawal threshold
      stream.status === 'ACTIVE'
    );
  };

  const handleWithdraw = async (streamId: string) => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream) {
      setLocalError('Stream not found');
      return;
    }

    const withdrawableAmount = calculateWithdrawable(stream);
    
    // Enhanced validation
    if (!canWithdraw(stream)) {
      if (!stream.withdrawalLimits.canWithdraw) {
        setLocalError(`Daily withdrawal limit reached (${stream.withdrawalLimits.withdrawalsUsedToday}/${stream.withdrawalLimits.maxWithdrawalsPerDay})`);
      } else if (withdrawableAmount <= 0.000001) {
        setLocalError('No funds available to withdraw yet');
      } else if (stream.status !== 'ACTIVE') {
        setLocalError('Cannot withdraw from inactive stream');
      } else {
        setLocalError('Withdrawal not allowed at this time');
      }
      return;
    }

    // Clear any previous errors
    setLocalError(null);

    try {
      console.log(`🚀 Starting withdrawal for stream ${streamId}`);
      console.log(`💰 Withdrawable amount: ${withdrawableAmount.toFixed(6)} USDC`);
      console.log(`📊 Stream details:`, {
        onChainId: stream.onChainStreamId,
        status: stream.status,
        payer: stream.payer.walletAddress,
        totalAmount: stream.totalAmount
      });

      // Show user feedback
      const withdrawalPromise = withdraw(streamId);
      
      // Add toast notification or user feedback here if available
      console.log('💫 Withdrawal initiated - transaction processing...');
      
      await withdrawalPromise;
      
      // Success feedback
      console.log(`✅ Withdrawal successful! ${withdrawableAmount.toFixed(6)} USDC withdrawn from stream ${streamId}`);
      
      // Show enhanced success message to user
      setSuccessMessage(`🎉 Successfully withdrew ${withdrawableAmount.toFixed(6)} USDC! Transaction confirmed on blockchain.`);
      
      // Trigger recent withdrawal highlight
      setRecentWithdrawal(true);
      
      // Clear success message after 8 seconds (longer to let user see it)
      setTimeout(() => setSuccessMessage(null), 8000);
      
      // Clear withdrawal highlight after 10 seconds
      setTimeout(() => setRecentWithdrawal(false), 10000);
      
      // Force refresh all data to show updated balances
      await Promise.all([
        refreshStreams(),
        refreshBalance(), // Refresh USDC balance
        // Add a small delay then refresh again to ensure backend is updated
        new Promise(resolve => setTimeout(() => {
          refreshStreams();
          refreshBalance();
          resolve(null);
        }, 2000))
      ]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
      console.error('❌ Withdrawal failed:', error);
      
      // Enhanced error messages for better UX
      if (errorMessage.includes('user rejected')) {
        setLocalError('Transaction was cancelled by user');
      } else if (errorMessage.includes('insufficient funds')) {
        setLocalError('Insufficient funds for gas fees');
      } else if (errorMessage.includes('execution reverted')) {
        setLocalError('Smart contract error - please try again or contact support');
      } else if (errorMessage.includes('Daily withdrawal limit')) {
        setLocalError(errorMessage);
      } else if (errorMessage.includes('No amount available')) {
        setLocalError('No funds available to withdraw at this time');
      } else {
        setLocalError(`Withdrawal failed: ${errorMessage}`);
      }
    }
  };

  // Test function to create a stream for debugging
  const createTestStream = async () => {
    if (!account) return;
    
    setIsCreatingTestStream(true);
    try {
      console.log('🧪 Creating test stream...');
      
      // First mint some test USDC if needed
      if (parseFloat(usdcBalance) < 100) {
        console.log('💰 Minting test USDC...');
        await mintTestUSDC('1000'); // Mint 1000 USDC for testing
        await refreshBalance();
      }
      
      // Create a test stream to the current account (self-stream for testing)
      const streamParams = {
        recipientAddress: account,
        totalAmount: '100.00', // 100 USDC
        duration: 86400, // 24 hours in seconds
        maxWithdrawalsPerDay: 5
      };
      
      console.log('🚀 Creating stream with params:', streamParams);
      const result = await createStream(streamParams);
      console.log('✅ Test stream created:', result);
      
      // Refresh the streams after creation
      setTimeout(() => {
        refreshStreams();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to create test stream:', error);
      alert('Failed to create test stream: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingTestStream(false);
    }
  };

  const totalEarned = userBalance?.balances?.reduce(
    (sum, balance) => sum + parseFloat(balance.totalEarned), 0
  ) || 0;

  const totalWithdrawn = userBalance?.balances?.reduce(
    (sum, balance) => sum + parseFloat(balance.totalWithdrawn), 0
  ) || 0;

  const totalAvailable = userBalance?.balances?.reduce(
    (sum, balance) => sum + parseFloat(balance.availableBalance), 0
  ) || 0;

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
      {/* Enhanced Header Section with Gradient and Animation */}
      <div style={{
        background: "linear-gradient(135deg, rgba(5, 95, 89, 0.1), rgba(5, 95, 89, 0.05))",
        padding: "2rem",
        borderRadius: "20px",
        border: "1px solid rgba(5, 95, 89, 0.2)",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(10px)"
      }}>
        {/* Animated background decoration */}
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(5, 95, 89, 0.15) 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite",
          zIndex: 0
        }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "var(--text)",
            margin: "0 0 0.5rem 0",
            background: "linear-gradient(135deg, var(--primary), #067f75)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            💰 Payment Streams
          </h1>
          <p style={{
            color: "var(--muted)",
            fontSize: "1.1rem",
            margin: 0,
            fontWeight: "400"
          }}>
            Real-time streaming payments • Powered by Arbitrum Sepolia
          </p>
        </div>
      </div>

      {/* Enhanced Real-time Connection Status */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        marginBottom: "1.5rem",
        background: isConnectedToWs 
          ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))"
          : "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))",
        borderRadius: "16px",
        border: `1px solid ${isConnectedToWs ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        transition: "all 0.3s ease",
        boxShadow: isConnectedToWs 
          ? "0 4px 20px rgba(34, 197, 94, 0.1)" 
          : "0 4px 20px rgba(239, 68, 68, 0.1)"
      }}>
        <div style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: isConnectedToWs ? "#22c55e" : "#ef4444",
          animation: isConnectedToWs ? "pulse 2s infinite" : "none",
          boxShadow: isConnectedToWs 
            ? "0 0 15px rgba(34, 197, 94, 0.6)" 
            : "0 0 15px rgba(239, 68, 68, 0.6)"
        }} />
        <span style={{ 
          fontSize: "1rem", 
          color: isConnectedToWs ? "#22c55e" : "#ef4444",
          fontWeight: "500"
        }}>
          {isConnectedToWs ? "🌐 Real-time updates active" : "⚠️ Reconnecting to live updates..."}
        </span>
        {!isConnectedToWs && (
          <button
            onClick={refreshStreams}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              backgroundColor: "transparent",
              border: "1px solid #ff9800",
              borderRadius: "4px",
              color: "#f57c00",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Enhanced Stats Overview with Glassmorphism */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "1.5rem", 
        marginBottom: "2rem",
        padding: "0 20px"
      }}>
        {/* Total Earned Card */}
        <div style={{ 
          background: "linear-gradient(135deg, rgba(5, 95, 89, 0.1), rgba(5, 95, 89, 0.05))",
          padding: "1.5rem", 
          borderRadius: "20px",
          border: "1px solid rgba(5, 95, 89, 0.2)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(5, 95, 89, 0.2) 0%, transparent 70%)",
            zIndex: 0
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ 
              color: "var(--muted)", 
              margin: "0 0 0.5rem 0", 
              fontSize: "0.875rem", 
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              💎 Total Earned
            </h3>
            <p style={{ 
              color: "var(--text)", 
              margin: 0, 
              fontSize: "2rem", 
              fontWeight: "700",
              background: "linear-gradient(135deg, var(--primary), #067f75)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              ${totalEarned.toFixed(6)} USDC
            </p>
          </div>
        </div>

        {/* Total Withdrawn Card - Enhanced for Recent Withdrawals */}
        <div style={{ 
          background: recentWithdrawal 
            ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.1))"
            : "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))",
          padding: "1.5rem", 
          borderRadius: "20px",
          border: recentWithdrawal 
            ? "2px solid rgba(168, 85, 247, 0.4)"
            : "1px solid rgba(168, 85, 247, 0.2)",
          backdropFilter: "blur(10px)",
          boxShadow: recentWithdrawal 
            ? "0 12px 40px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.2)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.5s ease",
          position: "relative",
          overflow: "hidden",
          animation: recentWithdrawal ? "pulse 2s ease-in-out infinite" : "none"
        }}>
          {recentWithdrawal && (
            <div style={{
              position: "absolute",
              top: "-2px",
              left: "-2px",
              right: "-2px", 
              bottom: "-2px",
              borderRadius: "20px",
              background: "linear-gradient(45deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.3))",
              zIndex: 0,
              animation: "shimmer 2s infinite"
            }} />
          )}
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
            zIndex: 0
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ 
              color: "var(--muted)", 
              margin: "0 0 0.5rem 0", 
              fontSize: "0.875rem", 
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              📤 Total Withdrawn
              {recentWithdrawal && (
                <span style={{
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#22c55e",
                  fontSize: "0.625rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "12px",
                  fontWeight: "600",
                  animation: "pulse 1s ease-in-out infinite"
                }}>
                  UPDATED
                </span>
              )}
            </h3>
            <p style={{ 
              color: recentWithdrawal ? "#c084fc" : "#a855f7", 
              margin: 0, 
              fontSize: "2rem", 
              fontWeight: "700",
              textShadow: recentWithdrawal ? "0 0 10px rgba(168, 85, 247, 0.3)" : "none"
            }}>
              ${totalWithdrawn.toFixed(6)} USDC
            </p>
          </div>
        </div>

        {/* Available to Withdraw Card - Enhanced for Recent Activity */}
        <div style={{ 
          background: recentWithdrawal 
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08))"
            : "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))",
          padding: "1.5rem", 
          borderRadius: "20px",
          border: recentWithdrawal 
            ? "2px solid rgba(34, 197, 94, 0.3)"
            : "1px solid rgba(34, 197, 94, 0.2)",
          backdropFilter: "blur(10px)",
          boxShadow: recentWithdrawal 
            ? "0 8px 32px rgba(34, 197, 94, 0.2)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.5s ease",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
            zIndex: 0
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ 
              color: "var(--muted)", 
              margin: "0 0 0.5rem 0", 
              fontSize: "0.875rem", 
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              🚀 Available
              {recentWithdrawal && totalAvailable > 0 && (
                <span style={{
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#22c55e",
                  fontSize: "0.625rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "12px",
                  fontWeight: "600"
                }}>
                  INCREASED
                </span>
              )}
            </h3>
            <p style={{ 
              color: totalAvailable > 0 ? "#22c55e" : "var(--text)", 
              margin: 0, 
              fontSize: "2rem", 
              fontWeight: "700",
              textShadow: recentWithdrawal && totalAvailable > 0 ? "0 0 10px rgba(34, 197, 94, 0.3)" : "none"
            }}>
              ${totalAvailable.toFixed(6)} USDC
            </p>
          </div>
        </div>

        {/* Active Streams Card */}
        <div style={{ 
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))",
          padding: "1.5rem", 
          borderRadius: "20px",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
            zIndex: 0
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ 
              color: "var(--muted)", 
              margin: "0 0 0.5rem 0", 
              fontSize: "0.875rem", 
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              📊 Active Streams
            </h3>
            <p style={{ 
              color: "#6366f1", 
              margin: 0, 
              fontSize: "2rem", 
              fontWeight: "700"
            }}>
              {streams.filter(stream => stream.status === 'ACTIVE').length}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(error || localError) && (
        <div style={{
          padding: "16px",
          margin: "0 20px 20px 20px",
          backgroundColor: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "8px",
          color: "#c62828"
        }}>
          <strong>Error:</strong> {localError || error}
        </div>
      )}

      {/* Enhanced Success Message Display */}
      {successMessage && (
        <div style={{
          padding: "1.5rem 2rem",
          margin: "0 20px 20px 20px",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08))",
          border: "2px solid rgba(34, 197, 94, 0.4)",
          borderRadius: "16px",
          color: "#16a34a",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 8px 32px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.1)",
          animation: "pulse 0.6s ease-in-out, float 3s ease-in-out infinite",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
            animation: "shimmer 2s infinite"
          }} />
          <div style={{ 
            fontSize: "2rem",
            animation: "float 2s ease-in-out infinite"
          }}>
            🎉
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              fontWeight: "700",
              fontSize: "1.125rem",
              marginBottom: "0.25rem"
            }}>
              Withdrawal Successful!
            </div>
            <div style={{
              fontSize: "0.875rem",
              opacity: 0.9
            }}>
              {successMessage.replace('🎉 ', '')}
            </div>
          </div>
          <div style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: "600",
            background: "rgba(255, 255, 255, 0.2)",
            padding: "0.5rem 1rem",
            borderRadius: "20px"
          }}>
            ✅ Confirmed
          </div>
        </div>
      )}

      {/* Received Streams */}
      <div style={{ padding: "0 20px" }}>
        <h2 style={{ 
          color: "var(--text)", 
          marginBottom: "1.5rem",
          fontSize: "1.75rem",
          fontWeight: "700",
          background: "linear-gradient(135deg, var(--primary), #067f75)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          💰 Incoming Payment Streams
          {isLoading && (
            <span style={{ 
              fontSize: "0.875rem", 
              color: "var(--muted)", 
              background: "rgba(255, 255, 255, 0.1)",
              padding: "0.25rem 0.75rem",
              borderRadius: "20px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              🔄 Loading...
            </span>
          )}
        </h2>
        
        {isLoading && streams.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "3rem",
            background: "linear-gradient(135deg, rgba(5, 95, 89, 0.05), rgba(5, 95, 89, 0.02))",
            borderRadius: "20px",
            border: "1px solid rgba(5, 95, 89, 0.2)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              animation: "pulse 2s ease-in-out infinite"
            }}>
              🔄
            </div>
            <p style={{ 
              color: "var(--text)", 
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "0.5rem"
            }}>
              Loading your streams...
            </p>
            {isConnectedToWs && (
              <p style={{ 
                color: "var(--primary)", 
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "rgba(5, 95, 89, 0.1)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                margin: "0 auto",
                maxWidth: "fit-content"
              }}>
                🔗 Real-time connection active
              </p>
            )}
          </div>
        ) : error ? (
          <div style={{
            textAlign: "center",
            padding: "3rem",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))",
            borderRadius: "20px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              fontSize: "3rem",
              marginBottom: "1rem"
            }}>
              ⚠️
            </div>
            <p style={{ 
              color: "#ef4444", 
              marginBottom: "1rem", 
              fontWeight: "700",
              fontSize: "1.125rem"
            }}>
              Error loading streams
            </p>
            <p style={{ 
              color: "var(--muted)", 
              fontSize: "0.875rem", 
              marginBottom: "1.5rem",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "1rem",
              borderRadius: "12px",
              fontFamily: "monospace"
            }}>
              {error}
            </p>
            <button 
              onClick={refreshStreams}
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                boxShadow: "0 4px 16px rgba(239, 68, 68, 0.3)",
                transition: "all 0.3s ease",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              🔄 Retry Connection
            </button>
          </div>
        ) : streams.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "3rem",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.03))",
            borderRadius: "20px",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              fontSize: "4rem",
              marginBottom: "1.5rem",
              animation: "float 6s ease-in-out infinite"
            }}>
              🏃‍♂️
            </div>
            <h3 style={{ 
              color: "var(--text)", 
              marginBottom: "1rem", 
              fontSize: "1.5rem",
              fontWeight: "700",
              background: "linear-gradient(135deg, var(--primary), #067f75)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              No incoming streams found
            </h3>
            <p style={{ 
              color: "var(--muted)", 
              fontSize: "1rem", 
              marginBottom: "0.5rem",
              fontWeight: "500"
            }}>
              Searched both database and blockchain - no streams exist for this wallet yet.
            </p>
            <p style={{ 
              color: "var(--muted)", 
              fontSize: "0.875rem", 
              marginBottom: "2rem" 
            }}>
              Share your wallet address with payers to start receiving payments!
            </p>
            
            {/* Enhanced wallet address display */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
              padding: "1rem 1.5rem",
              borderRadius: "16px",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              color: "var(--text)",
              marginBottom: "2rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(5px)",
              wordBreak: "break-all",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: "-2px",
                left: "-50%",
                width: "50%",
                height: "calc(100% + 4px)",
                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                animation: "shimmer 3s infinite"
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                📍 {account}
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "1rem", 
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              <button 
                onClick={refreshStreams}
                style={{
                  background: "linear-gradient(135deg, var(--primary), #067f75)",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  boxShadow: "0 4px 16px rgba(5, 95, 89, 0.3)",
                  transition: "all 0.3s ease",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                🔄 Refresh Streams
              </button>
              
              {/* Enhanced Debug: Create test stream */}
              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={createTestStream}
                  disabled={isCreatingTestStream || contractLoading}
                  style={{
                    background: isCreatingTestStream 
                      ? "linear-gradient(135deg, rgba(156, 163, 175, 0.5), rgba(156, 163, 175, 0.3))" 
                      : "linear-gradient(135deg, #6b46c1, #553c9a)",
                    color: "white",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    border: "none",
                    cursor: isCreatingTestStream ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    boxShadow: isCreatingTestStream ? "none" : "0 4px 16px rgba(107, 70, 193, 0.3)",
                    transition: "all 0.3s ease",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {isCreatingTestStream ? "🔄 Creating..." : "🧪 Create Test Stream"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {streams.map((stream) => {
              const currentEarned = calculateCurrentEarned(stream);
              const withdrawable = calculateWithdrawable(stream);
              const progress = (currentEarned / parseFloat(stream.totalAmount)) * 100;
              const isStreamWithdrawing = withdrawing === stream.id;
              const isActive = stream.status === 'ACTIVE';
              
              return (
                <div 
                  key={stream.id}
                  style={{ 
                    background: `linear-gradient(135deg, 
                      ${isActive ? 'rgba(5, 95, 89, 0.08)' : 'rgba(156, 163, 175, 0.08)'}, 
                      ${isActive ? 'rgba(5, 95, 89, 0.03)' : 'rgba(156, 163, 175, 0.03)'})`,
                    padding: "1.5rem", 
                    borderRadius: "20px",
                    border: `1px solid ${isActive ? 'rgba(5, 95, 89, 0.2)' : 'rgba(156, 163, 175, 0.2)'}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                    opacity: isActive ? 1 : 0.8
                  }}
                >
                  {/* Animated background effect */}
                  <div style={{
                    position: "absolute",
                    top: "-50%",
                    right: "-50%",
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${isActive ? 'rgba(5, 95, 89, 0.15)' : 'rgba(156, 163, 175, 0.15)'} 0%, transparent 70%)`,
                    zIndex: 0,
                    animation: "float 6s ease-in-out infinite"
                  }} />
                  
                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* Header */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start",
                      marginBottom: "1rem"
                    }}>
                      <div>
                        <h3 style={{ 
                          color: "var(--text)", 
                          margin: "0 0 0.5rem 0", 
                          fontSize: "1.125rem",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}>
                          💰 {formatAddress(stream.payer.walletAddress)}
                          {stream.onChainStreamId !== undefined && (
                            <span style={{ 
                              fontSize: "0.75rem", 
                              color: "var(--muted)",
                              background: "rgba(255, 255, 255, 0.1)",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "12px",
                              fontWeight: "500"
                            }}>
                              #{stream.onChainStreamId}
                            </span>
                          )}
                        </h3>
                        <div style={{ 
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          fontSize: "0.875rem"
                        }}>
                          <span style={{ 
                            color: "var(--muted)",
                            background: "rgba(255, 255, 255, 0.1)",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontWeight: "500"
                          }}>
                            ⚡ ${parseFloat(stream.calculation.ratePerSecond).toFixed(8)}/sec
                          </span>
                          <span style={{ 
                            color: "var(--muted)",
                            background: "rgba(255, 255, 255, 0.1)",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontWeight: "500"
                          }}>
                            🎯 ${parseFloat(stream.totalAmount).toFixed(2)} USDC
                          </span>
                          <span style={{ 
                            color: isActive ? '#22c55e' : 'var(--muted)',
                            background: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontWeight: "600",
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {isActive ? '🟢' : '🔴'} {stream.status}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: "right" }}>
                        <div style={{ 
                          color: "var(--primary)", 
                          fontSize: "1.5rem", 
                          fontWeight: "700",
                          background: "linear-gradient(135deg, var(--primary), #067f75)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text"
                        }}>
                          ${currentEarned.toFixed(6)}
                        </div>
                        <div style={{ 
                          color: "var(--muted)", 
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          earned
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress bar */}
                    <div style={{ 
                      backgroundColor: "rgba(255, 255, 255, 0.1)", 
                      borderRadius: "10px", 
                      height: "12px",
                      marginBottom: "1.5rem",
                      overflow: "hidden",
                      position: "relative"
                    }}>
                      <div style={{ 
                        background: isActive 
                          ? "linear-gradient(90deg, var(--primary), #067f75, var(--primary))" 
                          : "linear-gradient(90deg, #9e9e9e, #757575)",
                        borderRadius: "10px", 
                        height: "100%",
                        width: `${Math.min(progress, 100)}%`,
                        transition: "width 0.5s ease",
                        position: "relative",
                        overflow: "hidden"
                      }}>
                        {isActive && (
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: "-50%",
                            width: "50%",
                            height: "100%",
                            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
                            animation: "shimmer 2s infinite"
                          }} />
                        )}
                      </div>
                      <div style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.625rem",
                        color: "var(--text)",
                        fontWeight: "600"
                      }}>
                        {Math.min(progress, 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Withdrawal section */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      padding: "1rem",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                      <div>
                        <div style={{ 
                          color: "var(--text)", 
                          fontSize: "0.875rem", 
                          fontWeight: "600",
                          marginBottom: "0.25rem"
                        }}>
                          💳 Available: ${withdrawable.toFixed(6)} USDC
                        </div>
                        <div style={{ 
                          color: "var(--muted)", 
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            background: stream.withdrawalLimits.withdrawalsUsedToday > 0 
                              ? "rgba(34, 197, 94, 0.2)" 
                              : "rgba(156, 163, 175, 0.2)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "8px",
                            fontSize: "0.625rem",
                            fontWeight: "600"
                          }}>
                            <span>🔄</span>
                            <span style={{
                              color: stream.withdrawalLimits.withdrawalsUsedToday > 0 
                                ? "#22c55e" 
                                : "var(--muted)"
                            }}>
                              {stream.withdrawalLimits.withdrawalsUsedToday}/{stream.withdrawalLimits.maxWithdrawalsPerDay}
                            </span>
                            <span style={{ color: "var(--muted)" }}>today</span>
                          </div>
                          {stream.withdrawalLimits.withdrawalsUsedToday > 0 && (
                            <div style={{
                              color: "#22c55e",
                              fontSize: "0.625rem",
                              fontWeight: "600"
                            }}>
                              ✅ {stream.withdrawalLimits.maxWithdrawalsPerDay - stream.withdrawalLimits.withdrawalsUsedToday} left
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleWithdraw(stream.id)}
                        disabled={!canWithdraw(stream) || isStreamWithdrawing}
                        title={
                          canWithdraw(stream) && !isStreamWithdrawing 
                            ? `Withdraw ${withdrawable.toFixed(6)} USDC` 
                            : !stream.withdrawalLimits.canWithdraw 
                              ? `Daily limit reached (${stream.withdrawalLimits.withdrawalsUsedToday}/${stream.withdrawalLimits.maxWithdrawalsPerDay})`
                              : withdrawable <= 0.000001 
                                ? "No funds available yet" 
                                : "Cannot withdraw at this time"
                        }
                        style={{
                          background: canWithdraw(stream) && !isStreamWithdrawing 
                            ? "linear-gradient(135deg, var(--primary), #067f75)" 
                            : "linear-gradient(135deg, rgba(156, 163, 175, 0.5), rgba(156, 163, 175, 0.3))",
                          color: canWithdraw(stream) && !isStreamWithdrawing ? "white" : "rgba(156, 163, 175, 0.8)",
                          padding: "0.75rem 1.5rem",
                          borderRadius: "12px",
                          border: "none",
                          cursor: canWithdraw(stream) && !isStreamWithdrawing ? "pointer" : "not-allowed",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          transition: "all 0.3s ease",
                          boxShadow: canWithdraw(stream) && !isStreamWithdrawing 
                            ? "0 4px 16px rgba(5, 95, 89, 0.3)" 
                            : "none",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        {isStreamWithdrawing && (
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: "-100%",
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                            animation: "shimmer 1.5s infinite"
                          }} />
                        )}
                        <span style={{ position: "relative", zIndex: 1 }}>
                          {isStreamWithdrawing ? "🔄 Processing..." : 
                           !stream.withdrawalLimits.canWithdraw ? "🚫 Daily limit" :
                           withdrawable <= 0.000001 ? "💤 Nothing yet" :
                           stream.status !== 'ACTIVE' ? "⏸️ Inactive" :
                           `💎 Withdraw ${withdrawable.toFixed(4)}`}
                        </span>
                      </button>
                    </div>
                    
                    {/* Footer info */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        📅 Started: {new Date(stream.calculation.startTime * 1000).toLocaleDateString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        💸 Withdrawn: ${parseFloat(stream.calculation.withdrawnAmount).toFixed(6)} USDC
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Debug Information - Show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: "32px",
            padding: "16px",
            backgroundColor: "var(--progress-bg)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--muted)"
          }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--text)" }}>🔍 Debug Info</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
              <div>Wallet Connected: {isConnected ? "✅" : "❌"}</div>
              <div>Account: {account ? `${account.slice(0, 8)}...` : "None"}</div>
              <div>USDC Balance: {usdcBalance || "0"} USDC</div>
              <div>Streams Count: {streams.length}</div>
              <div>Loading: {isLoading ? "✅" : "❌"}</div>
              <div>Contract Loading: {contractLoading ? "✅" : "❌"}</div>
              <div>WebSocket: {isConnectedToWs ? "🟢 Connected" : "🔴 Disconnected"}</div>
              <div>Error: {error ? "❌ " + error.slice(0, 30) + "..." : "None"}</div>
              <div>Balance Loaded: {userBalance ? "✅" : "❌"}</div>
              <div>Active Streams: {streams.filter(stream => stream.status === 'ACTIVE').length}</div>
              <div>Total Earned: ${userBalance?.balances?.[0]?.totalEarned || "0"}</div>
              <div>Available: ${userBalance?.balances?.[0]?.availableBalance || "0"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}