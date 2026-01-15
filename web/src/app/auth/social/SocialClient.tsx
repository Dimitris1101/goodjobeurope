"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

type Me = {
  id: number;
  email: string;
  role: "CANDIDATE" | "COMPANY" | "ADMIN";
  candidate?: { profileCompleted?: boolean };
  company?: { profileCompleted?: boolean };
  uiLanguage?: string;
};

export default function SocialCatcher() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");

    // Αν το backend μας έστειλε error από Google/Facebook
    if (err && !token) {
      setError(decodeURIComponent(err));
      return;
    }

    if (!token) {
      router.replace("/auth/login?err=missing_token");
      return;
    }

    // 1) Βάλε το JWT σε storage / header (ίδιο key με LoginForm)
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    // 2) Πάρε τον χρήστη από /me (ΟΧΙ /auth/me) και κάνε redirect όπως στο LoginForm
    (async () => {
      try {
        const { data: me } = await api.get<Me>("/me");

        // Γλώσσα λογαριασμού – ίδιο pattern με LoginForm
        const accLang = (me?.uiLanguage || "el").toLowerCase();
        localStorage.setItem("uiAccountLang", accLang);
        if (!localStorage.getItem("uiOverrideLang")) {
          localStorage.setItem("preferredLanguage", accLang);
          window.dispatchEvent(
            new CustomEvent("preferredLanguageChanged", {
              detail: { lang: accLang },
            })
          );
        }

        if (me.role === "COMPANY") {
          const done = me?.company?.profileCompleted === true;
          router.replace(done ? "/dashboard/company" : "/onboarding/company");
          return;
        }

        if (me.role === "CANDIDATE") {
          const done = me?.candidate?.profileCompleted === true;
          router.replace(done ? "/dashboard/candidate" : "/onboarding/candidate");
          return;
        }

        router.replace("/");
      } catch (e) {
        console.error(e);
        router.replace("/auth/login?err=profile_fetch_failed");
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">Αποτυχία σύνδεσης</h1>
          <p className="text-sm opacity-80">{error}</p>
          <button
            onClick={() => router.replace("/auth/login")}
            className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm"
          >
            Επιστροφή στη σελίδα σύνδεσης
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <p className="text-sm opacity-80">Συνδέεσαι… Παρακαλώ περίμενε.</p>
    </div>
  );
}
