import { apiRequest } from "./client";

export interface BackendCall {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId: string;
  conversationId?: string | null;
  phoneNumberId?: string | null;
  contactId?: string | null;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  status: string;
  durationSeconds: number;
  summary?: string | null;
  outcome?: string | null;
  recordingId?: string | null;
  provider: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptTurn {
  id: string;
  callId: string;
  speaker: "agent" | "user" | string;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
  confidence?: number | null;
  createdAt: string;
}

export interface CallListItem {
  id: string;
  agentId: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  status: string;
  duration: number;
  outcome: string;
  summary: string;
  provider: string;
  startedAt: string;
  endedAt?: string;
  cost: number;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not started";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function estimateVoiceCost(durationSeconds: number) {
  const billableMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  return billableMinutes * 0.03;
}

export function mapBackendCall(call: BackendCall): CallListItem {
  return {
    id: call.id,
    agentId: call.agentId,
    direction: call.direction,
    from: call.fromNumber,
    to: call.toNumber,
    status: call.status,
    duration: call.durationSeconds,
    outcome: call.outcome ?? call.status,
    summary: call.summary ?? "",
    provider: call.provider,
    startedAt: formatDate(call.startedAt ?? call.createdAt),
    endedAt: call.endedAt ? formatDate(call.endedAt) : undefined,
    cost: estimateVoiceCost(call.durationSeconds),
  };
}

export async function listBackendCalls() {
  const response = await apiRequest<{ data: BackendCall[]; pagination: { limit: number; nextCursor: string | null } }>("/calls");

  return {
    data: response.data.map(mapBackendCall),
    pagination: response.pagination,
  };
}

export async function getBackendCall(id: string) {
  const response = await apiRequest<{ data: BackendCall }>(`/calls/${id}`);

  return { data: mapBackendCall(response.data) };
}

export async function startOutboundBackendCall(input: { agentId: string; to: string }) {
  const response = await apiRequest<{ data: BackendCall }>("/calls", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendCall(response.data) };
}

export async function endBackendCall(id: string) {
  const response = await apiRequest<{ data: BackendCall }>(`/calls/${id}/end`, {
    method: "POST",
  });

  return { data: mapBackendCall(response.data) };
}

export async function transferBackendCall(id: string, to: string) {
  const response = await apiRequest<{ data: BackendCall }>(`/calls/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });

  return { data: mapBackendCall(response.data) };
}

export async function getBackendCallTranscript(id: string) {
  return apiRequest<{ data: TranscriptTurn[]; pagination: { limit: number; nextCursor: string | null } }>(`/calls/${id}/transcript`);
}

export const listCalls = listBackendCalls;
export const getCall = getBackendCall;
export const startOutboundCall = startOutboundBackendCall;
export const endCall = endBackendCall;
export const transferCall = transferBackendCall;
export const callTranscript = getBackendCallTranscript;
export const callTimeline = async (id: string) => ({
  data: [
    { at: "created", event: "call.created", detail: id },
  ],
});
