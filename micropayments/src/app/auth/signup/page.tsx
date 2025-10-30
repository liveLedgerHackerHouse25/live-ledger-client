"use client"
import React, { useState } from "react";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { api } from "@/lib/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // allow multiple roles
  const [userTypes, setUserTypes] = useState<("PAYER" | "RECIPIENT")[]>(["PAYER"]);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  // helper to shorten address for UI
  const short = (addr: string) =>
    addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // connect to MetaMask (ethers.js) — robust for ethers v5 (Web3Provider) and v6 (BrowserProvider)
  const connectWallet = async () => {
    setError(null);
    try {
      const anyWin = window as any;
      if (!anyWin?.ethereum) {
        // redirect user to MetaMask install/create page
        window.location.assign("https://metamask.io/download.html");
        return;
      }

      // first, prompt MetaMask to request accounts (broad compatibility)
      if (typeof anyWin.ethereum.request === "function") {
        await anyWin.ethereum.request({ method: "eth_requestAccounts" });
      } else if (typeof anyWin.ethereum.enable === "function") {
        await anyWin.ethereum.enable();
      }

      // support either ethers v5 or v6 provider constructors
      const ethersAny = (ethers as any);
      let provider: any | undefined;

      if (ethersAny.providers && ethersAny.providers.Web3Provider) {
        // ethers v5 style
        provider = new ethersAny.providers.Web3Provider(anyWin.ethereum);
      } else if (ethersAny.BrowserProvider) {
        // ethers v6 style
        provider = new ethersAny.BrowserProvider(anyWin.ethereum);
      } else if (ethersAny.providers?.Web3Provider) {
        // fallback defensive check
        provider = new ethersAny.providers.Web3Provider(anyWin.ethereum);
      } else {
        throw new Error("No compatible ethers Provider found");
      }

      // get signer and address — both provider types expose getSigner()
      const signer = provider.getSigner ? provider.getSigner() : undefined;
      if (!signer || typeof signer.getAddress !== "function") {
        throw new Error("Provider does not expose a signer");
      }
      const addr = await signer.getAddress();
      setWalletAddress(addr);
    } catch (err) {
      console.error("connectWallet error", err);
      setError("Failed to connect wallet. Make sure MetaMask is installed, unlocked and try again.");
    }
  };

  // helper to toggle a role in the array
  const toggleRole = (role: "PAYER" | "RECIPIENT") => {
    setUserTypes((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      return [...prev, role];
    });
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Name is required.");
    if (!validateEmail(email)) return setError("Enter a valid email address.");
    if (!walletAddress || !walletAddress.trim()) return setError("Please connect your wallet.");

    // require at least one role
    if (!userTypes || userTypes.length === 0) return setError("Please select at least one role.");

    setLoading(true);
    try {
      // 1) request nonce from backend
      const nonceResp = await api.getNonce({ walletAddress });
      const message = `Sign this nonce to authenticate: ${nonceResp.nonce}`;

      // 2) request signature from injected provider (MetaMask)
      const anyWin = window as any;
      if (!anyWin?.ethereum) {
        window.location.assign("https://metamask.io/download.html");
        return;
      }

      // personal_sign: params [message, address]
      const signature = await anyWin.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });

      // 3) send wallet auth to backend (include userTypes, name, email)
      const auth = await api.walletAuth({
         walletAddress,
         signature,
         nonce: nonceResp.nonce,
         userTypes,
         name,
         email,
       });

      // 4) optionally fetch current user from /auth/me
      const me = await api.request("/auth/me");
      console.log("Authenticated user:", me);

      setSuccess("Account created and authenticated.");
      // reset local fields if desired (but tokens persist in api client)
      setName("");
      setEmail("");
      setWalletAddress("");
      setUserTypes(["PAYER"]);
      // redirect: prefer payer dashboard when user can be payer, otherwise recipient
      if (auth?.user?.userTypes?.includes("PAYER") || userTypes.includes("PAYER")) {
        router.push("/payer/dashboard");
      } else {
        router.push("/recipient/dashboard");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message ? String(err.message) : "Failed to sign up — try again.");
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
          <span className={styles.labelText}>Roles (you can select both)</span>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={userTypes.includes("PAYER")}
                onChange={() => toggleRole("PAYER")}
              />
              <span style={{ fontSize: 13 }}>Payer</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={userTypes.includes("RECIPIENT")}
                onChange={() => toggleRole("RECIPIENT")}
              />
              <span style={{ fontSize: 13 }}>Recipient</span>
            </label>
          </div>
        </label>

        {/* Wallet connect: replace manual input with connect flow */}
        <div
          className={styles.formLabel}
          style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
        >
          <div style={{ textAlign: "center" }}>
            <div className={styles.labelText}>Wallet</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
              <button
                type="button"
                onClick={connectWallet}
                className={styles.primary}
                style={{ padding: "8px 12px" }}
              >
                {walletAddress ? "Connected" : "Connect wallet"}
              </button>
              <div style={{ fontSize: 13, color: "var(--muted, #6b7280)", minWidth: 140 }}>
                {walletAddress ? short(walletAddress) : "No wallet connected"}
              </div>
            </div>
          </div>
        </div>

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