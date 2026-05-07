import { apiRequest, API_BASE_URL } from "./client";

export interface BackendHealth {
  name: string;
  phase: string;
  status: "ok" | string;
}

export async function getBackendHealth() {
  return apiRequest<{ data: BackendHealth }>("/health", { auth: false });
}

export function getBackendBaseUrl() {
  return API_BASE_URL;
}
