"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdProvider from "@/components/AdProvider";
import type { PlanName } from "@/types/plan";
import api from "@/lib/api";
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  useAutoTranslate();
  const pathname = usePathname();
  const search = useSearchParams();

  const isHome       = pathname === "/";                 
  const isOnboarding = pathname?.startsWith("/onboarding");
  const isAuth       = pathname?.startsWith("/auth");
  const isPublic     = isHome || isOnboarding || isAuth; 

  const [plan, setPlan] = useState<PlanName>("FREE_MEMBER");
  const [ready, setReady] = useState(false);

  const debugForce = search?.get("debugAd") === "1";
  const resetCap   = search?.get("resetAd") === "1";

  useEffect(() => {
    if (resetCap && typeof window !== "undefined") {
      Object.keys(localStorage)
        .filter(k => k.startsWith("ad.count.") || k.startsWith("ad.last.") || k.startsWith("ad.session"))
        .forEach(k => localStorage.removeItem(k));
      console.log("[ads] counters cleared");
    }
  }, [resetCap]);

  //  
  useEffect(() => {
    if (isPublic) {
      setReady(false);
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const { data } = await api.get("/me");
        const srvPlan = data?.plan as PlanName | null;
        const completed = !!data?.onboardingCompleted;
        if (!ignore) {
          if (srvPlan) setPlan(srvPlan);
          setReady(completed);
          console.log("[ads] /me =>", { plan: srvPlan, onboardingCompleted: completed, path: pathname });
        }
      } catch (e) {
        if (!ignore) {
          setReady(false);
          console.log("[ads] /me error =>", e);
        }
      }
    })();
    return () => { ignore = true; };
  }, [pathname, isPublic]);

  // Public routes: ποτέ ads & ποτέ /me
  if (isPublic) return <>{children}</>;

  if (debugForce) {
    return <AdProvider plan={plan} debug>{children}</AdProvider>;
  }

  if (!ready) return <>{children}</>;

  return <AdProvider plan={plan}>{children}</AdProvider>;
}