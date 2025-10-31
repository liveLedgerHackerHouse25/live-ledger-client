"use client"
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/app/_components/ui/sidebar";
import Topbar from "@/app/_components/ui/topbar";
// import StreamInfo from "@/app/_components/ui/streamInfo";
import WalletAside from "@/app/_components/ui/walletAside";
import mainStyles from "@/app/_components/styling/mainContent.receipient.module.css";
import ProtectedRoute from "@/components/ProtectedRoute";

export const recipientLinks = [
    { label: "Dashboard", href: "/recipient/dashboard" },
    { label: "Analytics", href: "/recipient/analytics" },
    { label: "Wallet", href: "/wallet" },
    { label: "Account", href: "/recipient/account"},
    { label: "Settings", href: "/"}
];

export default function DashboardLayout({children} : {
    children: React.ReactNode
}) {
        const [userName, setUserName] = useState<string | null>(null);

        useEffect(() => {
            let mounted = true;
            (async () => {
                try {
                    // Try known profile endpoints (support multiple backends)
                    let res: any = null;
                    try {
                        res = await api.get('/users/profile');
                    } catch (e) {
                        // ignore and try fallback
                        console.debug('[recipient layout] /users/profile failed, trying /auth/me', e);
                    }

                    if (!res) {
                        try {
                            res = await api.get('/auth/me');
                        } catch (e) {
                            console.debug('[recipient layout] /auth/me failed', e);
                        }
                    }

                    const user = res?.data?.user ?? res?.user ?? res;
                    if (!mounted) return;
                    const name = user?.name ?? user?.user?.name ?? user?.data?.user?.name ?? null;
                    setUserName(name ?? null);
                } catch (err) {
                    console.debug('[recipient layout] could not load profile', err);
                }
            })();

            return () => { mounted = false; };
        }, []);

        return (
                <ProtectedRoute>
                <div style={{ display: "flex", minHeight: "100vh" }}>
                        <Sidebar links={recipientLinks}/>
                                <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                     <Topbar title="Recipient Dashboard" subtitle={userName ? `Welcome back, ${userName}` : "Welcome back"} />
                                     <div className={mainStyles.content}>
                                            {/*<div className={mainStyles.topRow}>
                                                 <StreamInfo />
                                            </div>*/}
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