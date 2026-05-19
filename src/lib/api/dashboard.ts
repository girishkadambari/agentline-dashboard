import {
  type BackendBillingBalance,
  type BillingBalanceView,
  mapBackendBillingBalance,
} from "./billing";
import { type BackendCall, type CallListItem, mapBackendCall } from "./calls";
import { apiRequest } from "./client";
import {
  type BackendConversation,
  type ConversationListItem,
  mapBackendConversation,
} from "./messages";
import { type BackendUsageRollup, type UsageRollupListItem, mapBackendUsageRollup } from "./usage";

export interface BackendDashboardSummary {
  counts: {
    agents: number;
    activeAgents: number;
    numbers: number;
    activeNumbers: number;
    conversations: number;
    messages: number;
    calls: number;
    webhooks: number;
  };
  onboarding: {
    hasAgent: boolean;
    hasActiveNumber: boolean;
    hasWebhook: boolean;
    readyForLiveTraffic: boolean;
    nextAction: "create_agent" | "attach_number" | "configure_webhook" | "run_live_smoke";
  };
  recentCalls: BackendCall[];
  recentConversations: BackendConversation[];
  usage: {
    todayCost: string;
    monthCost: string;
    todayEvents: number;
    monthEvents: number;
    daily: BackendUsageRollup[];
  };
  failedWebhookDeliveries: number;
  billingBalance: BackendBillingBalance | null;
}

export interface DashboardSummaryView {
  counts: BackendDashboardSummary["counts"];
  onboarding: BackendDashboardSummary["onboarding"];
  recentCalls: CallListItem[];
  recentConversations: ConversationListItem[];
  usage: {
    todayCost: number;
    monthCost: number;
    todayEvents: number;
    monthEvents: number;
    daily: UsageRollupListItem[];
  };
  failedWebhookDeliveries: number;
  billingBalance: BillingBalanceView | null;
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapBackendDashboardSummary(summary: BackendDashboardSummary): DashboardSummaryView {
  return {
    counts: summary.counts,
    onboarding: summary.onboarding,
    recentCalls: summary.recentCalls.map(mapBackendCall),
    recentConversations: summary.recentConversations.map(mapBackendConversation),
    usage: {
      todayCost: asNumber(summary.usage.todayCost),
      monthCost: asNumber(summary.usage.monthCost),
      todayEvents: summary.usage.todayEvents,
      monthEvents: summary.usage.monthEvents,
      daily: summary.usage.daily.map(mapBackendUsageRollup),
    },
    failedWebhookDeliveries: summary.failedWebhookDeliveries,
    billingBalance: summary.billingBalance
      ? mapBackendBillingBalance(summary.billingBalance)
      : null,
  };
}

export async function getBackendDashboardSummary() {
  const response = await apiRequest<{ data: BackendDashboardSummary }>("/dashboard/summary");

  return { data: mapBackendDashboardSummary(response.data) };
}
