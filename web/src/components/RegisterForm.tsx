// C:\job-matching\web\src\components\RegisterForm.tsx
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { countries } from "@/lib/countries";
import { uiLanguages } from "@/lib/uiLanguages";

/** Schema: uiLanguage REQUIRED (basic UI languages) */
const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
    role: z.enum(["COMPANY", "CANDIDATE"]),
    name: z.string().min(2, "Enter your name / company name"),
    country: z.string().min(2, "Select a country"),
    uiLanguage: z.string().min(2, "Select a UI language"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "CANDIDATE", uiLanguage: "en" },
  });

  const role = watch("role");
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setServerError(null);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        role: data.role,
        name: data.name,
        country: data.country,
        uiLanguage: data.uiLanguage,
      };

      await api.post("/auth/register", payload);

      if (typeof window !== "undefined") {
  // 1) account preferred language
  localStorage.setItem("preferredLanguage", data.uiLanguage);

  // 2) backwards compat (ό,τι παλιό διαβάζει αυτό)
  localStorage.setItem("uiAccountLang", data.uiLanguage);

  // 3) ξεκινά μεταφρασμένο
  localStorage.setItem("ui.mode", "preferred");

  // 4) cookie που διαβάζει το autoTranslate hook
  document.cookie = `uiLanguage=${encodeURIComponent(
    data.uiLanguage
  )}; path=/; max-age=31536000`;

  // 5) ενημέρωση UI (αν κάποια components ακούνε)
  window.dispatchEvent(new CustomEvent("uiModeChanged"));
}

      router.push(`/auth/check-email?email=${encodeURIComponent(data.email)}`);
      return;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Registration failed");
    }
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
          {serverError}
        </div>
      )}

      {/* Role */}
      <fieldset>
        <legend className="block text-sm font-medium">Role</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <label
            htmlFor="role-candidate"
            className={`rounded-xl border p-2 text-center cursor-pointer ${
              role === "CANDIDATE" ? "ring-2 ring-blue-600" : ""
            }`}
          >
            <input
              id="role-candidate"
              type="radio"
              value="CANDIDATE"
              {...register("role")}
              className="hidden"
            />
            Candidate
          </label>

          <label
            htmlFor="role-company"
            className={`rounded-xl border p-2 text-center cursor-pointer ${
              role === "COMPANY" ? "ring-2 ring-blue-600" : ""
            }`}
          >
            <input
              id="role-company"
              type="radio"
              value="COMPANY"
              {...register("role")}
              className="hidden"
            />
            Company
          </label>
        </div>
      </fieldset>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          {...register("password")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Name / Company name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          {role === "COMPANY" ? "Company name" : "Full name"}
        </label>
        <input
          id="name"
          {...register("name")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder={
            role === "COMPANY"
              ? "Your company name"
              : "Your full name"
          }
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium">
          Country
        </label>
        <select
          id="country"
          {...register("country")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          defaultValue=""
        >
          <option value="" disabled>
            -- Select a country --
          </option>
          {countries.map((c, idx) => (
            <option key={`${c.code}-${idx}`} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="text-xs text-red-600">{errors.country.message}</p>
        )}
      </div>

      {/* UI Language */}
      <div>
        <label htmlFor="uiLanguage" className="block text-sm font-medium">
          UI language
        </label>
        <select
          id="uiLanguage"
          {...register("uiLanguage")}
          className="mt-1 w-full rounded-xl border px-3 py-2"
        >
          {uiLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} ({l.code})
            </option>
          ))}
        </select>
        {errors.uiLanguage && (
          <p className="text-xs text-red-600">{errors.uiLanguage.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        data-busy={isSubmitting ? "" : undefined}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      {/* Social sign up / login */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">or</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <a
          href={`${apiBase}/auth/google`}
          className="w-full inline-flex items-center justify-center rounded-xl border px-4 py-2 hover:bg-gray-50 text-sm"
        >
          Continue with Google
        </a>
        <a
          href={`${apiBase}/auth/facebook`}
          className="w-full inline-flex items-center justify-center rounded-xl border px-4 py-2 hover:bg-gray-50 text-sm"
        >
          Continue with Facebook
        </a>
      </div>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link className="text-blue-700 hover:underline" href="/auth/login">
          Log in
        </Link>
      </p>
    </form>
  );
}

