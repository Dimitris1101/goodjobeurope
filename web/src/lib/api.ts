import axios, { AxiosHeaders } from "axios";
import type { CompanyUpdatePayload } from "./company";
import { PLAN_DB_NAME, type PlanKey } from "./plans";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      // Axios v1: headers μπορεί να είναι AxiosHeaders ή raw object
      const h = AxiosHeaders.from(config.headers);
      h.set("Authorization", `Bearer ${token}`);
      config.headers = h;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

/** PUT /me/company (JSON) */
export async function updateMyCompany(payload: CompanyUpdatePayload) {
  const { data } = await api.put("/me/company", payload);
  return data;
}

/** PUT /me/company/media (multipart) */
export async function uploadCompanyMedia(files: { logo?: File | null; cover?: File | null }) {
  const fd = new FormData();
  if (files.logo)  fd.append("logo",  files.logo);
  if (files.cover) fd.append("cover", files.cover);

  const { data } = await api.put("/me/company/media", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { logoUrl?: string; coverUrl?: string; company: any };
}

/** PUT /me/plan (JSON) — αποθήκευση πλάνου για τον τρέχοντα χρήστη */
export async function selectMyPlan(planKey: PlanKey) {
  const plan = PLAN_DB_NAME[planKey]; // π.χ. COMPANY_SILVER_UI -> "COMPANY_SILVER"
  const { data } = await api.put("/me/plan", { plan });
  return data as { ok: true };
}

export default api;