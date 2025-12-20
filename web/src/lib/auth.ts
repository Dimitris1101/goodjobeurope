import { api } from "@/lib/api";

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearToken() {
  localStorage.removeItem("token");
  delete api.defaults.headers.common.Authorization;
}