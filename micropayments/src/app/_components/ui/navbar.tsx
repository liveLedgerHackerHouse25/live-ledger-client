"use client"
import React from "react";
import styles from "@/app/_components/styling/home.module.css";
import Link from "next/link";

export default function Navbar(): React.ReactElement {
  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandMark}>LIVE</Link>
          <Link href="/" className={styles.brandName}>LEDGER</Link>
        </div>

        <div className={styles.navLinks}>
          <a href="#contact" onClick={scrollToContact} className={styles.link}>Contact</a>
          <button className={styles.linkBtn}>Sign up</button>
          <Link href="/auth/login" className={styles.linkBtnAlt}>Log in</Link>
        </div>
      </div>
    </nav>
  );
}
