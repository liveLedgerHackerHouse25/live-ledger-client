"use client"
import React from "react";
import Sidebar from "@/app/_components/ui/sidebar";
import Topbar from "@/app/_components/ui/topbar";
import StreamInfo from "@/app/_components/ui/streamInfo";
import WalletAside from "@/app/_components/ui/walletAside";
import mainStyles from "@/app/_components/styling/mainContent.receipient.module.css";

const receipientLinks = [
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
            <Sidebar links={receipientLinks}/>
                <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                   <Topbar title="Receipient Dashboard" subtitle="Welcome back" />
                   <div className={mainStyles.content}>
                      <div className={mainStyles.topRow}>
                         <StreamInfo />
                      </div>
                      <div className={mainStyles.children}>
                         {children}
                      </div>
                   </div>
                  <WalletAside />
              </main>
        </div>
    )
}