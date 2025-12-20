/*'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export type Me = {
  id: number;
  email: string;
  role: 'ADMIN'|'COMPANY'|'CANDIDATE';
  emailVerified: boolean;
  company?: { id: number; name: string } | null;
  candidate?: { id: number; name: string } | null;
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Me>('/auth/me');
        setMe(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return { me, loading };
} */

  "use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function useMe() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setMe(null);
      return;
    }
    api
      .get("/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setMe(r.data))
      .catch((e) => setError(e?.response?.data?.message ?? "Failed to load /me"))
      .finally(() => setLoading(false));
  }, []);

  return { me, loading, error };
}
