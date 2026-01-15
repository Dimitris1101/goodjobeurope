"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FullScreenAd from "@/components/FullScreenAd";
import { useAdManager } from "@/lib/useAdManager";
import type { PlanName } from "@/types/plan";
import UpgradeBanner from "@/components/UpgradeBanner";

type Props = { plan: PlanName; children: React.ReactNode; debug?: boolean; };

export default function AdProvider({ plan, children, debug }: Props) {
  const pathname = usePathname();
  const { visible, showAd, closeAd, canShow, reset, policy, intervalSec } = useAdManager(plan);
  const [forceOpen, setForceOpen] = useState(false);

useEffect(() => {
  console.log("AdProvider mounted", { plan, pathname });
}, []);



useEffect(() => {
  console.log("Ad state", { visible, forceOpen, policy, intervalSec });
}, [visible, forceOpen, policy, intervalSec]);




  // 1) Πρώτη εμφάνιση ~2.5s μετά το mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (canShow()) showAd();
    }, 2500);
    return () => clearTimeout(t);
  }, [canShow, showAd, plan]);

  // 2) Κάθε αλλαγή route → ξαναδοκίμασε
  useEffect(() => {
    if (!visible && canShow()) showAd();
  }, [pathname, canShow, showAd, visible]);

  // 3) DEBUG: άνοιγμα πάντα
  useEffect(() => {
    if (debug) setForceOpen(true);
  }, [debug]);

  // 4) ΠΕΡΙΟΔΙΚΟΣ ΕΛΕΓΧΟΣ ανά 1s → όταν περάσει το interval, ανάβει μόνο του
  useEffect(() => {
    if (policy.maxPerSession <= 0) return; // VIP/GOLDEN -> ποτέ
    const id = setInterval(() => {
      if (!visible && canShow()) showAd();
    }, 1000);
    return () => clearInterval(id);
  }, [visible, canShow, showAd, policy.maxPerSession, intervalSec]);

  // 5) Όταν το tab ξαναγίνει ορατό, ξανατσεκάρει
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && !visible && canShow()) {
        showAd();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [visible, canShow, showAd]);

  // 6) Shortcut για test: Ctrl+Alt+A -> reset & open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === "a" || e.key === "A")) {
        reset();
        setForceOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  const handleClose = () => {
    setForceOpen(false);
    closeAd();
  };

  const shouldShow = visible || forceOpen;

  return (
    <>
      {children}
      {shouldShow && (
  <FullScreenAd onClose={handleClose}>
    <div className="w-full p-3 sm:p-6">
<UpgradeBanner
  planLabel={plan}
  subtitle="Go ad-free, get higher visibility, and connect faster with the right people."
  primaryHref="/onboarding/plan"
    />
    </div>
  </FullScreenAd>
)}
    </>
  );
}
