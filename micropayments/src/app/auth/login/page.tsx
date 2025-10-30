"use client";

import React, { useState } from "react";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: replace with real auth call
      console.log("Login attempt", { email, password });
      await new Promise((r) => setTimeout(r, 600));
      // redirect or show success
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
          <span className={styles.labelText}>Password</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
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
