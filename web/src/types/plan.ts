export type PlanName =
  | "FREE_MEMBER"
  | "VIP_MEMBER"
  | "COMPANY_BASIC"
  | "COMPANY_SILVER"
  | "COMPANY_GOLDEN"
  | "COMPANY_PLATINUM";

export const AdPolicy: Record<PlanName, { maxPerSession: number; minIntervalSec: number }> = {
  FREE_MEMBER:      { maxPerSession: 9999, minIntervalSec: 20 },
  COMPANY_BASIC:   { maxPerSession: 9999, minIntervalSec: 20 },
  COMPANY_SILVER:   { maxPerSession: 9999, minIntervalSec: 20 },
  COMPANY_GOLDEN:   { maxPerSession: 9999, minIntervalSec: 60 },
  COMPANY_PLATINUM: { maxPerSession: 0,    minIntervalSec: 0  },
  VIP_MEMBER:       { maxPerSession: 0,    minIntervalSec: 0  },
};
