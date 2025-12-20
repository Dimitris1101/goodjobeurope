export type PlanName = 'FREE' | 'PRO' | 'PREMIUM';

export type Plan = {
  id: number;
  name: PlanName;
  // αν θες και άλλα πεδία: adsEnabled?: boolean; priceCents?: number; ...
};

export type Candidate = {
  name?: string | null;
  location?: string | null;
  headline?: string | null;
  phone?: string | null;
  about?: string | null;
  education?: string | null;
  experience?: string | null;
  // ό,τι άλλο έχεις ήδη...
  plan?: Plan | null;        // <-- ΠΡΟΣΤΕΘΗΚΕ
  planName?: PlanName | null; // <-- flat εναλλακτική
};

export type Role = 'CANDIDATE' | 'COMPANY' | 'ADMIN';

export type Me = {
  id: number;
  email: string;
  role: Role;
  candidate?: Candidate | null;
  company?: unknown | null;  // βάλε τύπο όταν το χρειαστείς
};