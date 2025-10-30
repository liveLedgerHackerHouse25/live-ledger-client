"use client"
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
    const check = async () => {
      try {
        // attempt to fetch current user; backend should return 401 or null when unauthenticated
        const me = await api.request("/auth/me");
        if (!mounted) return;

        // basic check: if me is falsy or missing an id redirect to login
        if (!me || me?.error || !(me.id || me._id || me.email)) {
          router.push(redirectTo);
          return;
        }
        setChecking(false);
      } catch (err) {
        if (mounted) {
          // network/unauthenticated -> redirect
          router.push(redirectTo);
        }
      }
    };

    // If wallet connection is required for auth, wait for isConnected to be true first.
    // Otherwise, still attempt check (useful when session cookie exists).
    if (isConnected || !isConnected) {
      check();
    }

    return () => {
      mounted = false;
    };
  }, [router, redirectTo, isConnected]);

  if (checking) {
    // minimal loading UI - replace with your app spinner if you have one
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Checking authentication...
      </div>
    );
  }

  return <>{children}</>;
}
