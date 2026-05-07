import { apiRequest } from "./client";

export interface BackendBillingBalance {
  id: string;
  workspaceId: string;
  currency: string;
  balanceCents: number;
  spendLimitCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendBillingTransaction {
  id: string;
  workspaceId: string;
  provider: string;
  providerEventId: string | null;
  type: string;
  amountCents: number;
  currency: string;
  status: string;
  metadata: unknown;
  createdAt: string;
}

export interface BillingBalanceView {
  id: string;
  workspaceId: string;
  currency: string;
  balanceCents: number;
  balance: number;
  spendLimitCents: number | null;
  spendLimit: number | null;
  updatedAt: string;
  updatedLabel: string;
}

export interface BillingTransactionListItem {
  id: string;
  provider: string;
  providerEventId: string | null;
  type: string;
  amountCents: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  createdLabel: string;
}

export interface StripeStatusView {
  mode: "test" | "live";
  secretKeyConfigured: boolean;
  secretKeyMatchesMode: boolean;
  webhookSecretConfigured: boolean;
  webhookToleranceSeconds: number;
}

export interface CreateCheckoutSessionInput {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionInput {
  returnUrl: string;
}

export interface StripeSessionView {
  id: string;
  url: string;
  mode?: "test" | "live";
}

function centsToUsd(cents: number | null | undefined) {
  return typeof cents === "number" ? cents / 100 : null;
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

export function mapBackendBillingBalance(balance: BackendBillingBalance): BillingBalanceView {
  return {
    id: balance.id,
    workspaceId: balance.workspaceId,
    currency: balance.currency,
    balanceCents: balance.balanceCents,
    balance: centsToUsd(balance.balanceCents) ?? 0,
    spendLimitCents: balance.spendLimitCents,
    spendLimit: centsToUsd(balance.spendLimitCents),
    updatedAt: balance.updatedAt,
    updatedLabel: formatDateTime(balance.updatedAt),
  };
}

export function mapBackendBillingTransaction(transaction: BackendBillingTransaction): BillingTransactionListItem {
  return {
    id: transaction.id,
    provider: transaction.provider,
    providerEventId: transaction.providerEventId,
    type: transaction.type,
    amountCents: transaction.amountCents,
    amount: centsToUsd(transaction.amountCents) ?? 0,
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt,
    createdLabel: formatDateTime(transaction.createdAt),
  };
}

export async function getBackendBillingBalance() {
  const response = await apiRequest<{ data: BackendBillingBalance }>("/billing/balance");

  return { data: mapBackendBillingBalance(response.data) };
}

export async function getBackendStripeStatus() {
  return apiRequest<{ data: StripeStatusView }>("/billing/stripe/status");
}

export async function listBackendBillingTransactions() {
  const response = await apiRequest<{ data: BackendBillingTransaction[]; pagination: { limit: number; nextCursor: string | null } }>("/billing/transactions");

  return {
    data: response.data.map(mapBackendBillingTransaction),
    pagination: response.pagination,
  };
}

export async function createBackendCheckoutSession(input: CreateCheckoutSessionInput) {
  const response = await apiRequest<{ data: StripeSessionView }>("/billing/checkout-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response;
}

export async function createBackendPortalSession(input: CreatePortalSessionInput) {
  const response = await apiRequest<{ data: StripeSessionView }>("/billing/portal-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response;
}
