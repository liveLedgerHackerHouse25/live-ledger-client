"use client"
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/Web3Context";
import { useSmartContract } from "@/hooks/useSmartContract";
import styles from "@/app/_components/styling/payerStreamForm.module.css";

export type StreamPayload = {
  id: string;
  recipient: string;
  rate: number;
  durationSeconds: number;
  amount: number;
  receiptNote?: string;
  createdAt: string;
  txHash?: string;
  streamId?: number;
  status?: 'pending' | 'confirmed' | 'failed';
};

export default function PayerStreamForm({ onCreate }: { onCreate: (s: StreamPayload) => void }) {
  const { isConnected, account } = useWallet();
  const { createStream, mintTestUSDC, usdcBalance, isLoading: contractLoading, error: contractError, clearError } = useSmartContract();
  
  const [recipient, setRecipient] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMintButton, setShowMintButton] = useState(false);
  const [adjustmentInfo, setAdjustmentInfo] = useState<string | null>(null);

  // Show mint button if user has low USDC balance
  useEffect(() => {
    const balance = parseFloat(usdcBalance);
    setShowMintButton(balance < 100); // Show if less than 100 USDC
  }, [usdcBalance]);

  // Calculate rate per second and duration in seconds from user inputs
  const calculateStreamParams = () => {
    const amount = parseFloat(totalAmount);
    const days = parseFloat(durationDays);
    
    if (isNaN(amount) || isNaN(days) || amount <= 0 || days <= 0) {
      return { ratePerSecond: 0, durationSeconds: 0, isValid: false };
    }
    
    const durationSeconds = Math.floor(days * 24 * 60 * 60); // Convert days to seconds
    const ratePerSecond = amount / durationSeconds; // USDC per second
    
    return { ratePerSecond, durationSeconds, isValid: true };
  };

  const { ratePerSecond, durationSeconds, isValid } = calculateStreamParams();

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();
    
    if (!recipient) return setError("Recipient address is required.");
    if (!totalAmount || parseFloat(totalAmount) <= 0) return setError("Total amount must be a positive number.");
    if (!durationDays || parseFloat(durationDays) <= 0) return setError("Duration must be a positive number of days.");

    if (!isValid) return setError("Please enter valid amount and duration values.");

    // Check if wallet is connected
    if (!isConnected) {
      return setError("Please connect your wallet first.");
    }

    // Check if user has enough USDC
    const userBalance = parseFloat(usdcBalance);
    const amount = parseFloat(totalAmount);
    if (userBalance < amount) {
      return setError(`Insufficient USDC balance. You have $${userBalance.toFixed(2)} but need $${amount.toFixed(2)}.`);
    }

    setLoading(true);
    try {
      console.log('Creating stream with smart contract...');
      console.log('Stream parameters:', {
        totalAmount: amount,
        durationDays: parseFloat(durationDays),
        ratePerSecond: ratePerSecond.toFixed(8),
        durationSeconds
      });
      
      // Create stream using smart contract
      const streamParams = {
        recipientAddress: recipient,
        totalAmount: totalAmount,
        duration: durationSeconds,
        maxWithdrawalsPerDay: 5, // Default to 5 withdrawals per day
      };

      const transaction = await createStream(streamParams);
      
      console.log('Stream created successfully:', transaction);
      setAdjustmentInfo(null); // Clear any adjustment info on success

      // Create the stream payload for the UI
      const stream: StreamPayload = {
        id: `stream_${uid()}`,
        recipient,
        rate: ratePerSecond,
        durationSeconds: durationSeconds,
        amount: amount,
        receiptNote: note || undefined,
        createdAt: new Date().toISOString(),
        txHash: transaction.hash,
        streamId: transaction.streamId,
        status: transaction.status,
      };

      onCreate(stream);
      
      // Reset form
      setRecipient("");
      setTotalAmount("");
      setDurationDays("");
      setNote("");
      setAdjustmentInfo(null);
      
    } catch (error) {
      console.error('Failed to create stream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create stream';
      
      // Handle specific math validation errors with helpful suggestions
      if (errorMessage.includes("doesn't divide evenly")) {
        setError(`${errorMessage}\n\nTip: Try amounts like $86.40 for 30 days, or $100.80 for exactly divisible streaming.`);
        setAdjustmentInfo(`For ${durationDays} days, try amounts that divide evenly: $86.40, $100.80, $129.60, etc.`);
      } else {
        setError(errorMessage);
        setAdjustmentInfo(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMintUSDC = async () => {
    try {
      setLoading(true);
      console.log('Minting test USDC...');
      await mintTestUSDC("1000");
      console.log('Test USDC minted successfully');
    } catch (error) {
      console.error('Failed to mint USDC:', error);
      setError('Failed to mint test USDC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.form} aria-labelledby="create-stream-heading">
      <div className={styles.header}>
        <h3 id="create-stream-heading" className={styles.heading}>Create Payment Stream</h3>
        <p className={styles.sub}>Set up a continuous payment stream to a recipient. Funds will be streamed over time and can be withdrawn in real-time.</p>
        
        {/* Wallet status and balance */}
        {isConnected ? (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '8px', 
            marginTop: '12px',
            fontSize: '0.95rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#2e7d32', fontWeight: '500' }}>✓ Wallet Connected</span>
              <span style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>
                ${parseFloat(usdcBalance).toFixed(2)} USDC
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#4a4a4a', marginTop: '4px' }}>
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
            {showMintButton && (
              <button
                type="button"
                onClick={handleMintUSDC}
                disabled={loading || contractLoading}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Get 1000 Test USDC
              </button>
            )}
          </div>
        ) : (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fff3e0', 
            borderRadius: '8px', 
            marginTop: '12px',
            fontSize: '0.95rem',
            color: '#f57c00',
            fontWeight: '500'
          }}>
            ⚠️ Please connect your wallet to create streams
          </div>
        )}
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Recipient Address</span>
        <input
          className={styles.input}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x1234...abcd or recipient.eth"
          required
        />
        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
          Enter the wallet address that will receive the payment stream
        </small>
      </label>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.field}>
            <span className={styles.label}>Total Amount (USD)</span>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#666',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>$</span>
              <input
                className={styles.input}
                style={{ paddingLeft: '32px', fontSize: '1.1rem', fontWeight: '500' }}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="120.00"
                inputMode="decimal"
                required
              />
            </div>
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
              Total amount to be streamed to recipient
            </small>
          </label>
        </div>

        <div className={styles.col}>
          <label className={styles.field}>
            <span className={styles.label}>Duration (Days)</span>
            <div style={{ position: 'relative' }}>
              <input
                className={styles.input}
                style={{ paddingRight: '45px', fontSize: '1.1rem', fontWeight: '500' }}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="30"
                inputMode="decimal"
                required
              />
              <span style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#666',
                fontSize: '0.9rem'
              }}>days</span>
            </div>
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
              How long the stream will last
            </small>
          </label>
        </div>
      </div>

      {/* Stream calculation preview */}
      {isValid && totalAmount && durationDays && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          marginBottom: '16px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '0.95rem', fontWeight: '600' }}>
            📊 Stream Preview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
            <div>
              <strong style={{ color: '#6c757d' }}>Rate per second:</strong><br />
              <span style={{ color: '#28a745', fontWeight: '600' }}>${ratePerSecond.toFixed(8)}</span>
            </div>
            <div>
              <strong style={{ color: '#6c757d' }}>Rate per day:</strong><br />
              <span style={{ color: '#28a745', fontWeight: '600' }}>${(ratePerSecond * 86400).toFixed(2)}</span>
            </div>
            <div>
              <strong style={{ color: '#6c757d' }}>Rate per hour:</strong><br />
              <span style={{ color: '#28a745', fontWeight: '600' }}>${(ratePerSecond * 3600).toFixed(4)}</span>
            </div>
            <div>
              <strong style={{ color: '#6c757d' }}>Total duration:</strong><br />
              <span style={{ color: '#28a745', fontWeight: '600' }}>{Math.floor(durationSeconds / 86400)} days, {Math.floor((durationSeconds % 86400) / 3600)} hours</span>
            </div>
          </div>
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Receipt Note (Optional)</span>
        <textarea
          className={styles.textarea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for your records (e.g., 'Monthly salary for John Doe', 'Freelance payment for Q4 project')"
          rows={3}
        />
        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
          This note will appear on your payment receipt
        </small>
      </label>

      {(error || contractError) && (
        <div className={styles.error}>
          {error || contractError}
        </div>
      )}

      {adjustmentInfo && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: '#1565c0',
          border: '1px solid #bbdefb'
        }}>
          💡 {adjustmentInfo}
        </div>
      )}

      <div className={styles.actions}>
        <button 
          className={styles.primary} 
          type="submit" 
          disabled={loading || contractLoading || !isConnected || !isValid}
          style={{ 
            fontSize: '1rem', 
            fontWeight: '600',
            padding: '14px 24px'
          }}
        >
          {loading || contractLoading ? "Creating Stream..." : `Create Stream ($${totalAmount || '0.00'})`}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setRecipient("");
            setTotalAmount("");
            setDurationDays("");
            setNote("");
            setError(null);
            setAdjustmentInfo(null);
            clearError();
          }}
        >
          Reset Form
        </button>
      </div>
    </form>
  );
}
