import { apiRequest } from "./client";
import type { CallListItem, BackendCall } from "./calls";
import { mapBackendCall } from "./calls";
import type {
  BackendConversation,
  BackendMessage,
  ConversationListItem,
  MessageListItem,
} from "./messages";
import { mapBackendConversation, mapBackendMessage } from "./messages";
import type { BackendNumber, NumberListItem } from "./numbers";
import type { BackendUsageEvent, UsageEventListItem } from "./usage";
import { mapBackendUsageEvent } from "./usage";
import type { BackendWebhookDelivery, WebhookDeliveryListItem } from "./webhooks";
import { mapBackendWebhookDelivery } from "./webhooks";

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

export interface BackendAgentSummary {
  agent: BackendAgent;
  counts: {
    numbers: number;
    activeNumbers: number;
    conversations: number;
    messages: number;
    calls: number;
    failedWebhookDeliveries: number;
    providerIssues: number;
  };
  numbers: BackendNumber[];
  recentConversations: BackendConversation[];
  recentCalls: BackendCall[];
  recentMessages: BackendMessage[];
  recentUsageEvents: BackendUsageEvent[];
  recentWebhookDeliveries: BackendWebhookDelivery[];
  providerIssues: Array<{
    id: string;
    provider: string;
    providerEventId: string | null;
    eventType: string;
    status: string | null;
    resourceType: string;
    resourceId: string;
    code: string | null;
    message: string | null;
    occurredAt: string;
  }>;
  timeline: Array<{
    id: string;
    type: "call" | "message" | "usage" | "webhook" | "provider_issue";
    title: string;
    status: string;
    resourceId: string;
    occurredAt: string;
    metadata: Record<string, unknown>;
  }>;
  usage: {
    eventCount: number;
    totalCost: string;
  };
  lastActivityAt: string;
}

export interface AgentSummary {
  agent: AgentListItem;
  counts: BackendAgentSummary["counts"];
  numbers: NumberListItem[];
  recentConversations: ConversationListItem[];
  recentCalls: CallListItem[];
  recentMessages: MessageListItem[];
  recentUsageEvents: UsageEventListItem[];
  recentWebhookDeliveries: WebhookDeliveryListItem[];
  providerIssues: BackendAgentSummary["providerIssues"];
  timeline: BackendAgentSummary["timeline"];
  usage: BackendAgentSummary["usage"];
  lastActivity: string;
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
  const response = await apiRequest<{
    data: BackendAgent[];
    pagination: { limit: number; nextCursor: string | null };
  }>("/agents");

  return {
    data: response.data.map(mapBackendAgent),
    pagination: response.pagination,
  };
}

export async function getBackendAgent(id: string) {
  const response = await apiRequest<{ data: BackendAgent }>(`/agents/${id}`);

  return { data: mapBackendAgent(response.data) };
}

export async function getBackendAgentSummary(id: string) {
  const response = await apiRequest<{ data: BackendAgentSummary }>(`/agents/${id}/summary`);

  return {
    data: {
      agent: mapBackendAgent(response.data.agent),
      counts: response.data.counts,
      numbers: response.data.numbers.map((number) => ({
        id: number.id,
        agentId: number.agentId ?? undefined,
        number: number.phoneNumber,
        country: number.country,
        areaCode: number.areaCode ?? "",
        capabilities: number.capabilities,
        provider: number.provider,
        status: number.status,
        monthlyCost: 1.15,
        createdAt: number.createdAt,
        updatedAt: number.updatedAt,
      })),
      recentConversations: response.data.recentConversations.map(mapBackendConversation),
      recentCalls: response.data.recentCalls.map(mapBackendCall),
      recentMessages: response.data.recentMessages.map(mapBackendMessage),
      recentUsageEvents: response.data.recentUsageEvents.map(mapBackendUsageEvent),
      recentWebhookDeliveries: response.data.recentWebhookDeliveries.map(mapBackendWebhookDelivery),
      providerIssues: response.data.providerIssues,
      timeline: response.data.timeline,
      usage: response.data.usage,
      lastActivity: formatActivity(response.data.lastActivityAt),
    },
  };
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
