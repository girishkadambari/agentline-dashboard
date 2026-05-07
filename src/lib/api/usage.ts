import { apiRequest } from "./client";

export interface BackendUsageEvent {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId: string;
  resourceType: string;
  resourceId: string;
  channel: string;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
  occurredAt: string;
  createdAt: string;
}

export interface BackendUsageRollup {
  period: string;
  quantity: string;
  totalCost: string;
}

export interface UsageEventListItem {
  id: string;
  agentId: string;
  resourceType: string;
  resourceId: string;
  channel: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  occurredAt: string;
  occurredLabel: string;
}

export interface UsageRollupListItem {
  period: string;
  label: string;
  quantity: number;
  totalCost: number;
}

export interface UsageQueryInput {
  agentId?: string;
  channel?: string;
  from?: string;
  to?: string;
  limit?: number;
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatRollupLabel(period: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const date = new Date(`${period}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? period
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    const date = new Date(`${period}-01T00:00:00`);
    return Number.isNaN(date.getTime())
      ? period
      : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  return period;
}

export function mapBackendUsageEvent(event: BackendUsageEvent): UsageEventListItem {
  return {
    id: event.id,
    agentId: event.agentId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    channel: event.channel,
    quantity: asNumber(event.quantity),
    unit: event.unit,
    unitCost: asNumber(event.unitCost),
    totalCost: asNumber(event.totalCost),
    occurredAt: event.occurredAt,
    occurredLabel: formatDateTime(event.occurredAt),
  };
}

export function mapBackendUsageRollup(rollup: BackendUsageRollup): UsageRollupListItem {
  return {
    period: rollup.period,
    label: formatRollupLabel(rollup.period),
    quantity: asNumber(rollup.quantity),
    totalCost: asNumber(rollup.totalCost),
  };
}

function queryFromInput(input: UsageQueryInput = {}) {
  return {
    agentId: input.agentId,
    channel: input.channel,
    from: input.from,
    to: input.to,
    limit: input.limit,
  };
}

export async function listBackendUsageEvents(input: UsageQueryInput = {}) {
  const response = await apiRequest<{ data: BackendUsageEvent[]; pagination: { limit: number; nextCursor: string | null } }>("/usage", {
    query: queryFromInput(input),
  });

  return {
    data: response.data.map(mapBackendUsageEvent),
    pagination: response.pagination,
  };
}

export async function listBackendDailyUsage(input: UsageQueryInput = {}) {
  const response = await apiRequest<{ data: BackendUsageRollup[]; pagination: { limit: number; nextCursor: string | null } }>("/usage/daily", {
    query: queryFromInput(input),
  });

  return {
    data: response.data.map(mapBackendUsageRollup),
    pagination: response.pagination,
  };
}

export async function listBackendMonthlyUsage(input: UsageQueryInput = {}) {
  const response = await apiRequest<{ data: BackendUsageRollup[]; pagination: { limit: number; nextCursor: string | null } }>("/usage/monthly", {
    query: queryFromInput(input),
  });

  return {
    data: response.data.map(mapBackendUsageRollup),
    pagination: response.pagination,
  };
}
