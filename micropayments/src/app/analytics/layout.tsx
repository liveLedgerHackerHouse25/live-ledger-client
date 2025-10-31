"use client";
import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import styles from "@/app/_components/styling/mainContent.module.css";
import Sidebar from "../_components/ui/sidebar";
import Topbar from "../_components/ui/topbar";
import { recipientLinks } from "../recipient/dashboard/layout";
import { payerLinks } from "../payer/dashboard/layout";
import { api } from "@/lib/api";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export default function AnalyticsLayout({ children }: Props) {
  const pathname = usePathname?.() ?? "/";
  const [links, setLinks] = useState(() => {
    // default to links inferred from current pathname to avoid showing the wrong role briefly
  return pathname.includes("/recipient") ? recipientLinks : payerLinks;
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me: any = await api.get("/auth/me");
        const user = me?.data?.user ?? me?.user ?? me;
        const rawType = user?.userType ?? user?.role ?? user?.roles ?? user?.type ?? null;
        if (!mounted) return;

        const userTypeStr = String(rawType ?? "").toLowerCase();
        if (userTypeStr.includes("payer")) {
          setLinks(payerLinks);
        } else if (userTypeStr.includes("recipient") || userTypeStr.includes("receipient")) {
          // accept possible misspellings or different casing
          setLinks(recipientLinks);
        } else {
          // fallback to pathname if server didn't return a clear type
          setLinks(pathname.includes("/recipient") ? recipientLinks : payerLinks);
        }
      } catch (err) {
        console.error("AnalyticsLayout: failed to determine user type", err);
        if (mounted) setLinks(payerLinks);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar links={links} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Topbar title="Analytics" subtitle="View Stats" />
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}