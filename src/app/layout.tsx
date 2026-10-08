import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/session-provider";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { Toaster } from "sonner";
import { headers } from 'next/headers';
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
  verification: {
    google: "dzEaDDFxL3oKEeOZkQJfq_g51jRyDFwH_Ou2XGkx_0Q",
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;

  return (
    <html lang="en" nonce={nonce}>
      <body className={`${inter.variable} font-sans overflow-x-hidden`} nonce={nonce}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
        <Script
          src="https://edge-agent-widget.shunopsai.workers.dev/widget.js"
          data-api-url="https://edge-agent-widget.shunopsai.workers.dev"
          data-title="SaralGati Care AI"
          data-welcome="Namaste! Main SaralGati Elder & Caregiver AI Assistant hoon. Main emergency alert check karne, smartphone screen guidance dene, dawai schedule ya online call scam verify karne me aapki madad kar sakta hoon. Kaise madad karoon?"
          data-chips='[{"label":"🚨 SOS & Health Check","prompt":"Check active elder emergency alerts and health vitals status"},{"label":"📱 Phone Guide (सरल)","prompt":"Mujhe smartphone screen aur buttons chalana simple Hindi me samjhao"},{"label":"💊 Dawai Reminder","prompt":"Elder daily medicine reminder aur care routine schedule dikhao"},{"label":"🛡️ Scam & Fraud Shield","prompt":"Check if a suspicious phone call, SMS, or banking alert is a fraud or scam"}]'
          strategy="afterInteractive"
          nonce={nonce}
        />
      </body>
    </html>
  );
}
