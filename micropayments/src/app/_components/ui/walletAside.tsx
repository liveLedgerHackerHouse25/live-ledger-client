"use client"
import React, { useEffect, useState } from "react";
import styles from "@/app/_components/styling/walletAside.module.css";

export default function WalletAside(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number>(1234.56); // mock starting balance
  const [activity, setActivity] = useState([
    { id: 1, desc: "Received from Alice", amount: 25.0, time: "2m ago" },
    { id: 2, desc: "Sent to Bob", amount: -10.0, time: "12m ago" },
    { id: 3, desc: "Top-up", amount: 100.0, time: "1h ago" },
  ]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("openWallet", onOpen as EventListener);
    window.addEventListener("closeWallet", onClose as EventListener);
    return () => {
      window.removeEventListener("openWallet", onOpen as EventListener);
      window.removeEventListener("closeWallet", onClose as EventListener);
    };
  }, []);

  // mock: update balance slightly while open
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setBalance((b) => +(b + Math.random() * 0.5).toFixed(2)), 3000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const handleClose = () => setOpen(false);

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} />
      <aside className={styles.aside} role="dialog" aria-modal="true" aria-label="Wallet panel">
        <header className={styles.header}>
          <h2 className={styles.title}>Wallet</h2>
          <button aria-label="Close" className={styles.closeBtn} onClick={handleClose}>×</button>
        </header>

        <div className={styles.section}>
          <div className={styles.balanceLabel}>Amount in wallet</div>
          <div className={styles.balanceValue}>${balance.toFixed(2)}</div>
          <button className={styles.addBtn} type="button">+ Add new wallet & sign</button>
        </div>

        <div className={styles.ActivitySection}>
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          <ul className={styles.activityList}>
            {activity.map((a) => (
              <li key={a.id} className={styles.activityItem}>
                <div className={styles.activityDesc}>{a.desc}</div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityAmt}>{a.amount > 0 ? `+ $${a.amount.toFixed(2)}` : `- $${Math.abs(a.amount).toFixed(2)}`}</span>
                  <span className={styles.activityTime}>{a.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
