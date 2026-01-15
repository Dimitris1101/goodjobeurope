"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PriceTier = {
  label: string;          // π.χ. "Κανονική"
  amount: string;         // π.χ. "100€"
  muted?: boolean;        // πιο faded
  strike?: boolean;       // γραμμή
  highlight?: boolean;    // έντονο (τρέχουσα τιμή)
  badge?: string;         // π.χ. "NEW APP"
};

type Plan = {
  name: string;
  subtitle?: string;
  prices: PriceTier[];
  features: string[];     // προσωρινά placeholders μέχρι να στείλεις benefits
  cta: string;
  popular?: boolean;
};

const candidatePlans: Plan[] = [
  {
    name: "FREE",
    subtitle: "Candidate",
    prices: [{ label: "Τιμή", amount: "0€", highlight: true, badge: "FREE" }],
    features: ["NO profile photo", "Ads displayed", "up to 10 likes per day"],
    cta: "Start free",
  },
  {
    name: "VIP MEMBER",
    subtitle: "Candidate",
    prices: [
      { label: "Normal", amount: "7€/mounth", strike: true, muted: true },
      { label: "NEW APP", amount: "0€ NOW", highlight: true, badge: "LIMITED" },
    ],
    features: ["Photo profile allowed", "No ads", "unlimited matchups"],
    cta: "Get VIP",
    popular: true,
  },
];

const companyMonthlyPlans: Plan[] = [
  {
    name: "SILVER",
    subtitle: "Company (Monthly)",
    prices: [
      { label: "Normal price", amount: "100€/mounth", strike: true, muted: true },
      { label: "Campaign", amount: "50€/mounth", strike: true, muted: true },
      { label: "NEW APP", amount: "0€ few days offer", highlight: true, badge: "LIMITED" },
    ],
    features: [
      "Limited candidate profile views",
      "Ads displayed",
      "Up to 5 job ads",
      "Up to 5 candidate matchups per day",
    ],
    cta: "Start",
  },
  {
    name: "GOLDEN",
    subtitle: "Company (Monthly)",
    prices: [
      { label: "Normal price", amount: "120€/mounth", strike: true, muted: true },
      { label: "Campaign", amount: "70€/mounth", strike: true, muted: true },
      { label: "NEW APP", amount: "20€ for a few days", highlight: true, badge: "LIMITED" },
    ],
    features: ["Fewer ads", "Up to 10 job ads", "Up to 15 matchups per day"],
    cta: "Choose",
  },
  {
    name: "PLATINUM",
    subtitle: "Company (Monthly)",
    prices: [
      { label: "Normal price", amount: "140€/μήνα", strike: true, muted: true },
      { label: "Campaign", amount: "90€/μήνα", strike: true, muted: true },
      { label: "NEW APP", amount: "40€ για λίγες μέρες", highlight: true, badge: "LIMITED" },
    ],
    features: ["Unlimited matches with candidates", "No ads", "Advanced candidate filters"],
    cta: "Choose",
    popular: true,
  },
];


const companyYearlyPlans: Plan[] = [
  {
    name: "SILVER",
    subtitle: "Company (Yearly) • won 2 months of subscription",
    prices: [{ label: "Ετήσιο", amount: "500€/year", highlight: true, badge: "BEST VALUE" }],
    features: [
      "Includes all SILVER monthly benefits",
      "Save 2 months",
      "Single annual payment",
    ],
    cta: "Choose annual",
    
  },
  {
    name: "GOLDEN",
    subtitle: "Company (Yearly) • won 2 months of subscription",
    prices: [{ label: "Ετήσιο", amount: "700€/year", highlight: true, badge: "BEST VALUE" }],
    features: [
      "Includes all GOLDEN monthly benefits",
      "Save 2 months",
      "Single annual payment",
    ],
    cta: "Choose annual",
  },
  {
    name: "PLATINUM",
    subtitle: "Company (Yearly) • won 2 months of subscription",
    prices: [{ label: "Ετήσιο", amount: "900€/year", highlight: true, badge: "BEST VALUE" }],
    features: [
      "Includes all PLATINUM monthly benefits",
      "Save 2 months",
      "Single annual payment",
    ],
    cta: "Choose annual",
    popular: true,
  },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 flex-none">
      <path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  isAuthenticated?: boolean;
  userId?: string | null;
};

export default function Pricing({ isAuthenticated = false, userId = null }: Props) {
  const router = useRouter();
  const [audience, setAudience] = useState<"CANDIDATE" | "COMPANY">("CANDIDATE");

  const candidate = useMemo(() => candidatePlans, []);
  const companyMonthly = useMemo(() => companyMonthlyPlans, []);
  const companyYearly = useMemo(() => companyYearlyPlans, []);

  const handleSelect = async (planName: string, mode: "candidate" | "company_monthly" | "company_yearly") => {
    // προσωρινό: στέλνουμε role + plan + mode στο register
    if (!isAuthenticated || !userId) {
      const role = mode === "candidate" ? "candidate" : "company";
      router.push(`/auth/register?role=${role}&plan=${planName}&mode=${mode}`);
      return;
    }

    // TODO: εδώ αργότερα θα μπουν Stripe checkouts ανά plan/mode
    router.push("/dashboard");
  };

  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-20 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/back_pricing.jpg')" }}
    >
      {/* Animated overlay to “ζωντανέψει” το background */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px]" />
      <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
          backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"140\" viewBox=\"0 0 140 140\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"4\" stitchTiles=\"stitch\"/></filter><rect width=\"140\" height=\"140\" filter=\"url(%23n)\" opacity=\"0.4\"/></svg>')",
            }}
        />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-violet-400/40 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/4 -right-40 h-[600px] w-[600px] rounded-full bg-blue-400/40 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full bg-rose-400/40 blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
      </div>     


      <div className="relative mx-auto max-w-6xl px-4">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Pricing
          </h2>
          <p className="mt-2 text-slate-600">
            New app launch offers for a limited time.
          </p>
        </div>

        {/* Tabs */}
        <div className="mx-auto mb-10 flex w-full max-w-xl items-center rounded-2xl border bg-white p-1 shadow-sm">
          <button
            onClick={() => setAudience("CANDIDATE")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              audience === "CANDIDATE"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            aria-pressed={audience === "CANDIDATE"}
          >
            Candidate
          </button>
          <button
            onClick={() => setAudience("COMPANY")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              audience === "COMPANY"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            aria-pressed={audience === "COMPANY"}
          >
            Company
          </button>
        </div>

        {/* Candidate */}
        {audience === "CANDIDATE" && (
          <div className="grid gap-6 sm:grid-cols-2">
            {candidate.map((p) => (
              <Card
                key={p.name}
                plan={p}
                onSelect={() => handleSelect(p.name, "candidate")}
              />
            ))}
          </div>
        )}

        {/* Company */}
        {audience === "COMPANY" && (
          <div className="space-y-10">
            {/* Monthly */}
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xl font-semibold text-slate-900">Monthly plans</h3>
                <span className="text-xs text-slate-600">
                  Limited-time “NEW APP” prices included
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {companyMonthly.map((p) => (
                  <Card
                    key={p.name}
                    plan={p}
                    onSelect={() => handleSelect(p.name, "company_monthly")}
                  />
                ))}
              </div>
            </div>

            {/* Yearly */}
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xl font-semibold text-slate-900">Yearly plans</h3>
                <span className="text-xs text-slate-600">
                  Save 2 months with annual billing
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {companyYearly.map((p) => (
                  <Card
                    key={`${p.name}-yearly`}
                    plan={p}
                    onSelect={() => handleSelect(p.name, "company_yearly")}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Prices may include promotional discounts for a limited time.
        </p>
      </div>
    </section>
  );
}

function Card({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
  const popular = !!plan.popular;

  return (
    <div
      className={`relative rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
        popular ? "ring-2 ring-violet-500" : "border-slate-200"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 right-4 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
          Popular
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        {plan.subtitle && <p className="mt-1 text-xs text-slate-500">{plan.subtitle}</p>}

        <div className="mt-3 space-y-2">
          {plan.prices.map((pr, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">{pr.label}:</span>

              <span
                className={[
                  "text-lg font-bold",
                  pr.muted ? "text-slate-400" : "text-slate-900",
                  pr.strike ? "line-through" : "",
                  pr.highlight ? "text-emerald-700" : "",
                ].join(" ")}
              >
                {pr.amount}
              </span>

              {pr.badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {pr.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-2.5 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-slate-700">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckIcon />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition
          ${plan.popular ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-900 text-white hover:bg-slate-800"}
        `}
      >
        {plan.cta}
      </button>
    </div>
  );
}


