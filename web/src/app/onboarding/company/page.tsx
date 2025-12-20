"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { updateMyCompany } from "@/lib/api";
import { toCompanyPayload } from "@/lib/company";
import LocationAutocomplete from "@/components/LocationAutocomplete";

type CompanyForm = {
  name: string;
  website?: string;
  phone?: string;
  country?: string; // keeps the description for display/compat
  about?: string;
};

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm>({ name: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company location (autocomplete)
  const [companyLoc, setCompanyLoc] = useState<{
    placeId: string;
    description: string;
  } | null>(null);
  const [savingLoc] = useState(false); // reserved for future endpoint

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await api.get("/me");
        if (!me) {
          router.replace("/auth/login");
          return;
        }
        if (me.role !== "COMPANY") {
          router.replace("/");
          return;
        }
        if (me.company?.profileCompleted) {
          router.replace("/dashboard/company");
          return;
        }

        const f: CompanyForm = {
          name: me.company?.name ?? "",
          website: me.company?.website ?? "",
          phone: me.company?.phone ?? "",
          country: me.company?.country ?? "",
          about: me.company?.about ?? "",
        };
        setForm(f);

        if (f.country) {
          setCompanyLoc({ placeId: "", description: f.country });
        }
      } catch (e) {
        setError("Failed to load company details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleCompanyLocationSelect(place: {
    placeId: string;
    description: string;
  }) {
    setCompanyLoc(place);
    // For now, keep description in country field (compat with /me/company)
    setForm((f) => ({ ...f, country: place.description }));

    // If you add a normalized company location endpoint later, you can do:
    // try {
    //   setSavingLoc(true);
    //   await api.post('/me/company/location', { placeId: place.placeId });
    // } finally {
    //   setSavingLoc(false);
    // }
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.name?.trim()) {
        setError("Company name is required.");
        setSaving(false);
        return;
      }

      const payload = toCompanyPayload(form);
      await updateMyCompany(payload);
      router.replace("/onboarding/plan");
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(", ")
        : err?.response?.data?.message ?? "Failed to save company profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080710] text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080710] flex items-center justify-center relative overflow-hidden px-4">
      {/* Glassmorphism background circles */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-52 w-52 rounded-full bg-gradient-to-br from-[#1845ad] to-[#23a2f6]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-52 w-52 rounded-full bg-gradient-to-r from-[#ff512f] to-[#f09819]" />

      {/* Glass card */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-white/10
                   bg-white/10 backdrop-blur-lg shadow-[0_0_40px_rgba(8,7,16,0.6)]
                   px-6 sm:px-8 py-8 sm:py-10 text-white"
      >
        <h1 className="text-2xl font-semibold text-center mb-2">
          Company onboarding
        </h1>
        <p className="text-sm text-center text-gray-200 mb-4">
          Fill in the basic details of your company to get started.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/20 border border-red-400/60 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {/* Company name */}
          <div className="mt-4">
            <label
              htmlFor="company-name"
              className="block text-sm font-medium"
            >
              Company name <span className="text-red-300">*</span>
            </label>
            <input
              id="company-name"
              name="name"
              required
              aria-required="true"
              className="mt-2 w-full rounded-md bg-white/10 border border-white/20 px-3 py-2
                         text-sm placeholder:text-gray-300 focus:outline-none
                         focus:ring-2 focus:ring-white/60"
              placeholder="e.g. Acme S.A."
              title="Company name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              autoComplete="organization"
            />
          </div>

          {/* Website */}
          <div className="mt-4">
            <label
              htmlFor="company-website"
              className="block text-sm font-medium"
            >
              Website
            </label>
            <input
              id="company-website"
              name="website"
              className="mt-2 w-full rounded-md bg-white/10 border border-white/20 px-3 py-2
                         text-sm placeholder:text-gray-300 focus:outline-none
                         focus:ring-2 focus:ring-white/60"
              placeholder="https://example.com"
              title="Company website (optional)"
              value={form.website ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              inputMode="url"
              autoComplete="url"
            />
          </div>

          {/* Phone */}
          <div className="mt-4">
            <label
              htmlFor="company-phone"
              className="block text-sm font-medium"
            >
              Phone
            </label>
            <input
              id="company-phone"
              name="phone"
              className="mt-2 w-full rounded-md bg-white/10 border border-white/20 px-3 py-2
                         text-sm placeholder:text-gray-300 focus:outline-none
                         focus:ring-2 focus:ring-white/60"
              placeholder="+30 210 1234567"
              title="Contact phone (optional)"
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          {/* Country / City */}
          <div className="mt-4">
            <label className="block text-sm font-medium">Country / City</label>
            <div className="mt-2">
              <LocationAutocomplete
                value={companyLoc}
                onSelect={handleCompanyLocationSelect}
                placeholder="Type and select a location…"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-300">
              {savingLoc
                ? "Saving location…"
                : "The location will be saved along with your company details."}
            </p>
          </div>

          {/* About */}
          <div className="mt-4">
            <label
              htmlFor="company-about"
              className="block text-sm font-medium"
            >
              Short description
            </label>
            <textarea
              id="company-about"
              name="about"
              rows={4}
              className="mt-2 w-full rounded-md bg-white/10 border border-white/20 px-3 py-2
                         text-sm placeholder:text-gray-300 focus:outline-none
                         focus:ring-2 focus:ring-white/60 resize-none"
              placeholder="Write a few words about your company, what it does and what roles you are hiring for…"
              title="Company description (optional)"
              value={form.about ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, about: e.target.value }))
              }
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full rounded-md bg-white py-3 text-base font-semibold
                       text-[#080710] hover:bg-gray-100 disabled:opacity-60
                       transition-colors"
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-center text-gray-200">
          You can update these details later from your company profile.
        </p>
      </div>
    </div>
  );
}
