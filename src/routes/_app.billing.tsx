import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, Gauge, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable } from "@/components/agentline/DataTable";
import { Stat } from "@/components/agentline/Stat";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Mono } from "@/components/agentline/Mono";
import { Banner } from "@/components/agentline/Banner";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createBackendCheckoutSession,
  createBackendPortalSession,
  createBackendSubscriptionCheckoutSession,
  getBackendBillingBalance,
  getBackendBillingSubscription,
  getBackendStripeStatus,
  listBackendBillingTransactions,
  type BillingAllowanceGrantView,
  type BillingBalanceView,
  type BillingPlanKey,
  type BillingPlanView,
  type BillingSubscriptionStateView,
  type BillingSubscriptionView,
  type BillingTransactionListItem,
  type StripeStatusView,
} from "@/lib/api/billing";
import { listBackendUsageEvents } from "@/lib/api/usage";

export const Route = createFileRoute("/_app/billing")({
  component: Billing,
  head: () => ({ meta: [{ title: "Billing - AgentLine" }] }),
});

type BillingAction = "checkout" | "portal" | `plan:${string}`;

function Billing() {
  const [balance, setBalance] = useState<BillingBalanceView | null>(null);
  const [billingState, setBillingState] = useState<BillingSubscriptionStateView | null>(null);
  const [transactions, setTransactions] = useState<BillingTransactionListItem[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusView | null>(null);
  const [mtdSpend, setMtdSpend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [
        balanceResponse,
        subscriptionResponse,
        transactionResponse,
        usageResponse,
        stripeStatusResponse,
      ] = await Promise.all([
        getBackendBillingBalance(),
        getBackendBillingSubscription(),
        listBackendBillingTransactions(),
        listBackendUsageEvents({
          from: monthStart.toISOString(),
          to: new Date().toISOString(),
          limit: 200,
        }),
        getBackendStripeStatus(),
      ]);
      setBalance(balanceResponse.data);
      setBillingState(subscriptionResponse.data);
      setTransactions(transactionResponse.data);
      setStripeStatus(stripeStatusResponse.data);
      setMtdSpend(usageResponse.data.reduce((sum, event) => sum + event.totalCost, 0));
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load billing.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const successfulCredits = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.amountCents > 0 && transaction.status === "succeeded")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [transactions],
  );
  const activeAllowance = useMemo(
    () =>
      billingState?.allowanceGrants.find(
        (grant) => grant.remainingCents > 0 && isGrantActive(grant),
      ) ?? null,
    [billingState],
  );
  const planForSubscription = useMemo(
    () =>
      billingState?.plans.find((plan) => plan.key === billingState.subscription?.planKey) ?? null,
    [billingState],
  );

  async function openCheckout() {
    setIsActionLoading("checkout");
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await createBackendCheckoutSession({
        amountCents: 2500,
        successUrl: `${origin}/billing?checkout=success`,
        cancelUrl: `${origin}/billing?checkout=cancelled`,
      });
      window.location.href = response.data.url;
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not start checkout.",
      );
    } finally {
      setIsActionLoading(null);
    }
  }

  async function startPlanCheckout(planKey: Exclude<BillingPlanKey, "free">) {
    setIsActionLoading(`plan:${planKey}`);
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await createBackendSubscriptionCheckoutSession({
        planKey,
        successUrl: `${origin}/billing?subscription=success`,
        cancelUrl: `${origin}/billing?subscription=cancelled`,
      });
      window.location.href = response.data.url;
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError
          ? formatApiError(caught)
          : "Could not start subscription checkout.",
      );
    } finally {
      setIsActionLoading(null);
    }
  }

  async function openPortal() {
    setIsActionLoading("portal");
    setError(null);
    try {
      const response = await createBackendPortalSession({ returnUrl: window.location.href });
      window.location.href = response.data.url;
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError
          ? formatApiError(caught)
          : "Could not open billing portal.",
      );
    } finally {
      setIsActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Plans, trial credits, prepaid balance, Stripe sessions, and usage settlement."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openPortal}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isActionLoading === "portal" ? "Opening..." : "Billing portal"}
            </button>
            <button
              onClick={openCheckout}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {isActionLoading === "checkout" ? "Starting..." : "Add $25"}
            </button>
          </div>
        }
      />

      {stripeStatus && !isStripeReady(stripeStatus) && (
        <Banner
          variant="warning"
          className="mb-4"
          title={<>Stripe needs configuration</>}
          message={
            <>
              Mode <strong>{stripeStatus.mode}</strong>. Secret key{" "}
              {stripeStatus.secretKeyConfigured ? "configured" : "missing"}, mode match{" "}
              {stripeStatus.secretKeyMatchesMode ? "ok" : "failed"}, webhook secret{" "}
              {stripeStatus.webhookSecretConfigured ? "configured" : "missing"}.
            </>
          }
        />
      )}
      {stripeStatus?.usageMeterEventNameConfigured === false && (
        <Banner
          variant="info"
          className="mb-4"
          title={<>Stripe meter not configured</>}
          message="Subscribed overage usage will stay in AgentLine until STRIPE_USAGE_METER_EVENT_NAME is configured."
        />
      )}
      {error && (
        <Banner
          variant="error"
          className="mb-3"
          message={error}
          action={{ label: "Retry", onClick: () => void loadData() }}
          onDismiss={() => setError(null)}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat
            label="Plan"
            value={planForSubscription?.name ?? "Free trial"}
            hint={billingState?.subscription?.status ?? "Allowance first"}
          />
          <Stat
            label="Allowance left"
            value={formatUsd(activeAllowance?.remaining ?? 0)}
            hint={
              activeAllowance ? labelAllowanceSource(activeAllowance.source) : "No active allowance"
            }
          />
          <Stat
            label="Balance"
            value={formatUsd(balance?.balance ?? 0)}
            hint={balance?.currency ?? "USD"}
          />
          <Stat label="MTD spend" value={formatUsd(mtdSpend)} hint="From usage events" />
          <Stat
            label="Stripe"
            value={stripeStatus?.mode ?? "Unknown"}
            hint={stripeStatus && isStripeReady(stripeStatus) ? "Ready" : "Needs config"}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <SubscriptionCard
            billingState={billingState}
            activePlan={planForSubscription}
            onOpenPortal={openPortal}
            isPortalLoading={isActionLoading === "portal"}
          />
          <PlanGrid
            plans={billingState?.plans ?? []}
            currentPlanKey={billingState?.subscription?.planKey ?? "free"}
            isActionLoading={isActionLoading}
            onChoosePlan={startPlanCheckout}
          />
          {transactions.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-5 w-5" />}
              title="No billing transactions"
              description="Top-ups, subscription checkouts, invoices, and Stripe webhook credits will appear here."
            />
          ) : (
            <BillingTransactionsTable transactions={transactions} />
          )}
        </div>

        <div className="space-y-4">
          <AllowanceCard grants={billingState?.allowanceGrants ?? []} />
          <div className="rounded-lg border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Billing account</h2>
            <div className="mt-4 space-y-4 text-sm">
              <Detail
                label="Stripe customer"
                value={billingState?.billingAccount.providerCustomerId ?? "Unknown"}
                mono
              />
              <Detail label="Balance ID" value={balance?.id ?? "Unknown"} mono />
              <Detail label="Workspace" value={balance?.workspaceId ?? "Unknown"} mono />
              <Detail label="Updated" value={balance?.updatedLabel ?? "Unknown"} />
              <Detail label="Credits purchased" value={formatUsd(successfulCredits)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({
  billingState,
  activePlan,
  onOpenPortal,
  isPortalLoading,
}: {
  billingState: BillingSubscriptionStateView | null;
  activePlan: BillingPlanView | null;
  onOpenPortal: () => void;
  isPortalLoading: boolean;
}) {
  const subscription = billingState?.subscription ?? null;
  return (
    <section className="rounded-lg border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <h2 className="text-sm font-semibold">Subscription status</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Stripe is the billing source of truth. AgentLine keeps usage evidence and allowance
            settlement.
          </p>
        </div>
        <button
          onClick={onOpenPortal}
          disabled={isPortalLoading}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isPortalLoading ? "Opening..." : "Manage in Stripe"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MiniMetric label="Current plan" value={activePlan?.name ?? "Free trial"} />
        <MiniMetric label="Status" value={subscription?.status ?? "trial allowance"} />
        <MiniMetric
          label="Billing period"
          value={subscription?.currentPeriodLabel ?? "Not subscribed"}
        />
        <MiniMetric label="Trial ends" value={subscription?.trialEndsLabel ?? "Not active"} />
      </div>
    </section>
  );
}

function PlanGrid({
  plans,
  currentPlanKey,
  isActionLoading,
  onChoosePlan,
}: {
  plans: BillingPlanView[];
  currentPlanKey: string;
  isActionLoading: BillingAction | null;
  onChoosePlan: (planKey: Exclude<BillingPlanKey, "free">) => void;
}) {
  const paidPlans = plans.filter((plan) => plan.key !== "free");
  return (
    <section className="rounded-lg border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Upgrade plan</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {paidPlans.map((plan) => {
          const isCurrent = currentPlanKey === plan.key;
          const isLoading = isActionLoading === `plan:${plan.key}`;
          return (
            <div key={plan.key} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatUsd(plan.includedUsage)} included usage, then usage is settled from
                    Stripe metering or balance.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">{formatUsd(plan.monthlyPrice)}</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
              </div>
              <button
                onClick={() => onChoosePlan(plan.key)}
                disabled={isCurrent || !plan.stripePriceConfigured || isActionLoading !== null}
                className="mt-4 w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrent
                  ? "Current plan"
                  : !plan.stripePriceConfigured
                    ? "Price not configured"
                    : isLoading
                      ? "Starting checkout..."
                      : `Start ${plan.trialDays}-day trial`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AllowanceCard({ grants }: { grants: BillingAllowanceGrantView[] }) {
  return (
    <section className="rounded-lg border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Usage allowances</h2>
      </div>
      {grants.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No trial or included usage grants yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {grants.map((grant) => (
            <div key={grant.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{labelAllowanceSource(grant.source)}</div>
                  <div className="text-xs text-muted-foreground">{grant.periodLabel}</div>
                </div>
                <div className="text-right text-sm font-semibold">
                  {formatUsd(grant.remaining)} left
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-foreground" style={{ width: `${grant.usagePercent}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatUsd(grant.consumed)} used</span>
                <span>{formatUsd(grant.amount)} total</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BillingTransactionsTable({
  transactions,
}: {
  transactions: BillingTransactionListItem[];
}) {
  return (
    <div className="rounded-lg border bg-surface shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Billing transactions</h2>
      </div>
      <DataTable minWidth={960} className="rounded-none border-0 shadow-none">
        <thead className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[180px] px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="w-[120px] px-4 py-3 text-left font-medium">Provider</th>
            <th className="w-[120px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[120px] px-4 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b last:border-b-0 hover:bg-muted/35">
              <td className="px-4 py-3 text-muted-foreground">{transaction.createdLabel}</td>
              <td className="px-4 py-3">
                <div className="truncate font-medium">{transaction.type}</div>
                <Mono className="text-[11px] text-muted-foreground">{transaction.id}</Mono>
              </td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{transaction.provider}</td>
              <td className="px-4 py-3 capitalize">{transaction.status}</td>
              <td
                className={`px-4 py-3 text-right tabular-nums font-medium ${transaction.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}
              >
                {transaction.amount >= 0 ? "+" : "-"}
                {formatUsd(Math.abs(transaction.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {mono ? (
        <Mono className="mt-1 block break-all text-xs">{value}</Mono>
      ) : (
        <div className="mt-1 font-medium">{value}</div>
      )}
    </div>
  );
}

function isStripeReady(status: StripeStatusView) {
  return (
    status.secretKeyConfigured && status.secretKeyMatchesMode && status.webhookSecretConfigured
  );
}

function isGrantActive(grant: BillingAllowanceGrantView) {
  if (!grant.expiresAt) {
    return true;
  }
  return new Date(grant.expiresAt).getTime() >= Date.now();
}

function labelAllowanceSource(source: string) {
  const labels: Record<string, string> = {
    trial: "Trial credit",
    subscription_included: "Included plan credit",
    prepaid_topup: "Prepaid top-up",
    manual_credit: "Manual credit",
  };
  return labels[source] ?? source;
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
