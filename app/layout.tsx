import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/data";
import Navbar from "./components/Navbar";
import ContactFloat from "./components/ContactFloat";
import FlashMessageBanner from "./components/FlashMessageBanner";
import AuthGate from "./components/AuthGate";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小太羊国际物流 | 东南亚跨境物流专家",
  description:
    "专注台湾、泰国、柬埔寨、马来西亚、印尼集运服务，专业国际物流平台。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();
  const whatsappLink = siteSettings.whatsapp_link?.trim() || undefined;

  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <AuthGate>
              <FlashMessageBanner />
              <Navbar />
              {children}
              <ContactFloat whatsappLink={whatsappLink} />
            </AuthGate>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
