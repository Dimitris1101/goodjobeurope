"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import LocationAutocomplete from "@/components/LocationAutocomplete";

type Language = { name: string; level?: string };

type Me = {
  role: "CANDIDATE" | "COMPANY" | "ADMIN";
  email: string;
  candidate?: {
    name?: string;
    location?: string;
    headline?: string;
    about?: string;
    experience?: string;
    volunteering?: string;
    skillsText?: string;
    birthDate?: string;
    gender?: string;
    countryOfOrigin?: string;
    preferredLanguage?: string;
    driverLicenseA?: boolean;
    driverLicenseM?: boolean;
    languages?: Language[];
  };
};

const selectDark =
  "mt-1 w-full rounded-xl border border-black bg-black px-3 py-2 text-white focus:outline-none";

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);

  // Wizard state
  const steps = ["Personal details", "Experience", "Skills"] as const;
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [form, setForm] = useState({
    // Step 1
    name: "",
    headline: "",
    birthDate: "",
    gender: "",
    countryOfOrigin: "GR",
    preferredLanguage: "en",
    // avatar: null as File | null,
    referenceLetter: null as File | null,

    // display-only initial string
    locationDisplay: "",

    // Step 2
    about: "",
    experience: "",
    volunteering: "",

    // Step 3
    skillsCsv: "",
  });

  // Languages (Step 3)
  const [languages, setLanguages] = useState<Language[]>([
    { name: "Greek", level: "C2" },
  ]);

  // Location (autocomplete) — immediate save
  const [selectedLocation, setSelectedLocation] = useState<{
    placeId: string;
    description: string;
  } | null>(null);
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    api
      .get<Me>("/me")
      .then(({ data }) => {
        if (!data || data.role !== "CANDIDATE") {
          router.replace("/auth/login");
          return;
        }
        setMe(data);
        const c = data.candidate || {};
        setForm((f) => ({
          ...f,
          // step 1
          name: c.name ?? "",
          headline: c.headline ?? "",
          birthDate: c.birthDate ? c.birthDate.slice(0, 10) : "",
          gender: c.gender ?? "",
          countryOfOrigin: c.countryOfOrigin ?? "GR",
          preferredLanguage: c.preferredLanguage ?? "en",
          locationDisplay: c.location ?? "",

          // step 2
          about: c.about ?? "",
          experience: c.experience ?? "",
          volunteering: c.volunteering ?? "",

          // step 3
          skillsCsv: c.skillsText ?? "",
        }));
        setLanguages(
          Array.isArray(c.languages) && c.languages.length
            ? c.languages.map((l) => ({ name: l.name, level: l.level }))
            : [{ name: "Greek", level: "C2" }]
        );
        if (c.location)
          setSelectedLocation({ placeId: "", description: c.location });
      })
      .catch(() => router.replace("/auth/login"));
  }, [router]);

  async function handleLocationSelect(place: {
    placeId: string;
    description: string;
  }) {
    setSelectedLocation(place);
    try {
      setSavingLoc(true);
      await api.post("/me/candidate/location", { placeId: place.placeId });
    } finally {
      setSavingLoc(false);
    }
  }

  // Languages edit helpers
  const addLanguage = () =>
    setLanguages((arr) => [...arr, { name: "", level: "" }]);
  const updateLanguage = (
    i: number,
    field: keyof Language,
    value: string
  ) => {
    setLanguages((arr) => {
      const clone = [...arr];
      clone[i] = { ...clone[i], [field]: value };
      return clone;
    });
  };
  const removeLanguage = (i: number) =>
    setLanguages((arr) => arr.filter((_, idx) => idx !== i));

  // ✅ Validation for Step 1 (basic fields)
  function validateStep1(): boolean {
    const name = (form.name ?? "").trim();
    const hasLocation = !!(
      selectedLocation?.description?.trim() || form.locationDisplay?.trim()
    );

    if (!name || name.length < 2) {
      alert("Please enter your full name (at least 2 characters).");
      return false;
    }

    if (!hasLocation) {
      alert("Please select a location.");
      return false;
    }

    return true;
  }

  // Wizard nav
  const nextStep = () => {
    // On first step, don't proceed without validation
    if (step === 0) {
      if (!validateStep1()) return;
    }
    setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s));
  };

  const prevStep = () =>
    setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If user presses Enter on Step 0 → go to Step 1 with validation
    if (step === 0) {
      if (!validateStep1()) return;
      setStep(1);
      return;
    }

    // If Enter on Step 1 → go to Step 2
    if (step === 1) {
      setStep(2);
      return;
    }

    // Actual submit only from Step 2
    setSaving(true);

    try {
      // Double-check Step 1 basics
      if (!validateStep1()) {
        setSaving(false);
        return;
      }

      const fd = new FormData();

      // Files
      if (form.referenceLetter)
        fd.append("referenceLetter", form.referenceLetter);

      // helper
      const appendIfFilled = (key: string, val?: string | null) => {
        const v = (val ?? "").trim();
        if (v) fd.append(key, v);
      };

      // Step 1
      const name = (form.name ?? "").trim();
      fd.append("name", name);
      appendIfFilled("headline", form.headline);
      if (form.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate))
        fd.append("birthDate", form.birthDate);
      appendIfFilled("gender", form.gender);
      appendIfFilled("countryOfOrigin", form.countryOfOrigin);
      appendIfFilled("preferredLanguage", form.preferredLanguage);
      // ⚠️ We don't send free-text location — it's saved via /me/candidate/location

      // Step 2
      appendIfFilled("about", form.about);
      appendIfFilled("experience", form.experience);
      appendIfFilled("volunteering", form.volunteering);

      // Step 3
      const skillsCsv = (form.skillsCsv ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");
      if (skillsCsv) fd.append("skillsCsv", skillsCsv);

      const cleanLangs = (Array.isArray(languages) ? languages : [])
        .map((l) => ({
          name: (l.name ?? "").trim(),
          level: (l.level ?? "").trim(),
        }))
        .filter((l) => l.name);
      if (cleanLangs.length)
        fd.append("languages", JSON.stringify(cleanLangs));

      await api.put("/me/candidate", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.replace("/onboarding/plan");
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join("\n")
        : err?.response?.data?.message ||
          err?.message ||
          "Failed to save profile";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!me)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(to_left,#6441A5,#2a0845)] text-white">
        Loading…
      </div>
    );

  return (
    <div className="min-h-screen bg-[linear-gradient(to_left,#6441A5,#2a0845)]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-center">
          Candidate onboarding
        </h1>
        <p className="text-center text-sm text-white/80 mt-1">
          Account: <span className="text-white font-medium">{me.email}</span>
        </p>

        {/* Progressbar (CodePen-style) */}
        <ul
          id="progressbar"
          className="mt-6 mb-4 flex items-center justify-between"
        >
          {steps.map((label, idx) => (
            <li
              key={label}
              className={`relative flex-1 text-[10px] sm:text-xs tracking-wider text-white uppercase text-center ${
                idx <= step ? "active" : ""
              }`}
            >
              <span className="step-icon mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] text-gray-800">
                {idx + 1}
              </span>
              {label}
              {idx > 0 && (
                <span className="connector absolute left-[-50%] top-[11px] h-[2px] w-full bg-white -z-10" />
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="relative">
          <div className="wizard-card onb-mobile-blacktext relative mx-auto w-full max-w-xl bg-white rounded-xl shadow-[0_0_15px_1px_rgba(0,0,0,0.4)] p-5 sm:p-8">
            {/* STEP 1 */}
            <fieldset
              aria-hidden={step !== 0}
              className={`fieldset ${step === 0 ? "shown" : "hiddenFS"}`}
            >
              {/* Full Name + Reference letter */}
              <div className="grid gap-4 sm:grid-cols-2 mt-1">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="e.g. Dimitris Liavas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Reference letter (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        referenceLetter: e.target.files?.[0] ?? null,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Location + Headline */}
              <div className="grid gap-4 sm:grid-cols-2 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Location
                  </label>
                  <LocationAutocomplete
                    value={selectedLocation}
                    onSelect={handleLocationSelect}
                    placeholder="Type and select a location…"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Saved automatically{savingLoc ? "…" : ""}.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Headline
                  </label>
                  <input
                    value={form.headline}
                    onChange={(e) =>
                      setForm({ ...form, headline: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="e.g. Full-stack Developer"
                  />
                </div>
              </div>

              {/* Birthdate + Gender + Country */}
              <div className="grid gap-4 sm:grid-cols-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Birth date
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    className={selectDark}
                  >
                    <option value="">Select…</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_SAY">
                      Prefer not to say
                    </option>
                  </select>
                </div> 
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="action-button"
                >
                  Next
                </button>
              </div>
            </fieldset>

            {/* STEP 2 */}
            <fieldset
              aria-hidden={step !== 1}
              className={`fieldset ${step === 1 ? "shown" : "hiddenFS"}`}
            >
              <h2 className="fs-title">Experience</h2>
              <h3 className="fs-subtitle">Tell us about your background</h3>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  About me
                </label>
                <textarea
                  rows={3}
                  value={form.about}
                  onChange={(e) =>
                    setForm({ ...form, about: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Short description about you, your profile and goals…"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-800">
                  Experience
                </label>
                <textarea
                  rows={3}
                  value={form.experience}
                  onChange={(e) =>
                    setForm({ ...form, experience: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="e.g. 2022–today: Front-end Developer @ Company…"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-800">
                  Volunteering
                </label>
                <textarea
                  rows={3}
                  value={form.volunteering}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      volunteering: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Volunteer work, organizations, contributions…"
                />
              </div>

              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="action-button-previous"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="action-button"
                >
                  Next
                </button>
              </div>
            </fieldset>

            {/* STEP 3 */}
            <fieldset
              aria-hidden={step !== 2}
              className={`fieldset ${step === 2 ? "shown" : "hiddenFS"}`}
            >
              <h2 className="fs-title">Skills</h2>
              <h3 className="fs-subtitle">What can you do?</h3>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Skills (comma-separated)
                </label>
                <input
                  value={form.skillsCsv}
                  onChange={(e) =>
                    setForm({ ...form, skillsCsv: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="React, Node.js, SQL"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-gray-800">
                    Languages
                  </h3>
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="rounded-xl bg-[#ee0979] text-white px-3 py-1.5 text-sm"
                  >
                    + Add
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {languages.map((l, i) => (
                    <div
                      key={i}
                      className="grid gap-2 sm:grid-cols-[1fr,220px,auto]"
                    >
                      <input
                        className="rounded-xl border px-3 py-2"
                        placeholder="Language"
                        value={l.name}
                        onChange={(e) =>
                          updateLanguage(i, "name", e.target.value)
                        }
                      />
                      <select
                        className="rounded-xl border px-3 py-2 bg-black text-white"
                        value={l.level ?? ""}
                        onChange={(e) =>
                          updateLanguage(i, "level", e.target.value)
                        }
                      >
                        <option value="">Level</option>
                        <option>A1</option>
                        <option>A2</option>
                        <option>B1</option>
                        <option>B2</option>
                        <option>C1</option>
                        <option>C2</option>
                        <option>BASIC</option>
                        <option>INTERMEDIATE</option>
                        <option>ADVANCED</option>
                        <option>FLUENT</option>
                        <option>NATIVE</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLanguage(i)}
                        className="rounded-xl border border-red-400 px-3 py-2 text-sm text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="action-button-previous"
                >
                  Previous
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="action-button"
                >
                  {saving ? "Saving…" : "Submit"}
                </button>
              </div>
            </fieldset>
          </div>
        </form>
      </div>

      {/* Inline styles (CodePen-style) */}
      <style jsx>{`
        .wizard-card {
          animation: fadeIn 0.8s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fs-title {
          @apply text-lg uppercase tracking-widest font-bold text-gray-800 mb-2;
        }
        .fs-subtitle {
          @apply text-sm text-gray-600 mb-4;
        }
        .fieldset {
          @apply rounded-xl p-0 w-full relative;
          background: transparent;
          box-shadow: none;
          transition: all 0.6s ease-in-out;
        }
        .hiddenFS {
          opacity: 0;
          pointer-events: none;
          transform: translateX(50%) scale(0.98);
          position: absolute;
          left: 50%;
          right: 0;
        }
        .shown {
          opacity: 1;
          transform: translateX(0) scale(1);
          position: relative;
          left: 0;
        }
        #progressbar li {
          list-style: none;
        }
        #progressbar li .connector {
          display: block;
        }
        #progressbar li:first-child .connector {
          display: none;
        }
        #progressbar li.active .step-icon {
          background: #35bd0cff;
          color: #6e4242ff;
        }

	  @media (max-width: 640px) {
          .onb-mobile-blacktext :global(input),
          .onb-mobile-blacktext :global(textarea),
          .onb-mobile-blacktext :global(select) {
            color: #000 !important;
            -webkit-text-fill-color: #000 !important; /* iOS Safari fix */
            caret-color: #000 !important;
          }

          /* keep placeholder slightly gray */
          .onb-mobile-blacktext :global(input::placeholder),
          .onb-mobile-blacktext :global(textarea::placeholder) {
            color: rgba(0,0,0,0.45) !important;
            -webkit-text-fill-color: rgba(0,0,0,0.45) !important;
          }
        }

        .action-button {
          width: 110px;
          background: #17d117ff;
          font-weight: 700;
          color: white;
          border: 0;
          border-radius: 9999px;
          cursor: pointer;
          padding: 10px 14px;
        }
        .action-button-previous {
          width: 110px;
          background: #6e4242ff;
          font-weight: 700;
          color: white;
          border: 0;
          border-radius: 9999px;
          cursor: pointer;
          padding: 10px 14px;
        }
      `}</style>
    </div>
  );
}

