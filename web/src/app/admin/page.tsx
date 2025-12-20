"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminHome() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load(page=1) {
    const res = await api.get(`/admin/users?page=${page}&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
  }

  if (!token) return null;
  if (!data) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin — Users</h1>
      <div className="flex gap-2">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search email/role" className="border rounded-lg px-3 py-2"/>
        <button onClick={()=>load(1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Search</button>
      </div>
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u:any)=>(
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.company?.name ?? u.candidate?.name ?? "-"}</td>
                <td className="p-2">{u.subscriptions?.[0]?.plan?.name ?? "Free"}</td>
                <td className="p-2">
                  <ChangeRole userId={u.id} current={u.role} token={token!} onDone={()=>load()} />
                  <ChangePlan userId={u.id} token={token!} onDone={()=>load()} />
                </td>
                <td className="p-2">
                <ChangeRole userId={u.id} current={u.role} token={token!} onDone={()=>load()} />
                <ChangePlan userId={u.id} token={token!} onDone={()=>load()} />
                <Link className="ml-2 text-blue-600 hover:underline" href={`/admin/users/${u.id}`}>
                Προβολή
                </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination hint */}
      <div className="text-sm text-gray-600">Total: {data.total}</div>
    </div>
  );
}

function ChangeRole({
  userId, current, token, onDone,
}: { userId:number; current:string; token:string; onDone:()=>void }) {
  async function setRole(role:string){
    await api.patch(`/admin/users/${userId}/role`, { role }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    onDone();
  }
  return (
    <div className="inline-flex items-center gap-1">
      {/* A11y label */}
      <label className="sr-only" htmlFor={`role-${userId}`}>Change role</label>
      <select
        id={`role-${userId}`}
        aria-label="Change role"             // ✅ προσβάσιμο όνομα
        defaultValue={current}
        onChange={(e)=>setRole(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="ADMIN">ADMIN</option>
        <option value="COMPANY">COMPANY</option>
        <option value="CANDIDATE">CANDIDATE</option>
      </select>
    </div>
  );
}

function ChangePlan({
  userId, token, onDone,
}: { userId:number; token:string; onDone:()=>void }) {
  async function setPlan(planName:string){
    await api.patch(`/admin/users/${userId}/plan`, { planName }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    onDone();
  }
  return (
    <div className="inline-flex items-center gap-1 ml-2">
      {/* A11y label */}
      <label className="sr-only" htmlFor={`plan-${userId}`}>Change plan</label>
      <select
        id={`plan-${userId}`}
        aria-label="Change plan"             // ✅ προσβάσιμο όνομα
        defaultValue=""
        onChange={(e)=>setPlan(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="" disabled>Set plan…</option>
        <option value="Free">Free</option>
        <option value="Pro Candidate">Pro Candidate</option>
        <option value="Pro Company">Pro Company</option>
      </select>
    </div>
  );
}