"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api, { updateMyCompany, uploadCompanyMedia } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import CompanyMatchupsPanel from "@/components/CompanyMatchupsPanel";
import Link from "next/link";
import MessengerBadge from "@/components/MessengerBadge";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import AdProvider from "@/components/AdProvider";

type Role = "CANDIDATE" | "COMPANY" | "ADMIN";

type MeCompany = {
  id: number;
  email: string;
  role: Role;
  company?: {
    id?: number;
    name?: string;
    heading?: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
    coverUrl?: string;
  };
  subscriptions?: Array<{ plan?: { name?: string } }>;
};

type FormState = {
  name: string;
  heading?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
};

type Limits = {
  plan: "SIMPLE" | "SILVER" | "GOLDEN";
  totalAllowed: number | "UNLIMITED";
  activeCount: number;
  remaining: number | "UNLIMITED";
};

export type JobLite = {
  id: number;
  title: string;
  locationText?: string | null;
  locationCity?: string | null;
  locationCountryCode?: string | null;
  location?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  workMode: "ONSITE" | "REMOTE" | "HYBRID";
  requireLicenseA: boolean;
  requireLicenseM: boolean;
  skills: string[];
  sector?:
    | "IT"
    | "SALES"
    | "ADMIN"
    | "LOGISTICS"
    | "FINANCE"
    | "MARKETING"
    | "FOOD"
    | "TOURISM"
    | "WORKERS"
    | "OTHER"
    | null;
  sectorOtherText?: string | null;
  preferredLanguage?: string | null;
  preferredLangLevel?: string | null;
};

const SECTOR_OPTIONS = [
  { value: "IT", label: "IT" },
  { value: "SALES", label: "SALES" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "LOGISTICS", label: "LOGISTICS" },
  { value: "FINANCE", label: "FINANCE" },
  { value: "MARKETING", label: "MARKETING" },
  { value: "FOOD", label: "FOOD" },
  { value: "TOURISM", label: "TOURISM" },
  { value: "GENERAL_WORKERS", label: "GENERAL_WORKERS" },
  { value: "OTHER", label: "OTHER" },
];

const LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];

const PLAN_LABEL: Record<"SIMPLE" | "SILVER" | "GOLDEN", string> = {
  SIMPLE: "Simple",
  SILVER: "Silver",
  GOLDEN: "Golden",
};

// what backend returns from listLikedByUserId()
type OutgoingLike = {
  jobId: number;
  jobTitle: string;
  candidateId: number;
  candidateName: string;
  candidateLocation?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
};

export default function CompanyDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<MeCompany | null>(null);

  const [limits, setLimits] = useState<Limits | null>(null);
  const [limitsMsg, setLimitsMsg] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [sector, setSector] = useState<
    | "IT"
    | "SALES"
    | "ADMIN"
    | "LOGISTICS"
    | "FINANCE"
    | "MARKETING"
    | "FOOD"
    | "TOURISM"
    | "WORKERS"
    | "OTHER"
  >("IT");
  const [sectorOther, setSectorOther] = useState("");
  const [prefLang, setPrefLang] = useState("");
  const [prefLangLevel, setPrefLangLevel] = useState("");

  // Outgoing likes (Like & Message)
  const [outgoingLikes, setOutgoingLikes] = useState<OutgoingLike[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [likesError, setLikesError] = useState<string | null>(null);

 const logoPreview = useMemo(
  () =>
    logoFile
      ? URL.createObjectURL(logoFile)
      : me?.company?.logoUrl
      ? mediaUrl(me.company.logoUrl)
      : "",
  [logoFile, me?.company?.logoUrl]
);

  const coverPreview = useMemo(
    () =>
      coverFile
        ? URL.createObjectURL(coverFile)
        : me?.company?.coverUrl
        ? mediaUrl(me.company.coverUrl)
        : "",
    [coverFile, me?.company?.coverUrl]
  );

  const [form, setForm] = useState<FormState>({ name: "" });

  // Modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [locWarn, setLocWarn] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Location state for New Job (Google Maps)
  const [jobLoc, setJobLoc] = useState<{
    placeId: string;
    description: string;
  } | null>(null);

  const [workModeUI, setWorkModeUI] = useState<"ONSITE" | "REMOTE" | "HYBRID">(
    "ONSITE"
  );

  const fetchMe = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    const { data } = await api.get<MeCompany>("/me");
    if (data.role !== "COMPANY") {
      router.replace("/");
      return;
    }
    setMe(data);
    const co = data.company ?? {};
    setForm({
      name: co.name ?? "",
      heading: co.heading ?? "",
      phone: co.phone ?? "",
      address: co.address ?? "",
    });
  };

  const fetchLimits = async () => {
    setLimitsMsg(null);
    try {
      const { data } = await api.get<Limits>("/company/jobs/limits");
      setLimits(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setLimits(null);
        setLimitsMsg(
          "Fill in your company name and click Save to activate job limits."
        );
      } else if (status !== 401) {
        setLimitsMsg("Could not load job limits.");
      }
    }
  };

  const fetchJobs = async () => {
    try {
      const { data } = await api.get<JobLite[]>("/company/jobs");
      setJobs(data);
      if (!activeJobId && data.length) setActiveJobId(data[0].id);
    } catch {
      // ignore
    }
  };

  const fetchOutgoingLikes = async () => {
    setLikesError(null);
    try {
      setLoadingLikes(true);
      const { data } = await api.get<OutgoingLike[]>(
        "/company/matchups/liked"
      );
      setOutgoingLikes(data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        setLikesError("Could not load Like & Message data.");
      }
    } finally {
      setLoadingLikes(false);
    }
  };

  // callback from left panel, when doing Like & Message
  const handleCompanyLike = (row: {
    jobId: number;
    jobTitle: string;
    candidateId: number;
    candidateName: string;
    candidateLocation?: string | null;
    createdAt: string;
  }) => {
    setOutgoingLikes((prev) => [
      {
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        candidateId: row.candidateId,
        candidateName: row.candidateName,
        candidateLocation: row.candidateLocation ?? null,
        avatarUrl: undefined,
        createdAt: row.createdAt,
      },
      ...prev,
    ]);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
      } finally {
        setLoading(false);
      }
      await Promise.all([fetchLimits(), fetchJobs(), fetchOutgoingLikes()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // clear modal errors when open
  useEffect(() => {
    if (openCreate) {
      setCreateErr(null);
      setLocWarn(null);
      setLocError(null);
    }
  }, [openCreate]);

  const planFromLimits = limits ? PLAN_LABEL[limits.plan] : null;
  const planFromSubs = me?.subscriptions?.[0]?.plan?.name ?? "FREE";
  const planDisplay = planFromLimits ?? planFromSubs;

  const isUpgradable =
    limits && (limits.plan === "SIMPLE" || limits.plan === "SILVER");

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/auth/login");
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!form.name?.trim()) {
        setError("Company name is required.");
        setSaving(false);
        return;
      }
      if (logoFile || coverFile) {
        await uploadCompanyMedia({ logo: logoFile, cover: coverFile });
        setLogoFile(null);
        setCoverFile(null);
      }
      await updateMyCompany({
        name: form.name,
        heading: form.heading,
        phone: form.phone,
        address: form.address,
      });
      await fetchMe();
      await Promise.all([fetchLimits(), fetchJobs(), fetchOutgoingLikes()]);
      setError(null);
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(", ")
        : err?.response?.data?.message ?? "Failed to save company details.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Create job
  const onCreateJob: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setCreateErr(null);
    setLocWarn(null);
    setLocError(null);
    setCreating(true);

    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const driverLicenseARequired = fd.get("driverA") === "on";
    const driverLicenseMRequired = fd.get("driverM") === "on";
    const skillsCsv = String(fd.get("skills") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

    if (!title || !description || !skillsCsv) {
      setCreateErr("Fill in all required fields (Title, Description, Skills).");
      setCreating(false);
      return;
    }

    if (workModeUI !== "REMOTE" && !jobLoc?.placeId) {
      setLocError("Select a location from the list (Google Autocomplete).");
      setCreating(false);
      return;
    }

    try {
      const { data: created } = await api.post("/company/jobs", {
        title,
        description,
        workMode: workModeUI,
        driverLicenseARequired,
        driverLicenseMRequired,
        skills: skillsCsv,
        sector,
        sectorOtherText:
          sector === "OTHER" ? sectorOther || undefined : undefined,
        preferredLanguage: prefLang || undefined,
        preferredLangLevel: prefLangLevel || undefined,
      });

      if (workModeUI !== "REMOTE" && jobLoc?.placeId) {
        await api.post(`/company/jobs/${created.id}/location`, {
          placeId: jobLoc.placeId,
        });
      }

      await Promise.all([fetchLimits(), fetchJobs(), fetchOutgoingLikes()]);

      setOpenCreate(false);
      (e.currentTarget as HTMLFormElement).reset();
      setJobLoc(null);
      if (created?.id) setActiveJobId(created.id);
    } catch (ex: any) {
      setCreateErr(
        Array.isArray(ex?.response?.data?.message)
          ? ex.response.data.message.join(", ")
          : ex?.response?.data?.message ?? "Failed to create job."
      );
    } finally {
      setCreating(false);
    }
  };

  const onArchive = async (id: number) => {
    try {
      await api.put(`/company/jobs/${id}/archive`);
      await Promise.all([fetchJobs(), fetchLimits(), fetchOutgoingLikes()]);
    } catch {
      // ignore
    }
  };

  if (loading || !me) {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  const remainingLabel =
    limits?.totalAllowed === "UNLIMITED"
      ? "Unlimited"
      : limits
      ? `${limits.remaining} / ${limits.totalAllowed}`
      : "- / -";

  const newJobDisabled =
    !limits ||
    (limits.totalAllowed !== "UNLIMITED" &&
      (limits.remaining as number) <= 0);

  // filter likes for active job
  const likesForActiveJob = activeJobId
    ? outgoingLikes.filter((m) => m.jobId === activeJobId)
    : outgoingLikes;

  return (
  <div className="relative min-h-screen text-white">
    {/* Background image */}
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/back_company_dash.jpg')" }}
    />
    <div className="absolute inset-0 bg-black/40" />

    {/* Header */}
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-white/90">
            <div className="text-xs">Plan</div>
            <div className="text-sm font-semibold">{planDisplay}</div>
          </div>

          <div className="rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-xs text-white">
            Active job slots: <b>{remainingLabel}</b>
            {limits?.plan === "GOLDEN" && (
              <span className="ml-2 opacity-80">(unlimited)</span>
            )}
          </div>

          {isUpgradable && (
            <button
              type="button"
              onClick={() => router.push("/onboarding/plan")}
              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-600"
            >
              Upgrade plan
            </button>
          )}

          {limitsMsg && (
            <div className="text-[11px] text-white/80">{limitsMsg}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/messenger"
            className="relative rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
            aria-label="Open Messenger"
          >
            Messenger
            <span className="absolute -right-2 -top-2">
              <MessengerBadge role="COMPANY" />
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    {/* Main */}
    <main className="relative z-10 mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 pb-14 sm:pb-16">
      {/* Cover */}
      <div className="relative h-56 overflow-hidden rounded-2xl border border-white/10 bg-black/40 md:h-80">
        {coverPreview ? (
          <img
            src={coverPreview}
            alt="cover"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/70">
            Background photo
          </div>
        )}
      </div>

      {/* Heading row */}
      <div className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="flex w-full flex-1 items-center gap-4">
          <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-white/30 bg-black/50 shadow-lg md:h-32 md:w-32">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="logo"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <input
              className="block w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-base sm:text-lg font-semibold text-white placeholder-white/40 outline-none backdrop-blur-sm"
              placeholder="Company name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="mt-2 block w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 outline-none backdrop-blur-sm"
              placeholder="Short company tagline..."
              value={form.heading ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, heading: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 text-sm text-white md:w-auto md:flex-row">
          <div className="rounded-xl border border-white/60 bg-black/30 px-3 py-2">
            <div className="text-white/80">Email</div>
            <div className="mt-0.5 break-all text-xs sm:text-sm">
              {me.email}
            </div>
          </div>
          <div className="rounded-xl border border-white/60 bg-black/30 px-3 py-2">
            <div className="text-white/80">Phone</div>
            <input
              className="mt-0.5 w-full md:w-44 bg-transparent text-xs sm:text-sm outline-none"
              placeholder="—"
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div className="rounded-xl border border-white/60 bg-black/30 px-3 py-2">
            <div className="text-white/80">Address</div>
            <input
              className="mt-0.5 w-full md:w-52 bg-transparent text-xs sm:text-sm outline-none"
              placeholder="—"
              value={form.address ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* 3 columns - fully responsive */}
      <div className="mt-6 grid gap-6 md:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* LEFT: Matchups panel */}
        <CompanyMatchupsPanel
          jobs={jobs}
          activeJobId={activeJobId}
          onChangeJob={setActiveJobId}
          onCompanyLike={handleCompanyLike}
        />

        {/* CENTER: Jobs list + add */}
        <section className="rounded-2xl border border-white/30 bg-black/70 p-3 text-sm text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Job ads</div>
            <button
              className={`rounded-lg border border-white/20 px-3 py-1.5 text-xs sm:text-sm ${
                newJobDisabled
                  ? "cursor-not-allowed bg-black/40 opacity-50"
                  : "bg-black/40 hover:bg-black/60"
              }`}
              title={newJobDisabled ? "No available slots" : "Create new job ad"}
              disabled={newJobDisabled}
              onClick={() => setOpenCreate(true)}
            >
              + New job ad
            </button>
          </div>

          {/* Jobs list (Responsive) */}
          <div className="mt-4">
            {/* Desktop/tablet table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/70">
                    <th className="w-56 py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Location</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">License</th>
                    <th className="py-2 pr-4">Skills</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-white/60">
                        No job ads yet.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr
                        key={j.id}
                        className="border-b border-white/10 last:border-0"
                      >
                        <td className="max-w-[14rem] truncate py-2 pr-4" title={j.title}>
                          {j.title}
                        </td>

                        <td className="py-2 pr-4">
                          {j.workMode === "REMOTE"
                            ? "Remote"
                            : j.locationText
                            ? j.locationText
                            : j.locationCity && j.locationCountryCode
                            ? `${j.locationCity}, ${j.locationCountryCode}`
                            : j.location || "—"}
                        </td>

                        <td className="py-2 pr-4">
                          {j.workMode === "REMOTE"
                            ? "Remote"
                            : j.workMode === "HYBRID"
                            ? "Hybrid"
                            : "On-site"}
                        </td>

                        <td className="py-2 pr-4">
                          {j.requireLicenseA ? "A " : ""}
                          {j.requireLicenseM ? "M" : ""}
                          {!j.requireLicenseA && !j.requireLicenseM ? "—" : ""}
                        </td>

                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {j.skills?.length
                              ? j.skills.slice(0, 6).map((s) => (
                                  <span
                                    key={s}
                                    className="rounded bg-white/10 px-2 py-0.5 text-[11px]"
                                  >
                                    {s}
                                  </span>
                                ))
                              : "—"}
                            {j.skills?.length > 6 ? (
                              <span className="rounded bg-white/10 px-2 py-0.5 text-[11px]">
                                +{j.skills.length - 6}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-2 pr-4">{j.status}</td>

                        <td className="py-2 pr-4">
                          {new Date(j.createdAt).toLocaleDateString("en-GB")}
                        </td>

                        <td className="py-2 pr-4">
                          {j.status !== "ARCHIVED" && (
                            <button
                              onClick={() => onArchive(j.id)}
                              className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
                            >
                              Archive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {jobs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-white/70 text-sm">
                  No job ads yet.
                </div>
              ) : (
                jobs.map((j) => (
                  <div
                    key={j.id}
                    className="rounded-2xl border border-white/15 bg-black/35 p-4 shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold" title={j.title}>
                          {j.title}
                        </div>
                        <div className="mt-1 text-xs text-white/70">
                          {j.workMode === "REMOTE"
                            ? "Remote"
                            : j.locationText
                            ? j.locationText
                            : j.locationCity && j.locationCountryCode
                            ? `${j.locationCity}, ${j.locationCountryCode}`
                            : j.location || "—"}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] text-white/80">
                        {j.status}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {j.workMode === "REMOTE"
                          ? "Remote"
                          : j.workMode === "HYBRID"
                          ? "Hybrid"
                          : "On-site"}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1">
                        License:{" "}
                        {j.requireLicenseA || j.requireLicenseM
                          ? `${j.requireLicenseA ? "A" : ""}${j.requireLicenseM ? "M" : ""}`
                          : "—"}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {new Date(j.createdAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {(j.skills ?? []).slice(0, 8).map((s) => (
                        <span
                          key={s}
                          className="rounded bg-white/10 px-2 py-1 text-[11px]"
                        >
                          {s}
                        </span>
                      ))}
                      {(j.skills ?? []).length > 8 ? (
                        <span className="rounded bg-white/10 px-2 py-1 text-[11px]">
                          +{(j.skills ?? []).length - 8}
                        </span>
                      ) : null}
                    </div>

                    {j.status !== "ARCHIVED" && (
                      <button
                        onClick={() => onArchive(j.id)}
                        className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm hover:bg-black/50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: uploads / details */}
        <aside className="rounded-2xl border border-sky-500/40 bg-sky-900/80 p-4 text-sm text-white shadow-lg">
          <div className="mb-3 font-medium">Company details</div>
          <div className="space-y-2">
            <div>
              <span className="text-white/60">Email:</span> {me.email}
            </div>
            <div>
              <span className="text-white/60">Phone:</span> {form.phone || "—"}
            </div>
            <div>
              <span className="text-white/60">Address:</span>{" "}
              {form.address || "—"}
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
            <div className="text-sm font-medium">Uploads</div>
            <label className="block">
              <span className="text-xs text-white/70">Logo (profile image)</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">Background image</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </aside>
      </div>

      {/* Save bar + Like & Message */}
      <div className="mt-8 flex flex-col items-start justify-between gap-4 md:flex-row">
        <section className="w-full rounded-2xl border border-sky-500/40 bg-sky-900/80 p-5 text-sm text-white shadow-lg md:w-2/3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">
                Like &amp; Message (Matchups)
              </h3>
              <p className="text-[11px] text-sky-100/80">
                All candidates you have Liked &amp; Messaged for the selected job
                ad.
              </p>
            </div>
            {activeJobId && (
              <span className="inline-flex items-center rounded-full bg-sky-800/80 px-3 py-1 text-[11px]">
                Total:{" "}
                <span className="ml-1 font-semibold">
                  {likesForActiveJob.length}
                </span>
              </span>
            )}
          </div>

          {likesError && <p className="mb-2 text-xs text-red-200">{likesError}</p>}

          {loadingLikes ? (
            <p className="text-xs text-sky-100/80">Loading...</p>
          ) : likesForActiveJob.length === 0 ? (
            <p className="text-xs text-sky-100/80">
              You have not yet Liked &amp; Messaged candidates for this job ad.
            </p>
          ) : (
            <>
              {/* Desktop/tablet table */}
              <div className="hidden sm:block max-h-72 overflow-y-auto rounded-xl border border-sky-500/20 bg-sky-950/40">
                <table className="w-full table-fixed text-[11px]">
                  <thead className="border-b border-sky-500/30 bg-sky-950/60 text-sky-100/80">
                    <tr className="text-left">
                      <th className="w-[38%] py-2 pl-3 pr-2">Candidate</th>
                      <th className="w-[27%] py-2 pr-2">Job ad</th>
                      <th className="w-[25%] py-2 pr-2">Location</th>
                      <th className="w-[10%] py-2 pr-3 text-right">
                        Date &amp; time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {likesForActiveJob.map((m) => (
                      <tr
                        key={`${m.jobId}-${m.candidateId}-${m.createdAt}`}
                        className="border-b border-sky-500/10 last:border-0 transition-colors hover:bg-sky-900/50"
                      >
                        <td className="py-2 pl-3 pr-2">
                          <div className="flex items-center gap-2">
                            {m.avatarUrl ? (
                              <img
                                src={mediaUrl(m.avatarUrl)}
                                alt={m.candidateName}
                                className="h-7 w-7 rounded-full border border-sky-500/50 object-cover"
                              />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-800/80 text-[10px] font-semibold">
                                {m.candidateName?.[0]?.toUpperCase() ?? "•"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium" title={m.candidateName}>
                                {m.candidateName}
                              </div>
                              <div className="text-[10px] text-sky-100/80">
                                ID: {m.candidateId}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="truncate py-2 pr-2" title={m.jobTitle || ""}>
                          {m.jobTitle || "—"}
                        </td>

                        <td className="truncate py-2 pr-2" title={m.candidateLocation || ""}>
                          {m.candidateLocation || "—"}
                        </td>

                        <td className="whitespace-nowrap py-2 pr-3 text-right">
                          <div>{new Date(m.createdAt).toLocaleDateString("en-GB")}</div>
                          <div className="text-[10px] text-sky-100/80">
                            {new Date(m.createdAt).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {likesForActiveJob.map((m) => (
                  <div
                    key={`${m.jobId}-${m.candidateId}-${m.createdAt}`}
                    className="rounded-2xl border border-sky-500/20 bg-sky-950/40 p-4"
                  >
                    <div className="flex items-center gap-3">
                      {m.avatarUrl ? (
                        <img
                          src={mediaUrl(m.avatarUrl)}
                          alt={m.candidateName}
                          className="h-10 w-10 rounded-full border border-sky-500/40 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-800/80 text-sm font-semibold">
                          {m.candidateName?.[0]?.toUpperCase() ?? "•"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold" title={m.candidateName}>
                          {m.candidateName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-sky-100/80 truncate">
                          {m.candidateLocation || "—"}
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-sky-100/80">
                        <div>{new Date(m.createdAt).toLocaleDateString("en-GB")}</div>
                        <div>
                          {new Date(m.createdAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-sky-500/15 bg-black/20 px-3 py-2 text-[11px]">
                      <div className="text-sky-100/70">Job ad</div>
                      <div className="mt-0.5 truncate font-medium" title={m.jobTitle || ""}>
                        {m.jobTitle || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <button
          disabled={saving}
          onClick={onSave}
          className="w-full md:w-auto self-stretch rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 md:self-end"
          title="Save changes"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </main>

    {/* Modal: New Job */}
   {openCreate && (
  <div className="fixed inset-0 z-50">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => setOpenCreate(false)}
    />

    {/* Modal wrapper (scrollable on mobile) */}
    <div className="absolute inset-0 overflow-y-auto p-3 sm:p-4">
      {/* Push down on mobile so it doesn't sit too high */}
      <div className="min-h-full flex items-start justify-center pt-16 sm:pt-10 pb-10">
        {/* Modal card */}
        <div className="w-full max-w-lg rounded-2xl bg-white text-black shadow-2xl overflow-hidden">
          {/* Header sticky (optional αλλά πολύ βοηθάει) */}
          <div className="flex items-center justify-between border-b bg-white px-4 py-3 sticky top-0 z-10">
            <h3 className="text-lg font-semibold">New job ad</h3>
            <button
              className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              onClick={() => setOpenCreate(false)}
            >
              Close
            </button>
          </div>

          {/* Body scroll if needed */}
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-4 py-4">
            {createErr && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {createErr}
              </div>
            )}
            {locWarn && !createErr && (
              <div className="mb-3 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                {locWarn}
              </div>
            )}
            {locError && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {locError}
              </div>
            )}

            {/* ⬇️ κράτα ΕΔΩ μέσα το υπάρχον form σου ΑΚΡΙΒΩΣ όπως είναι */}
            <form className="space-y-3" onSubmit={onCreateJob}>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium">Title *</label>
                <input
                  name="title"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium">
                  Description *
                </label>
                <textarea
                  name="description"
                  className="mt-1 min-h-[120px] w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>

              {/* Location + Work mode */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium">
                    {workModeUI === "REMOTE" ? "Location" : "Location *"}
                  </label>

                  {workModeUI === "REMOTE" ? (
                    <div className="mt-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      No location needed for remote jobs
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1">
                        <LocationAutocomplete
                          value={jobLoc}
                          placeholder="Choose city/address..."
                          onSelect={(p) => {
                            setJobLoc(p);
                            setLocError(null);
                          }}
                        />
                      </div>
                      {jobLoc ? (
                        <button
                          type="button"
                          onClick={() => setJobLoc(null)}
                          className="rounded-md border px-2 py-1 text-xs"
                          title="Clear location"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  )}

                  <p className="mt-1 text-xs text-gray-500">
                    Location is stored normalized (city/country + lat/lng).
                  </p>
                </div>

                {/* Work mode */}
                <div>
                  <label className="block text-sm font-medium">
                    Work mode *
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="workMode"
                        value="ONSITE"
                        checked={workModeUI === "ONSITE"}
                        onChange={() => {
                          setWorkModeUI("ONSITE");
                          setLocError(null);
                        }}
                      />{" "}
                      On-site
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="workMode"
                        value="REMOTE"
                        checked={workModeUI === "REMOTE"}
                        onChange={() => {
                          setWorkModeUI("REMOTE");
                          setJobLoc(null);
                          setLocError(null);
                        }}
                      />{" "}
                      Remote
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="workMode"
                        value="HYBRID"
                        checked={workModeUI === "HYBRID"}
                        onChange={() => {
                          setWorkModeUI("HYBRID");
                          setLocError(null);
                        }}
                      />{" "}
                      Hybrid
                    </label>
                  </div>
                </div>
              </div>

              {/* License + Skills */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Driving license
                  </label>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="driverA" /> A
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="driverM" /> M
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Skills (comma-separated) *
                  </label>
                  <input
                    name="skills"
                    placeholder="JavaScript, React, Node..."
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm font-medium">Sector *</label>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    className="rounded-lg border px-3 py-2"
                    value={sector}
                    onChange={(e) => setSector(e.target.value as any)}
                    required
                  >
                    {SECTOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {sector === "OTHER" && (
                    <input
                      className="rounded-lg border px-3 py-2"
                      placeholder="Describe sector..."
                      value={sectorOther}
                      onChange={(e) => setSectorOther(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Language (optional) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Language (optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    placeholder="e.g. en, el, de"
                    value={prefLang}
                    onChange={(e) => setPrefLang(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Level (optional)
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-black"
                    value={prefLangLevel}
                    onChange={(e) => setPrefLangLevel(e.target.value)}
                  >
                    <option value="">—</option>
                    {LANG_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions sticky bottom (πολύ καλό στο mobile) */}
              <div className="sticky bottom-0 bg-white pt-3">
                <div className="flex items-center justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenCreate(false)}
                    className="rounded-lg border px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={creating}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {creating ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
  </div>
);
}
