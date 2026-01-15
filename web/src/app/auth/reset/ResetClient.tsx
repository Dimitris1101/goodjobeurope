"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(() => {
    return password.length >= 8 && password === confirm && !!token;
  }, [password, confirm, token]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      
      await api.post(
        "/auth/reset-password",
          { token, newPassword: password },
          { headers: { "Content-Type": "application/json" } }
        );
        if (!token?.trim()) { setError("Το token λείπει ή δεν είναι έγκυρο."); return; }
        if (password !== confirm) { setError("Οι κωδικοί δεν ταιριάζουν."); return; }
      setDone(true);
      
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: string } } };
      setError(maybe?.response?.data?.message ?? "Κάτι πήγε στραβά");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/bac_log-in.jpg')" }}
    >
      <div className="w-full max-w-md bg-black/60 p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-semibold text-white text-center">Επαναφορά κωδικού</h1>
        <p className="text-sm text-gray-200 mt-1 text-center">
          Ο σύνδεσμος ισχύει για περιορισμένο χρόνο.
        </p>

        {!token && (
          <div className="mt-4 rounded-lg bg-red-500/70 text-white p-3 text-sm">
            Δεν βρέθηκε token στο URL.
          </div>
        )}

        {done ? (
          <div className="mt-6 rounded-lg bg-green-500/20 text-green-200 p-3 text-sm text-center">
            Ο κωδικός άλλαξε επιτυχώς. Μεταφορά στο login…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {error && (
              <div className="rounded-lg bg-red-500/70 text-white p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Νέος κωδικός
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white bg-transparent px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                placeholder="••••••••"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-white">
                Επιβεβαίωση κωδικού
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white bg-transparent px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                placeholder="••••••••"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full rounded-xl bg-white text-black font-semibold px-4 py-2 hover:bg-gray-200 disabled:opacity-60"
            >
              {busy ? "Αποθήκευση..." : "Αποθήκευση νέου κωδικού"}
            </button>
          </form>
        )}

        <a href="/auth/login" className="block text-center text-sm text-white underline mt-4">
          Πίσω στο login
        </a>
      </div>
    </div>
  );
}