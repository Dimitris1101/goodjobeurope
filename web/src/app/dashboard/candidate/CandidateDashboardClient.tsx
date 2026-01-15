'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { mediaUrl, normalizeCvUrl, normalizeReferenceUrl } from '@/lib/media';
import Link from 'next/link';
import MessengerBadge from '@/components/MessengerBadge';
import LocationBar from '@/components/LocationBar';
import type { LocPref } from '@/types/location';
import LanguageTranslateToggle from "@/components/LanguageTranslateToggle";


/* ================= Types ================= */
type Role = 'CANDIDATE' | 'COMPANY' | 'ADMIN';
type Section = '#about' | '#experience' | '#contact' | '#extra';
type PlanName = string | null;

type LanguageRow = { name: string; level: string };

type CandidateCore = {
  name?: string;
  location?: string;
  headline?: string;
  phone?: string;
  about?: string;
  education?: string;
  experience?: string;
  volunteering?: string;
  avatarUrl?: string;
  cvUrl?: string;
  skills?: { skill: { name: string } }[];
  profileCompleted?: boolean;
  planName?: PlanName;

  gender?: string | null;
  birthDate?: string | null;
  countryOfOrigin?: string | null;
  driverLicenseA?: boolean | null;
  driverLicenseM?: boolean | null;
  preferredLanguage?: string | null;
  languages?: { id?: number; name: string; level: string }[];
  referenceLetterUrl?: string | null;
};

type Subscription = { status: string; plan?: { name: PlanName } | null };

type MeCandidate = {
  id: number;
  email: string;
  role: Role;
  candidate?: CandidateCore | null;
  subscriptions?: Subscription[];
};

type Baseline = {
  name: string;
  location: string;
  headline: string;
  phone: string;
  about: string;
  education: string;
  experience: string;
  volunteering: string;
  avatarUrl: string;
  cvUrl: string;

  gender: string;
  birthDate: string;
  countryOfOrigin: string;
  driverLicenseA: boolean;
  driverLicenseM: boolean;
  preferredLanguage: string;
  languages: LanguageRow[];
  referenceLetterUrl: string;
};

function ViewToggle() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"UI" | "ORIGINAL">("UI");

  useEffect(() => {
    const acc =
      localStorage.getItem("ui.accountLang") ||
      localStorage.getItem("uiAccountLang") ||
      localStorage.getItem("uiLanguage") ||
      "en";

    const view = localStorage.getItem("ui.viewLang") || acc;
    setMode(view === "en" ? "ORIGINAL" : "UI");
  }, []);

  const selectMode = (value: "UI" | "ORIGINAL") => {
    setMode(value);
    setOpen(false);

    const acc =
      localStorage.getItem("ui.accountLang") ||
      localStorage.getItem("uiAccountLang") ||
      localStorage.getItem("uiLanguage") ||
      "en";

    localStorage.setItem(
      "ui.viewLang",
      value === "ORIGINAL" ? "en" : acc.toLowerCase()
    );

    window.location.reload();
  };

  return (
    <div className="relative text-xs md:text-sm">
      <span className="hidden sm:inline opacity-70 mr-1 text-white">View:</span>

      <div
        className="min-w-[150px] cursor-pointer rounded-md bg-white text-black px-3 py-1 border border-white/40"
        onClick={() => setOpen(!open)}
      >
        {mode === "UI" ? "UI language" : "English (original)"}
      </div>

      {open && (
        <div className="absolute left-0 mt-1 w-full rounded-md shadow-lg bg-white text-black border border-gray-200 z-40">
          <div
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => selectMode("UI")}
          >
            UI language
          </div>
          <div
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => selectMode("ORIGINAL")}
          >
            English (original)
          </div>
        </div>
      )}
    </div>
  );
}




/* ======= Matchups types ======= */
type JobCard = {
  id: number;
  title: string;
  description: string;
  location?: string | null;
  workMode: 'ONSITE' | 'REMOTE' | 'HYBRID';
  requireLicenseA: boolean;
  requireLicenseM: boolean;
  skills: string[];
  company?: { name?: string; logoUrl?: string | null };
  createdAt: string;
  sector?:
    | 'IT'
    | 'SALES'
    | 'ADMIN'
    | 'LOGISTICS'
    | 'FINANCE'
    | 'MARKETING'
    | 'FOOD'
    | 'TOURISM'
    | 'GENERAL_WORKERS'
    | 'OTHER'
    | null;
  sectorOtherText?: string | null;
};

type MyLikeRow = {
  jobId: number;
  title: string;
  location?: string | null;
  companyName?: string;
  companyLogoUrl?: string | null;
  createdAt: string;
};

/* ======= Filters ======= */
const SECTOR_ENUMS = [
  { value: 'IT', label: 'IT' },
  { value: 'SALES', label: 'Sales' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'FOOD', label: 'Food' },
  { value: 'TOURISM', label: 'Tourism' },
  { value: 'GENERAL_WORKERS', label: 'General workers' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SECTOR_LABEL: Record<(typeof SECTOR_ENUMS)[number]['value'], string> =
  Object.fromEntries(SECTOR_ENUMS.map((s) => [s.value, s.label])) as any;

/* ======= Helpers ======= */
function areLocListsEqual(a: LocPref[], b: LocPref[]) {
  if (a.length !== b.length) return false;
  const norm = (l: LocPref) =>
    `${l.placeId ?? ''}|${l.description ?? ''}|${l.lat ?? ''}|${l.lng ?? ''}|${
      l.countryCode ?? ''
    }`;
  const as = a.map(norm).sort().join('||');
  const bs = b.map(norm).sort().join('||');
  return as === bs;
}

/* ======= UI helpers ======= */
function ToggleChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-3 py-1 text-sm border ${
        active
          ? 'bg-white text-black border-white'
          : 'border-white/50 text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function PhotoCard({
  title,
  imageUrl,
  onClick,
}: {
  title: string;
  imageUrl: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative block w-full min-h-[260px] md:min-h-[300px] overflow-hidden rounded-2xl text-left shadow focus:outline-none focus:ring-2 focus:ring-white/30"
    >
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <span className="inline-block rounded-lg bg-white px-4 md:px-5 py-2 text-lg md:text-2xl font-semibold text-black shadow">
          {title}
        </span>
      </div>
    </button>
  );
}

function Stars({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, Math.floor(value)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < clamped;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${
              filled ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
          >
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        );
      })}
    </div>
  );
}

type RatingRow = {
  jobId: number;
  jobTitle: string;
  companyName: string;
  rating: number;
  ratedAt: string;
};

function CompanyRatingsCard() {
  const [ratings, setRatings] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RatingRow[]>('/candidate/ratings')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setRatings(res.data);
        } else {
          setRatings([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load ratings', err);
        setError('Failed to load ratings.');
        setRatings([]);
      });
  }, []);

  return (
    <div className="rounded-2xl bg-white p-5 text-black shadow w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Company ratings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs md:text-sm text-gray-600">
              <th className="py-2 pr-3 font-medium">Job</th>
              <th className="py-2 pr-3 font-medium">Company</th>
              <th className="py-2 pr-3 font-medium">Rating</th>
              <th className="py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {ratings === null && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}

            {ratings !== null && ratings.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  No ratings yet.
                </td>
              </tr>
            )}

            {error && ratings?.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-red-500 text-sm"
                >
                  {error}
                </td>
              </tr>
            )}

            {(ratings ?? []).map((r, idx) => (
              <tr key={idx} className="border-t border-gray-200">
                <td className="py-3 pr-3">{r.jobTitle}</td>
                <td className="py-3 pr-3">{r.companyName || '—'}</td>
                <td className="py-3">
                  <Stars value={r.rating} />
                </td>
                <td className="py-3 text-sm text-gray-500">
                  {new Date(r.ratedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SidebarCalendar() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthName = new Intl.DateTimeFormat('en', {
    month: 'long',
  }).format(now).toUpperCase();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { num: number; inMonth: boolean }[] = [];
  for (let i = 0; i < firstDay; i++)
    cells.push({ num: prevMonthDays - firstDay + 1 + i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ num: d, inMonth: true });
  while (cells.length < 42)
    cells.push({
      num: cells.length - (firstDay + daysInMonth) + 1,
      inMonth: false,
    });

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  return (
    <div className="mt-6 md:mt-8 w-full md:w-[26rem] overflow-hidden rounded-2xl shadow-2xl">
      <div className="w-full bg-gradient-to-t from-[#3498DB] to-[#02548b] px-4 text-center text-white">
        <div className="h-20 text-[28px] md:text-[34px] leading-[80px] tracking-wide">
          {monthName}
        </div>
      </div>
      <div className="w-full bg-white text-black">
        <div className="grid grid-cols-7">
          {dayNames.map((d) => (
            <div
              key={d}
              className="h-10 text-center leading-10 text-xs md:text-sm uppercase"
            >
              {d}
            </div>
          ))}
        </div>
      </div>
      <div className="w-full bg-black">
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const isToday = cell.inMonth && cell.num === today;
            return (
              <div
                key={i}
                className={[
                  'h-[44px] md:h-[60px] w-full border-t border-l border-white text-center leading-[44px] md:leading-[60px] text-sm',
                  i % 7 === 6 ? 'border-r' : '',
                  i >= 35 ? 'border-b' : '',
                  cell.inMonth
                    ? 'bg-[#cccccc] text-black'
                    : 'bg-[#cccccc]/80 text-black/80',
                  isToday ? 'bg-[#02548b] text-white' : '',
                  !isToday
                    ? 'hover:bg-[#02548b] hover:text-white transition-colors'
                    : '',
                ].join(' ')}
              >
                {cell.num}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================ Component ================ */

export default function CandidateDashboard() {
  const router = useRouter();

  const [me, setMe] = useState<MeCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'DASH' | 'MATCHUPS'>('MATCHUPS');
  const [filterLocations, setFilterLocations] = useState<LocPref[]>([]);
  const [open, setOpen] = useState<Section | null>(null);

  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [baselineSkills, setBaselineSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const cvId = useId();
  const refId = useId();
  const avatarInputId = useId();

  const [original, setOriginal] = useState<Baseline>({
    name: '',
    location: '',
    headline: '',
    phone: '',
    about: '',
    education: '',
    experience: '',
    volunteering: '',
    avatarUrl: '',
    cvUrl: '',
    gender: '',
    birthDate: '',
    countryOfOrigin: '',
    driverLicenseA: false,
    driverLicenseM: false,
    preferredLanguage: '',
    languages: [],
    referenceLetterUrl: '',
  });

  const [form, setForm] = useState<{
    name: string;
    location: string;
    headline: string;
    phone: string;
    about: string;
    education: string;
    experience: string;
    volunteering: string;
    avatar: File | null;
    cv: File | null;
    gender: string;
    birthDate: string;
    countryOfOrigin: string;
    driverLicenseA: boolean;
    driverLicenseM: boolean;
    preferredLanguage: string;
    languages: LanguageRow[];
    referenceLetter: File | null;
  }>({
    name: '',
    location: '',
    headline: '',
    phone: '',
    about: '',
    education: '',
    experience: '',
    volunteering: '',
    avatar: null,
    cv: null,
    gender: '',
    birthDate: '',
    countryOfOrigin: '',
    driverLicenseA: false,
    driverLicenseM: false,
    preferredLanguage: '',
    languages: [],
    referenceLetter: null,
  });

  const [stack, setStack] = useState<JobCard[]>([]);
  const [likes, setLikes] = useState<MyLikeRow[]>([]);
  const [matchErr, setMatchErr] = useState<string | null>(null);
  const [filterSectors, setFilterSectors] = useState<string[]>([]);
  const [sectorOtherFilter, setSectorOtherFilter] = useState<string>('');

  // ------------ Hooks for nested UI -------------
  const addLangRow = useCallback(
    () =>
      setForm((f) => ({
        ...f,
        languages: [...f.languages, { name: '', level: '' }],
      })),
    [],
  );
  const removeLangRow = useCallback(
    (idx: number) =>
      setForm((f) => ({
        ...f,
        languages: f.languages.filter((_, i) => i !== idx),
      })),
    [],
  );
  const setLangName = useCallback((idx: number, name: string) => {
    setForm((f) => {
      const copy = [...f.languages];
      copy[idx] = { ...copy[idx], name };
      return { ...f, languages: copy };
    });
  }, []);
  const setLangLevel = useCallback((idx: number, level: string) => {
    setForm((f) => {
      const copy = [...f.languages];
      copy[idx] = { ...copy[idx], level };
      return { ...f, languages: copy };
    });
  }, []);

  /* -------- Fetch matchups -------- */
  const fetchMatches = useCallback(
    async (opts?: { useFilters?: boolean }) => {
      try {
        setMatchErr(null);
        const params: any = { limit: 30 };

        if (opts?.useFilters) {
          if (filterSectors.length) {
            params.sectors = filterSectors.join(',');
            if (filterSectors.includes('OTHER') && sectorOtherFilter.trim()) {
              params.sectorOtherText = sectorOtherFilter.trim();
            }
          }

          const placeIds = filterLocations
            .map((l) => l.placeId)
            .filter(Boolean);
          if (placeIds.length) {
            params.placeIds = placeIds.join(',');
          } else if (filterLocations.length) {
            params.locations = filterLocations
              .map((l) => l.description)
              .join(',');
          }
        }

        const { data } = await api.get<JobCard[]>('/candidate/matchups', {
          params,
        });
        setStack(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setStack([]);
        setMatchErr(
          e?.response?.data?.message ?? 'Failed to load matchups.',
        );
      }
    },
    [filterLocations, filterSectors, sectorOtherFilter],
  );

  // likes
  const fetchLikes = useCallback(async () => {
    try {
      const { data } = await api.get<MyLikeRow[]>('/candidate/likes');
      setLikes(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchLikes();
  }, [fetchLikes]);

  /* -------- Load me + first data -------- */
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null;
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    api
      .get<MeCandidate>('/me')
      .then(async ({ data }) => {
        if (!data || data.role !== 'CANDIDATE') {
          router.replace('/');
          return;
        }
        if (data.candidate?.profileCompleted === false) {
          router.replace('/onboarding/candidate');
          return;
        }

        const activePlanName: PlanName =
          (data.subscriptions?.[0]?.plan?.name as
            | PlanName
            | undefined) ?? null;

        const normalized: MeCandidate = {
          ...data,
          candidate: data.candidate
            ? { ...data.candidate, planName: activePlanName }
            : { planName: activePlanName },
        };
        setMe(normalized);

        const serverSkills = (data.candidate?.skills ?? [])
          .map((s) => s.skill.name)
          .filter(Boolean);
        setSkillsList(serverSkills);
        setBaselineSkills(serverSkills);

        const c = normalized.candidate ?? {};
        const baseline: Baseline = {
          name: c.name ?? '',
          location: c.location ?? '',
          headline: c.headline ?? '',
          phone: c.phone ?? '',
          about: c.about ?? '',
          education: c.education ?? '',
          experience: c.experience ?? '',
          volunteering: c.volunteering ?? '',
          avatarUrl: c.avatarUrl ?? '',
          cvUrl: c.cvUrl ?? '',
          gender: c.gender ?? '',
          birthDate: c.birthDate
            ? (c.birthDate as string).slice(0, 10)
            : '',
          countryOfOrigin: c.countryOfOrigin ?? '',
          driverLicenseA: !!c.driverLicenseA,
          driverLicenseM: !!c.driverLicenseM,
          preferredLanguage: c.preferredLanguage ?? '',
          languages: (c.languages ?? []).map((l) => ({
            name: l.name,
            level: l.level,
          })),
          referenceLetterUrl: c.referenceLetterUrl ?? '',
        };

        setOriginal(baseline);
        setForm({
          name: baseline.name,
          location: baseline.location,
          headline: baseline.headline,
          phone: baseline.phone,
          about: baseline.about,
          education: baseline.education,
          experience: baseline.experience,
          volunteering: baseline.volunteering,
          avatar: null,
          cv: null,
          gender: baseline.gender,
          birthDate: baseline.birthDate,
          countryOfOrigin: baseline.countryOfOrigin,
          driverLicenseA: baseline.driverLicenseA,
          driverLicenseM: baseline.driverLicenseM,
          preferredLanguage: baseline.preferredLanguage,
          languages: baseline.languages,
          referenceLetter: null,
        });

        await Promise.all([fetchMatches(), fetchLikes()]);
      })
      .finally(() => setLoading(false));
  }, [router, fetchMatches, fetchLikes]);

  // ======= Persist filters =======
  useEffect(() => {
    const payload = JSON.stringify({
      locations: filterLocations.map((l) => ({
        placeId: l.placeId,
        description: l.description,
        lat: l.lat,
        lng: l.lng,
        countryCode: l.countryCode ?? null,
      })),
      sectors: filterSectors,
    });
    localStorage.setItem('matchupFilters', payload);
  }, [filterLocations, filterSectors]);

  // ======= Restore filters on mount =======
  useEffect(() => {
    try {
      const raw = localStorage.getItem('matchupFilters');
      if (raw) {
        const f = JSON.parse(raw);
        if (Array.isArray(f.locations)) {
          const list: LocPref[] = f.locations.map((it: any) =>
            typeof it === 'string'
              ? {
                  placeId: it,
                  description: it,
                  countryCode: null,
                }
              : it,
          );
          setFilterLocations(list);
        }
        if (Array.isArray(f.sectors)) setFilterSectors(f.sectors);
      }
    } catch {}
  }, []);

  // ======= Debounced fetch when filters change =======
  const fetchDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (fetchDebounceRef.current)
      window.clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = window.setTimeout(() => {
      void fetchMatches({ useFilters: true });
    }, 250);
    return () => {
      if (fetchDebounceRef.current)
        window.clearTimeout(fetchDebounceRef.current);
    };
  }, [filterLocations, filterSectors, fetchMatches]);

  // idempotent onChange for LocationBar
  const handleLocationChange = useCallback((list: LocPref[]) => {
    setFilterLocations((prev) =>
      areLocListsEqual(prev, list) ? prev : list,
    );
  }, []);

  // ============== EARLY RETURN AFTER HOOKS ONLY ==============
  if (loading || !me)
    return <div className="p-8 text-center text-white">Loading...</div>;

  /* ====== derived values ====== */
  const c = me.candidate ?? {};
  const activePlan = (c.planName ?? 'NO PLAN') as string;

  const rawCv = me.candidate?.cvUrl || original.cvUrl || '';
  const cvHref = mediaUrl(normalizeCvUrl(rawCv));

  const planRaw =
    (me as any)?.plan ?? me?.subscriptions?.[0]?.plan?.name ?? null;

  const isVip =
    typeof planRaw === 'string' && planRaw.toUpperCase().includes('VIP');
  const isFree =
    typeof planRaw === 'string' && planRaw.toUpperCase().includes('FREE');
  const MAX_LIKES = isVip ? Infinity : 10;
  const likeLimitReached = !isVip && likes.length >= 10;

  const serverAvatarUrl =
    me.candidate?.avatarUrl || original.avatarUrl || '';
  const avatarUploadedSrc = serverAvatarUrl
    ? mediaUrl(serverAvatarUrl)
    : null;
  const avatarSrc =
    avatarPreview ||
    avatarUploadedSrc ||
    (isFree ? '/free_profil.jpg' : '/default_avatar.jpg');

  // Swipe
  const swipe = async (decision: 'LIKE' | 'PASS') => {
    if (!stack.length) return;
    const job = stack[0];

    try {
      await api.post('/candidate/swipe', { jobId: job.id, decision });
      setStack((prev) => prev.filter((j) => j.id !== job.id));

      if (decision === 'LIKE') {
        const optimistic: MyLikeRow = {
          jobId: job.id,
          title: job.title,
          location: job.location ?? undefined,
          companyName: job.company?.name,
          companyLogoUrl: job.company?.logoUrl ?? null,
          createdAt: new Date().toISOString(),
        };
        setLikes((prev) => [optimistic, ...prev]);
        await fetchLikes();
      }

      if (stack.length <= 1) fetchMatches({ useFilters: true });
    } catch (e: any) {
      setMatchErr(
        e?.response?.data?.message ?? 'Failed to record swipe.',
      );
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    router.replace('/auth/login');
  };

  // ======= SAVE HELPERS =======
  const buildPartialFD = (
    fields: Record<string, unknown>,
    files?: {
      avatar?: File | null;
      cv?: File | null;
      referenceLetter?: File | null;
    },
  ) => {
    const fd = new FormData();
    fd.append('name', form.name || original.name || '');

    Object.entries(fields).forEach(([key, value]) => {
      if (key === 'languages') {
        const json = JSON.stringify(value);
        if (json !== JSON.stringify(original.languages))
          fd.append('languages', json);
        return;
      }
      if (typeof value === 'boolean') {
        if (value !== (original as any)[key])
          fd.append(key, String(value));
        return;
      }
      if (typeof value === 'string') {
        const oldVal = (original as any)[key] ?? '';
        if (value !== oldVal && !(key === 'birthDate' && !value)) {
          fd.append(key, value);
        }
        return;
      }
      if (value == null) return;
    });

    if (JSON.stringify(skillsList) !== JSON.stringify(baselineSkills)) {
      fd.append('skillsCsv', skillsList.join(','));
    }
    if (files?.avatar) fd.append('avatar', files.avatar);
    if (files?.cv) fd.append('cv', files.cv);
    if (files?.referenceLetter)
      fd.append('referenceLetter', files.referenceLetter);

    return fd;
  };

  const applyUpdatedToState = (updated?: Partial<CandidateCore>) => {
    setMe((prev) => {
      if (!prev) return prev;
      const mergedCandidate: CandidateCore = {
        ...(prev.candidate ?? {}),
        ...(updated ?? {}),
      };
      return { ...prev, candidate: mergedCandidate };
    });

    setOriginal((o) => ({
      ...o,
      name: form.name || o.name,
      location: form.location,
      headline: form.headline,
      phone: form.phone,
      about: form.about,
      education: form.education,
      experience: form.experience,
      volunteering: form.volunteering,
      avatarUrl:
        (updated?.avatarUrl ?? me?.candidate?.avatarUrl ?? '') ||
        o.avatarUrl ||
        '',
      cvUrl:
        (updated?.cvUrl ?? me?.candidate?.cvUrl ?? '') ||
        o.cvUrl ||
        '',
      gender: form.gender,
      birthDate: form.birthDate,
      countryOfOrigin: form.countryOfOrigin,
      preferredLanguage: form.preferredLanguage,
      driverLicenseA: form.driverLicenseA,
      driverLicenseM: form.driverLicenseM,
      languages: form.languages,
      referenceLetterUrl:
        updated?.referenceLetterUrl ??
        me?.candidate?.referenceLetterUrl ??
        o.referenceLetterUrl ??
        '',
    }));
    setBaselineSkills(skillsList);
  };

  const savePartial = async (
    fields: Record<string, unknown>,
    files?: {
      avatar?: File | null;
      cv?: File | null;
      referenceLetter?: File | null;
    },
  ) => {
    const fd = buildPartialFD(fields, files);
    const { data: updated } = await api.put<Partial<CandidateCore>>(
      '/me/candidate',
      fd,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    applyUpdatedToState(updated);
  };

  return (
    <div
      className="relative min-h-screen text-[#2b2c48] bg-cover bg-center"
      style={{ backgroundImage: "url('/backround_cand_dashboard.jpg')" }}
    >

            <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-white md:flex-row md:items-center md:justify-between">
        {/* Left side: plan + welcome */}
        <div className="flex flex-col gap-3">
          {/* Plan + upgrade */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {activePlan || "NO PLAN"}
            </span>

            {isFree && (
              <Link
                href="/onboarding/plan"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-600"
              >
                Upgrade plan
              </Link>
            )}
          </div>

          {/* Welcome text */}
          <div>
            <div className="text-sm md:text-base opacity-90">Welcome</div>
            <div className="text-xl md:text-2xl font-semibold break-words">
              {original.name || "Candidate"}
            </div>
          </div>
        </div>

        {/* Right side: view + nav buttons */}
        <nav className="flex flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
          {/* View toggle */}
          <LanguageTranslateToggle />

  {/* Tabs */}
  <button
  onClick={() => setTab("MATCHUPS")}
  className={`rounded-xl border px-3 py-1.5 text-xs sm:text-sm md:text-base ${
    tab === "MATCHUPS"
      ? "bg-[#00F0FF] text-black border-[#00F0FF] shadow-lg shadow-[#00F0FF]/40"
      : "border-[#00F0FF] text-[#00F0FF]"
  }`}
>
  Matchups
</button>

          <button
            onClick={() => setTab("DASH")}
            className={`rounded-xl border px-3 py-1.5 text-xs sm:text-sm md:text-base ${
              tab === "DASH"
                ? "bg-white text-[#231E39] border-white"
                : "border-white text-white"
            }`}
          >
            Dashboard
          </button>

          {/* Messenger */}
          <Link
            href="/messenger"
            className="relative inline-flex items-center rounded-xl border border-white/30 bg-black/40 px-3 py-1.5 text-xs sm:text-sm md:text-base text-white hover:bg-black/60"
            aria-label="Open Messenger"
          >
            Messenger
            <span className="absolute -right-2 -top-2">
              <MessengerBadge role="CANDIDATE" />
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="rounded-xl bg-white px-3 py-1.5 text-xs sm:text-sm md:text-base font-medium text-[#231E39]"
          >
            Log out
          </button>
        </nav>
      </header>


      <main className="relative z-10 mx-auto max-w-6xl px-3 pb-12">
        {/* ================== MATCHUPS TAB ================== */}
        {tab === 'MATCHUPS' ? (
          <>
            {/* Filters row */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {/* LEFT: Locations */}
              <div className="rounded-2xl border border-white/40 bg-black/40 backdrop-blur px-4 py-4 text-white">
                <label className="mb-1 block text-sm opacity-90">
                  Locations (up to 3)
                </label>
                <LocationBar max={3} onChange={handleLocationChange} />

                {/* Selected chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {filterLocations.length ? (
                    filterLocations.map((l, i) => (
                      <span
                        key={(l.placeId || l.description) + i}
                        className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm"
                      >
                        {l.description}
                        <button
                          type="button"
                          className="rounded-full bg-white/20 px-1 leading-none hover:bg-white/30"
                          onClick={() =>
                            setFilterLocations((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          aria-label="Remove location"
                          title="Remove location"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/70">
                      No selected locations
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: Sectors */}
              <section className="rounded-2xl border border-white/40 bg-black/40 backdrop-blur px-4 py-4 text-white">
                <label className="mb-1 block text-sm opacity-90">
                  Sectors
                </label>
                <div className="flex flex-wrap gap-2">
                  {SECTOR_ENUMS.map((sec) => (
                    <ToggleChip
                      key={sec.value}
                      label={sec.label}
                      active={filterSectors.includes(sec.value)}
                      onToggle={() =>
                        setFilterSectors((prev) =>
                          prev.includes(sec.value)
                            ? prev.filter((s) => s !== sec.value)
                            : [...prev, sec.value],
                        )
                      }
                    />
                  ))}
                </div>

                {/* Other sector keywords */}
                {filterSectors.includes('OTHER') && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm opacity-90">
                      Other sector (keywords)
                    </label>
                    <input
                      className="w-full rounded-lg border border-white/40 bg-white/95 px-3 py-2 text-black text-sm"
                      placeholder="e.g. Metal constructions, Painting…"
                      value={sectorOtherFilter}
                      onChange={(e) =>
                        setSectorOtherFilter(e.target.value)
                      }
                    />
                    <p className="mt-1 text-xs text-white/80">
                      Only ads with the Other sector will be searched when
                      this is used.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchMatches({ useFilters: true })}
                    className="rounded-xl bg-white px-4 py-2 text-black font-medium text-sm"
                  >
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSectors([]);
                      setSectorOtherFilter('');
                    }}
                    className="rounded-xl border border-white/40 px-4 py-2 text-white text-sm"
                  >
                    Clear sectors
                  </button>
                </div>
              </section>
            </div>

            {/* Matchups + Likes row */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
              {/* LEFT: swipe card */}
              <aside className="rounded-2xl border border-white/50 p-5 text-white bg-black/40 backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="font-semibold text-lg">Matchups</div>
                  <div className="text-xs md:text-sm rounded-md bg-white/15 px-2 py-1">
                    Likes:{' '}
                    <b>
                      {likes.length}
                    </b>{' '}
                    / {isVip ? '∞' : MAX_LIKES}
                  </div>
                </div>

                {stack.length ? (
                  <div className="relative w-full overflow-hidden rounded-2xl border border-white/20 bg-white text-[#333] shadow-xl">
                    <div className="relative h-72 md:h-80 overflow-hidden bg-black">
                      {stack[0].company?.logoUrl ? (
                        <img
                          src={mediaUrl(stack[0].company.logoUrl)}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-60"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-white/70">
                          Company
                        </div>
                      )}
                      <div className="absolute left-4 top-4 flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            style={{ width: 10, height: 10 }}
                            className={`rounded-full ${
                              i === 0 ? 'bg-rose-500' : 'bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-b border-black/10 p-4">
                      <h2 className="text-lg md:text-2xl font-semibold leading-tight">
                        {stack[0].title}
                        <span className="ml-1 md:ml-2 text-sm md:text-base font-normal text-gray-500">
                          {stack[0].location
                            ? `· ${stack[0].location}`
                            : ''}
                        </span>
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {stack[0].company?.name ?? ''}
                        {stack[0].workMode
                          ? ` · ${stack[0].workMode}`
                          : ''}
                        {(stack[0].requireLicenseA ||
                          stack[0].requireLicenseM) && (
                          <>
                            {' '}
                            · License{' '}
                            {stack[0].requireLicenseA ? 'A' : ''}
                            {stack[0].requireLicenseM ? ' M' : ''}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="p-4">
                      <div className="mb-1 text-sm text-gray-700">
                        Required skills:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stack[0].skills?.length ? (
                          stack[0].skills.map((s) => (
                            <span
                              key={s}
                              className="rounded bg-gray-100 px-2.5 py-1 text-xs md:text-sm"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-sm text-gray-700 line-clamp-5">
                        {stack[0].description}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => swipe('PASS')}
                        className="grid h-14 w-14 md:h-16 md:w-16 place-items-center rounded-full bg-rose-500 text-xl text-white transition hover:brightness-110 active:scale-95"
                        title="Pass"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => swipe('LIKE')}
                        disabled={likeLimitReached}
                        className={`grid h-14 w-14 md:h-16 md:w-16 place-items-center rounded-full text-xl text-white active:scale-95 transition ${
                          likeLimitReached
                            ? 'cursor-not-allowed bg-emerald-800/60'
                            : 'bg-emerald-500 hover:brightness-110'
                        }`}
                        title={
                          likeLimitReached
                            ? '10 Likes limit on the free plan'
                            : 'Like'
                        }
                      >
                        ❤
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm md:text-base text-white/80">
                    No more job ads at the moment.
                  </div>
                )}

                {matchErr && (
                  <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                    {matchErr}
                  </div>
                )}
              </aside>

              {/* RIGHT: Likes table */}
              <section className="rounded-2xl border border-white/30 bg-black/80 p-3 text-white">
                <div className="mb-3 font-medium">
                  Ads you liked
                </div>
                <div className="max-h-[520px] overflow-auto rounded-lg border border-white/10">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/70">
                        <th className="py-2 px-3">Job</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {likes.length ? (
                        likes.map((r) => (
                          <tr
                            key={`${r.jobId}-${r.createdAt}`}
                            className="border-b border-white/10"
                          >
                            <td className="py-2 px-3">{r.title}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {r.companyLogoUrl ? (
                                  <img
                                    src={mediaUrl(r.companyLogoUrl)}
                                    className="h-7 w-7 rounded object-cover"
                                    alt=""
                                  />
                                ) : (
                                  <span className="inline-block h-7 w-7 rounded bg-white/20" />
                                )}
                                <span>{r.companyName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {r.location ?? '—'}
                            </td>
                            <td className="py-2 px-3">
                              {new Date(
                                r.createdAt,
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 px-3 text-white/60"
                          >
                            No likes yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        ) : null}

        {/* ================== DASHBOARD TAB ================== */}
        {tab === 'DASH' && (
          <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-2 py-4 md:flex-row md:gap-10">
            {/* LEFT column */}
            <aside className="w-full md:w-[23rem] md:mr-4 flex flex-col items-center md:items-start">
              <div className="w-full overflow-hidden rounded-2xl">
                <div className="flex min-h-[34rem] md:min-h-[38rem] flex-col justify-start bg-[#5847eb] px-6 text-[#dfe6ff]">
                  <div className="pt-6" />

                  {/* Upgrade modal */}
                  {upgradeOpen && (
                    <div className="fixed inset-0 z-[200] grid place-items-center">
                      <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setUpgradeOpen(false)}
                      />
                      <div className="relative z-[201] w-[min(92vw,460px)] rounded-2xl bg-white p-6 shadow-xl">
                        <h4 className="text-xl font-semibold text-black">
                          Become VIP to upload a profile photo
                        </h4>
                        <p className="mt-2 text-sm text-slate-600">
                          Adding a profile photo is available only for VIP
                          members.
                        </p>
                        <div className="mt-5 flex items-center justify-end gap-2">
                          <button
                            onClick={() => setUpgradeOpen(false)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <Link
                            href="/onboarding/plan"
                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:brightness-110"
                          >
                            Upgrade to VIP
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="my-4 flex justify-center md:justify-start">
                    <div>
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        className={`h-[120px] w-[120px] md:h-[140px] md:w-[140px] rounded-full border-[4px] border-white object-cover ${
                          isFree
                            ? 'cursor-not-allowed opacity-95'
                            : 'cursor-pointer'
                        }`}
                        title={
                          isFree
                            ? 'Available only for VIP'
                            : 'Change profile photo'
                        }
                        onClick={() => {
                          if (isFree) {
                            setUpgradeOpen(true);
                          } else {
                            const el = document.getElementById(
                              avatarInputId,
                            ) as HTMLInputElement | null;
                            el?.click();
                          }
                        }}
                      />

                      {/* hidden file input */}
                      <input
                        id={avatarInputId}
                        ref={avatarFileRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>,
                        ) => {
                          if (!isVip) {
                            e.currentTarget.value = '';
                            setUpgradeOpen(true);
                            return;
                          }
                          const file = e.target.files?.[0] ?? null;
                          setForm({ ...form, avatar: file });
                          setAvatarPreview(
                            file ? URL.createObjectURL(file) : null,
                          );
                          if (file) {
                            savePartial({}, { avatar: file }).finally(
                              () => setAvatarPreview(null),
                            );
                          }
                        }}
                      />

                      {isFree && (
                        <div className="mt-2 rounded-md bg-white/15 px-3 py-1 text-xs md:text-sm text-white">
                          Profile photo is available only for VIP users.
                          <Link
                            href="/onboarding/plan"
                            className="ml-2 underline"
                          >
                            Upgrade
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h1 className="mt-1 text-[32px] md:text-[44px] leading-tight font-light text-white">
                      {original.name || 'Candidate'}
                    </h1>
                    <p className="mt-3 text-white/95 text-base md:text-lg">
                      {original.headline || 'Software developer'}
                    </p>

                    {/* Contact details */}
                    <div className="mt-5 space-y-2 text-white text-sm">
                      <div className="opacity-90">
                        <span className="opacity-80">Email:</span>{' '}
                        <span className="font-medium">
                          {me.email || '—'}
                        </span>
                      </div>
                      <div className="opacity-90">
                        <span className="opacity-80">Gender:</span>{' '}
                        <span className="font-medium">
                          {original.gender || '—'}
                        </span>
                      </div>
                      <div className="opacity-90">
                        <span className="opacity-80">Phone:</span>{' '}
                        <span className="font-medium">
                          {original.phone || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <SidebarCalendar />
            </aside>

            {/* RIGHT: 2x2 cards + ratings */}
            <div className="grid w-full grid-cols-12 gap-6 md:gap-8 items-start">
              {/* Row 1 */}
              <div className="col-span-12 md:col-span-6">
                <PhotoCard
                  title="About"
                  imageUrl="/about.jpg"
                  onClick={() => setOpen('#about')}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <PhotoCard
                  title="Experience"
                  imageUrl="/experience.jpg"
                  onClick={() => setOpen('#experience')}
                />
              </div>

              {/* Row 2 */}
              <div className="col-span-12 md:col-span-6">
                <PhotoCard
                  title="Contact"
                  imageUrl="/contact.jpg"
                  onClick={() => setOpen('#contact')}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <PhotoCard
                  title="Extra"
                  imageUrl="/extra.jpg"
                  onClick={() => setOpen('#extra')}
                />
              </div>

              {/* Ratings bottom-right */}
              <div className="col-span-12 md:col-span-6 md:col-start-7">
                <CompanyRatingsCard />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== Modals ===== */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(null)}
          />
          <div className="relative z-[101] w-[min(92vw,980px)] max-h-[88vh] overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <h3 className="text-2xl font-semibold text-black">
                {open === '#about'
                  ? 'About'
                  : open === '#experience'
                  ? 'Experience'
                  : open === '#contact'
                  ? 'Contact'
                  : 'Extra'}
              </h3>
              <button
                onClick={() => setOpen(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            {/* ABOUT */}
            {open === '#about' && (
              <div className="space-y-4 text-black">
                <div className="grid md:grid-cols-2 gap-4">
                  <FieldInput
                    label="Name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                  />
                  <FieldInput
                    label="Location"
                    value={form.location}
                    onChange={(v) =>
                      setForm({ ...form, location: v })
                    }
                  />
                  <FieldInput
                    label="Headline"
                    value={form.headline}
                    onChange={(v) =>
                      setForm({ ...form, headline: v })
                    }
                  />
                  <FieldInput
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </div>

                {/* Basic selects */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      Gender
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender: e.target.value,
                        })
                      }
                    >
                      {[
                        { v: '', l: '—' },
                        { v: 'MALE', l: 'Male' },
                        { v: 'FEMALE', l: 'Female' },
                        { v: 'OTHER', l: 'Other' },
                        {
                          v: 'PREFER_NOT_SAY',
                          l: 'Prefer not to say',
                        },
                      ].map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      Date of birth
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      value={form.birthDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          birthDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      Country of origin
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      value={form.countryOfOrigin}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          countryOfOrigin: e.target.value,
                        })
                      }
                    >
                      {[
                        { v: '', l: '—' },
                        { v: 'GR', l: 'Greece' },
                        { v: 'CY', l: 'Cyprus' },
                        { v: 'AL', l: 'Albania' },
                        { v: 'BG', l: 'Bulgaria' },
                        { v: 'RO', l: 'Romania' },
                        { v: 'PL', l: 'Poland' },
                        { v: 'IT', l: 'Italy' },
                        { v: 'ES', l: 'Spain' },
                        { v: 'FR', l: 'France' },
                        { v: 'DE', l: 'Germany' },
                        { v: 'UK', l: 'United Kingdom' },
                        { v: 'UA', l: 'Ukraine' },
                      ].map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      UI language
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      value={form.preferredLanguage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          preferredLanguage: e.target.value,
                        })
                      }
                    >
                      {[
                        { v: 'en', l: 'English' },
                        { v: 'el', l: 'Greek' },
                        { v: 'de', l: 'German' },
                        { v: 'fr', l: 'French' },
                        { v: 'it', l: 'Italian' },
                        { v: 'es', l: 'Spanish' },
                        { v: 'ar', l: 'Arabic' },
                      ].map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <FieldTextarea
                  label="About me"
                  value={form.about}
                  onChange={(v) =>
                    setForm({ ...form, about: v })
                  }
                />

                {/* Skills */}
                <SkillsEditor
                  skillsList={skillsList}
                  setSkillsList={setSkillsList}
                  skillInput={skillInput}
                  setSkillInput={setSkillInput}
                />

                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      await savePartial({
                        name: form.name,
                        location: form.location,
                        headline: form.headline,
                        phone: form.phone,
                        gender: form.gender,
                        birthDate: form.birthDate,
                        countryOfOrigin: form.countryOfOrigin,
                        preferredLanguage: form.preferredLanguage,
                        about: form.about,
                      });
                      setOpen(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-black hover:bg-gray-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* EXPERIENCE */}
            {open === '#experience' && (
              <div className="space-y-4 text-black">
                <FieldTextarea
                  label="Experience"
                  value={form.experience}
                  onChange={(v) =>
                    setForm({ ...form, experience: v })
                  }
                  rows={10}
                />
                <FieldTextarea
                  label="Education"
                  value={form.education}
                  onChange={(v) =>
                    setForm({ ...form, education: v })
                  }
                  rows={6}
                />
                <FieldTextarea
                  label="Volunteering"
                  value={form.volunteering}
                  onChange={(v) =>
                    setForm({ ...form, volunteering: v })
                  }
                  rows={6}
                />

                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      await savePartial({
                        experience: form.experience,
                        education: form.education,
                        volunteering: form.volunteering,
                      });
                      setOpen(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-black hover:bg-gray-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* CONTACT */}
            {open === '#contact' && (
              <div className="space-y-4 text-black">
                <div className="grid md:grid-cols-2 gap-4">
                  <FieldInput
                    label="Location"
                    value={form.location}
                    onChange={(v) =>
                      setForm({ ...form, location: v })
                    }
                  />
                  <FieldInput
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </div>

                {/* CV upload */}
                <div>
                  <label
                    htmlFor={cvId}
                    className="mb-1 block text-sm text-slate-600"
                  >
                    CV (PDF)
                  </label>
                  <input
                    id={cvId}
                    name="cv"
                    type="file"
                    accept="application/pdf"
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) =>
                      setForm({
                        ...form,
                        cv: e.target.files?.[0] ?? null,
                      })
                    }
                  />
                  <div className="mt-1 text-sm">
                    {me.candidate?.cvUrl || original.cvUrl ? (
                      <a
                        href={cvHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline"
                      >
                        Open current CV
                      </a>
                    ) : (
                      <span className="text-slate-500">
                        No CV uploaded
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      await savePartial(
                        {
                          location: form.location,
                          phone: form.phone,
                        },
                        { cv: form.cv },
                      );
                      setForm((f) => ({ ...f, cv: null }));
                      setOpen(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-black hover:bg-gray-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* EXTRA */}
            {open === '#extra' && (
              <div className="space-y-6 text-black">
                {/* Driving license */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <label className="text-sm font-medium text-slate-700">
                    Driving license:
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.driverLicenseA}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          driverLicenseA: e.target.checked,
                        })
                      }
                    />
                    Car
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.driverLicenseM}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          driverLicenseM: e.target.checked,
                        })
                      }
                    />
                    Motorcycle
                  </label>
                </div>

                {/* Languages */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Languages
                  </div>
                  <div className="space-y-2">
                    {form.languages.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 items-center gap-2"
                      >
                        <div className="col-span-6">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Language
                          </label>
                          <input
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            value={row.name}
                            onChange={(e) =>
                              setLangName(idx, e.target.value)
                            }
                            placeholder="e.g. English"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Level
                          </label>
                          <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none bg-white text-black"
                            value={row.level}
                            onChange={(e) =>
                              setLangLevel(idx, e.target.value)
                            }
                          >
                            <option value="">—</option>
                            {[
                              'A1',
                              'A2',
                              'B1',
                              'B2',
                              'C1',
                              'C2',
                              'Native',
                            ].map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 pt-6">
                          <button
                            type="button"
                            onClick={() => removeLangRow(idx)}
                            className="w-full rounded-lg border border-rose-300 px-2 py-2 text-sm text-rose-600 hover:bg-rose-50"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={addLangRow}
                      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                    >
                      + Add language
                    </button>
                  </div>
                </div>

                {/* Reference letter */}
                <div>
                  <label
                    htmlFor={refId}
                    className="mb-1 block text-sm text-slate-600"
                  >
                    Reference letter (PDF)
                  </label>
                  <input
                    id={refId}
                    name="referenceLetter"
                    type="file"
                    accept="application/pdf"
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) =>
                      setForm({
                        ...form,
                        referenceLetter:
                          e.target.files?.[0] ?? null,
                      })
                    }
                  />

                  {original.referenceLetterUrl ? (
                    <div className="mt-1 text-sm">
                      Uploaded:{' '}
                      <a
                        href={mediaUrl(
                          normalizeReferenceUrl(
                            original.referenceLetterUrl,
                          ),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline"
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">
                      No reference letter uploaded
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      await savePartial(
                        {
                          driverLicenseA: form.driverLicenseA,
                          driverLicenseM: form.driverLicenseM,
                          languages: form.languages,
                        },
                        { referenceLetter: form.referenceLetter },
                      );
                      setForm((f) => ({
                        ...f,
                        referenceLetter: null,
                      }));
                      setOpen(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-black hover:bg-gray-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Small components ============ */
function FieldInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const { label, value, onChange, type = 'text' } = props;
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-600">
        {label}
      </label>
      <input
        type={type}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldTextarea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const { label, value, onChange, rows = 6 } = props;
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-600">
        {label}
      </label>
      <textarea
        rows={rows}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SkillsEditor({
  skillsList,
  setSkillsList,
  skillInput,
  setSkillInput,
}: {
  skillsList: string[];
  setSkillsList: React.Dispatch<
    React.SetStateAction<string[]>
  >;
  skillInput: string;
  setSkillInput: React.Dispatch<
    React.SetStateAction<string>
  >;
}) {
  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (skillsList.includes(s)) {
      setSkillInput('');
      return;
    }
    setSkillsList((prev) => [...prev, s]);
    setSkillInput('');
  };
  const removeSkill = (s: string) => {
    setSkillsList((prev) => prev.filter((x) => x !== s));
  };

  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-700">
        Skills
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        {skillsList.length ? (
          skillsList.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="ml-1 text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="+ skill"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkill();
            }
          }}
        />
        <button
          type="button"
          onClick={addSkill}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

