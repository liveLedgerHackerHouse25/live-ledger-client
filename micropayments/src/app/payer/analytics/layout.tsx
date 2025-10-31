"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import styles from "@/app/_components/styling/mainContent.module.css";
import Sidebar from "@/app/_components/ui/sidebar"
import Topbar from "@/app/_components/ui/topbar"
import { payerLinks } from "@/app/payer/dashboard/layout"

interface Props {
  children: React.ReactNode;
}

export default function AnalyticsLayout({ children }: Props) {


  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar links={payerLinks} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Topbar title="Analytics" subtitle="View Stats" />
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}