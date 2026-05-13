import { apiRequest, API_BASE_URL } from "./client";
import type { ApiListResponse } from "./types";

export interface CurrentUserProject {
  id: string;
  name: string;
  environment: string;
}

export interface CurrentUserWorkspace {
  id: string;
  name: string;
  role: string;
  status: string;
  projects: CurrentUserProject[];
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  activeWorkspaceId: string;
  activeProjectId: string;
  activeWorkspace: {
    id: string;
    name: string;
  };
  activeProject: CurrentUserProject;
  workspaces: CurrentUserWorkspace[];
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  invitedById: string | null;
  acceptedById: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getCurrentUser() {
  return apiRequest<{ data: CurrentUser }>("/users/me");
}

export function logoutSession() {
  return apiRequest<{ data: { loggedOut: boolean } }>("/auth/logout", {
    method: "POST",
  });
}

export function startGoogleLogin() {
  window.location.href = `${API_BASE_URL}/auth/google/start`;
}

export function listSessionWorkspaces() {
  return apiRequest<ApiListResponse<CurrentUserWorkspace>>("/workspaces");
}

export function createSessionWorkspace(input: { name: string }) {
  return apiRequest<{ data: CurrentUserWorkspace & { projects: CurrentUserProject[] } }>("/workspaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function switchSessionWorkspace(workspaceId: string, input: { projectId?: string } = {}) {
  return apiRequest<{ data: { workspaceId: string; projectId: string } }>(`/workspaces/${workspaceId}/switch`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function acceptWorkspaceInvite(input: { token: string }) {
  return apiRequest<{ data: WorkspaceInvite }>("/workspaces/invites/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
