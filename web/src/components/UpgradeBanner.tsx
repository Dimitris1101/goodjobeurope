"use client";

import Link from "next/link";
import type { PlanName } from "@/types/plan";

type Props = {
  planLabel: PlanName | string;
  subtitle?: string;
  primaryHref: string;
};

export default function UpgradeBanner({
  planLabel,
  subtitle = "Go ad-free, get higher visibility, and connect faster with the right people.",
  primaryHref,
}: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-[18px]">
      {/* TOP: hero */}
      <div
        className="relative w-full"
        style={{
          minHeight: 300,
          backgroundImage: "url(/ad.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />

        {/* ad1 image (desktop: a bit lower + more right, mobile: bottom) */}
        <img
          src="/ad1.png"
          alt="ad corner"
          className="
            absolute z-[2] h-auto rounded-2xl shadow-2xl
            w-[140px] sm:w-[160px]
            right-3 top-6
            md:right-2 md:top-10
            lg:right-0 lg:top-14
            max-sm:top-auto max-sm:right-3 max-sm:bottom-3
          "
        />

        <div className="relative z-[2] flex max-w-[700px] flex-col gap-3 p-6 sm:p-8">
          {/* Title */}
          <div
            className="text-white/95 text-[18px] sm:text-[20px] font-semibold tracking-wide"
            style={{
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
          >
            This is an advertisment !
          </div>

          {/* Plan line */}
          <div className="text-white/95 text-[16px] sm:text-[18px]">
            You&apos;re currently on{" "}
            <b className="text-emerald-400">{planLabel}</b>
          </div>

          {/* Subtitle */}
          <div className="text-white text-[16px] sm:text-[18px] leading-relaxed">
            {subtitle}
          </div>

          {/* Centered button */}
          <div className="mt-4 flex w-full justify-start md:justify-center">
            <Link
              href={primaryHref}
              className="
                inline-flex items-center justify-center
                rounded-xl px-6 py-3
                font-bold no-underline
                bg-white text-zinc-900
                shadow-2xl hover:opacity-95
              "
            >
              Upgrade plan
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM: 3-column strip like your screenshot */}
      <div className="w-full bg-black/95">
        <div className="mx-auto max-w-[980px] px-5 py-2 sm:px-8 sm:py-3">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            {/* ABOUT US */}
            <div>
              <div className="text-white font-semibold tracking-wider">
                ABOUT US.
              </div>
              <div className="mt-1 h-[2px] w-20 bg-amber-300/90" />
              <p className="mt-2 text-white/80 text-[13px] leading-relaxed">
                GooJobEurope is a jobmatching platform that helps candidates
                find job across the Europe
              </p>
            </div>

            {/* HOW IT WORKS */}
            <div>
              <div className="text-white font-semibold tracking-wider">
                HOW IT WORKS
              </div>
              <div className="mt-1 h-[2px] w-20 bg-amber-300/90" />
              <p className="mt-2 text-white/80 text-[13px] leading-relaxed">
                Companies publish job advertisements. Employees state the
                locations they desire and the field of employment and find the
                advertisements.
              </p>
            </div>

            {/* CONTACT US */}
            <div>
              <div className="text-white font-semibold tracking-wider">
                CONTACT US
              </div>
              <div className="mt-1 h-[2px] w-20 bg-amber-300/90" />
              <p className="mt-2 text-white/80 text-[13px] leading-relaxed">
                For more information or clarifications, we are at your disposal.
                Contact us at{" "}
                <a
                  href="mailto:goodjobeurope25@gmail.com"
                  className="text-white underline underline-offset-4"
                >
                  goodjobeurope25@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

