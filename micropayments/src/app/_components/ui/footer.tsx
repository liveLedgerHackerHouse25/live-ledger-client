"use client"
import React from "react";
import styles from "@/app/_components/styling/home.module.css";

export default function Footer(): React.ReactElement {
  return (
    <footer className={styles.footer} id="contact" aria-label="Contact section">
      <div className={styles.footerInner}>
        <div className={styles.footerLeft}>
          <h3 className={styles.footerTitle}>Contact LIVE LEDGER</h3>
          <p className={styles.footerText}>Email: support@liveledger.example</p>
        </div>
        <div className={styles.footerRight}>
          <form className={styles.contactForm} onSubmit={(e) => e.preventDefault()}>
            <input className={styles.input} placeholder="Your email" />
            <textarea className={styles.textarea} placeholder="Message" />
            <button className={styles.primary}>Send</button>
          </form>
        </div>
      </div>
      <div className={styles.copy}>© {new Date().getFullYear()} Live Ledger</div>
    </footer>
  );
}
