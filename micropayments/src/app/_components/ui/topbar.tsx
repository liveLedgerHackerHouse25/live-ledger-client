"use client";
import React from "react";
import styles from "@/app/_components/styling/topbar.module.css";
import { FiCalendar, FiBell, FiUser, FiSearch } from "react-icons/fi";
import DarkModeToggle from "@/app/_components/ui/darkmodeToggle";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function Topbar({ title = "Dashboard", subtitle, actions }: Props): React.ReactElement {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("search:", e.target.value);
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      </div>

      <div className={styles.center}>
        <label className={styles.search}>
          <FiSearch className={styles.searchIcon} aria-hidden="true" />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search..."
            aria-label="Search"
            onChange={handleSearch}
          />
        </label>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Open calendar" type="button">
          <FiCalendar />
        </button>
        <button className={styles.iconBtn} aria-label="Notifications" type="button">
          <FiBell />
        </button>

        <DarkModeToggle />

        <button className={styles.profileBtn} aria-label="User profile" type="button">
          <FiUser />
        </button>
        <div className={styles.actions}>{actions}</div>
      </div>
    </header>
  );
}