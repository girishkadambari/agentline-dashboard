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

export type BillingPlanKey = "free" | "starter" | "growth";

export interface BackendBillingPlan {
  key: BillingPlanKey;
  name: string;
  billingMode: string;
  monthlyPriceCents: number;
  includedUsageCents: number;
  trialDays: number;
  stripePriceConfigured: boolean;
}

export interface BillingPlanView extends BackendBillingPlan {
  monthlyPrice: number;
  includedUsage: number;
}

export interface BackendBillingSubscription {
  id: string;
  workspaceId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string | null;
  providerPriceId: string | null;
  planKey: BillingPlanKey | string;
  status: string;
  billingMode: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface BackendBillingAllowanceGrant {
  id: string;
  workspaceId: string;
  subscriptionId: string | null;
  source: "trial" | "subscription_included" | "prepaid_topup" | "manual_credit" | string;
  amountCents: number;
  consumedCents: number;
  remainingCents: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  expiresAt: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionView extends BackendBillingSubscription {
  currentPeriodLabel: string;
  trialEndsLabel: string | null;
}

export interface BillingAllowanceGrantView extends BackendBillingAllowanceGrant {
  amount: number;
  consumed: number;
  remaining: number;
  usagePercent: number;
  periodLabel: string;
}

export interface BackendBillingSubscriptionState {
  billingAccount: {
    provider: string;
    providerCustomerId: string;
    status: string;
  };
  subscription: BackendBillingSubscription | null;
  allowanceGrants: BackendBillingAllowanceGrant[];
  plans: BackendBillingPlan[];
}

export interface BillingSubscriptionStateView {
  billingAccount: BackendBillingSubscriptionState["billingAccount"];
  subscription: BillingSubscriptionView | null;
  allowanceGrants: BillingAllowanceGrantView[];
  plans: BillingPlanView[];
}

export interface StripeStatusView {
  mode: "test" | "live";
  secretKeyConfigured: boolean;
  secretKeyMatchesMode: boolean;
  webhookSecretConfigured: boolean;
  webhookToleranceSeconds: number;
  usageMeterEventNameConfigured?: boolean;
}

export interface CreateCheckoutSessionInput {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionInput {
  returnUrl: string;
}

export interface CreateSubscriptionCheckoutSessionInput {
  planKey: Exclude<BillingPlanKey, "free">;
  successUrl: string;
  cancelUrl: string;
}

export interface UpdateBillingControlsInput {
  spendLimitCents?: number | null;
}

export interface StripeSessionView {
  id: string;
  url: string;
  mode?: "test" | "live";
  plan?: {
    key: string;
    name: string;
    monthlyPriceCents: number;
    includedUsageCents: number;
    trialDays: number;
  };
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapBackendBillingPlan(plan: BackendBillingPlan): BillingPlanView {
  return {
    ...plan,
    monthlyPrice: centsToUsd(plan.monthlyPriceCents) ?? 0,
    includedUsage: centsToUsd(plan.includedUsageCents) ?? 0,
  };
}

function mapBackendSubscription(subscription: BackendBillingSubscription): BillingSubscriptionView {
  return {
    ...subscription,
    currentPeriodLabel:
      subscription.currentPeriodStart || subscription.currentPeriodEnd
        ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
        : "Not started",
    trialEndsLabel: subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : null,
  };
}

function mapBackendAllowanceGrant(grant: BackendBillingAllowanceGrant): BillingAllowanceGrantView {
  const amount = centsToUsd(grant.amountCents) ?? 0;
  const consumed = centsToUsd(grant.consumedCents) ?? 0;
  const remaining = centsToUsd(grant.remainingCents) ?? 0;
  return {
    ...grant,
    amount,
    consumed,
    remaining,
    usagePercent:
      grant.amountCents > 0
        ? Math.min(100, Math.round((grant.consumedCents / grant.amountCents) * 100))
        : 0,
    periodLabel:
      grant.periodStart || grant.periodEnd
        ? `${formatDate(grant.periodStart)} - ${formatDate(grant.periodEnd)}`
        : grant.expiresAt
          ? `Expires ${formatDate(grant.expiresAt)}`
          : "No expiry",
  };
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

export function mapBackendBillingTransaction(
  transaction: BackendBillingTransaction,
): BillingTransactionListItem {
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

export async function getBackendBillingPlans() {
  const response = await apiRequest<{ data: BackendBillingPlan[] }>("/billing/plans");

  return { data: response.data.map(mapBackendBillingPlan) };
}

export async function getBackendBillingSubscription() {
  const response = await apiRequest<{ data: BackendBillingSubscriptionState }>(
    "/billing/subscription",
  );

  return {
    data: {
      billingAccount: response.data.billingAccount,
      subscription: response.data.subscription
        ? mapBackendSubscription(response.data.subscription)
        : null,
      allowanceGrants: response.data.allowanceGrants.map(mapBackendAllowanceGrant),
      plans: response.data.plans.map(mapBackendBillingPlan),
    },
  };
}

export async function listBackendBillingTransactions() {
  const response = await apiRequest<{
    data: BackendBillingTransaction[];
    pagination: { limit: number; nextCursor: string | null };
  }>("/billing/transactions");

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

export async function createBackendSubscriptionCheckoutSession(
  input: CreateSubscriptionCheckoutSessionInput,
) {
  const response = await apiRequest<{ data: StripeSessionView }>(
    "/billing/subscription-checkout-sessions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response;
}

export async function createBackendPortalSession(input: CreatePortalSessionInput) {
  const response = await apiRequest<{ data: StripeSessionView }>("/billing/portal-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response;
}

export async function updateBackendBillingControls(input: UpdateBillingControlsInput) {
  return apiRequest<{
    data: {
      balance: BackendBillingBalance;
      controls: {
        prepaidRequired: boolean;
        spendLimitCents: number | null;
        balanceCents: number;
        canSpend: boolean;
        lowBalance: boolean;
      };
    };
  }>("/billing/controls", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
