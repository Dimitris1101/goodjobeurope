"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import LocationAutocomplete from "@/components/LocationAutocomplete";

type Props = {
  open?: boolean;          // αν το modal σου περνάει "open"
  onCreated?: () => void;  // refresh λίστας
  onClose?: () => void;    // κλείσιμο modal
};

export default function JobCreateForm({ open, onCreated, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workMode, setWorkMode] = useState<"ONSITE" | "HYBRID" | "REMOTE">("ONSITE");
  const [skillsCsv, setSkillsCsv] = useState("");
  const [jobLoc, setJobLoc] = useState<{ placeId: string; description: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [locWarn, setLocWarn] = useState<string | null>(null);

  // ✅ κάθε φορά που ανοίγει το modal, καθάρισε φόρμα & errors (ώστε να μη βλέπεις παλιό "Αποτυχία…")
  useEffect(() => {
    if (open) {
      setErr(null);
      setLocWarn(null);
      // αφήνω τα πεδία όπως είναι, αλλά αν θες πλήρες reset:
      // setTitle(""); setDescription(""); setWorkMode("ONSITE"); setSkillsCsv(""); setJobLoc(null);
    }
  }, [open]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setLocWarn(null);

    try {
      if (!title.trim()) {
        setErr("Συμπλήρωσε τίτλο θέσης.");
        return;
      }

      // 1) Δημιουργία αγγελίας
      const { data: created } = await api.post("/jobs", {
        title: title.trim(),
        description: description.trim(),
        workMode,
        skillsCsv: skillsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(","),
      });

      // 2) Αν υπάρχει placeId → "δέστο" στην αγγελία (ΔΕΝ μπλοκάρει τη δημιουργία αν αποτύχει)
      if (jobLoc?.placeId) {
        try {
          await api.post(`/jobs/${created.id}/location`, { placeId: jobLoc.placeId });
        } catch (e: any) {
          // Δεν θέλουμε κόκκινο error για να μη νομίζει ο χρήστης ότι δεν δημιουργήθηκε η αγγελία.
          // Δίνουμε ήπια προειδοποίηση και προχωράμε.
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Η αγγελία δημιουργήθηκε, αλλά απέτυχε η αποθήκευση τοποθεσίας.";
          setLocWarn(msg);
        }
      }

      // 3) Refresh λίστας & κλείσιμο
      onCreated?.();
      onClose?.();
    } catch (e: any) {
      // ΜΟΝΟ αν αποτύχει η ΔΗΜΙΟΥΡΓΙΑ της αγγελίας (1ο βήμα) δείχνουμε error
      setErr(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(", ")
          : e?.response?.data?.message || e?.message || "Αποτυχία δημιουργίας αγγελίας"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={create} className="space-y-4">
      {err && <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
      {locWarn && !err && (
        <div className="rounded bg-yellow-50 text-yellow-800 px-3 py-2 text-sm">{locWarn}</div>
      )}

      <div>
        <label className="block text-sm font-medium">Τίτλος</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="π.χ. Οδηγός Β' Κατηγορίας"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Περιγραφή</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Καθήκοντα, ωράριο, αμοιβή…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Μοντέλο εργασίας</label>
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value as any)}
        >
          <option value="ONSITE">On-site</option>
          <option value="HYBRID">Hybrid</option>
          <option value="REMOTE">Remote</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Skills (με κόμμα)</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={skillsCsv}
          onChange={(e) => setSkillsCsv(e.target.value)}
          placeholder="Forklift, Category B driving, English B1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Τοποθεσία αγγελίας</label>
        <LocationAutocomplete
          value={jobLoc}
          onSelect={setJobLoc}
          placeholder="Πληκτρολόγησε και διάλεξε…"
        />
        <p className="mt-1 text-xs text-gray-500">
          Η τοποθεσία θα δεθεί στην αγγελία αμέσως μετά την αποθήκευση.
        </p>
      </div>

      <div className="pt-1 flex items-center gap-2">
        <button
          disabled={saving}
          className="rounded-xl bg-blue-600 text-white px-4 py-2.5 disabled:opacity-60"
        >
          {saving ? "Αποθήκευση…" : "Δημιουργία"}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5">
          Άκυρο
        </button>
      </div>
    </form>
  );
}