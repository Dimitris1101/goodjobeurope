"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Κάτι πήγε στραβά");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Ξέχασες τον κωδικό;</h1>
        <p className="text-sm text-gray-600 mt-1">Θα σου στείλουμε email με οδηγίες επαναφοράς.</p>
        {sent ? (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 p-3 text-sm">
            Αν υπάρχει λογαριασμός με αυτό το email, στάλθηκαν οδηγίες.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
            <input
              type="email" placeholder="you@example.com" value={email}
              onChange={e=>setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-blue-600"
            />
            <button className="w-full rounded-xl bg-blue-600 text-white px-4 py-2">Αποστολή</button>
          </form>
        )}
        <a href="/auth/login" className="block text-center text-sm text-blue-700 underline mt-4">Πίσω στο login</a>
      </div>
    </div>
  );
}
