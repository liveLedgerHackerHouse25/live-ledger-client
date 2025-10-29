"use client"
import React from "react";
import Sidebar from "@/app/_components/ui/sidebar"
import Topbar from "@/app/_components/ui/topbar"
import WalletAside from "@/app/_components/ui/walletAside";
import mainStyles from "@/app/_components/styling/mainContent.module.css"

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
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar links={payerLinks}/>
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Topbar title="Payer Dashboard" subtitle="Welcome back" />
          {/* themed content area below the Topbar */}
          <div className={mainStyles.content}>
            <div className={mainStyles.children}>
              {children}
            </div>
          </div>
          <WalletAside />
        </main>
      </div>
    )
}