"use client";

import { useEffect, useState } from "react";
import RegisterForm from "@/components/RegisterForm";
import LoginForm from "@/components/LoginForm";

/**
 * Neumorphic-like auth shell μόνο με Tailwind.
 * - Desktop: αριστερό panel 400px, δεξί 600px όπως πριν.
 * - Mobile: stack (top switch panel + bottom form) χωρίς scale.
 * - FIX: ΜΟΝΟ ένα layout στο DOM (για να μην υπάρχουν duplicate ids)
 */
export default function FancyAuthShell({
  defaultSide = "signup",
}: {
  defaultSide?: "signup" | "signin";
}) {
  const [side, setSide] = useState<"signup" | "signin">(defaultSide);
  const isSignup = side === "signup";

  // ✅ FIX: render only ONE layout to avoid duplicated form ids
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="w-full flex items-center justify-center px-3 sm:px-6 py-10 sm:py-14">
      {/* OUTER SHELL */}
      <div
        className={[
          // Desktop fixed shell
          "relative bg-[#ecf0f3] text-gray-500 overflow-hidden",
          "shadow-[10px_10px_10px_#d1d9e6,-10px_-10px_10px_#f9f9f9]",
          "rounded-2xl",
          // Responsive sizing
          "w-full max-w-[1000px]",
          // Desktop height same as before
          "lg:h-[850px]",
          // Mobile/tablet: auto height
          "h-auto",
        ].join(" ")}
      >
        {/* === DESKTOP LAYOUT (side-by-side) === */}
        {isDesktop && (
          <div>
            {/* LEFT SWITCH PANEL */}
            <div
              className={[
                "absolute top-0 left-0 h-full w-[400px] p-12 z-20",
                "bg-[#ecf0f3] overflow-hidden",
                "shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#f9f9f9]",
              ].join(" ")}
            >
              {/* big circle */}
              <div
                className={[
                  "absolute rounded-full bg-[#ecf0f3] w-[500px] h-[500px]",
                  "shadow-[inset_8px_8px_12px_#d1d9e6,inset_-8px_-8px_12px_#f9f9f9]",
                  "left-[-60%] bottom-[-60%]",
                ].join(" ")}
              />
              {/* top circle */}
              <div
                className={[
                  "absolute rounded-full bg-[#ecf0f3] w-[300px] h-[300px]",
                  "shadow-[inset_8px_8px_12px_#d1d9e6,inset_-8px_-8px_12px_#f9f9f9]",
                  "left-[60%] top-[-30%]",
                ].join(" ")}
              />

              {/* content */}
              <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center">
                {isSignup ? (
                  <>
                    <h2 className="text-3xl font-bold text-black leading-[3]">
                      Welcome Back !
                    </h2>
                    <p className="text-sm px-6">
                      To keep connected with us please login with your personal info
                    </p>
                    <button
                      type="button"
                      onClick={() => setSide("signin")}
                      className="mt-10 inline-flex items-center justify-center w-[180px] h-[50px] rounded-full font-semibold tracking-wider text-white
                                 bg-[#4B70E2] transition active:scale-[0.97]
                                 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#f9f9f9] hover:shadow-[6px_6px_10px_#d1d9e6,-6px_-6px_10px_#f9f9f9]"
                    >
                      SIGN IN
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-black leading-[3]">
                      Hello Friend !
                    </h2>
                    <p className="text-sm px-6">
                      Enter your personal details and start journey with us
                    </p>
                    <button
                      type="button"
                      onClick={() => setSide("signup")}
                      className="mt-10 inline-flex items-center justify-center w-[180px] h-[50px] rounded-full font-semibold tracking-wider text-white
                                 bg-[#4B70E2] transition active:scale-[0.97]
                                 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#f9f9f9] hover:shadow-[6px_6px_10px_#d1d9e6,-6px_-6px_10px_#f9f9f9]"
                    >
                      SIGN UP
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT MAIN container */}
            <div
              className={[
                "absolute top-0 right-0 h-full w-[600px] p-6 z-30",
                "flex items-center justify-center bg-[#ecf0f3]",
              ].join(" ")}
            >
              <div className="w-full h-full flex items-center justify-center">
                {isSignup ? (
                  <div className="w-full max-w-[420px] mx-auto">
                    <RegisterForm />
                  </div>
                ) : (
                  <div className="w-full max-w-[420px] mx-auto">
                    <div className="bg-black/60 p-8 rounded-xl shadow-lg text-white">
                      <h1 className="mb-6 text-center text-xl font-semibold">
                        Σύνδεση
                      </h1>
                      <div className="w-full max-w-[360px] mx-auto">
                        <LoginForm />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === MOBILE/TABLET LAYOUT (stack) === */}
        {!isDesktop && (
          <div>
            {/* TOP SWITCH PANEL */}
            <div className="relative overflow-hidden rounded-2xl">
              <div
                className={[
                  "relative w-full p-7 sm:p-10",
                  "bg-[#ecf0f3]",
                  "shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#f9f9f9]",
                ].join(" ")}
              >
                {/* circles (decorative) — IMPORTANT: do not block taps */}
                <div
                  className={[
                    "absolute pointer-events-none select-none rounded-full bg-[#ecf0f3] w-[360px] h-[360px]",
                    "shadow-[inset_8px_8px_12px_#d1d9e6,inset_-8px_-8px_12px_#f9f9f9]",
                    "left-[-45%] bottom-[-55%]",
                  ].join(" ")}
                />
                <div
                  className={[
                    "absolute pointer-events-none select-none rounded-full bg-[#ecf0f3] w-[240px] h-[240px]",
                    "shadow-[inset_8px_8px_12px_#d1d9e6,inset_-8px_-8px_12px_#f9f9f9]",
                    "right-[-20%] top-[-45%]",
                  ].join(" ")}
                />

                <div className="relative z-10 text-center">
                  {isSignup ? (
                    <>
                      <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight">
                        Welcome Back !
                      </h2>
                      <p className="mt-2 text-sm sm:text-base px-2 text-gray-600">
                        To keep connected with us please login with your personal info
                      </p>
                      <button
                        type="button"
                        onClick={() => setSide("signin")}
                        className="mt-6 inline-flex items-center justify-center w-full sm:w-[220px] h-[48px] rounded-full font-semibold tracking-wider text-white
                                   bg-[#4B70E2] transition active:scale-[0.98]
                                   shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#f9f9f9]"
                      >
                        SIGN IN
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl sm:text-3xl font-bold text-black leading-tight">
                        Hello Friend !
                      </h2>
                      <p className="mt-2 text-sm sm:text-base px-2 text-gray-600">
                        Enter your personal details and start journey with us
                      </p>
                      <button
                        type="button"
                        onClick={() => setSide("signup")}
                        className="mt-6 inline-flex items-center justify-center w-full sm:w-[220px] h-[48px] rounded-full font-semibold tracking-wider text-white
                                   bg-[#4B70E2] transition active:scale-[0.98]
                                   shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#f9f9f9]"
                      >
                        SIGN UP
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* BOTTOM FORM PANEL */}
            <div className="relative z-10 mt-6 sm:mt-8 px-3 sm:px-8 pb-8">
              {isSignup ? (
                <div className="w-full max-w-[520px] mx-auto">
                  <RegisterForm />
                </div>
              ) : (
                <div className="w-full max-w-[520px] mx-auto">
                  <div className="bg-black/70 p-6 sm:p-8 rounded-2xl shadow-xl text-white">
                    <h1 className="mb-5 text-center text-lg sm:text-xl font-semibold">
                      Σύνδεση
                    </h1>
                    <div className="w-full max-w-[420px] mx-auto">
                      <LoginForm />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

