import { apiRequest } from "./client";
import type { ApiListResponse } from "./types";

export interface Workspace {
  id: string;
  name: string;
  billingEmail?: string | null;
  spendLimitCents?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceResponse {
  data: Workspace;
}

export type WorkspaceRole = "owner" | "admin" | "developer" | "billing" | "viewer" | "member";
export type WorkspaceMemberStatus = "active" | "suspended" | "removed";
export type WorkspaceInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceInviteStatus;
  invitedById: string;
  acceptedById: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  rawToken?: string;
  createdAt: string;
  updatedAt: string;
}

export function getCurrentWorkspace(authToken?: string) {
  return apiRequest<WorkspaceResponse>("/workspaces/current", { authToken });
}

export function updateCurrentWorkspace(input: Partial<Pick<Workspace, "name">>) {
  return apiRequest<WorkspaceResponse>("/workspaces/current", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listWorkspaceMembers() {
  return apiRequest<ApiListResponse<WorkspaceMember>>("/workspaces/current/members");
}

export function updateWorkspaceMember(
  memberId: string,
  input: Partial<Pick<WorkspaceMember, "role" | "status">>,
) {
  return apiRequest<{ data: WorkspaceMember }>(`/workspaces/current/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function removeWorkspaceMember(memberId: string) {
  return apiRequest<{ data: WorkspaceMember }>(`/workspaces/current/members/${memberId}`, {
    method: "DELETE",
  });
}

export function listWorkspaceInvites() {
  return apiRequest<ApiListResponse<WorkspaceInvite>>("/workspaces/current/invites");
}

export function createWorkspaceInvite(input: { email: string; role: WorkspaceRole }) {
  return apiRequest<{ data: WorkspaceInvite }>("/workspaces/current/invites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeWorkspaceInvite(inviteId: string) {
  return apiRequest<{ data: WorkspaceInvite }>(`/workspaces/current/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export function resendWorkspaceInvite(inviteId: string) {
  return apiRequest<{ data: WorkspaceInvite }>(`/workspaces/current/invites/${inviteId}/resend`, {
    method: "POST",
  });
}
