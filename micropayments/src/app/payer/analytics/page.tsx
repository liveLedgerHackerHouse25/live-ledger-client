"use client";
import React, { useEffect, useState } from "react";
import styles from "@/app/_components/styling/mainContent.module.css";
import { api } from "@/lib/api";
import { useWallet } from "@/contexts/Web3Context";

export default function PayerAnalyticsPage(): React.ReactElement {
  const { isConnected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<{ activeStreams?: number; totalVolume?: string; dailyVolume?: string; withdrawalStats?: any }>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Require authenticated user for analytics
        let me: any = null;
        try {
          me = await api.get('/auth/me');
        } catch (e) {
          console.debug('[payer analytics] /auth/me failed', e);
        }

        if (!mounted) return;
        const mountedUser = me?.data?.user ?? me?.user ?? me ?? null;
        setUser(mountedUser);

        if (!mountedUser) {
          if (mounted) {
            setError('Authentication required to view analytics. Please log in.');
            setLoading(false);
          }
          return;
        }

        const res: any = await api.getActiveStreamsAnalytics();
        const payload = res?.data ?? res ?? {};
        if (!mounted) return;
        setData({
          activeStreams: typeof payload.activeStreams === 'number' ? payload.activeStreams : Number(payload.activeStreams) || 0,
          totalVolume: String(payload.totalVolume ?? payload.volume ?? '0'),
          dailyVolume: String(payload.dailyVolume ?? payload.today ?? '0'),
          withdrawalStats: payload.withdrawalStats ?? payload.stats ?? {}
        });
      } catch (err: any) {
        console.error('[payer analytics] failed to load analytics:', err);
        if (mounted) setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [isConnected]);

  return (
    <div className={styles.content}>
      <div style={{ padding: '1.5rem', maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ margin: 0, color: 'var(--text)' }}>Analytics — Payer</h1>
        <p style={{ color: 'var(--muted)' }}>Payer-specific analytics</p>

        {loading ? (
          <div style={{ marginTop: 24, padding: 20, background: 'var(--card-bg)', borderRadius: 12 }}>
            Loading analytics...
          </div>
        ) : error ? (
          <div style={{ marginTop: 24, padding: 20, background: '#fff4f4', borderRadius: 12, color: '#b91c1c' }}>
            Error loading analytics: {error}
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(5,95,89,0.05), rgba(5,95,89,0.02))', border: '1px solid rgba(5,95,89,0.12)' }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>Active Streams</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{data.activeStreams ?? 0}</div>
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.02))', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>Total Volume</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>${data.totalVolume ?? '0'}</div>
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>Daily Volume</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>${data.dailyVolume ?? '0'}</div>
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>Withdrawal Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Withdrawals</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{String(data.withdrawalStats?.totalWithdrawals ?? 0)}</div>
                </div>

                {/* Payer view: show Unique Recipients */}
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Unique Recipients</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{String(data.withdrawalStats?.uniqueRecipients ?? 0)}</div>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Avg Withdrawals / Recipient</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{String(data.withdrawalStats?.averageWithdrawalsPerRecipient ?? 0)}</div>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Daily Limit Hits</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{String(data.withdrawalStats?.dailyLimitHits ?? 0)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

}
