"use client";

import React, { useState, useEffect } from "react";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/Web3Context";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  // single selected role for login (either PAYER or RECIPIENT)
  const [userType, setUserType] = useState<"PAYER" | "RECIPIENT">("PAYER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

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

  // When a user selects a role: update backend profile and route to the appropriate dashboard
  const handleRoleSelect = async (role: "PAYER" | "RECIPIENT") => {
    setError(null);
    // require wallet connected (backend will associate profile with wallet session)
    if (!isConnected || !account) {
      setError("Please connect your wallet before selecting a role.");
      return;
    }

    setUserType(role);
    try {
      // update user profile on backend with selected userType
      await api.request("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType: role }),
      });

      // route immediately based on selected role
      if (role === "PAYER") {
        router.push("/payer/dashboard");
      } else {
        router.push("/recipient/dashboard");
      }
    } catch (err: unknown) {
      console.error("Failed to update user type:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update role — try again.";
      setError(errorMessage);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error("No signer available");
    }
    return await signer.signMessage(message);
  };

  const submit = async (ev: React.FormEvent) => {
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
      const message = `Welcome to LiveLedger! Sign this message to authenticate your wallet. Nonce: ${nonceResp.nonce} This request will not trigger a blockchain transaction or cost any gas fees.`;

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

      setSuccess("Login Successful!");

      // reset local fields if desired
      setName("");
      setEmail("");
      setUserType("PAYER");

      // redirect: prefer payer dashboard when user can be payer, otherwise recipient
      setTimeout(() => {
        // support both new single-field userType and legacy array userTypes
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
      const errorMessage = err instanceof Error ? err.message : "Failed to login — try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.container}>
      <h2 id="login-heading" className={styles.title}>Log in</h2>
      <p className={styles.lead}>Sign in to access your Live Ledger dashboard.</p>

      <form onSubmit={submit} className={styles.loginForm}>
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
            autoComplete="email"
          />
        </label>

        <label className={styles.formLabel}>
          <span className={styles.labelText}>Select role</span>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                name="userType"
                value="PAYER"
                checked={userType === "PAYER"}
                onChange={() => handleRoleSelect("PAYER")}
              />
              <span style={{ fontSize: 13 }}>Payer</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                name="userType"
                value="RECIPIENT"
                checked={userType === "RECIPIENT"}
                onChange={() => handleRoleSelect("RECIPIENT")}
              />
              <span style={{ fontSize: 13 }}>Recipient</span>
            </label>
          </div>
        </label>

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
                  ✓ Ready to login
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
            {loading ? "Logging in" : isConnected ? "Login in" : "Connect Wallet First"}
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => router.push("/")}
          >
            Back
          </button>
        </div>
      </form>

      <p className={styles.footerNote}>
        Don't have an account? <a href="/auth/signup" className={styles.link}>Sign up</a>
      </p>
    </div>
  );
}
