"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { mediaUrl, normalizeCvUrl } from "@/lib/media";

type JobPick = { id: number; title: string };

type Props = {
  jobs: JobPick[];
  activeJobId: number | null;
  onChangeJob: (id: number | null) => void;
  onCompanyLike?: (row: {
    jobId: number;
    jobTitle: string;
    candidateId: number;
    candidateName: string;
    candidateLocation?: string | null;
    createdAt: string;
  }) => void;

  onWatchVideo?: (candidateId: number) => void | Promise<void>;
};

// Γραμμή από το /company/matchups?jobId=...
type LikeForJobRow = {
  createdAt: string;
  candidateId: number;
  name: string;
  location: string;
  headline: string;
  about?: string;
  avatarUrl: string | null;
  cvUrl: string | null;
  skills: string[];
  languages?: { name: string; level: string }[];
  searchAreas?: string[];

  companyRating?: number | null;   // rating 1–5
};


type CandidateDetails = {
  id: number;
  name: string;
  location?: string | null;
  headline?: string | null;
  avatarUrl?: string | null;
  skills: string[];
  cvUrl?: string | null;
};

export default function CompanyMatchupsPanel({
  jobs,
  activeJobId,
  onChangeJob,
  onCompanyLike,
  onWatchVideo,
}: Props) {
  const router = useRouter();

  const [rows, setRows] = useState<LikeForJobRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  

  // modal state
  const [selected, setSelected] = useState<CandidateDetails | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
const [videoUrl, setVideoUrl] = useState<string | null>(null);
const [videoLoading, setVideoLoading] = useState(false);
const [videoErr, setVideoErr] = useState<string | null>(null);

  const [ratingTarget, setRatingTarget] = useState<{
    jobId: number;
    jobTitle: string;
    candidateId: number;
    candidateName: string;
  } | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const loadForJob = useCallback(
    async (jobId: number) => {
      setErr(null);
      try {
        const { data } = await api.get<LikeForJobRow[]>("/company/matchups", {
          params: { jobId },
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("GET /company/matchups failed:", e?.response?.data ?? e);
        setRows([]);
        setErr(e?.response?.data?.message ?? "Αποτυχία φόρτωσης θετικών swipes.");
      }
    },
    []
  );

  useEffect(() => {
    setSelected(null);
    if (activeJobId) loadForJob(activeJobId);
  }, [activeJobId, loadForJob]);

  // ESC για κλείσιμο modal
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const onRowClick = (r: LikeForJobRow) => {
    setSelected({
      id: r.candidateId,
      name: r.name,
      location: r.location ?? null,
      headline: r.headline ?? "",
      avatarUrl: r.avatarUrl ?? null,
      skills: Array.isArray(r.skills) ? r.skills : [],
      cvUrl: r.cvUrl ?? null,
    });
  };

   // Τίτλος τρέχουσας αγγελίας (για το callback)
  const jobTitle =
    activeJobId ? jobs.find((j) => j.id === activeJobId)?.title ?? "—" : "—";

  const openRatingModal = () => {
    if (!selected || !activeJobId) return;
    const existing = rows.find((x) => x.candidateId === selected.id);

    setRatingTarget({
      jobId: activeJobId,
      jobTitle,
      candidateId: selected.id,
      candidateName: selected.name,
    });
    setRatingValue(existing?.companyRating ?? 0);
    setRatingError(null);
  };

  const openCv = (cvUrl?: string | null) => {
    if (!cvUrl) return;
    const href = mediaUrl(normalizeCvUrl(cvUrl));
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const openCandidateVideo = async (candidateId: number) => {
  setVideoErr(null);
  setVideoUrl(null);
  setVideoOpen(true);
  setVideoLoading(true);

  try {
    const { data } = await api.get<{ playUrl: string | null }>(
      `/candidate/${candidateId}/video/play`
    );

    if (!data?.playUrl) {
      setVideoErr("This candidate has no video.");
      setVideoUrl(null);
    } else {
      setVideoUrl(data.playUrl);
    }
  } catch (e: any) {
    setVideoErr(e?.response?.data?.message ?? "Could not load candidate video.");
    setVideoUrl(null);
  } finally {
    setVideoLoading(false);
  }
};

const closeVideo = () => {
  setVideoOpen(false);
  setVideoUrl(null);
  setVideoErr(null);
  setVideoLoading(false);
};

  // Like & Message: δημιουργεί match, log-άρει swipe, ενημερώνει parent + ανοίγει messenger
  const likeAndMessage = async (payload: {
    candidateId: number;
    candidateName: string;
    candidateLocation?: string | null;
  }) => {
    if (!activeJobId) return;
    try {
      // 1) match / conversation
      const { data } = await api.post("/matches/accept-by", {
        jobId: activeJobId,
        candidateId: payload.candidateId,
      });

      // 2) log swipe ως LIKE, για να το δει ο πίνακας στο dashboard
      try {
        await api.post("/company/matchups/swipe", {
          jobId: activeJobId,
          candidateId: payload.candidateId,
          decision: "LIKE",
        });
      } catch (e) {
        console.error("POST /company/matchups/swipe failed:", e);
      }

      // 3) ενημέρωσε άμεσα το κάτω κουτί (optimistic update)
      onCompanyLike?.({
        jobId: activeJobId,
        jobTitle,
        candidateId: payload.candidateId,
        candidateName: payload.candidateName,
        candidateLocation: payload.candidateLocation ?? null,
        createdAt: new Date().toISOString(),
      });

      // 4) άνοιγμα messenger
      const conversationId = data?.conversationId;
      if (conversationId) router.push(`/messenger?c=${conversationId}`);
      else router.push(`/messenger`);
    } catch (e) {
      console.error("POST /matches/accept-by failed:", e);
    }
  };


    const submitRating = async () => {
    if (!ratingTarget || !activeJobId || ratingValue < 1 || ratingValue > 5) {
      setRatingError("Διάλεξε βαθμολογία 1–5.");
      return;
    }
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      await api.post("/company/matchups/rate", {
        jobId: ratingTarget.jobId,
        candidateId: ratingTarget.candidateId,
        rating: ratingValue,
      });

      // ενημέρωση τοπικού state: βάζουμε companyRating στο rows
      setRows((prev) =>
        prev.map((r) =>
          r.candidateId === ratingTarget.candidateId
            ? { ...r, companyRating: ratingValue }
            : r
        )
      );

      setRatingTarget(null);
    } catch (e: any) {
      console.error("POST /company/matchups/rate failed:", e?.response?.data ?? e);
      setRatingError(
        e?.response?.data?.message ?? "Αποτυχία αποθήκευσης βαθμολογίας."
      );
    } finally {
      setRatingSubmitting(false);
    }
  };


  return (
    <aside className="rounded-2xl border border-white/50 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">Matchups</span>
        </div>

        <select
          className="bg-black/50 border border-white/20 rounded-md px-2 py-1 text-sm w-full truncate"
          style={{
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
            display: "block",
          }}
          value={activeJobId ?? ""}
          onChange={(e) =>
            onChangeJob(e.target.value ? Number(e.target.value) : null)
          }
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>

      {!activeJobId && (
        <div className="text-sm text-white/80">
          Διάλεξε αγγελία για να δεις matchups.
        </div>
      )}

      {activeJobId && (
        <>
          {err && (
            <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          {/* Πίνακας likes για την επιλεγμένη αγγελία */}
          <div>
            <div className="text-sm font-medium mb-2">Positive swipes</div>
            <div className="max-h-64 overflow-auto border border-white/10 rounded-lg">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-white/70 border-b border-white/10">
                    <th className="py-2 px-2">Υποψήφιος</th>
                    <th className="py-2 px-2">Τοποθεσία</th>
                    <th className="py-2 px-2">Ημ/νία</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((r) => (
                      <tr
                        key={`${r.candidateId}-${r.createdAt}`}
                        className="border-b border-white/10 cursor-pointer hover:bg-white/5"
                        onClick={() => onRowClick(r)}
                        title="Προβολή προφίλ"
                      >
                        <td className="py-2 px-2 flex items-center gap-2">
                          {r.avatarUrl ? (
                            <img
                              src={mediaUrl(r.avatarUrl)}
                              className="h-6 w-6 rounded-full object-cover"
                              alt=""
                            />
                          ) : (
                            <span className="h-6 w-6 rounded-full bg-white/20 inline-block" />
                          )}
                          {r.name}
                        </td>
                        <td className="py-2 px-2">
                          {r.searchAreas?.length
                            ? r.searchAreas.join(" • ")
                            : r.location ?? "—"}
                        </td>
                        <td className="py-2 px-2">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-3 px-2 text-white/60">
                        Δεν υπάρχουν ακόμη.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======= MODAL POPUP ======= */}
      {selected && (
        <div className="fixed inset-0 z-[100]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />
          {/* dialog */}
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md relative rounded-2xl overflow-hidden bg-[#231E39] text-[#B3B8CD] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.75)]">
              {/* close */}
              <button
                className="absolute right-3 top-3 h-8 w-8 rounded-full grid place-items-center text-white/90 hover:bg-white/10"
                aria-label="Κλείσιμο"
                title="Κλείσιμο"
                onClick={() => setSelected(null)}
              >
                ×
              </button>

              <div className="pt-8 pb-4 px-6 text-center">
                <div className="inline-block rounded-full p-1 border border-[#03BFCB]">
                  {selected.avatarUrl ? (
                    <img
                      src={mediaUrl(selected.avatarUrl)}
                      alt={selected.name}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full grid place-items-center bg-[#1F1A36] text-2xl">
                      {selected.name?.[0]?.toUpperCase() ?? "•"}
                    </div>
                  )}
                </div>

                <h3 className="mt-3 text-xl font-semibold text-white">
                  {selected.name}
                </h3>
                <h6 className="mt-0.5 text-xs tracking-wide uppercase opacity-80">
                  {selected.location ?? "—"}
                </h6>
                <p className="mt-1 text-sm opacity-90">
                  {selected.headline ?? "—"}
                </p>

                {/* Προτιμώμενες τοποθεσίες */}
                <div className="mt-2 text-xs opacity-80">
                  <div className="uppercase tracking-wide">
                    Προτιμώμενες τοποθεσίες
                  </div>
                  <div>
                    {(
                      rows.find((x) => x.candidateId === selected.id)
                        ?.searchAreas ?? []
                    ).join(" • ") || "—"}
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  {/* Open CV */}
                  {selected.cvUrl ? (
                    <button
                      onClick={() => openCv(selected.cvUrl)}
                      className="rounded bg-[#03BFCB] border border-[#03BFCB] text-[#231E39] px-4 py-2 text-sm font-medium hover:brightness-110"
                      title="Άνοιγμα CV σε νέο tab"
                    >
                      Open CV
                    </button>
                  ) : (
                    <button
                      className="rounded bg-[#03BFCB]/40 border border-[#03BFCB]/40 text-[#231E39]/70 px-4 py-2 text-sm font-medium cursor-not-allowed"
                      title="Δεν υπάρχει ανεβασμένο CV"
                      disabled
                    >
                      Open CV
                    </button>
                  )}

                  <button
  type="button"
  onClick={() => openCandidateVideo(selected.id)}
  className="rounded border border-[#03BFCB] bg-transparent px-4 py-2 text-sm font-medium text-[#02899C] hover:bg-white/10"
  title="Watch candidate video"
>
  Watch video
</button>

                  {/* ✅ Like → Conversation → Messenger + log & update */}
                  <button
                    className="rounded-lg bg-blue-600 text-white px-3 py-2"
                    onClick={() =>
                      likeAndMessage({
                        candidateId: selected.id,
                        candidateName: selected.name,
                        candidateLocation: selected.location ?? null,
                      })
                    }
                    title="Like & Message"
                  >
                    Like & Message
                  </button>

                   {/* Rating */}
                  <button
                    type="button"
                    onClick={openRatingModal}
                    className="rounded border border-[#03BFCB] text-[#02899C] px-4 py-2 text-sm font-medium bg-transparent"
                    title="Βαθμολόγηση υποψηφίου"
                  >
                    Rating
                  </button>
                </div>
              </div>

              {/* ======= RATING MODAL ======= */}
      {ratingTarget && (
        <div className="fixed inset-0 z-[110]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setRatingTarget(null)}
          />
          {/* dialog */}
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-sm relative rounded-2xl bg-white p-5 shadow-2xl">
              <button
                className="absolute right-3 top-3 h-7 w-7 rounded-full grid place-items-center text-gray-700 hover:bg-gray-100"
                aria-label="Κλείσιμο"
                title="Κλείσιμο"
                onClick={() => setRatingTarget(null)}
              >
                ×
              </button>

              <h3 className="text-lg font-semibold mb-1">
                Candidate rating
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                {ratingTarget.candidateName} ·{" "}
                <span className="font-medium">{ratingTarget.jobTitle}</span>
              </p>

              <div className="flex items-center justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="text-2xl focus:outline-none"
                  >
                    <span
                      className={
                        star <= ratingValue ? "text-yellow-400" : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-gray-600 mb-2">
                Choose a rating from 1 (bad experience) to 5 (excellent).
              </p>

              {ratingError && (
                <div className="mb-2 rounded-md bg-red-50 text-red-700 px-3 py-1.5 text-xs">
                  {ratingError}
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRatingTarget(null)}
                  className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Άκυρο
                </button>
                <button
                  type="button"
                  disabled={ratingSubmitting}
                  onClick={submitRating}
                  className="rounded-lg bg-blue-600 text-white px-4 py-1.5 text-sm disabled:opacity-60"
                >
                  {ratingSubmitting ? "Submit…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ======= /RATING MODAL ======= */}

              {/* skills */}
              <div className="bg-[#1F1A36] px-4 py-4">
                <h6 className="mb-2 text-xs tracking-wide uppercase opacity-80">
                  Skills
                </h6>
                <div className="flex flex-wrap gap-2">
                  {selected.skills?.length ? (
                    selected.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[12px] border border-[#2D2747] rounded px-2 py-1"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] opacity-60">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ======= VIDEO MODAL ======= */}
{videoOpen && (
  <div className="fixed inset-0 z-[120]">
    <div className="absolute inset-0 bg-black/70" onClick={closeVideo} />

    <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">Candidate video</div>
          <button
            onClick={closeVideo}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {videoLoading ? (
            <div className="text-sm text-white/80">Loading video...</div>
          ) : videoErr ? (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {videoErr}
            </div>
          ) : videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="auto"
              className="w-full rounded-xl bg-black"
            />
          ) : (
            <div className="text-sm text-white/70">No video available.</div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
      {/* ======= /MODAL POPUP ======= */}
    </aside>
  );
}
