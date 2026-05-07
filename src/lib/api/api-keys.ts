import { apiRequest } from "./client";

export type ApiKeyStatus = "active" | "revoked";

export interface BackendApiKey {
  id: string;
  workspaceId: string;
  projectId: string;
  label: string;
  prefix: string;
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendCreatedApiKey extends BackendApiKey {
  key: string;
}

export interface ApiKeyListItem {
  id: string;
  workspaceId: string;
  projectId: string;
  label: string;
  prefix: string;
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  lastUsedLabel: string;
  createdAt: string;
  createdLabel: string;
  updatedAt: string;
}

export interface CreatedApiKeyView extends ApiKeyListItem {
  key: string;
}

export interface CreateApiKeyInput {
  label: string;
}

export interface UpdateApiKeyInput {
  label?: string;
  status?: ApiKeyStatus;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function mapBackendApiKey(apiKey: BackendApiKey): ApiKeyListItem {
  return {
    id: apiKey.id,
    workspaceId: apiKey.workspaceId,
    projectId: apiKey.projectId,
    label: apiKey.label,
    prefix: apiKey.prefix,
    status: apiKey.status,
    lastUsedAt: apiKey.lastUsedAt,
    lastUsedLabel: formatDateTime(apiKey.lastUsedAt),
    createdAt: apiKey.createdAt,
    createdLabel: formatDateTime(apiKey.createdAt),
    updatedAt: apiKey.updatedAt,
  };
}

export function mapBackendCreatedApiKey(apiKey: BackendCreatedApiKey): CreatedApiKeyView {
  return {
    ...mapBackendApiKey(apiKey),
    key: apiKey.key,
  };
}

export async function listBackendApiKeys(limit = 50) {
  const response = await apiRequest<{ data: BackendApiKey[]; pagination: { limit: number; nextCursor: string | null } }>("/api-keys", {
    query: { limit },
  });

  return {
    data: response.data.map(mapBackendApiKey),
    pagination: response.pagination,
  };
}

export async function createBackendApiKey(input: CreateApiKeyInput) {
  const response = await apiRequest<{ data: BackendCreatedApiKey }>("/api-keys", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendCreatedApiKey(response.data) };
}

export async function updateBackendApiKey(id: string, input: UpdateApiKeyInput) {
  const response = await apiRequest<{ data: BackendApiKey }>(`/api-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendApiKey(response.data) };
}

export async function revokeBackendApiKey(id: string) {
  const response = await apiRequest<{ data: BackendApiKey }>(`/api-keys/${id}`, {
    method: "DELETE",
  });

  return { data: mapBackendApiKey(response.data) };
}
