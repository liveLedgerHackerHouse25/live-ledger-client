import React from "react";
import Image from "next/image";
import Navbar from "@/app/_components/ui/navbar";
import Footer from "@/app/_components/ui/footer";
import styles from "@/app/_components/styling/home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        {/* HERO: centered demo video only */}
        <section className={styles.hero}>
          <div className={styles.videoPlaceholder} role="img" aria-label="Demo video placeholder">
            <div className={styles.playIcon}>▶</div>
            <div className={styles.videoLabel}>Demo video placeholder</div>
          </div>
        </section>

        {/* WRITEUP: brand, description and CTAs below the hero */}
        <section className={styles.writeup}>
          <h1 className={styles.title}>LIVE LEDGER</h1>
          <p className={styles.lead}>
            Live Ledger is a gas-efficient payment DApp that lets a payer set a payment
            rate over time, creating the illusion of real-time streaming payments. Recipients
            see their balance grow live on the dashboard and can withdraw accrued funds anytime,
            within a set daily limit.
          </p>
          <div className={styles.ctaRow}>
            <button className={styles.primary}>Sign up</button>
            <button className={styles.ghost}>Log in</button>
          </div>
        </section>

        {/* optional feature / info section (kept below) */}
        <section className={styles.features}>
          <div className={styles.feature}>
            <h3>Real-time streaming</h3>
            <p>Set a payment rate and watch funds accrue live for recipients.</p>
          </div>
          <div className={styles.feature}>
            <h3>Gas-efficient</h3>
            <p>Optimized DApp flows to reduce on-chain costs.</p>
          </div>
          <div className={styles.feature}>
            <h3>Withdraw anytime</h3>
            <p>Recipients can withdraw accrued funds within daily limits.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
