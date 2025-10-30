"use client"
import React, { useState } from "react";
import Sidebar from "@/app/_components/ui/sidebar"
import Topbar from "@/app/_components/ui/topbar"
import WalletAside from "@/app/_components/ui/walletAside";
import mainStyles from "@/app/_components/styling/mainContent.module.css"
import PayerStreamForm from "@/app/_components/ui/payerStreamForm";
import StreamReceipt from "@/app/_components/ui/streamReceipt";
import type { StreamPayload } from "@/app/_components/ui/payerStreamForm";
import ProtectedRoute from "@/components/ProtectedRoute";

const payerLinks = [
    { label: "Dashboard", href: "/payer/dashboard" },
    { label: "Statistics", href: "/statistics" },
    { label: "Wallet", href: "/wallet" },
    { label: "Account", href: "/"},
    { label: "Settings", href: "/"}
];

export default function DashboardLayout({children} : {
    children: React.ReactNode
}) {
    // Keep an array of streams so new streams don't replace old ones
    const [streams, setStreams] = useState<StreamPayload[]>([]);
    const [showForm, setShowForm] = useState(false);

    return (
      <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar links={payerLinks}/>
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Topbar title="Payer Dashboard" subtitle="Welcome back" />
          {/* themed content area below the Topbar */}
          <div className={mainStyles.content}>
            {/* center and constrain the top row to reduce overall width */}
            <div
              className={mainStyles.topRow}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                margin: "0 auto 16px",
                maxWidth: 980,           // reduced overall width
                width: "100%",
                padding: "0 12px",
              }}
            >
              <div style={{ flex: "1 1 520px" }}>
                {!showForm ? (
                  <div style={{ padding: 16, borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                    <h3 style={{ margin: 0, color: "#055F59" }}>Create a payment stream</h3>
                    <p style={{ marginTop: 8, color: "rgba(230,238,240,0.8)" }}>Start a new streaming payment to a recipient.</p>
                    <div style={{ marginTop: 12 }}>
                      <button style={{ 
                        borderRadius: 8,
                        backgroundColor: "#055F59",
                        color: "#ffffff",
                        padding: 8
                        }} onClick={() => setShowForm(true)}>Start stream</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <PayerStreamForm onCreate={(s) => { setStreams(prev => [s, ...prev]); setShowForm(false); }} />
                    <div style={{ marginTop: 8 }}>
                      <button className="ghost" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                  </>
                )}
              </div>

              {/* receipts column: display multiple streams stacked, scroll if too many */}
              <div style={{ width: 360, maxHeight: 480, overflow: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {streams.length === 0 ? (
                    <div style={{ color: "rgba(230,238,240,0.6)" }}>No streams yet</div>
                  ) : (
                    streams.map((s) => <StreamReceipt key={s.id} stream={s} />)
                  )}
                </div>
              </div>
            </div>

            <div className={mainStyles.children}>
              {children}
            </div>
          </div>
          <WalletAside />
        </main>
      </div>
      </ProtectedRoute>
    )
}