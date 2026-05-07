import { apiRequest } from "./client";

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  billingEmail?: string | null;
  spendLimitCents?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceResponse {
  data: Workspace;
}

export function getCurrentWorkspace(authToken?: string) {
  return apiRequest<WorkspaceResponse>("/workspaces/current", { authToken });
}

export function updateCurrentWorkspace(input: Partial<Pick<Workspace, "name" | "billingEmail">>) {
  return apiRequest<WorkspaceResponse>("/workspaces/current", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
