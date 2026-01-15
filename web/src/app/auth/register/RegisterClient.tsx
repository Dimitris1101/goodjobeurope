"use client";

import Header from "@/components/Header";
import FancyAuthShell from "@/components/FancyAuthShell";

export default function Page() {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-64px)] bg-[#ecf0f3] flex items-center justify-center px-4 py-10">
        <FancyAuthShell defaultSide="signup" />
      </main>
    </>
  );
}
