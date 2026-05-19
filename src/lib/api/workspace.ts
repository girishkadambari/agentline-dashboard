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

export interface WorkspaceSettings {
  workspace: Workspace;
  currentUserRole: WorkspaceRole | null;
  currentProjectId: string;
  projects: Array<{
    id: string;
    name: string;
    environment: string;
    createdAt: string;
    updatedAt: string;
  }>;
  counts: {
    activeMembers: number;
    pendingInvites: number;
    agents: number;
    activeNumbers: number;
    activeWebhooks: number;
  };
  onboarding: {
    hasAgent: boolean;
    hasActiveNumber: boolean;
    hasWebhook: boolean;
    readyForLiveTraffic: boolean;
    nextAction: "create_agent" | "attach_number" | "configure_webhook" | "run_live_smoke";
  };
  billing: {
    currency: string;
    balanceCents: number;
    spendLimitCents: number | null;
    prepaidRequired: boolean;
    lowBalance: boolean;
  };
  providers: {
    telecom: {
      provider: string;
      mode: string;
      credentialsReady: boolean;
      liveCredentialsReady: boolean;
      testCredentialsReady: boolean;
      callbackUrlsReady: boolean;
    };
    stripe: {
      mode: string;
      secretKeyConfigured: boolean;
      webhookSecretConfigured: boolean;
      usageMeterEventNameConfigured: boolean;
    };
    brevo: {
      apiKeyConfigured: boolean;
      fromEmailConfigured: boolean;
    };
    auth: {
      googleConfigured: boolean;
    };
  };
  controls: {
    canManageWorkspace: boolean;
    canManageBilling: boolean;
    canInviteMembers: boolean;
    canManageApiKeys: boolean;
    recording?: {
      enabled: boolean;
      consentRequired: boolean;
      status: string;
    };
    retention?: {
      transcriptsDays: number;
      recordingsDays: number | null;
      rawEventsDays: number;
      configurable: boolean;
    };
  };
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

export function getCurrentWorkspaceSettings() {
  return apiRequest<{ data: WorkspaceSettings }>("/workspaces/current/settings");
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
