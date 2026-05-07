import { apiRequest } from "./client";

export type BackendAgentMode = "hosted" | "webhook" | "web";

export interface BackendAgent {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string | null;
  mode: BackendAgentMode;
  status: string;
  systemPrompt?: string | null;
  voice?: string | null;
  beginMessage?: string | null;
  transferNumber?: string | null;
  voicemailMessage?: string | null;
  webhookUrl?: string | null;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AgentListItem {
  id: string;
  name: string;
  description: string;
  mode: BackendAgentMode;
  status: string;
  numbers: number;
  calls: number;
  messages: number;
  lastActivity: string;
  systemPrompt: string;
  voice: string;
  beginMessage: string;
  webhookUrl?: string;
  transferNumber?: string;
  voicemailMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBackendAgentInput {
  name: string;
  description?: string;
  mode?: BackendAgentMode;
  systemPrompt?: string;
  voice?: string;
  beginMessage?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateBackendAgentInput = Partial<CreateBackendAgentInput> & {
  transferNumber?: string;
  voicemailMessage?: string;
};

function formatActivity(value: string) {
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

export function mapBackendAgent(agent: BackendAgent): AgentListItem {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "",
    mode: agent.mode,
    status: agent.status,
    numbers: 0,
    calls: 0,
    messages: 0,
    lastActivity: formatActivity(agent.updatedAt),
    systemPrompt: agent.systemPrompt ?? "",
    voice: agent.voice ?? "",
    beginMessage: agent.beginMessage ?? "",
    webhookUrl: agent.webhookUrl ?? undefined,
    transferNumber: agent.transferNumber ?? undefined,
    voicemailMessage: agent.voicemailMessage ?? undefined,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export async function listBackendAgents() {
  const response = await apiRequest<{ data: BackendAgent[]; pagination: { limit: number; nextCursor: string | null } }>("/agents");

  return {
    data: response.data.map(mapBackendAgent),
    pagination: response.pagination,
  };
}

export async function getBackendAgent(id: string) {
  const response = await apiRequest<{ data: BackendAgent }>(`/agents/${id}`);

  return { data: mapBackendAgent(response.data) };
}

export function createBackendAgent(input: CreateBackendAgentInput) {
  return apiRequest<{ data: BackendAgent }>("/agents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createAgentRecord(input: CreateBackendAgentInput) {
  const response = await createBackendAgent(input);

  return { data: mapBackendAgent(response.data) };
}

export async function updateBackendAgent(id: string, input: UpdateBackendAgentInput) {
  const response = await apiRequest<{ data: BackendAgent }>(`/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendAgent(response.data) };
}

export async function disableBackendAgent(id: string) {
  const response = await apiRequest<{ data: BackendAgent }>(`/agents/${id}`, {
    method: "DELETE",
  });

  return { data: mapBackendAgent(response.data) };
}
