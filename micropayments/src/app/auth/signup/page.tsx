"use client"
import React, { useState, useEffect } from "react";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/Web3Context";
import { api } from "@/lib/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // single role now: either "PAYER" or "RECIPIENT"
  const [userType, setUserType] = useState<"PAYER" | "RECIPIENT">("PAYER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  // Use our Web3Context
  const { 
    isConnected, 
    isConnecting, 
    account, 
    connectWallet, 
    error: walletError,
    clearError,
    signer
  } = useWallet();

  // Clear wallet errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Helper to shorten address for UI
  const short = (addr: string) =>
    addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Set single selected role
  const selectRole = (role: "PAYER" | "RECIPIENT") => {
    setUserType(role);
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error("No signer available");
    }
    return await signer.signMessage(message);
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Name is required.");
    if (!validateEmail(email)) return setError("Enter a valid email address.");
    if (!isConnected || !account) return setError("Please connect your wallet first.");

    // require a role
    if (!userType) return setError("Please select a role.");

    setLoading(true);
    try {
      // 1) request nonce from backend
      const nonceResp = await api.getNonce({ walletAddress: account });
      const message = `Welcome to LiveLedger!\n\nSign this message to authenticate your wallet.\n\nNonce: ${nonceResp.nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;

      // 2) Sign message using our Web3Context signer
      const signature = await signMessage(message);

      // 3) send wallet auth to backend (include userType, name, email)
      const auth = await api.walletAuth({
         walletAddress: account,
         signature,
         nonce: nonceResp.nonce,
         userType,
         name,
         email,
       });

      // 4) optionally fetch current user from /auth/me
      const me = await api.request("/auth/me");
      console.log("Authenticated user:", me);

      setSuccess("Account created and authenticated successfully!");
      
      // reset local fields if desired
      setName("");
      setEmail("");
      setUserType("PAYER");
      
      // redirect: prefer payer dashboard when user can be payer, otherwise recipient
      setTimeout(() => {

        const isPayer =
          auth?.user?.userType === "PAYER" ||
          auth?.user?.userType?.includes?.("PAYER") ||
          userType === "PAYER";
        if (isPayer) {
          router.push("/payer/dashboard");
        } else {
          router.push("/recipient/dashboard");
        }
      }, 1500); // Show success message briefly before redirect
      
    } catch (err: unknown) {
      console.error("Signup error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign up — try again.";
      setError(errorMessage);
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
          <span className={styles.labelText}>Select role</span>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="userType" value="PAYER" checked={userType === "PAYER"}
                onChange={() => selectRole("PAYER")}
              />
              <span style={{ fontSize: 13 }}>Payer</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="userType" value="RECIPIENT" checked={userType === "RECIPIENT"}
                onChange={() => selectRole("RECIPIENT")}
              />
              <span style={{ fontSize: 13 }}>Recipient</span>
            </label>
          </div>
        </label>

        {/* Wallet connection section */}
        <div className={styles.formLabel}>
          <span className={styles.labelText}>Wallet Connection</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {!isConnected ? (
              <button
                type="button"
                onClick={connectWallet}
                className={styles.primary}
                disabled={isConnecting}
                style={{ padding: "12px 16px" }}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: "var(--success-bg, #f0f9ff)",
                border: "1px solid var(--success-border, #0ea5e9)",
                borderRadius: "6px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: "50%", 
                    backgroundColor: "var(--success, #10b981)" 
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    Connected: {short(account || "")}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>
                  ✓ Ready to sign up
                </span>
              </div>
            )}
            {walletError && (
              <div style={{ 
                fontSize: 13, 
                color: "var(--error, #ef4444)", 
                padding: "8px 12px",
                backgroundColor: "var(--error-bg, #fef2f2)",
                border: "1px solid var(--error-border, #fecaca)",
                borderRadius: "4px"
              }}>
                {walletError}
              </div>
            )}
          </div>
        </div>

        {(error || walletError) && (
          <div className={styles.error}>
            {error || walletError}
          </div>
        )}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.actions}>
          <button 
            type="submit" 
            className={styles.primary} 
            disabled={loading || !isConnected || isConnecting}
          >
            {loading ? "Creating Account..." : isConnected ? "Sign Up" : "Connect Wallet First"}
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => router.push("/auth/login")}
          >
            Back to Login
          </button>
        </div>
      </form>

      <p className={styles.footerNote}>
        Already have an account? <a href="/auth/login" className={styles.link}>Log in</a>
      </p>
    </div>
  );
}