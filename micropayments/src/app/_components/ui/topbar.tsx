"use client";
import React, { useEffect, useState } from "react";
import styles from "@/app/_components/styling/topbar.module.css";
import { FiCalendar, FiBell, FiUser, FiSearch, FiSun, FiMoon } from "react-icons/fi";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function Topbar({ title = "Dashboard", subtitle, actions }: Props): React.ReactElement {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("search:", e.target.value);
  };

  // theme handling (keeps theme consistent across pages/layouts)
  const STORAGE_KEY = "ll:theme";
  const getPreferred = (): "light" | "dark" => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored === "light" || stored === "dark") return stored;
      if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (e) { /* ignore */ }
    return "light";
  };

  // start with a safe default on the server and compute actual preference after mount
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // helper to apply theme everywhere and persist. Also set core CSS variables
  const applyTheme = (t: "light" | "dark") => {
    try {
      const html = document.documentElement;
      const body = document.body;

      // set attribute used by CSS modules (:global html[data-theme="dark"] ...)
      html.setAttribute("data-theme", t);
      if (body) body.setAttribute("data-theme", t);

      // set a simple class for any selectors relying on classes
      html.classList.remove("ll-theme-light", "ll-theme-dark");
      html.classList.add(t === "dark" ? "ll-theme-dark" : "ll-theme-light");

      // set a small set of core CSS variables inline to override module defaults immediately
      const varsDark: Record<string, string> = {
        "--bg": "#0b1220",
        "--card-bg": "#071018",
        "--text": "#e6f3f2",
        "--muted": "rgba(255,255,255,0.75)",
        "--sidebar-bg": "#041018",
        "--link-color": "#7fe3da",
        "--accent": "#0ea5a4"
      };
      const varsLight: Record<string, string> = {
        "--bg": "#f8fafc",
        "--card-bg": "#fff",
        "--text": "#0f172a",
        "--muted": "#6b7280",
        "--sidebar-bg": "#ffffff",
        "--link-color": "#0ea5a4",
        "--accent": "#0ea5a4"
      };

      const selected = t === "dark" ? varsDark : varsLight;
      Object.entries(selected).forEach(([k, v]) => {
        html.style.setProperty(k, v);
        if (body) body.style.setProperty(k, v);
      });

      // update a meta color-scheme if present (helps form controls)
      const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
      if (meta) meta.content = t === "dark" ? "dark light" : "light dark";

      // persist (this will also notify other tabs)
      localStorage.setItem(STORAGE_KEY, t);
    } catch (e) {
      /* noop */
    }
  };

  // on mount, determine preferred theme and apply it. Also subscribe to cross-component/tab updates.
  useEffect(() => {
    setMounted(true);
    const preferred = getPreferred();
    applyTheme(preferred);
    setTheme(preferred);

    // storage event sync (other tabs)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY && (ev.newValue === "light" || ev.newValue === "dark")) {
        const v = ev.newValue as "light" | "dark";
        setTheme(v);
        applyTheme(v);
      }
    };

    // custom event sync (same tab components)
    const onCustom = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail;
      const v = detail?.theme ?? detail;
      if (v === "light" || v === "dark") {
        setTheme(v);
        applyTheme(v);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("ll:theme-changed", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ll:theme-changed", onCustom as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // expose a keyboard-accessible toggle button and broadcast changes
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    // notify other components in the same tab
    try {
      window.dispatchEvent(new CustomEvent("ll:theme-changed", { detail: { theme: next } }));
    } catch (e) { /* noop */ }
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

        <button
          className={styles.iconBtn}
          aria-label={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
          title={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
          onClick={toggleTheme}
          type="button"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          {/* only render the exact icon after mount to avoid hydration mismatch */}
          {mounted ? (theme === "dark" ? <FiSun /> : <FiMoon />) : null}
        </button>

        <button className={styles.profileBtn} aria-label="User profile" type="button">
          <FiUser />
        </button>
        <div className={styles.actions}>{actions}</div>
      </div>
    </header>
  );
}