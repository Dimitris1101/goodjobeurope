"use client";

// C:\job-matching\web\src\app\onboarding\plan\page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PlanName } from "@/types/plan";

type Role = "CANDIDATE" | "COMPANY" | "ADMIN";
type Me = { id: string; role: Role; email?: string; stripeCustomerId?: string };

// --- UI plan keys (what you show to the user) ---
type UiPlanKey =
  | "FREE_UI"
  | "VIP_MEMBER_UI"
  // Companies (monthly)
  | "COMPANY_SILVER_UI"
  | "COMPANY_GOLDEN_UI"
  | "COMPANY_PLATINUM_UI"
  // Companies (annual display only for now)
  | "COMPANY_SILVER_ANNUAL_UI"
  | "COMPANY_GOLDEN_ANNUAL_UI"
  | "COMPANY_PLATINUM_ANNUAL_UI";

// mapping UI → canonical PlanName (backend)
// NOTE: We "rename/shift" only in UI:
// SILVER(UI)=COMPANY_BASIC, GOLDEN(UI)=COMPANY_SILVER, PLATINUM(UI)=COMPANY_GOLDEN
const mapUiToPlanName = (ui: UiPlanKey): PlanName | null => {
  switch (ui) {
    case "FREE_UI":
      return "FREE_MEMBER";
    case "VIP_MEMBER_UI":
      return "VIP_MEMBER";

    case "COMPANY_SILVER_UI":
      return "COMPANY_BASIC";
    case "COMPANY_GOLDEN_UI":
      return "COMPANY_SILVER";
    case "COMPANY_PLATINUM_UI":
      return "COMPANY_GOLDEN";

    // annual packages are display-only for now (unless you add backend plans)
    case "COMPANY_SILVER_ANNUAL_UI":
    case "COMPANY_GOLDEN_ANNUAL_UI":
    case "COMPANY_PLATINUM_ANNUAL_UI":
      return null;
  }
};

type UiPrice = {
  original?: string; // normal price (line-through)
  campaign?: string; // campaign price (line-through)
  current: string; // NEW APP / final price
  discount?: string; // e.g. "-50%" "-100%"
  note?: string; // e.g. "NEW APP • offer of a few days"
  suffix?: string; // "/μήνα" "/χρόνο"
};

type UiPlan = {
  key: UiPlanKey;
  title: string;
  price: UiPrice;
  features: string[];
  highlight?: boolean;
  cta?: string; // button text
  disabled?: boolean;
};

const CANDIDATE_PLANS: UiPlan[] = [
  {
    key: "FREE_UI",
    title: "FREE",
    price: { current: "0€", suffix: "" },
    features: ["NO profile photo", "Ads displayed", "up to 10 likes per day"],
    cta: "Start free",
  },
  {
    key: "VIP_MEMBER_UI",
    title: "VIP MEMBER",
    price: {
      original: "7€",
      current: "0€",
      discount: "-100%",
      note: "NEW APP • offer of a few days",
      suffix: "/μήνα",
    },
    features: ["Photo profile allowed", "No ads", "unlimited matchups"],
    highlight: true,
    cta: "Get VIP",
  },
];

const COMPANY_MONTHLY_PLANS: UiPlan[] = [
  {
    key: "COMPANY_SILVER_UI",
    title: "SILVER",
    price: {
      original: "100€",
      campaign: "50€",
      current: "0€",
      discount: "-50%",
      note: "NEW APP • offer of a few days",
      suffix: "/μήνα",
    },
    features: ["Limited candidate profile views", "Ads displayed", "Up to 5 job ads", "Up to 5 candidate mathups per day"],
    cta: "Start",
  },
  {
    key: "COMPANY_GOLDEN_UI",
    title: "GOLDEN",
    price: {
      original: "120€",
      campaign: "70€",
      current: "20€",
      discount: "-42%",
      note: "NEW APP • offer of a few days",
      suffix: "/μήνα",
    },
    features: ["Fewer ads", "Up to 10 job ads", "Up to 15 matchups per day"],
    highlight: true,
    cta: "Choose",
  },
  {
    key: "COMPANY_PLATINUM_UI",
    title: "PLATINUM",
    price: {
      original: "140€",
      campaign: "90€",
      current: "40€",
      discount: "-36%",
      note: "NEW APP • offer of a few days",
      suffix: "/μήνα",
    },
    features: ["Unlimited matches with candidates", "No ads", "Advanced candidate filters"],
    cta: "Choose",
  },
];

const COMPANY_ANNUAL_PLANS: UiPlan[] = [
  {
    key: "COMPANY_SILVER_ANNUAL_UI",
    title: "SILVER (ANNUAL)",
    price: { current: "500€", note: "2 months discount", suffix: "/χρόνο" },
    features: ["Save 2 months on annual billing"],
    disabled: true,
    cta: "Soon",
  },
  {
    key: "COMPANY_GOLDEN_ANNUAL_UI",
    title: "GOLDEN (ANNUAL)",
    price: { current: "700€", note: "2 months discount", suffix: "/χρόνο" },
    features: ["Save 2 months on annual billing"],
    highlight: true,
    disabled: true,
    cta: "Soon",
  },
  {
    key: "COMPANY_PLATINUM_ANNUAL_UI",
    title: "PLATINUM (ANNUAL)",
    price: { current: "900€", note: "2 months discount", suffix: "/χρόνο" },
    features: ["Save 2 months on annual billing"],
    disabled: true,
    cta: "Soon",
  },
];

function PriceBadge({ price }: { price: UiPrice }) {
  const hasOriginal = !!price.original;
  const hasCampaign = !!price.campaign;

  return (
    <span
      className="mx-auto -mb-16 mt-2 flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full border-4 border-white bg-white
                 shadow-[inset_0_5px_20px_#ddd,inset_0_3px_0_#999]"
    >
      {/* top row: discount */}
      {price.discount ? (
        <span className="text-[12px] font-bold text-red-600 leading-none">
          {price.discount}
        </span>
      ) : (
        <span className="h-[14px]" />
      )}

      {/* original line-through */}
      {hasOriginal ? (
        <span className="text-[12px] text-[#888] line-through leading-none mt-[2px]">
          {price.original}
          {price.suffix ? ` ${price.suffix}` : ""}
        </span>
      ) : (
        <span className="h-[14px]" />
      )}

      {/* campaign line-through (second strike) */}
      {hasCampaign ? (
        <span className="text-[12px] text-[#666] line-through leading-none mt-[2px]">
          {price.campaign}
          {price.suffix ? ` ${price.suffix}` : ""}
        </span>
      ) : (
        <span className="h-[14px]" />
      )}

      {/* current */}
      <span className="text-[#2e7d32] font-[900] text-[22px] leading-none mt-[4px]">
        {price.current}
      </span>

      {/* note */}
      {price.note ? (
        <span className="mt-[4px] rounded-full bg-black/5 px-2 py-[2px] text-[10px] font-semibold text-[#444]">
          {price.note}
        </span>
      ) : null}
    </span>
  );
}

export default function ChoosePlanPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<UiPlanKey | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Me>("/me");
        if (!data || data.role === "ADMIN") {
          router.replace("/");
          return;
        }
        setMe(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const clearAdCaps = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ad."))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem("ad.freshStart", String(Date.now()));
    } catch {}
  };

  const markOnboardingCompleted = () => {
    try {
      localStorage.setItem("hasPlan", "1");
      localStorage.setItem("onboarding.completed", "1");
      clearAdCaps();
    } catch {}
  };

  const pick = async (uiKey: UiPlanKey) => {
    if (!me) return;

    try {
      setBusyKey(uiKey);

      // Display-only annual packages for now
      if (
        uiKey === "COMPANY_SILVER_ANNUAL_UI" ||
        uiKey === "COMPANY_GOLDEN_ANNUAL_UI" ||
        uiKey === "COMPANY_PLATINUM_ANNUAL_UI"
      ) {
        alert("Annual packages are coming soon.");
        return;
      }

      // ====== CANDIDATE ======
      if (me.role === "CANDIDATE") {
        if (uiKey === "VIP_MEMBER_UI") {
        const plan: PlanName = "VIP_MEMBER";
        await api.put("/me/plan", { plan }); // direct grant VIP
        markOnboardingCompleted();
        router.replace("/dashboard/candidate");
        return;
      }

        if (uiKey === "FREE_UI") {
          await api.put("/me/plan", { plan: "FREE_MEMBER" as PlanName });
          markOnboardingCompleted();
          router.replace("/dashboard/candidate");
          return;
        }

        return;
      }

      // ====== COMPANY ======
      if (me.role === "COMPANY") {
        const plan = mapUiToPlanName(uiKey);

        // SILVER (UI) is free now → direct set (no Stripe)
        if (uiKey === "COMPANY_SILVER_UI") {
          if (!plan) return;
          await api.put("/me/plan", { plan });
          markOnboardingCompleted();
          router.replace("/dashboard/company");
          return;
        }

        // GOLDEN / PLATINUM → go to billing details
        if (uiKey === "COMPANY_GOLDEN_UI" || uiKey === "COMPANY_PLATINUM_UI") {
          if (!plan) return;
          router.push(`/onboarding/billing?plan=${plan}`);
          return;
        }
      }
    } catch (err: unknown) {
      let msg = "Failed to select plan";
      if (typeof err === "object" && err !== null) {
        const maybe: any = err;
        msg = maybe?.response?.data?.message ?? maybe?.message ?? msg;
      }
      alert(msg);
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#303030] text-white">
        Loading…
      </div>
    );
  }

  const isCompany = me?.role === "COMPANY";
  const mainPlans: UiPlan[] = isCompany ? COMPANY_MONTHLY_PLANS : CANDIDATE_PLANS;

  const PlanGrid = ({
    plans,
    title,
    subtitle,
  }: {
    plans: UiPlan[];
    title: string;
    subtitle?: string;
  }) => (
    <div className="mb-10">
      <h2 className="text-center text-xl sm:text-2xl font-semibold text-white mb-2">{title}</h2>
      {subtitle ? (
        <p className="text-center text-sm text-gray-200 mb-6">{subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}

      <div className="mx-auto grid max-w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((p, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === plans.length - 1;
          const isBusy = busyKey === p.key;

          return (
            <div
              key={p.key}
              className={[
                "relative float-left bg-white text-[#333] shadow-sm",
                "border border-[#ddd] p-5 text-center font-['Lucida_Sans','Trebuchet_MS',Arial,Helvetica] text-[12px]",
                "rounded-md",
                p.highlight
                  ? "z-20 -top-3 border-2 shadow-[20px_0_10px_-10px_rgba(0,0,0,.15),-20px_0_10px_-10px_rgba(0,0,0,.15)]"
                  : "",
                isFirst ? "sm:rounded-l-md" : "",
                isLast ? "sm:rounded-r-md" : "",
              ].join(" ")}
            >
              <h3
                className={[
                  "mb-14 -mx-5 -mt-5 bg-gradient-to-b from-white to-[#eee] px-5 py-5 text-[20px] font-normal",
                  p.highlight ? "rounded-t-md -mt-7 pt-7 from-[#eee] to-[#ddd]" : "",
                  isFirst ? "sm:rounded-tl-md" : "",
                  isLast ? "sm:rounded-tr-md" : "",
                ].join(" ")}
              >
                {p.title}
                <PriceBadge price={p.price} />
              </h3>

              <button
                onClick={() => pick(p.key)}
                disabled={!!busyKey || !!p.disabled}
                className="mt-5 inline-block rounded-[3px] bg-gradient-to-b from-[#72ce3f] to-[#62bc30] px-5 py-2 text-[14px] font-bold uppercase text-white shadow-[0_1px_0_rgba(255,255,255,.5),0_2px_0_rgba(0,0,0,.7)] disabled:opacity-60"
              >
                {isBusy ? "Choosing…" : p.cta ?? "Sign up"}
              </button>

              <ul className="mt-5 list-none p-0">
                {p.features.map((f) => (
                  <li key={f} className="border-t border-[#ddd] py-2 text-[12px]">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#303030] py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="text-center text-2xl sm:text-3xl font-semibold text-white mb-4">
          Choose your plan
        </h1>
        <p className="text-center text-sm text-gray-200 mb-8">
          You can start free and upgrade later at any time.
        </p>

        {/* MAIN TABLE */}
        <PlanGrid
          plans={mainPlans}
          title={isCompany ? "Company plans (Monthly)" : "Candidate plans"}
          subtitle={isCompany ? "NEW APP prices are available for a limited time." : "Start free and upgrade anytime."}
        />

        {/* SECOND TABLE for companies: annual packages */}
        {isCompany ? (
          <PlanGrid
            plans={COMPANY_ANNUAL_PLANS}
            title="Company plans (Annual packages)"
            subtitle="Κέρδισε 2 μήνες με ετήσια πληρωμή."
          />
        ) : null}
      </div>
    </div>
  );
}

