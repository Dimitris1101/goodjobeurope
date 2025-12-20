import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import AutoTranslate from "@/components/AutoTranslate.dynamic";
import UiLanguageProvider from "@/components/UiLanguageProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GOODJOBEUROPE",
  description: "Job matching platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="theme-color" content="#111111" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/Icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UiLanguageProvider>
          {/* Global auto-translate πάνω από όλο το UI */}
          <AutoTranslate />
          <ClientShell>{children}</ClientShell>
        </UiLanguageProvider>
      </body>
    </html>
  );
}
