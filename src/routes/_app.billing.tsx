import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Gauge,
  Landmark,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable, type Column } from "@/components/agentline/DataTable";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Mono } from "@/components/agentline/Mono";
import { Banner } from "@/components/agentline/Banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
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
  type BillingTransactionListItem,
  type StripeStatusView,
} from "@/lib/api/billing";
import { listBackendUsageEvents } from "@/lib/api/usage";

export const Route = createFileRoute("/_app/billing")({
  component: Billing,
  head: () => ({ meta: [{ title: "Billing - AgentLine" }] }),
});

type BillingAction = "checkout" | "portal" | `plan:${string}`;

const PRESET_AMOUNTS = [10, 25, 50, 100, 250] as const;

const USAGE_RATES = [
  {
    key: "number",
    label: "Phone number",
    price: "$1.00",
    unit: "per provision/import event",
    note: "Number rental and compliance costs will move to versioned rate cards.",
    icon: Phone,
  },
  {
    key: "sms-out",
    label: "Outbound SMS",
    price: "$0.01",
    unit: "per message",
    note: "Charged when a provider accepts the outbound message.",
    icon: MessageSquare,
  },
  {
    key: "sms-in",
    label: "Inbound SMS",
    price: "$0.01",
    unit: "per message",
    note: "Charged when AgentLine receives the provider webhook.",
    icon: MessageSquare,
  },
  {
    key: "voice",
    label: "Voice",
    price: "$0.03",
    unit: "per started minute",
    note: "Final duration is settled from provider status callbacks.",
    icon: Gauge,
  },
] as const;

function Billing() {
  const [balance, setBalance] = useState<BillingBalanceView | null>(null);
  const [billingState, setBillingState] = useState<BillingSubscriptionStateView | null>(null);
  const [transactions, setTransactions] = useState<BillingTransactionListItem[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusView | null>(null);
  const [mtdSpend, setMtdSpend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [balanceRes, subRes, txRes, usageRes, stripeRes] = await Promise.all([
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
      setBalance(balanceRes.data);
      setBillingState(subRes.data);
      setTransactions(txRes.data);
      setStripeStatus(stripeRes.data);
      setMtdSpend(usageRes.data.reduce((sum, event) => sum + event.totalCost, 0));
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

  const activeAllowance = useMemo(
    () =>
      billingState?.allowanceGrants.find((grant) => grant.remainingCents > 0 && isGrantActive(grant)) ??
      null,
    [billingState],
  );
  const planForSubscription = useMemo(
    () =>
      billingState?.plans.find((plan) => plan.key === billingState.subscription?.planKey) ?? null,
    [billingState],
  );
  const pendingSubscriptionCheckout = useMemo(
    () =>
      transactions.find(
        (transaction) =>
          transaction.type === "subscription_checkout_session.created" &&
          transaction.status === "pending",
      ) ?? null,
    [transactions],
  );
  const customerTransactions = useMemo(
    () => transactions.filter(isCustomerVisibleTransaction),
    [transactions],
  );
  const recentTransactions = customerTransactions.slice(0, 8);
  const allowanceRemaining = activeAllowance?.remaining ?? 0;
  const prepaidBalance = balance?.balance ?? 0;
  const totalAvailable = prepaidBalance + allowanceRemaining;

  async function openCheckout(amountUsd: number) {
    setIsActionLoading("checkout");
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await createBackendCheckoutSession({
        amountCents: Math.round(amountUsd * 100),
        successUrl: `${origin}/billing?checkout=success`,
        cancelUrl: `${origin}/billing?checkout=cancelled`,
      });
      window.location.href = response.data.url;
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not start checkout.",
      );
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
      setIsActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Track plan, credits, and usage costs for your AI phone agents."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openPortal}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {isActionLoading === "portal" ? "Opening..." : "Manage in Stripe"}
            </button>
            <button
              onClick={() => setTopUpOpen(true)}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Add credits
            </button>
          </div>
        }
      />

      {stripeStatus && !isStripeReady(stripeStatus) && (
        <Banner
          variant="warning"
          className="mb-4"
          title={<>Stripe needs configuration</>}
          message="Payments are not fully ready. Configure the Stripe key, webhook secret, and matching mode before real customers use billing."
        />
      )}
      {stripeStatus?.usageMeterEventNameConfigured === false && (
        <Banner
          variant="info"
          className="mb-4"
          title={<>Stripe usage meter is not connected</>}
          message="Subscription overage usage is still tracked in AgentLine. Configure the Stripe meter event name before billing overages through Stripe."
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
      {!billingState?.subscription && pendingSubscriptionCheckout && (
        <Banner
          variant="warning"
          className="mb-4"
          title={<>Subscription checkout is still pending</>}
          message={
            <>
              Finish the Stripe Checkout page, then confirm <Mono>checkout.session.completed</Mono>{" "}
              is reaching <Mono>/v1/billing/stripe/webhook</Mono>.
            </>
          }
          action={{ label: "Refresh", onClick: () => void loadData() }}
        />
      )}

      {isLoading ? (
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <BillingOverviewCard
            totalAvailable={totalAvailable}
            prepaidBalance={prepaidBalance}
            allowanceRemaining={allowanceRemaining}
            mtdSpend={mtdSpend}
            currency={balance?.currency ?? "USD"}
            onTopUp={() => setTopUpOpen(true)}
          />
          <PlanSummaryCard
            plan={planForSubscription}
            subscription={billingState?.subscription ?? null}
            onManage={openPortal}
            isLoading={isActionLoading === "portal"}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <RateCard />

          <section className="rounded-xl border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Recent billing activity</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Payment, credit, and subscription events customers actually need to see.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {recentTransactions.length} shown
              </span>
            </div>
            {customerTransactions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  title="No billing activity"
                  description="Credits, subscription changes, invoices, and payment failures will appear here."
                />
              </div>
            ) : (
              <BillingTransactionsTable transactions={customerTransactions} />
            )}
          </section>

          <PlanGrid
            plans={billingState?.plans ?? []}
            currentPlanKey={billingState?.subscription?.planKey ?? "free"}
            isActionLoading={isActionLoading}
            onChoosePlan={startPlanCheckout}
          />
        </div>

        <div className="space-y-4">
          <AllowanceCard grants={billingState?.allowanceGrants ?? []} />
          <SettlementCard />
          <DeveloperBillingDetails
            balance={balance}
            billingState={billingState}
            stripeStatus={stripeStatus}
          />
        </div>
      </div>

      <TopUpDialog
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        onConfirm={(amount) => {
          setTopUpOpen(false);
          void openCheckout(amount);
        }}
        isLoading={isActionLoading === "checkout"}
      />
    </div>
  );
}

function BillingOverviewCard({
  totalAvailable,
  prepaidBalance,
  allowanceRemaining,
  mtdSpend,
  currency,
  onTopUp,
}: {
  totalAvailable: number;
  prepaidBalance: number;
  allowanceRemaining: number;
  mtdSpend: number;
  currency: string;
  onTopUp: () => void;
}) {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Available usage funds
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatUsd(totalAvailable)}
            </div>
            <div className="pb-1 text-xs text-muted-foreground">{currency}</div>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            AgentLine spends allowance first, then prepaid credits. When Stripe metering is
            enabled for a subscription, overages can be settled through Stripe invoices.
          </p>
        </div>
        <button
          onClick={onTopUp}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-xs font-semibold text-background hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add credits
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Prepaid credits" value={formatUsd(prepaidBalance)} icon={<CreditCard className="h-4 w-4" />} />
        <MetricCard label="Included allowance left" value={formatUsd(allowanceRemaining)} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard label="Used this month" value={formatUsd(mtdSpend)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlanSummaryCard({
  plan,
  subscription,
  onManage,
  isLoading,
}: {
  plan: BillingPlanView | null;
  subscription: BillingSubscriptionStateView["subscription"];
  onManage: () => void;
  isLoading: boolean;
}) {
  const status = subscription?.status ?? "trial";
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <h2 className="text-sm font-semibold">Current plan</h2>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">{plan?.name ?? "Free trial"}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {plan
            ? `${formatUsd(plan.includedUsage)} included usage each month, then metered.`
            : "Trial allowance first. Upgrade when you need monthly included usage."}
        </p>
      </div>

      <dl className="mt-5 space-y-2.5 text-xs">
        <Row label="Billing period" value={subscription?.currentPeriodLabel ?? "Not subscribed"} />
        <Row label="Trial ends" value={subscription?.trialEndsLabel ?? "Not active"} />
        <Row
          label="Renewal"
          value={
            subscription?.cancelAtPeriodEnd
              ? "Cancels at period end"
              : subscription
                ? "Auto-renews"
                : "Not active"
          }
        />
      </dl>

      <button
        onClick={onManage}
        disabled={isLoading}
        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {isLoading ? "Opening..." : "Manage invoices and payment method"}
      </button>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function RateCard() {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Usage pricing</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Transparent rates used by the current AgentLine usage ledger.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          Rate card v2026-05-14
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {USAGE_RATES.map((rate) => {
          const Icon = rate.icon;
          return (
            <div key={rate.key} className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {rate.label}
              </div>
              <div className="mt-3">
                <span className="text-2xl font-semibold tabular-nums">{rate.price}</span>
                <span className="ml-1 text-xs text-muted-foreground">{rate.unit}</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">{rate.note}</p>
            </div>
          );
        })}
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
  if (paidPlans.length === 0) return null;
  const recommendedKey = paidPlans[Math.floor(paidPlans.length / 2)]?.key;

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Plan options</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Plans include monthly usage allowance. Extra usage is settled from credits or Stripe
        metering when enabled.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {paidPlans.map((plan) => {
          const isCurrent = currentPlanKey === plan.key;
          const isLoading = isActionLoading === `plan:${plan.key}`;
          const isRecommended = plan.key === recommendedKey && !isCurrent;
          return (
            <div
              key={plan.key}
              className={cn(
                "relative rounded-lg border p-4 transition",
                isCurrent
                  ? "border-success/50 bg-success/[0.04]"
                  : isRecommended
                    ? "border-foreground/30 ring-1 ring-foreground/10"
                    : "hover:border-foreground/30",
              )}
            >
              {isRecommended && (
                <span className="absolute -top-2 right-4 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                  Recommended
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2 right-4 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                  <Check className="h-3 w-3" /> Current
                </span>
              )}
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatUsd(plan.monthlyPrice)}
                </span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <Feature>{formatUsd(plan.includedUsage)} included usage / month</Feature>
                <Feature>Overage settled from Stripe or prepaid credits</Feature>
                <Feature>{plan.trialDays}-day free trial</Feature>
              </ul>
              <button
                onClick={() => onChoosePlan(plan.key as Exclude<BillingPlanKey, "free">)}
                disabled={isCurrent || !plan.stripePriceConfigured || isActionLoading !== null}
                className={cn(
                  "mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrent
                    ? "border border-success/40 bg-transparent text-success"
                    : "bg-foreground text-background hover:opacity-90",
                )}
              >
                {isCurrent
                  ? "Current plan"
                  : !plan.stripePriceConfigured
                    ? "Price not configured"
                    : isLoading
                      ? "Starting checkout..."
                      : (
                        <>
                          Start {plan.trialDays}-day trial
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
      <span>{children}</span>
    </li>
  );
}

function AllowanceCard({ grants }: { grants: BillingAllowanceGrantView[] }) {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Allowance</h2>
      </div>
      {grants.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No trial or plan allowance yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {grants.map((grant) => {
            const pct = Math.max(0, Math.min(100, grant.usagePercent));
            const tone =
              pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-foreground";
            return (
              <div key={grant.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{labelAllowanceSource(grant.source)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {grant.periodLabel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatUsd(grant.remaining)}
                    </div>
                    <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                      left
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full transition-all", tone)} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{formatUsd(grant.consumed)} used</span>
                  <span>{formatUsd(grant.amount)} total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SettlementCard() {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold">How charges settle</h2>
      <ol className="mt-4 space-y-3 text-sm">
        <SettlementStep index={1} title="Use allowance" text="Trial and monthly included usage are consumed first." />
        <SettlementStep index={2} title="Report subscribed usage" text="When Stripe meters are enabled, overages can be sent to Stripe." />
        <SettlementStep index={3} title="Use prepaid credits" text="Credits cover usage when there is no active allowance or meter path." />
      </ol>
    </section>
  );
}

function SettlementStep({ index, title, text }: { index: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
        {index}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span>
      </span>
    </li>
  );
}

function DeveloperBillingDetails({
  balance,
  billingState,
  stripeStatus,
}: {
  balance: BillingBalanceView | null;
  billingState: BillingSubscriptionStateView | null;
  stripeStatus: StripeStatusView | null;
}) {
  return (
    <details className="group rounded-xl border bg-surface p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        Developer billing details
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Support identifiers for debugging Stripe and workspace billing issues.
      </p>
      <dl className="mt-4 space-y-3.5 text-xs">
        <Detail label="Stripe mode" value={stripeStatus?.mode ?? "-"} />
        <Detail label="Stripe customer" value={billingState?.billingAccount.providerCustomerId ?? "-"} mono />
        <Detail label="Balance ID" value={balance?.id ?? "-"} mono />
        <Detail label="Workspace" value={balance?.workspaceId ?? "-"} mono />
        <Detail label="Last updated" value={balance?.updatedLabel ?? "-"} />
      </dl>
    </details>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">
        {mono ? (
          <Mono className="block break-all text-[11.5px]">{value}</Mono>
        ) : (
          <span className="text-sm font-medium">{value}</span>
        )}
      </dd>
    </div>
  );
}

function TopUpDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<number>(25);
  const [customValue, setCustomValue] = useState<string>("");
  const customNum = Number(customValue);
  const isCustomValid =
    customValue !== "" && Number.isFinite(customNum) && customNum >= 5 && customNum <= 5000;
  const finalAmount = customValue ? (isCustomValid ? customNum : null) : selected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add credits
          </DialogTitle>
          <DialogDescription>
            Top up prepaid credits. Credits are applied after allowance and before blocked usage.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            Quick amounts
          </div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((amount) => {
              const isActive = !customValue && selected === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelected(amount);
                    setCustomValue("");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm font-semibold tabular-nums transition",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "hover:border-foreground/40 hover:bg-muted",
                  )}
                >
                  ${amount}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label
              htmlFor="custom-amount"
              className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Custom amount
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                id="custom-amount"
                type="number"
                min={5}
                max={5000}
                step={1}
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder="Enter amount (5 - 5000)"
                className="flex-1 bg-transparent text-sm tabular-nums outline-none"
              />
              <span className="text-xs text-muted-foreground">USD</span>
            </div>
            {customValue && !isCustomValid && (
              <p className="mt-1.5 text-xs text-destructive">
                Enter an amount between $5 and $5000.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-lg bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You'll be charged</span>
              <span className="text-lg font-semibold tabular-nums">
                {finalAmount ? formatUsd(finalAmount) : "-"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Stripe processes the payment. AgentLine credits only after a verified webhook.
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => finalAmount && onConfirm(finalAmount)}
            disabled={!finalAmount || isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {isLoading ? "Starting..." : "Continue to checkout"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingTransactionsTable({ transactions }: { transactions: BillingTransactionListItem[] }) {
  const columns: Column<BillingTransactionListItem>[] = [
    {
      key: "createdAt",
      label: "Date",
      width: 170,
      sortable: true,
      sortAccessor: (transaction) => new Date(transaction.createdAt),
      render: (transaction) => (
        <span className="text-muted-foreground">{transaction.createdLabel}</span>
      ),
    },
    {
      key: "type",
      label: "Activity",
      sortable: true,
      sortAccessor: (transaction) => customerTransactionLabel(transaction),
      render: (transaction) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{customerTransactionLabel(transaction)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {customerTransactionDescription(transaction)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      sortable: true,
      render: (transaction) => <StatusPill status={transaction.status} />,
    },
    {
      key: "amount",
      label: "Amount",
      width: 130,
      align: "right",
      sortable: true,
      sortAccessor: (transaction) => transaction.amount,
      render: (transaction) => (
        <span
          className={cn(
            "tabular-nums font-semibold",
            transaction.amount >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {transaction.amount >= 0 ? "+" : "-"}
          {formatUsd(Math.abs(transaction.amount))}
        </span>
      ),
    },
  ];

  return (
    <DataTable<BillingTransactionListItem>
      columns={columns}
      data={transactions}
      getRowKey={(transaction) => transaction.id}
      stickyHeader
      maxBodyHeight={520}
      pageSize={10}
      defaultSort={{ key: "createdAt", dir: "desc" }}
      className="rounded-none border-0 shadow-none"
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "succeeded" || status === "paid" || status === "active"
      ? "bg-success/10 text-success"
      : status === "pending" || status === "processing" || status === "trialing"
        ? "bg-info/10 text-info"
        : status === "failed" || status === "canceled" || status === "incomplete"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
        tone,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function isStripeReady(status: StripeStatusView) {
  return status.secretKeyConfigured && status.secretKeyMatchesMode && status.webhookSecretConfigured;
}

function isGrantActive(grant: BillingAllowanceGrantView) {
  if (!grant.expiresAt) return true;
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

function isCustomerVisibleTransaction(transaction: BillingTransactionListItem) {
  const succeededInternalStart =
    transaction.status === "succeeded" &&
    (transaction.type === "checkout_session.created" ||
      transaction.type === "subscription_checkout_session.created");
  return !succeededInternalStart;
}

function customerTransactionLabel(transaction: BillingTransactionListItem) {
  const labels: Record<string, string> = {
    "checkout_session.created": "Credit checkout started",
    "checkout.session.completed": "Credits added",
    "checkout.session.expired": "Checkout expired",
    "subscription_checkout_session.created": "Plan checkout started",
    "customer.subscription.created": "Subscription started",
    "customer.subscription.updated": "Subscription updated",
    "customer.subscription.deleted": "Subscription canceled",
    "invoice.paid": "Invoice paid",
    "invoice.payment_failed": "Payment failed",
  };
  return labels[transaction.type] ?? prettifyType(transaction.type);
}

function customerTransactionDescription(transaction: BillingTransactionListItem) {
  if (transaction.type.includes("subscription")) return "Plan lifecycle managed by Stripe";
  if (transaction.type.includes("invoice")) return "Recurring billing event";
  if (transaction.type.includes("checkout")) return "Stripe Checkout event";
  return "Billing ledger event";
}

function prettifyType(type: string) {
  return type.replace(/[._]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
