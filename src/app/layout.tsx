import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/session-provider";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansDevanagari = Noto_Sans_Devanagari({
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
});

export const metadata: Metadata = {
  title: "SaralGati — Elderly Accessibility Companion",
  description: "Empowering Elders, Supporting Families with AI-powered screen guidance, real-time alerts, and habit learning.",
  keywords: ["Elderly care", "Accessibility", "Indian families", "Senior companion", "AI assistance"],
  openGraph: {
    title: "SaralGati — Elderly Accessibility Companion",
    description: "Empowering Elders, Supporting Families",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://saralgati.example.com",
    siteName: "SaralGati",
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  manifest: "/manifest.json",
  verification: {
    google: "dzEaDDFxL3oKEeOZkQJfq_g51jRyDFwH_Ou2XGkx_0Q",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${notoSansDevanagari.variable} font-sans overflow-x-hidden`}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}
