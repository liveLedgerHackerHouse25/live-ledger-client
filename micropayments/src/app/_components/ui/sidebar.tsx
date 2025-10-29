"use client"
import React, { useState } from "react";
import styles from "@/app/_components/styling/sidebar.module.css"
import Link from 'next/link';
import Image from "next/image"; // added
import { FiGrid, FiUser, FiSettings, FiCircle, FiBarChart2 } from "react-icons/fi";
import { Wallet } from "phosphor-react"; // wallet icon from phosphor-react

type SidebarProps = {
  links?: { label: string; href: string }[];
};

export default function Sidebar({ links = [] }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  const getIcon = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("dash") || key.includes("home")) return <FiGrid />;
    if (key.includes("account") || key.includes("acct") || key.includes("profile") || key.includes("user")) return <FiUser />;
    if (key.includes("setting") || key.includes("prefs")) return <FiSettings />;
    if (key.includes("stat") || key.includes("analytics") || key.includes("report")) return <FiBarChart2 />; // statistics
    if (key.includes("wallet")) return <Wallet size={18} weight="regular" />; // wallet icon (phosphor)
    return <FiCircle />;
  };

  const handleLinkClick = (e: React.MouseEvent, label: string) => {
    const key = label.toLowerCase();
    if (key.includes("wallet")) {
      e.preventDefault();
      try {
        window.dispatchEvent(new CustomEvent("openWallet"));
      } catch (err) {
        // ignore in non-browser env
      }
      setOpen(false);
    } else {
      // normal behavior: close sidebar on navigation
      setOpen(false);
    }
  };

  return (
    <aside className={`${styles.sidebarcontainer} ${open ? styles.open : styles.closed}`}>
      {/* logo area: show image; text hidden when collapsed */}
      <div className={styles.logo}>
        <div className={styles.logoIcon} aria-hidden="true">
          <Image src="/logo.png" alt="LiveLedger logo" width={300} height={36} className={styles.logoImg} />
        </div>
      </div>

      <button
        type="button"
        className={styles.toggleButton}
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Close sidebar" : "Open sidebar"}
      >
        <span className={styles.toggleIcon} aria-hidden="true">{open ? "«" : "☰"}</span>
        <span className={`${styles.toggleLabel} ${open ? "" : styles.hiddenLabel}`}>
          {open ? "Close" : ""}
        </span>
      </button>

      <ul className={styles.navList}>
        {links.map((link, idx) => (
          <li key={`${link.href}-${idx}`} className={styles.navItem}>
            <Link href={link.href} className={styles.link} onClick={(e) => handleLinkClick(e as any, link.label)}>
              <span className={styles.icon} aria-hidden="true">{getIcon(link.label)}</span>
              <span className={`${styles.linkLabel} ${open ? "" : styles.collapsedLabel}`}>
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
