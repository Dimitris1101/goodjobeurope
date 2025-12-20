"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminUserDetail() {
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const id = Number(idStr);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/admin/users/${id}`)
      .then(res => setData(res.data))
      .catch(() => setData(null));
  }, [id]);

  if (!data) return <div className="p-6">Loading…</div>;

  const u = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Χρήστης #{u.id}</h1>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Βασικά</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-500">Email:</span> {u.email}</div>
          <div><span className="text-slate-500">Role:</span> {u.role}</div>
          <div><span className="text-slate-500">Created:</span> {new Date(u.createdAt).toLocaleString()}</div>
        </div>
      </section>

      {u.candidate && (
        <section className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Candidate</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>Name: {u.candidate.name}</div>
            <div>First/Last: {u.candidate.firstName} {u.candidate.lastName}</div>
            <div>Location: {u.candidate.location}</div>
            <div>Birth: {u.candidate.birthDate ? new Date(u.candidate.birthDate).toLocaleDateString() : "-"}</div>
            <div>Headline: {u.candidate.headline}</div>
            <div>Degree: {u.candidate.degree ? "Yes" : "No"}</div>
            <div>Degree Title: {u.candidate.degreeTitle ?? "-"}</div>
            <div>Phone: {u.candidate.phone ?? "-"}</div>
            <div className="col-span-2">About: {u.candidate.about ?? "-"}</div>
            <div className="col-span-2">Education: {u.candidate.education ?? "-"}</div>
            <div className="col-span-2">Experience: {u.candidate.experience ?? "-"}</div>
            <div className="col-span-2">Volunteering: {u.candidate.volunteering ?? "-"}</div>
            <div className="col-span-2">Skills: {u.candidate.skillsText ?? "-"}</div>
            <div>Completed: {u.candidate.profileCompleted ? "✅" : "—"}</div>
          </div>
        </section>
      )}

      {u.company && (
        <section className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Company</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>Name: {u.company.name}</div>
            <div>Country: {u.company.country ?? "-"}</div>
            <div>Website: {u.company.website ?? "-"}</div>
            <div>Phone: {u.company.phone ?? "-"}</div>
            <div className="col-span-2">About: {u.company.about ?? "-"}</div>
            <div>Completed: {u.company.profileCompleted ? "✅" : "—"}</div>
          </div>
        </section>
      )}

      {u.subscriptions?.length > 0 && (
        <section className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Subscriptions</h2>
          <ul className="text-sm list-disc pl-5">
            {u.subscriptions.map((s: any) => (
              <li key={s.id}>
                #{s.id} – {s.status} – {s.plan?.name ?? "-"} – {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "-"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}