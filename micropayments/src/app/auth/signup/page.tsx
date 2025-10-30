"use client"
import React, { useState } from "react";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Name is required.");
    if (!validateEmail(email)) return setError("Enter a valid email address.");
    if (!walletAddress.trim()) return setError("Wallet address is required.");

    setLoading(true);
    try {
      // simulate server call
      await new Promise((res) => setTimeout(res, 700));
      console.log("Signup payload:", { name, email, walletAddress });
      setSuccess("Account created successfully.");
      setName("");
      setEmail("");
      setWalletAddress("");
      // optionally redirect to login after success
      // router.push("/auth/login");
    } catch (err) {
      setError("Failed to sign up — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 id="signup-heading" className={styles.title}>Sign up</h2>
      <p className={styles.lead}>Create an account to access your Live Ledger dashboard.</p>

      <form onSubmit={onSubmit} className={styles.loginForm}>
        <label className={styles.formLabel}>
          <span className={styles.labelText}>Name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
            autoComplete="name"
          />
        </label>

        <label className={styles.formLabel}>
          <span className={styles.labelText}>Email</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className={styles.formLabel}>
          <span className={styles.labelText}>Wallet address</span>
          <input
            className={styles.input}
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            required
            placeholder="0xabc... or wallet id"
            autoComplete="off"
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? "Signing up..." : "Sign up"}
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => router.push("/auth/login")}
          >
            Back
          </button>
        </div>
      </form>

      <p className={styles.footerNote}>
        Already have an account? <a href="/auth/login" className={styles.link}>Log in</a>
      </p>
    </div>
  );
}