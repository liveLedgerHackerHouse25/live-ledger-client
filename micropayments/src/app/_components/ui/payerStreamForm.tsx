"use client"
import React, { useState, useEffect } from "react";
import styles from "@/app/_components/styling/payerStreamForm.module.css";

export type StreamPayload = {
  id: string;
  recipient: string;
  rate: number;
  durationSeconds: number;
  amount: number;
  receiptNote?: string;
  createdAt: string;
};

export default function PayerStreamForm({ onCreate }: { onCreate: (s: StreamPayload) => void }) {
  const [recipient, setRecipient] = useState("");
  const [rate, setRate] = useState("");
  const [duration, setDuration] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  // compute integer duration (seconds) from amount and rate when both are valid
  const computeDurationFrom = (amountStr: string, rateStr: string) => {
    const a = parseFloat(amountStr);
    const r = parseFloat(rateStr);
    if (isNaN(a) || isNaN(r) || r <= 0 || a <= 0) return "";
    // floor to get whole seconds (avoid fractional seconds)
    return String(Math.floor(a / r));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = parseFloat(rate);
    const d = parseInt(duration, 10);
    const a = parseFloat(amount);

    if (!recipient) return setError("Recipient is required.");
    if (isNaN(r) || r <= 0) return setError("Rate must be a positive number.");
    if (isNaN(d) || d <= 0) return setError("Duration must be a positive integer (seconds).");
    if (isNaN(a) || a <= 0) return setError("Amount must be a positive number.");

    setLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 700));
      const stream = {
        id: `stream_${uid()}`,
        recipient,
        rate: r,
        durationSeconds: d,
        amount: a,
        receiptNote: note || undefined,
        createdAt: new Date().toISOString(),
      };
      onCreate(stream);
      setRate("");
      setDuration("");
      setAmount("");
      setNote("");
    } catch (err) {
      setError("Failed to create stream — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.form} aria-labelledby="create-stream-heading">
      <div className={styles.header}>
        <h3 id="create-stream-heading" className={styles.heading}>Create payment stream</h3>
        <p className={styles.sub}>Configure rate, duration and total amount. Receipt will be generated on success.</p>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Recipient</span>
        <input
          className={styles.input}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0xabc... or user id"
          required
        />
      </label>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.field}>
            <span className={styles.label}>Rate (per sec)</span>
            <input
              className={styles.input}
              value={rate}
              onChange={(e) => {
                const v = e.target.value;
                setRate(v);
                const newDuration = computeDurationFrom(amount, v);
                if (newDuration) setDuration(newDuration);
              }}
              placeholder="0.01"
              inputMode="decimal"
              required
            />
          </label>
        </div>

        <div className={`${styles.col} ${styles.colSmall}`}>
          <label className={styles.field}>
            <span className={styles.label}>Duration (s)</span>
            <input
              className={styles.input}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="3600"
              inputMode="numeric"
              required
            />
          </label>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Total amount</span>
        <input
          className={styles.input}
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            setAmount(v);
            const newDuration = computeDurationFrom(v, rate);
            if (newDuration) setDuration(newDuration);
          }}
          placeholder="36"
          inputMode="decimal"
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Receipt note (optional)</span>
        <textarea
          className={styles.textarea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to include on receipt"
          rows={2}
        />
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button className={styles.primary} type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create stream"}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setRecipient("");
            setRate("");
            setDuration("");
            setAmount("");
            setNote("");
            setError(null);
          }}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
