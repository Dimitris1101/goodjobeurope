"use client";

import { useState } from "react";
import RegisterForm from "@/components/RegisterForm";
import LoginForm from "@/components/LoginForm";

/**
 * Neumorphic-like auth shell μόνο με Tailwind.
 * - Το αριστερό panel ΜΕΝΕΙ πάντα αριστερά (δεν εξαφανίζεται).
 * - Το δεξί container αλλάζει περιεχόμενο (signup/login).
 */
export default function FancyAuthShell({
  defaultSide = "signup",
}: {
  defaultSide?: "signup" | "signin";
}) {
  const [side, setSide] = useState<"signup" | "signin">(defaultSide);
  const isSignup = side === "signup";

  return (
    <div
      className="relative mx-auto w-[1000px] min-w-[1000px] h-[850px] min-h-[850px] rounded-xl bg-[#ecf0f3] text-gray-500 p-6 overflow-hidden
                 shadow-[10px_10px_10px_#d1d9e6,-10px_-10px_10px_#f9f9f9]
                 [@media(max-width:1200px)]:scale-[0.7]
                 [@media(max-width:1000px)]:scale-[0.6]
                 [@media(max-width:800px)]:scale-[0.5]
                 [@media(max-width:600px)]:scale-[0.4]"
    >
      {/* LEFT SWITCH PANEL (μένει πάντα αριστερά, ενεργό) */}
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
              <h2 className="text-3xl font-bold text-black leading-[3]">Welcome Back !</h2>
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
              <h2 className="text-3xl font-bold text-black leading-[3]">Hello Friend !</h2>
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

      {/* RIGHT MAIN container (σταθερό – αλλάζει μόνο το περιεχόμενο) */}
      <div
        className={[
          "absolute top-0 right-0 h-full w-[600px] p-6 z-30",
          "flex items-center justify-center bg-[#ecf0f3]",
        ].join(" ")}
      >
        <div className="w-full h-full flex items-center justify-center">
          {isSignup ? (
            // SIGN UP: ξεκινάει κατευθείαν από το Role
            <div className="w-full max-w-[420px] mx-auto">
              <RegisterForm />
            </div>
          ) : (
            // SIGN IN: login panel, απόλυτα κεντραρισμένο
            <div className="w-full max-w-[420px] mx-auto">
              <div className="bg-black/60 p-8 rounded-xl shadow-lg text-white">
                <h1 className="mb-6 text-center text-xl font-semibold">Σύνδεση</h1>
                <div className="w-full max-w-[360px] mx-auto">
                  <LoginForm />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
