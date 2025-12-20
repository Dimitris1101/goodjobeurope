"use client";

import { useState, useMemo } from "react";

type Step = { title: string; desc?: string };

const employeeSteps: Step[] = [
  { title: "Create your account or log in" },
  {
    title: "Fill in your information for accurate matching",
    desc: "Tip: you can always edit your details from your dashboard.",
  },
  {
    title: "Choose your plan",
    desc: "We recommend VIP for a better, ad-free experience with a profile photo.",
  },
  {
    title: "Upload your resume",
    desc: "Very important so companies can choose you faster.",
  },
  {
    title: "Go to the Matching tab",
    desc: "Search by location and sector.",
  },
  { title: "Swipe right or left" },
  {
    title: "Keep an eye on your messages",
    desc: "Companies that match with you will send you a message.",
  },
  {
    title: "Chat live inside the app",
    desc: "Convince the company via messenger and your next opportunity is one step away.",
  },
];

const companySteps: Step[] = [
  { title: "Create your account or log in" },
  {
    title: "Fill in your company information",
    desc: "Tip: you can update your details from your dashboard.",
  },
  {
    title: "Choose your plan",
    desc: "We recommend SILVER/GOLDEN for fewer or no ads and more job posts.",
  },
  {
    title: "Upload a profile and cover photo",
    desc: "Optional, but it builds trust.",
  },
  {
    title: "Post your job ad",
    desc: "Short description – see who is interested instantly.",
  },
  {
    title: "See who liked your job ad",
    desc: "Make a match to start the conversation.",
  },
];

export default function InfoTimeline() {
  const [audience, setAudience] = useState<"EMP" | "COM">("EMP");
  const steps = useMemo(
    () => (audience === "EMP" ? employeeSteps : companySteps),
    [audience]
  );

  return (
    <section className="relative py-16" id="how-it-works">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header + Toggle */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How it works
          </h2>
          <p className="text-slate-600 max-w-2xl">
            See the main steps for{" "}
            {audience === "EMP" ? "candidates" : "companies"}.
          </p>

          <div className="flex w-full max-w-xs sm:max-w-sm items-center rounded-2xl border bg-white p-1 shadow-sm">
            <button
              onClick={() => setAudience("EMP")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                audience === "EMP"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              aria-pressed={audience === "EMP"}
            >
              Candidates
            </button>
            <button
              onClick={() => setAudience("COM")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                audience === "COM"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              aria-pressed={audience === "COM"}
            >
              Companies
            </button>
          </div>
        </div>

        {/* Split layout: Timeline (left) + Image (right) */}
        <div className="flex flex-col lg:flex-row items-start gap-10">
          {/* Timeline */}
          <div className="flex-[0.9] relative">
            {/* Vertical line in the middle (md+) */}
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[6px] -translate-x-1/2 rounded bg-gradient-to-b from-transparent via-slate-400 to-transparent md:block" />

            <ul className="space-y-8">
              {steps.map((s, idx) => {
                const isLeft = idx % 2 === 0;
                return (
                  <li
                    key={idx}
                    className="md:grid md:grid-cols-2 md:items-center"
                  >
                    {/* Left column */}
                    <div
                      className={`md:px-6 ${
                        isLeft ? "md:order-1" : "md:order-2"
                      }`}
                    >
                      {isLeft && (
                        <div className="relative md:text-right">
                          {/* node on the line */}
                          <span
                            className="hidden md:block absolute top-1/2 -translate-y-1/2 right-[-28px] h-5 w-5 rounded-full border-[4px] border-rose-500 bg-white"
                            aria-hidden
                          />
                          {/* card */}
                          <div className="inline-block max-w-xl rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                            <div className="text-sm uppercase tracking-wide text-slate-500">
                              Step {idx + 1}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {s.title}
                            </div>
                            {s.desc && (
                              <div className="mt-1 text-sm text-slate-600 italic">
                                {s.desc}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div
                      className={`md:px-6 ${
                        isLeft ? "md:order-2" : "md:order-1"
                      }`}
                    >
                      {!isLeft && (
                        <div className="relative md:text-left">
                          {/* node on the line */}
                          <span
                            className="hidden md:block absolute top-1/2 -translate-y-1/2 left-[-28px] h-5 w-5 rounded-full border-[4px] border-rose-500 bg-white"
                            aria-hidden
                          />
                          {/* card */}
                          <div className="inline-block max-w-xl rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                            <div className="text-sm uppercase tracking-wide text-slate-500">
                              Step {idx + 1}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {s.title}
                            </div>
                            {s.desc && (
                              <div className="mt-1 text-sm text-slate-600 italic">
                                {s.desc}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mobile: single-column cards */}
                      <div className="md:hidden mt-3">
                        <div className="relative">
                          <div className="inline-block w-full rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                            <div className="text-sm uppercase tracking-wide text-slate-500">
                              Step {idx + 1}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {s.title}
                            </div>
                            {s.desc && (
                              <div className="mt-1 text-sm text-slate-600 italic">
                                {s.desc}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* small vertical line for narrow screens */}
            <div className="pointer-events-none absolute left-4 top-0 block h-full w-[3px] rounded bg-gradient-to-b from-transparent via-slate-300 to-transparent md:hidden" />
          </div>

          {/* Image (Right) */}
          <div className="flex-[0.3] flex justify-center items-start relative overflow-visible pt-6 sm:pt-10 lg:pt-16">
            <img
              src="/hero.jpg"
              alt="Job matching illustration"
              className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-[150%] lg:max-w-none object-cover rounded-2xl shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
