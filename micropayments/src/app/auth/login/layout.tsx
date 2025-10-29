import React from "react";
import Navbar from "@/app/_components/ui/navbar";
import Footer from "@/app/_components/ui/footer";
import styles from "@/app/_components/styling/home.module.css";

export default function AuthLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        {/* center the auth content using existing home styles */}
        <section className={styles.authWrap ?? styles.writeup} aria-labelledby="login-heading">
          {children}
        </section>
      </main>
      <Footer />
    </div>
  );
}
