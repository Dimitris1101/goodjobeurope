"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FullScreenAd from "@/components/FullScreenAd";
import { useAdManager } from "@/lib/useAdManager";
import type { PlanName } from "@/types/plan";

type Props = { plan: PlanName; children: React.ReactNode; debug?: boolean; };

export default function AdProvider({ plan, children, debug }: Props) {
  const pathname = usePathname();
  const { visible, showAd, closeAd, canShow, reset, policy, intervalSec } = useAdManager(plan);
  const [forceOpen, setForceOpen] = useState(false);

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
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <div className="p-6 text-center">
              <div className="text-lg font-semibold">Διαφήμιση (modal)</div>
              <p className="mt-2 text-sm text-gray-600">
                Το GOODJOBEUROPE παραμένει δωρεάν χάρη στις διαφημίσεις 💙
              </p>
            </div>
          </div>
        </FullScreenAd>
      )}
    </>
  );
}