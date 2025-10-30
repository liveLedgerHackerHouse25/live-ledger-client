"use client"
import React from "react";
import type { StreamPayload } from "./payerStreamForm";

export default function StreamReceipt({ stream }: { stream: StreamPayload }) {
  if (!stream) return null;

  const json = JSON.stringify(stream, null, 2);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      // silent UX: could show toast; keep simple
    } catch {
      // ignore
    }
  };

  const onDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stream.id}-receipt.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)", width: "100%" }}>
      <h4 style={{ margin: "0 0 8px 0", color: "#13C4A9" }}>Stream receipt</h4>
      <div style={{ fontSize: 13, color: "var(--muted, #cbd5e1)", marginBottom: 8 }}>
        ID: <strong style={{ color: "#e6eef0" }}>{stream.id}</strong>
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Recipient</dt>
          <dd style={{ margin: 0, color: "#e6eef0", fontSize: 11, fontFamily: "monospace" }}>
            {stream.recipient.length > 20 ? `${stream.recipient.slice(0, 8)}...${stream.recipient.slice(-6)}` : stream.recipient}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Amount</dt>
          <dd style={{ margin: 0, color: "#e6eef0" }}>{stream.amount} USDC</dd>
        </div>
        <div>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Rate (per sec)</dt>
          <dd style={{ margin: 0, color: "#e6eef0" }}>{stream.rate} USDC</dd>
        </div>
        <div>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Duration</dt>
          <dd style={{ margin: 0, color: "#e6eef0" }}>{stream.durationSeconds}s</dd>
        </div>
      </dl>

      {/* Transaction info */}
      {stream.txHash && (
        <div style={{ marginBottom: 8 }}>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Transaction</dt>
          <dd style={{ margin: 0, color: "#e6eef0", fontSize: 11, fontFamily: "monospace" }}>
            <a 
              href={`https://sepolia.arbiscan.io/tx/${stream.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#13C4A9", textDecoration: "none" }}
            >
              {stream.txHash.slice(0, 8)}...{stream.txHash.slice(-6)}
            </a>
          </dd>
        </div>
      )}

      {/* Stream status */}
      {stream.status && (
        <div style={{ marginBottom: 8 }}>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Status</dt>
          <dd style={{ margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ 
              fontSize: 8, 
              color: stream.status === 'confirmed' ? '#4caf50' : stream.status === 'pending' ? '#ff9800' : '#f44336' 
            }}>
              ●
            </span>
            <span style={{ 
              color: "#e6eef0", 
              textTransform: "capitalize",
              fontSize: 12
            }}>
              {stream.status}
            </span>
            {stream.streamId && (
              <span style={{ fontSize: 11, color: "#9aa7bf", marginLeft: 8 }}>
                (Stream #{stream.streamId})
              </span>
            )}
          </dd>
        </div>
      )}

      {stream.receiptNote && (
        <div style={{ marginBottom: 8 }}>
          <dt style={{ fontSize: 12, color: "#9aa7bf" }}>Note</dt>
          <div style={{ color: "#e6eef0" }}>{stream.receiptNote}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="primary" onClick={onCopy}>Copy</button>
        <button className="ghost" onClick={onDownload}>Download</button>
      </div>
    </div>
  );
}
