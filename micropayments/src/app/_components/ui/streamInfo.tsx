"use client"
import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/_components/styling/streamInfo.module.css";
import WithdrawButton from "@/app/_components/ui/withdrawButton";

type Props = {
  company?: string;
  initialAmount?: number;
  ratePerSec?: number; // amount increase per second (mock)
  currency?: string;
};

export default function StreamInfo({
  company = "Acme Corp",
  initialAmount = 0,
  ratePerSec = 0.5,
  currency = "USD",
}: Props) {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [seconds, setSeconds] = useState<number>(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const t = setInterval(() => {
      if (!mounted.current) return;
      setAmount((a) => +(a + ratePerSec).toFixed(2));
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [ratePerSec]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className={styles.container} role="region" aria-label="stream info">
      <div className={styles.grid}>
        <div className={styles.item}>
          <div className={styles.label}>Amount</div>
          <div className={styles.value}>{currency} {amount.toFixed(2)}</div>
        </div>

        <div className={styles.item}>
          <div className={styles.label}>Payer</div>
          <div className={styles.value}>{company}</div>
        </div>

        <div className={styles.item}>
          <div className={styles.label}>Duration</div>
          <div className={styles.value}>{fmtTime(seconds)}</div>
        </div>

        <div className={styles.item}>
          <div className={styles.label}>Rate/s</div>
          <div className={styles.value}>{ratePerSec.toFixed(2)}</div>
        </div>
      </div>

      <div className={styles.actions}>
        <WithdrawButton />
      </div>
    </div>
  );
}
