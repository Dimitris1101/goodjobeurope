// C:\job-matching\web\src\lib\useAdManager.ts

"use client";
import { useCallback, useMemo, useState } from "react";
import { AdPolicy, type PlanName } from "@/types/plan";

function lsGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function getSessionId() {
  try {
    let sid = sessionStorage.getItem("ad.session");
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("ad.session", sid);
    }
    return sid;
  } catch {
    return "nosession";
  }
}

const DEFAULT_PLAN: PlanName = "FREE_MEMBER";

export function useAdManager(plan: PlanName | string) {
  // ✅ harden: ποτέ undefined policy (αν περάσει λάθος string / παλιό plan)
  const safePlan = (plan in AdPolicy ? (plan as PlanName) : DEFAULT_PLAN);
  const policy = AdPolicy[safePlan];

  const sessionId = useMemo(() => getSessionId(), []);
  const [visible, setVisible] = useState(false);

  const countKey = useMemo(() => `ad.count.${sessionId}`, [sessionId]);
  const lastKey = useMemo(() => `ad.last.${sessionId}`, [sessionId]);

  // ΑΚΡΙΒΩΣ τα seconds του policy (με safe fallback)
  const intervalSec = policy?.minIntervalSec ?? 0;

  // ✅ ΔΥΝΑΜΙΚΟΣ έλεγχος — ξανατρέχει κάθε φορά που τον καλείς
  const canShow = useCallback(() => {
    if (!policy || policy.maxPerSession <= 0) return false;

    const count = parseInt(lsGet(countKey) || "0", 10);
    if (count >= policy.maxPerSession) return false;

    const last = parseInt(lsGet(lastKey) || "0", 10);
    if (!last) return true;

    const elapsedMs = Date.now() - last;
    return elapsedMs >= intervalSec * 1000;
  }, [policy, countKey, lastKey, intervalSec]);

  const showAd = useCallback(() => {
    if (!canShow()) return false;
    setVisible(true);

    const next = parseInt(lsGet(countKey) || "0", 10) + 1;
    lsSet(countKey, String(next));
    lsSet(lastKey, String(Date.now()));
    return true;
  }, [canShow, countKey, lastKey]);

  const closeAd = useCallback(() => setVisible(false), []);

  const reset = useCallback(() => {
    lsDel(countKey);
    lsDel(lastKey);
    setVisible(false);
  }, [countKey, lastKey]);

  return {
    visible,
    showAd,
    closeAd,
    canShow,
    policy,
    reset,
    intervalSec,
    plan: safePlan, // extra debug-friendly
  };
}