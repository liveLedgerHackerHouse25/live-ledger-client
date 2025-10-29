"use client"
import React from "react";
import styles from "@/app/_components/styling/home.module.css";

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
          <span className={styles.brandMark}>LIVE</span>
          <span className={styles.brandName}>LEDGER</span>
        </div>

        <div className={styles.navLinks}>
          <a href="#contact" onClick={scrollToContact} className={styles.link}>Contact</a>
          <button className={styles.linkBtn}>Sign up</button>
          <button className={styles.linkBtnAlt}>Log in</button>
        </div>
      </div>
    </nav>
  );
}
