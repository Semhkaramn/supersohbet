import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import TelegramConnectionModal from "@/components/TelegramConnectionModal";
import VisitTracker from "@/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SüperSohbet Bot - Ödül Merkezi",
  description: "Puan kazan, rütbe atla, ödüller kazan!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen text-white`}
      >
        <AuthProvider>
          <VisitTracker />
          {children}
          <LoginModal />
          <RegisterModal />
          <TelegramConnectionModal />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
