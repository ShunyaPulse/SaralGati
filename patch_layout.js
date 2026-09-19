const fs = require('fs');
const filepath = 'src/app/layout.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/session-provider";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { Toaster } from "sonner";`;

const replace = `import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/session-provider";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { Toaster } from "sonner";
import { headers } from 'next/headers';`;

code = code.replace(search, replace);

const search2 = `export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={\`\${inter.variable} \${notoSansDevanagari.variable} font-sans overflow-x-hidden\`}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}`;

const replace2 = `export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;

  return (
    <html lang="en">
      <body className={\`\${inter.variable} \${notoSansDevanagari.variable} font-sans overflow-x-hidden\`}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}`;

code = code.replace(search2, replace2);
fs.writeFileSync(filepath, code);
