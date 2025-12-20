"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LanguageToggle from "@/components/LanguageTranslateToggle";
import DesktopShortcutButton from "@/components/DesktopShortcutButton";

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* Top bar with Desktop Shortcut / PWA */}
      <div className="w-full bg-black text-white text-xs sm:text-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-center sm:justify-end px-4 py-1.5 sm:py-2">
          <DesktopShortcutButton />
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div
          className="
            mx-auto max-w-6xl px-4 
            py-2.5 md:py-3 
            flex flex-col gap-2
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          {/* Left: brand + logo */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Home"
          >
            {/* Brand text - hidden on very small screens to avoid overflow */}
            <span className="hidden sm:inline font-semibold text-base md:text-xl tracking-tight">
              GOODJOBEUROPE
            </span>

            {/* Logo - scales nicely on mobile */}
            <Image
              src="/logo.png"
              alt="GOODJOBEUROPE"
              width={200}
              height={80}
              className="h-8 w-auto sm:h-10"
              priority
            />
          </Link>

          {/* Right: desktop navigation */}
          <nav className="hidden md:flex items-center gap-3">
            <Link
              href="/#plans"
              className={`px-3 py-2 rounded-lg text-sm hover:bg-gray-50 ${
                isActive("/#plans") ? "underline" : ""
              }`}
            >
              Plans
            </Link>

            <LanguageToggle />

            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
            >
              Log In
            </Link>

            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </nav>

          {/* Right: mobile actions (full-width row, can wrap) */}
          <div
            className="
              flex md:hidden 
              items-center justify-end 
              gap-2 flex-wrap
            "
          >
            <LanguageToggle />

            <Link
              href="/auth/login"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-gray-50"
            >
              Log In
            </Link>

            <Link
              href="/auth/register"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
