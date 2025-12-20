'use client';
import { useState } from 'react';
import api from '@/lib/api';

type Plan = "FREE" | "PRO";
export default function PlanBadge({ plan }: { plan?: Plan | null }) {
  if (!plan) return null;
  const style = plan === "PRO"
    ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white"
    : "bg-slate-200 text-slate-700";
  return (
    <div className={`fixed left-4 top-4 z-50 rounded-xl px-4 py-2 text-sm font-semibold shadow ${style}`}>
      Plan: {plan}
    </div>
  );
}