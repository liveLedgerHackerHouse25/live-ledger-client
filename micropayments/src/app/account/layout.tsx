"use client";
import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import styles from "@/app/_components/styling/mainContent.module.css";
import Sidebar from "../_components/ui/sidebar";
import Topbar from "../_components/ui/topbar";
import { receipientLinks } from "../recipient/dashboard/layout";
import { payerLinks } from "../payer/dashboard/layout";
import { api } from "@/lib/api";

interface Props {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: Props) {
  const [links, setLinks] = useState(payerLinks);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me: any = await api.get("/auth/me");
        const user = me?.data?.user ?? me?.user ?? me;
        const userType = user?.userType ?? user?.role ?? user?.roles ?? null;
        if (!mounted) return;

        if (userType === "PAYER") {
          setLinks(payerLinks);
        } else if (userType === "RECIPIENT") {
          setLinks(receipientLinks);
        } else {
          // default to payerLinks if unknown
          setLinks(payerLinks);
        }
      } catch (err) {
        console.error("AccountLayout: failed to determine user type", err);
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
          <Topbar title="Account" subtitle="Manage your profile" />
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
