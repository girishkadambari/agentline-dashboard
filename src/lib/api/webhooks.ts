import { apiRequest } from "./client";

export type WebhookEndpointStatus = "active" | "paused" | "disabled";
export type WebhookDeliveryStatus = "pending" | "succeeded" | "failed" | "retrying" | "exhausted";

export interface BackendWebhookEndpoint {
  id: string;
  workspaceId: string;
  projectId: string;
  url: string;
  events: string[];
  status: WebhookEndpointStatus;
  secret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendWebhookDelivery {
  id: string;
  workspaceId: string;
  projectId: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpointListItem {
  id: string;
  url: string;
  events: string[];
  status: WebhookEndpointStatus;
  secret?: string;
  createdAt: string;
  updatedAt: string;
  createdLabel: string;
  updatedLabel: string;
}

export interface WebhookDeliveryListItem {
  id: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdLabel: string;
  updatedLabel: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  status?: WebhookEndpointStatus;
}

export interface TestWebhookInput {
  simulateFailure?: boolean;
}

export interface RetryWebhookDeliveryInput {
  outcome?: "succeeded" | "failed";
  exhaust?: boolean;
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

export function mapBackendWebhookEndpoint(endpoint: BackendWebhookEndpoint): WebhookEndpointListItem {
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.events,
    status: endpoint.status,
    secret: endpoint.secret,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
    createdLabel: formatDateTime(endpoint.createdAt),
    updatedLabel: formatDateTime(endpoint.updatedAt),
  };
}

export function mapBackendWebhookDelivery(delivery: BackendWebhookDelivery): WebhookDeliveryListItem {
  return {
    id: delivery.id,
    endpointId: delivery.endpointId,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    payload: delivery.payload,
    status: delivery.status,
    attemptCount: delivery.attemptCount,
    lastStatusCode: delivery.lastStatusCode,
    lastError: delivery.lastError,
    nextAttemptAt: delivery.nextAttemptAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    createdLabel: formatDateTime(delivery.createdAt),
    updatedLabel: formatDateTime(delivery.updatedAt),
  };
}

export async function listBackendWebhooks() {
  const response = await apiRequest<{ data: BackendWebhookEndpoint[]; pagination: { limit: number; nextCursor: string | null } }>("/webhooks");

  return {
    data: response.data.map(mapBackendWebhookEndpoint),
    pagination: response.pagination,
  };
}

export async function createBackendWebhook(input: CreateWebhookInput) {
  const response = await apiRequest<{ data: BackendWebhookEndpoint }>("/webhooks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendWebhookEndpoint(response.data) };
}

export async function updateBackendWebhook(id: string, input: UpdateWebhookInput) {
  const response = await apiRequest<{ data: BackendWebhookEndpoint }>(`/webhooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendWebhookEndpoint(response.data) };
}

export async function disableBackendWebhook(id: string) {
  const response = await apiRequest<{ data: BackendWebhookEndpoint }>(`/webhooks/${id}`, {
    method: "DELETE",
  });

  return { data: mapBackendWebhookEndpoint(response.data) };
}

export async function testBackendWebhook(id: string, input: TestWebhookInput = {}) {
  const response = await apiRequest<{ data: { delivery: BackendWebhookDelivery; headers: Record<string, string> } }>(`/webhooks/${id}/test`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return {
    data: {
      delivery: mapBackendWebhookDelivery(response.data.delivery),
      headers: response.data.headers,
    },
  };
}

export async function listBackendWebhookDeliveries(query: { endpointId?: string; eventId?: string; status?: WebhookDeliveryStatus } = {}) {
  const response = await apiRequest<{ data: BackendWebhookDelivery[]; pagination: { limit: number; nextCursor: string | null } }>("/webhooks/deliveries", {
    query,
  });

  return {
    data: response.data.map(mapBackendWebhookDelivery),
    pagination: response.pagination,
  };
}

export async function retryBackendWebhookDelivery(id: string, input: RetryWebhookDeliveryInput = {}) {
  const response = await apiRequest<{ data: BackendWebhookDelivery }>(`/webhooks/deliveries/${id}/retry`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendWebhookDelivery(response.data) };
}
