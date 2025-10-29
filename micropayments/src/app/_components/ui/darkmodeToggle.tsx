"use client"
import React, { useEffect, useState } from "react";
import styles from "@/app/_components/styling/darkmodeToggle.module.css";
import { FiSun, FiMoon } from "react-icons/fi";

export default function DarkModeToggle(): React.ReactElement {
  // don't read window/localStorage during initial render
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // read stored preference / system preference only on client after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    } catch (e) {
      setTheme("light");
    } finally {
      setMounted(true);
    }
  }, []);

  // update document attribute & localStorage only after mount / when theme changes
  useEffect(() => {
    if (!mounted) return;
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore
    }
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const aria = mounted
    ? theme === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle color scheme";

  const title = mounted ? (theme === "dark" ? "Light mode" : "Dark mode") : "Toggle theme";

  // render neutral icon until mounted to avoid hydration mismatch
  const Icon = mounted ? (theme === "dark" ? FiSun : FiMoon) : FiMoon;
  const IconEl = <Icon className={styles.icon} />;

  return (
    <button
      type="button"
      aria-label={aria}
      title={title}
      className={styles.toggle}
      onClick={toggle}
    >
      {IconEl}
    </button>
  );
}
