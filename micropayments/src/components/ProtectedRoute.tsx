"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWallet } from "@/contexts/Web3Context";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function ProtectedRoute({ children, redirectTo = "/auth/login" }: Props) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { isConnected } = useWallet();

  useEffect(() => {
    let mounted = true;

    const waitFor = (predicate: () => boolean, timeout = 5000) =>
      new Promise<boolean>((resolve) => {
        const interval = 100;
        let waited = 0;
        const t = setInterval(() => {
          if (predicate() || waited >= timeout) {
            clearInterval(t);
            resolve(Boolean(predicate()));
          }
          waited += interval;
        }, interval);
      });

    const check = async () => {
      try {
        console.debug("[ProtectedRoute] fetching /auth/me");
        const me = await api.get("/auth/me");
        console.debug("[ProtectedRoute] /auth/me result:", me);

        // 🧩 Fix: handle your actual response shape
        const user = me?.data?.user ?? me?.user ?? me;
        if (!mounted) return;

        if (!user || !(user.id || user._id || user.email)) {
          console.debug("[ProtectedRoute] no valid user, redirecting:", redirectTo);
          router.push(redirectTo);
          return;
        }

        setChecking(false);
      } catch (err) {
        console.error("[ProtectedRoute] auth check failed:", err);
        if (mounted) router.push(redirectTo);
      }
    };

    (async () => {
      try {
        await waitFor(() => !!api.token || isConnected, 5000);
        if (!mounted) return;
        await check();
      } catch (e) {
        console.error("[ProtectedRoute] unexpected error:", e);
        if (mounted) router.push(redirectTo);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, redirectTo, isConnected]);

  if (checking) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Checking authentication...
      </div>
    );
  }

  return <>{children}</>;
}
