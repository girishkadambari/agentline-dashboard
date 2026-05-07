import { apiRequest } from "./client";

export type BackendConversationStatus = "open" | "closed" | "archived";
export type BackendMessageDirection = "inbound" | "outbound";

export interface BackendConversation {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId: string;
  contactId: string;
  channel: "sms" | "voice" | string;
  status: BackendConversationStatus | string;
  lastActivityAt: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId: string;
  conversationId: string;
  phoneNumberId: string;
  contactId: string;
  direction: BackendMessageDirection;
  body: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  agentId: string;
  contactId: string;
  channel: string;
  status: string;
  lastActivityAt: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListItem {
  id: string;
  agentId: string;
  conversationId: string;
  phoneNumberId: string;
  contactId: string;
  direction: BackendMessageDirection;
  body: string;
  status: string;
  provider: string;
  createdAt: string;
  timestamp: string;
}

export interface SendMessageInput {
  agentId: string;
  to: string;
  body: string;
}

export interface SimulateInboundSmsInput {
  agentId: string;
  from: string;
  body: string;
}

export interface UpdateConversationInput {
  status?: BackendConversationStatus;
  metadata?: Record<string, unknown>;
}

function formatDateTime(value: string) {
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

export function mapBackendConversation(conversation: BackendConversation): ConversationListItem {
  return {
    id: conversation.id,
    agentId: conversation.agentId,
    contactId: conversation.contactId,
    channel: conversation.channel,
    status: conversation.status,
    lastActivityAt: conversation.lastActivityAt,
    lastActivity: formatDateTime(conversation.lastActivityAt),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function mapBackendMessage(message: BackendMessage): MessageListItem {
  return {
    id: message.id,
    agentId: message.agentId,
    conversationId: message.conversationId,
    phoneNumberId: message.phoneNumberId,
    contactId: message.contactId,
    direction: message.direction,
    body: message.body,
    status: message.status,
    provider: message.provider,
    createdAt: message.createdAt,
    timestamp: formatDateTime(message.createdAt),
  };
}

export async function listBackendConversations(query: { agentId?: string; status?: string } = {}) {
  const response = await apiRequest<{ data: BackendConversation[]; pagination: { limit: number; nextCursor: string | null } }>("/conversations", {
    query,
  });

  return {
    data: response.data.map(mapBackendConversation),
    pagination: response.pagination,
  };
}

export async function getBackendConversation(id: string) {
  const response = await apiRequest<{ data: BackendConversation }>(`/conversations/${id}`);

  return { data: mapBackendConversation(response.data) };
}

export async function updateBackendConversation(id: string, input: UpdateConversationInput) {
  const response = await apiRequest<{ data: BackendConversation }>(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendConversation(response.data) };
}

export async function listBackendConversationMessages(conversationId: string) {
  const response = await apiRequest<{ data: BackendMessage[]; pagination: { limit: number; nextCursor: string | null } }>(
    `/conversations/${conversationId}/messages`,
  );

  return {
    data: response.data.map(mapBackendMessage),
    pagination: response.pagination,
  };
}

export async function sendBackendMessage(input: SendMessageInput) {
  const response = await apiRequest<{ data: BackendMessage }>("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendMessage(response.data) };
}

export async function simulateBackendInboundSms(input: SimulateInboundSmsInput) {
  const response = await apiRequest<{ data: BackendMessage }>("/simulations/inbound-sms", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendMessage(response.data) };
}
