import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  ExternalLink,
  Gauge,
  Plus,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
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
  head: () => ({ meta: [{ title: "Billing — AgentLine" }] }),
});

type BillingAction = "checkout" | "portal" | `plan:${string}`;

const PRESET_AMOUNTS = [10, 25, 50, 100, 250] as const;

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
      setMtdSpend(usageRes.data.reduce((sum, e) => sum + e.totalCost, 0));
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
        .filter((t) => t.amountCents > 0 && t.status === "succeeded")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );
  const activeAllowance = useMemo(
    () =>
      billingState?.allowanceGrants.find((g) => g.remainingCents > 0 && isGrantActive(g)) ?? null,
    [billingState],
  );
  const planForSubscription = useMemo(
    () =>
      billingState?.plans.find((p) => p.key === billingState.subscription?.planKey) ?? null,
    [billingState],
  );

  const totalAvailable = (balance?.balance ?? 0) + (activeAllowance?.remaining ?? 0);

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
        description="Manage your subscription, top up credits, and review every transaction."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openPortal}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {isActionLoading === "portal" ? "Opening…" : "Manage in Stripe"}
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

      {/* HERO — primary balance + plan summary */}
      {isLoading ? (
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <BalanceHero
            balance={balance?.balance ?? 0}
            allowance={activeAllowance?.remaining ?? 0}
            currency={balance?.currency ?? "USD"}
            mtdSpend={mtdSpend}
            totalAvailable={totalAvailable}
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

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <PlanGrid
            plans={billingState?.plans ?? []}
            currentPlanKey={billingState?.subscription?.planKey ?? "free"}
            isActionLoading={isActionLoading}
            onChoosePlan={startPlanCheckout}
          />

          <section className="rounded-xl border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Transaction history</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {transactions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  title="No billing transactions"
                  description="Top-ups, subscription checkouts, invoices, and Stripe webhook credits will appear here."
                />
              </div>
            ) : (
              <BillingTransactionsTable transactions={transactions} />
            )}
          </section>
        </div>

        <div className="space-y-4">
          <AllowanceCard grants={billingState?.allowanceGrants ?? []} />
          <AccountCard
            balance={balance}
            billingState={billingState}
            successfulCredits={successfulCredits}
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

/* ---------- Hero ---------- */

function BalanceHero({
  balance,
  allowance,
  currency,
  mtdSpend,
  totalAvailable,
  onTopUp,
}: {
  balance: number;
  allowance: number;
  currency: string;
  mtdSpend: number;
  totalAvailable: number;
  onTopUp: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-foreground to-foreground/85 p-6 text-background shadow-sm">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-background/5 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-background/60">
          <Wallet className="h-3.5 w-3.5" />
          Available balance
        </div>
        <div className="mt-2 flex items-end gap-3">
          <div className="text-4xl font-semibold tracking-tight tabular-nums">
            {formatUsd(totalAvailable)}
          </div>
          <div className="pb-1 text-xs text-background/60">{currency}</div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
          <HeroStat label="Prepaid" value={formatUsd(balance)} icon={<CreditCard className="h-3.5 w-3.5" />} />
          <HeroStat label="Allowance" value={formatUsd(allowance)} icon={<Sparkles className="h-3.5 w-3.5" />} />
          <HeroStat label="MTD spend" value={formatUsd(mtdSpend)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            onClick={onTopUp}
            className="inline-flex items-center gap-1.5 rounded-md bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-background/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add credits
          </button>
          <span className="text-[11px] text-background/55">
            Powered by Stripe • Instant credit
          </span>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/10 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-background/65">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/* ---------- Plan summary ---------- */

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
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
            status === "active"
              ? "bg-success/10 text-success"
              : status === "trialing"
                ? "bg-info/10 text-info"
                : "bg-muted text-muted-foreground",
          )}
        >
          {status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">
          {plan?.name ?? "Free trial"}
        </div>
        {plan ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatUsd(plan.includedUsage)} included usage / month, then metered.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Allowance-first. Upgrade for monthly included usage.
          </p>
        )}
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
                : "—"
          }
        />
      </dl>

      <button
        onClick={onManage}
        disabled={isLoading}
        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {isLoading ? "Opening…" : "Manage in Stripe portal"}
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

/* ---------- Plan grid ---------- */

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
  const paidPlans = plans.filter((p) => p.key !== "free");
  if (paidPlans.length === 0) return null;
  // Mark middle plan as recommended
  const recommendedKey = paidPlans[Math.floor(paidPlans.length / 2)]?.key;

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Choose your plan</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        All plans include a 14-day free trial. Cancel anytime from the Stripe portal.
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
                <Feature>Then metered via Stripe or balance</Feature>
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
                      ? "Starting checkout…"
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

/* ---------- Allowance card ---------- */

function AllowanceCard({ grants }: { grants: BillingAllowanceGrantView[] }) {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-info" />
        <h2 className="text-sm font-semibold">Usage allowances</h2>
      </div>
      {grants.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No trial or included usage grants yet.
        </p>
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
                    <div className="text-sm font-medium">
                      {labelAllowanceSource(grant.source)}
                    </div>
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

/* ---------- Account card ---------- */

function AccountCard({
  balance,
  billingState,
  successfulCredits,
  stripeStatus,
}: {
  balance: BillingBalanceView | null;
  billingState: BillingSubscriptionStateView | null;
  successfulCredits: number;
  stripeStatus: StripeStatusView | null;
}) {
  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Account details</h2>
        {stripeStatus && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              isStripeReady(stripeStatus)
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning",
            )}
          >
            <Zap className="h-3 w-3" />
            {stripeStatus.mode}
          </span>
        )}
      </div>
      <dl className="mt-4 space-y-3.5 text-xs">
        <Detail
          label="Stripe customer"
          value={billingState?.billingAccount.providerCustomerId ?? "—"}
          mono
        />
        <Detail label="Balance ID" value={balance?.id ?? "—"} mono />
        <Detail label="Workspace" value={balance?.workspaceId ?? "—"} mono />
        <Detail label="Last updated" value={balance?.updatedLabel ?? "—"} />
        <Detail label="Lifetime credits purchased" value={formatUsd(successfulCredits)} />
      </dl>
    </section>
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

/* ---------- Top-up dialog ---------- */

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
  const isCustomValid = customValue !== "" && Number.isFinite(customNum) && customNum >= 5 && customNum <= 5000;
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
            Top up your prepaid balance. Credits never expire and apply to all usage.
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
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter amount (5 – 5000)"
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
                {finalAmount ? formatUsd(finalAmount) : "—"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Securely processed by Stripe. Credits appear instantly after payment.
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
            {isLoading ? "Starting…" : `Continue to checkout`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Transactions table ---------- */

function BillingTransactionsTable({ transactions }: { transactions: BillingTransactionListItem[] }) {
  const columns: Column<BillingTransactionListItem>[] = [
    {
      key: "createdAt",
      label: "Date",
      width: 170,
      sortable: true,
      sortAccessor: (t) => new Date(t.createdAt),
      render: (t) => <span className="text-muted-foreground">{t.createdLabel}</span>,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      sortAccessor: (t) => t.type,
      render: (t) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{prettifyType(t.type)}</div>
          <Mono className="text-[11px] text-muted-foreground">{t.id}</Mono>
        </div>
      ),
    },
    {
      key: "provider",
      label: "Provider",
      width: 110,
      sortable: true,
      render: (t) => <span className="capitalize text-muted-foreground">{t.provider}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      sortable: true,
      render: (t) => <StatusPill status={t.status} />,
    },
    {
      key: "amount",
      label: "Amount",
      width: 130,
      align: "right",
      sortable: true,
      sortAccessor: (t) => t.amount,
      render: (t) => (
        <span
          className={cn(
            "tabular-nums font-semibold",
            t.amount >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {t.amount >= 0 ? "+" : "−"}
          {formatUsd(Math.abs(t.amount))}
        </span>
      ),
    },
  ];

  return (
    <DataTable<BillingTransactionListItem>
      columns={columns}
      data={transactions}
      getRowKey={(t) => t.id}
      stickyHeader
      maxBodyHeight={520}
      pageSize={25}
      defaultSort={{ key: "createdAt", dir: "desc" }}
      className="rounded-none border-0 shadow-none"
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "succeeded" || status === "paid"
      ? "bg-success/10 text-success"
      : status === "pending" || status === "processing"
        ? "bg-info/10 text-info"
        : status === "failed" || status === "canceled"
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

/* ---------- helpers ---------- */

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

function prettifyType(type: string) {
  return type
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
