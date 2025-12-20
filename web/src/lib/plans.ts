export type Audience = 'CANDIDATE' | 'COMPANY';
export type PlanKey = 'FREE' | 'VIP_MEMBER' | 'APLI' | 'SILVER' | 'GOLDEN';

export const PLAN_DB_NAME: Record<PlanKey, string> = {
  FREE: 'FREE',
  VIP_MEMBER: 'VIP MEMBER',
  APLI: 'ΑΠΛΗ',
  SILVER: 'SILVER',
  GOLDEN: 'GOLDEN',
};

export type UiPlan = {
  key: PlanKey;
  name: string;         // label στο UI
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
};

export function plansFor(audience: Audience): UiPlan[] {
  if (audience === 'CANDIDATE') {
    return [
      { key: 'FREE',       name: 'FREE',       price: '0€',       features: ['1 Φωτογραφία', 'Διαφημίσεις', 'ΟΧΙ προτεραιότητα σε αναζητήσεις'], cta: 'Ξεκίνα δωρεάν' },
      { key: 'VIP_MEMBER', name: 'VIP MEMBER', price: '15€/μήνα', features: ['Χωρίς διαφημίσεις', 'Πολλαπλές φωτογραφίες', 'Προτεραιότητα σε αναζητήσεις'], cta: 'Απόκτησέ το', popular: true },
    ];
  }
  return [
    { key: 'APLI',   name: 'ΑΠΛΗ',   price: '0€',       features: ['Περιορισμός στα profile υποψηγίων', 'Διαφημίσεις', 'Χαμηλή προτεραιότητα αναζητήσεων'], cta: 'Ξεκίνα' },
    { key: 'SILVER', name: 'SILVER', price: '20€/μήνα', features: ['Περιορισμός στα profile υποψηφίων', 'Λιγότερες διαφημίσεις', 'Μεσαία προτεραιότητα σε Matching'], cta: 'Απόκτησέ το', popular: true },
    { key: 'GOLDEN', name: 'GOLDEN', price: '35€/μήνα', features: ['Απεριόριστα match με υποψήφιους', 'Καθόλου διαφημίσεις', 'Επιλογή φίλτρων υποψηφίων'], cta: 'Γίνε PRO' },
  ];
}

export function planKeyFromQuery(q?: string | null): PlanKey | null {
  if (!q) return null;
  const up = decodeURIComponent(q).toUpperCase();
  const all: PlanKey[] = ['FREE','VIP_MEMBER','APLI','SILVER','GOLDEN'];
  return (all.find(k => k === up) ?? null);
}

export function audienceAllowedPlanKeys(audience: Audience): Set<PlanKey> {
  return new Set(audience === 'CANDIDATE'
    ? (['FREE','VIP_MEMBER'] as PlanKey[])
    : (['APLI','SILVER','GOLDEN'] as PlanKey[])
  );
}
