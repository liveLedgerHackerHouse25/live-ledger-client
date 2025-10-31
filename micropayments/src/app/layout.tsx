import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/contexts/Web3Context";
import { AuthProvider } from "@/contexts/AuthContext";
import WalletAside from "@/app/_components/ui/walletAside";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Ledger - Real-time Payment Streaming",
  description: "Gas-efficient payment streaming DApp with real-time balance updates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Web3Provider>
          <AuthProvider>
            {children}
            <WalletAside />
          </AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
