"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

type Me = {
  id: number;
  email: string;
  role: "CANDIDATE" | "COMPANY" | "ADMIN";
  candidate?: { profileCompleted?: boolean; preferredLanguage?: string | null };
  company?: { profileCompleted?: boolean; preferredLanguage?: string | null };
  uiLanguage?: string; // optional, μπορεί να το βάλουμε αργότερα
};

function getErrorMessage(err: unknown) {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.message ||
    "Login failed"
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Click on GOOGLE / FACEBOOK -> redirect to API
  const handleSocialLogin = (provider: "google" | "facebook") => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      console.error("Missing NEXT_PUBLIC_API_URL in .env");
      setServerError(
        "API URL is not configured. Please contact the administrator."
      );
      return;
    }

    // Adjust if your endpoints differ (e.g. /auth/google/login)
    window.location.href = `${apiBase}/auth/${provider}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    try {
      // 1) login -> get token
      const { data: login } = await api.post("/auth/login", { email, password });
      const token = login?.access_token;
      if (!token) throw new Error("No access token returned");
      localStorage.setItem("token", token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // 2) fetch /me
      const { data: me } = await api.get<Me>("/me");

      // 2a) store account language
const accLang = ((me as any)?.candidate?.preferredLanguage || "en").toLowerCase();

// DEBUG (για να δεις ΤΙ έφερε το /me)
console.log("[login] me.uiLanguage =", me?.uiLanguage, "=> accLang =", accLang);

// storage
localStorage.setItem("preferredLanguage", accLang);
localStorage.setItem("ui.accountLang", accLang);
localStorage.setItem("uiAccountLang", accLang);
localStorage.setItem("ui.mode", accLang === "en" ? "original" : "preferred");

// cookie
document.cookie = `uiLanguage=${encodeURIComponent(accLang)}; path=/; max-age=31536000; SameSite=Lax`;

// DEBUG: επιβεβαίωση ότι γράφτηκε
console.log(
  "[login] cookie now =",
  document.cookie.split("; ").find(x => x.startsWith("uiLanguage="))
);

// events
window.dispatchEvent(new CustomEvent("preferredLanguageChanged", { detail: { lang: accLang } }));
window.dispatchEvent(new CustomEvent("uiModeChanged"));


          // 3) decide where to go
      if (me.role === "CANDIDATE") {
        const done = me?.candidate?.profileCompleted === true;
        router.replace(done ? "/dashboard/candidate" : "/onboarding/candidate");
      } else if (me.role === "COMPANY") {
        const done = me?.company?.profileCompleted === true;
        router.replace(done ? "/dashboard/company" : "/onboarding/company");
      } else {
        router.replace("/");
      }
    } catch (err: unknown) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
          {serverError}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-white"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-xl border border-white bg-transparent px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-white"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-xl border border-white bg-transparent px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        data-busy={loading ? "" : undefined}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      <div className="text-center">
        <Link
          href="/auth/forgot"
          className="text-sm text-white underline hover:text-gray-300"
        >
          Forgot password
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 text-xs text-gray-300 pt-2">
        <div className="h-px flex-1 bg-gray-500" />
        <span>or</span>
        <div className="h-px flex-1 bg-gray-500" />
      </div>

      {/* Social buttons */}
      <div className="grid gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="w-full rounded-xl bg-white text-gray-900 px-4 py-2.5 text-sm font-medium hover:bg-gray-100 flex items-center justify-center gap-2"
        >
          <span>Sign in with Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          className="w-full rounded-xl bg-[#1877F2] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#145ecc] flex items-center justify-center gap-2"
        >
          <span>Sign in with Facebook</span>
        </button>
      </div>
    </form>
  );
}
