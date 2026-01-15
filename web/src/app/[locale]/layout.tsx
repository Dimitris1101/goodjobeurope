// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import ClientShell from "@/components/ClientShell";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

// messages
import elCommon from "@/i18n/el/common";
import elAuth from "@/i18n/el/auth";
import enCommon from "@/i18n/en/common";
import enAuth from "@/i18n/en/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobMatch",
  description: "Job matching platform",
};

const messagesMap = {
  en: { common: enCommon, auth: enAuth },
  el: { common: elCommon, auth: elAuth },
} as const;

type Locale = keyof typeof messagesMap; // "en" | "el"

function isLocale(x: string): x is Locale {
  return x === "en" || x === "el";
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  // Next 15: params είναι Promise, αλλά locale έρχεται ως string
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesMap[locale];

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientShell>{children}</ClientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

