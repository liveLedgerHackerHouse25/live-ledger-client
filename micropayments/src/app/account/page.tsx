"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/_components/styling/mainContent.module.css";
import { useWallet } from "@/contexts/Web3Context";
import { api } from "@/lib/api";

export default function AccountPage(): React.ReactElement {
  const router = useRouter();
  const { account, connectWallet, disconnectWallet, isConnected } = useWallet();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // best-effort update; backend path may vary - keep safe error handling
      await api.put("/users/me", { name, email });
      setMessage("Profile updated");
    } catch (err) {
      console.error("Failed to update profile:", err);
      setMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      api.clearTokens();
    } catch (e) {
      console.warn("Failed clearing tokens:", e);
    }
    try {
      disconnectWallet?.();
    } catch {}
    router.push("/auth/login");
  };

  // load profile on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await api.get("/auth/me");
        const u = res?.data?.user ?? res?.user ?? res;
        if (!mounted) return;
        setName(u?.name ?? "");
        setEmail(u?.email ?? "");
      } catch (err) {
        console.warn("AccountPage: failed to load profile", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px 16px 20px" }}>
        <h1 style={{ margin: 0, color: "var(--primary)" }}>Account</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (!isConnected) connectWallet?.();
            }}
            style={{
              backgroundColor: isConnected ? "var(--card-bg)" : "var(--primary)",
              color: isConnected ? "var(--text)" : "var(--button-text)",
              border: "1px solid var(--card-border)",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            {isConnected ? "Wallet Connected" : "Link Wallet"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "transparent",
              color: "var(--danger, #d04545)",
              border: "1px solid var(--card-border)",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "8px 20px 40px 20px" }}>
        <div style={{ backgroundColor: "var(--card-bg)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border)" }}>
          <h3 style={{ marginTop: 0, color: "var(--text)" }}>Profile</h3>

          {loading ? (
            <p style={{ color: "var(--muted)" }}>Loading profile...</p>
          ) : (
            <>
              <label style={{ display: "block", marginBottom: 8, color: "var(--muted)" }}>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  style={{ width: "100%", marginTop: 6, padding: 8, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: 8, color: "var(--muted)" }}>
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  style={{ width: "100%", marginTop: 6, padding: 8, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text)" }}
                />
              </label>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--button-text)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "none",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => {
                    // reload server data
                    setLoading(true);
                    api.get("/auth/me").then((res: any) => {
                      const u = res?.data?.user ?? res?.user ?? res;
                      setName(u?.name ?? "");
                      setEmail(u?.email ?? "");
                    }).catch(() => {}).finally(() => setLoading(false));
                  }}
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--card-border)",
                  }}
                >
                  Reload
                </button>
              </div>

              {message && (
                <div style={{ marginTop: 12, color: "var(--muted)" }}>{message}</div>
              )}
            </>
          )}
        </div>

        <div style={{ height: 16 }} />

        <div style={{ backgroundColor: "var(--card-bg)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border)" }}>
          <h3 style={{ marginTop: 0, color: "var(--text)" }}>Wallet</h3>
          <div style={{ fontFamily: "monospace", color: "var(--text)", marginBottom: 12 }}>{account ?? "No wallet linked"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => connectWallet?.()}
              style={{ backgroundColor: "var(--primary)", color: "var(--button-text)", padding: "8px 12px", borderRadius: 8, border: "none" }}
            >
              {account ? "Switch/Link Wallet" : "Connect Wallet"}
            </button>

            <button
              onClick={() => { try { disconnectWallet?.(); } catch {} }}
              style={{ backgroundColor: "transparent", color: "var(--text)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--card-border)" }}
            >
              Unlink
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
