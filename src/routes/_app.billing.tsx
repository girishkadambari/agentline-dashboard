import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  ExternalLink,
  Gauge,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  Sparkles,
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
  head: () => ({ meta: [{ title: "Billing — AgentLine" }] }),
});

type BillingAction = "checkout" | "portal" | `plan:${string}`;
const PRESET_AMOUNTS = [10, 25, 50, 100, 250] as const;
const USAGE_RATES = [
  {
    key: "number",
    label: "Phone number",
    price: "$1.00",
    unit: "provision/import event",
    note: "Current setup charge. Monthly rental controls come next.",
    icon: Phone,
  },
  {
    key: "sms-out",
    label: "Outbound SMS",
    price: "$0.01",
    unit: "message",
    note: "Charged when Twilio accepts the outbound message.",
    icon: MessageSquare,
  },
  {
    key: "sms-in",
    label: "Inbound SMS",
    price: "$0.01",
    unit: "message",
    note: "Charged when AgentLine receives the inbound webhook.",
    icon: MessageSquare,
  },
  {
    key: "voice",
    label: "Voice",
    price: "$0.03",
    unit: "started minute",
    note: "Final cost settles from provider call duration callbacks.",
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

  const activeAllowance = useMemo(
    () =>
      billingState?.allowanceGrants.find((g) => g.remainingCents > 0 && isGrantActive(g)) ?? null,
    [billingState],
  );
  const planForSubscription = useMemo(
    () => billingState?.plans.find((p) => p.key === billingState.subscription?.planKey) ?? null,
    [billingState],
  );
  const customerTransactions = useMemo(
    () => transactions.filter(isCustomerVisibleTransaction).slice(0, 8),
    [transactions],
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
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Billing"
        description="Your plan, credits, and payments — all in one place."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openPortal}
              disabled={isActionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isActionLoading === "portal" ? "Opening…" : "Invoices & payment method"}
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
      {error && (
        <Banner
          variant="error"
          className="mb-3"
          message={error}
          action={{ label: "Retry", onClick: () => void loadData() }}
          onDismiss={() => setError(null)}
        />
      )}

      {/* HERO — combined balance + plan card */}
      {isLoading ? (
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
      ) : (
        <SummaryHero
          totalAvailable={totalAvailable}
          balance={balance?.balance ?? 0}
          allowance={activeAllowance?.remaining ?? 0}
          mtdSpend={mtdSpend}
          plan={planForSubscription}
          subscription={billingState?.subscription ?? null}
          activeAllowance={activeAllowance}
          onTopUp={() => setTopUpOpen(true)}
        />
      )}

      {/* RATES */}
      <div className="mt-8">
        <SectionHeader
          title="Usage pricing"
          description="Current rates used to calculate phone, SMS, and voice usage."
        />
        <RateGrid />
      </div>

      {/* PLANS */}
      <div className="mt-8">
        <SectionHeader
          title="Plans"
          description="Switch plans anytime. Changes prorate automatically through Stripe."
        />
        <PlanGrid
          plans={billingState?.plans ?? []}
          currentPlanKey={billingState?.subscription?.planKey ?? "free"}
          hasSubscription={Boolean(billingState?.subscription)}
          isActionLoading={isActionLoading}
          onChoosePlan={startPlanCheckout}
        />
      </div>

      {/* ACTIVITY */}
      <div className="mt-8">
        <SectionHeader
          title="Billing activity"
          description="Top-ups, subscription charges, and credits applied to your workspace."
          right={
            <span className="text-xs text-muted-foreground">
              {customerTransactions.length} shown
            </span>
          }
        />
        <div className="rounded-xl border bg-surface shadow-sm">
          {customerTransactions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Receipt className="h-5 w-5" />}
                title="No billing activity yet"
                description="Your top-ups, subscription charges, and credits will appear here."
                action={
                  <button
                    onClick={() => setTopUpOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add your first credits
                  </button>
                }
              />
            </div>
          ) : (
            <BillingTransactionsTable transactions={customerTransactions} />
          )}
        </div>
      </div>

      {/* DEVELOPER DETAILS — collapsible footer */}
      {balance && (
        <details className="group mt-8 rounded-xl border bg-surface px-5 py-3 shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
            Developer details
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Detail
              label="Stripe customer"
              value={billingState?.billingAccount.providerCustomerId ?? "—"}
              mono
            />
            <Detail label="Balance ID" value={balance.id} mono />
            <Detail label="Workspace" value={balance.workspaceId} mono />
            <Detail label="Last updated" value={balance.updatedLabel} />
          </dl>
        </details>
      )}

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

/* ---------- Section header ---------- */

function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Rates ---------- */

function RateGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {USAGE_RATES.map((rate) => {
        const Icon = rate.icon;
        return (
          <div key={rate.key} className="rounded-xl border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {rate.label}
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold tabular-nums">{rate.price}</span>
              <span className="ml-1 text-xs text-muted-foreground">/ {rate.unit}</span>
            </div>
            <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">{rate.note}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Hero: balance + plan combined ---------- */

function SummaryHero({
  totalAvailable,
  balance,
  allowance,
  mtdSpend,
  plan,
  subscription,
  activeAllowance,
  onTopUp,
}: {
  totalAvailable: number;
  balance: number;
  allowance: number;
  mtdSpend: number;
  plan: BillingPlanView | null;
  subscription: BillingSubscriptionStateView["subscription"];
  activeAllowance: BillingAllowanceGrantView | null;
  onTopUp: () => void;
}) {
  const status = subscription?.status ?? "trial";
  const statusTone =
    status === "active"
      ? "bg-success/10 text-success"
      : status === "trialing"
        ? "bg-info/10 text-info"
        : "bg-muted text-muted-foreground";

  return (
    <section className="overflow-hidden rounded-xl border bg-surface shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
        {/* LEFT — Balance */}
        <div className="relative overflow-hidden bg-gradient-to-br from-foreground to-foreground/85 p-6 text-background">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-background/5 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-background/60">
              <Wallet className="h-3.5 w-3.5" />
              Available to spend
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
                {formatUsd(totalAvailable)}
              </div>
              <div className="pb-1 text-xs text-background/60">USD</div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5 text-sm">
              <HeroStat label="Prepaid" value={formatUsd(balance)} />
              <HeroStat label="Allowance" value={formatUsd(allowance)} />
              <HeroStat label="This month" value={formatUsd(mtdSpend)} hint="spent" />
            </div>

            <button
              onClick={onTopUp}
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-background/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add credits
            </button>
          </div>
        </div>

        {/* RIGHT — Plan */}
        <div className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Current plan
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
                statusTone,
              )}
            >
              {status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-semibold tracking-tight">
              {plan?.name ?? "Free trial"}
            </div>
            {plan && plan.monthlyPrice > 0 && (
              <div className="text-xs text-muted-foreground tabular-nums">
                {formatUsd(plan.monthlyPrice)}/mo
              </div>
            )}
          </div>
          {plan ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatUsd(plan.includedUsage)} included usage each month, then metered.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Allowance-first. Upgrade for monthly included usage.
            </p>
          )}

          {/* Allowance progress (if active) */}
          {activeAllowance && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-foreground">
                  {labelAllowanceSource(activeAllowance.source)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatUsd(activeAllowance.remaining)} of {formatUsd(activeAllowance.amount)} left
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    activeAllowance.usagePercent >= 90
                      ? "bg-destructive"
                      : activeAllowance.usagePercent >= 70
                        ? "bg-warning"
                        : "bg-foreground",
                  )}
                  style={{ width: `${Math.max(2, activeAllowance.usagePercent)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10.5px] text-muted-foreground">
                {activeAllowance.periodLabel}
              </div>
            </div>
          )}

          <div className="mt-auto grid grid-cols-2 gap-3 pt-4 text-[11px]">
            <MetaRow label="Renews" value={renewalLabel(subscription)} />
            <MetaRow
              label={subscription?.cancelAtPeriodEnd ? "Cancels" : "Trial ends"}
              value={trialLabel(subscription)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-background/10 px-3 py-2 backdrop-blur">
      <div className="text-[10px] font-medium uppercase tracking-wide text-background/60">
        {label}
      </div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-background/55">{hint}</div>}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

/* ---------- Plan grid ---------- */

function PlanGrid({
  plans,
  currentPlanKey,
  hasSubscription,
  isActionLoading,
  onChoosePlan,
}: {
  plans: BillingPlanView[];
  currentPlanKey: string;
  hasSubscription: boolean;
  isActionLoading: BillingAction | null;
  onChoosePlan: (planKey: Exclude<BillingPlanKey, "free">) => void;
}) {
  const paidPlans = plans.filter((p) => p.key !== "free");
  if (paidPlans.length === 0) return null;
  const recommendedKey = paidPlans[Math.floor(paidPlans.length / 2)]?.key;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {paidPlans.map((plan) => {
        const isCurrent = currentPlanKey === plan.key;
        const isLoading = isActionLoading === `plan:${plan.key}`;
        const isRecommended = plan.key === recommendedKey && !isCurrent;
        return (
          <div
            key={plan.key}
            className={cn(
              "relative rounded-xl border bg-surface p-5 shadow-sm transition",
              isCurrent
                ? "border-success/50 bg-success/[0.03]"
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
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatUsd(plan.monthlyPrice)}
              </span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <Feature>
                <strong className="text-foreground tabular-nums">
                  {formatUsd(plan.includedUsage)}
                </strong>{" "}
                included usage every month
              </Feature>
              <Feature>Overages metered through Stripe or balance</Feature>
              <Feature>{plan.trialDays}-day free trial, no card surprises</Feature>
            </ul>
            <button
              onClick={() => onChoosePlan(plan.key as Exclude<BillingPlanKey, "free">)}
              disabled={isCurrent || !plan.stripePriceConfigured || isActionLoading !== null}
              className={cn(
                "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                isCurrent
                  ? "border border-success/40 bg-transparent text-success"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              {isCurrent ? (
                "Current plan"
              ) : !plan.stripePriceConfigured ? (
                "Price not configured"
              ) : isLoading ? (
                "Opening Stripe..."
              ) : hasSubscription ? (
                <>
                  Switch to {plan.name}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </>
              ) : (
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

/* ---------- Detail (developer footer) ---------- */

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
  const isCustomValid =
    customValue !== "" && Number.isFinite(customNum) && customNum >= 5 && customNum <= 5000;
  const finalAmount = customValue ? (isCustomValid ? customNum : null) : selected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
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

function BillingTransactionsTable({
  transactions,
}: {
  transactions: BillingTransactionListItem[];
}) {
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
      label: "Activity",
      sortable: true,
      sortAccessor: (t) => customerTransactionLabel(t),
      render: (t) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{customerTransactionLabel(t)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {customerTransactionDescription(t)}
          </div>
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
      sortAccessor: (t) => customerTransactionAmount(t).value,
      render: (t) => {
        const amount = customerTransactionAmount(t);
        return (
          <span
            className={cn(
              "tabular-nums font-semibold",
              amount.tone === "credit" ? "text-success" : "text-destructive",
            )}
          >
            {amount.label}
          </span>
        );
      },
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
      className="rounded-xl border-0 shadow-none"
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
  return (
    status.secretKeyConfigured && status.secretKeyMatchesMode && status.webhookSecretConfigured
  );
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

function renewalLabel(subscription: BillingSubscriptionStateView["subscription"]) {
  if (!subscription) return "Not subscribed";
  if (subscription.cancelAtPeriodEnd) return "Cancels at period end";
  if (subscription.currentPeriodLabel && subscription.currentPeriodLabel !== "Not started") {
    return subscription.currentPeriodLabel;
  }
  if (subscription.status === "trialing") return "After trial";
  if (subscription.status === "active") return "Auto-renews";
  return "Not started";
}

function trialLabel(subscription: BillingSubscriptionStateView["subscription"]) {
  return subscription?.trialEndsLabel ?? "Not active";
}

function isCustomerVisibleTransaction(transaction: BillingTransactionListItem) {
  const succeededCheckoutStart =
    transaction.status === "succeeded" &&
    (transaction.type === "checkout_session.created" ||
      transaction.type === "subscription_checkout_session.created");
  return !succeededCheckoutStart;
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
    "usage.settlement_adjustment": "Voice usage adjusted",
  };
  return labels[transaction.type] ?? prettifyType(transaction.type);
}

function customerTransactionDescription(transaction: BillingTransactionListItem) {
  if (transaction.type === "usage.settlement_adjustment") {
    const metadata = transaction.metadata as Record<string, unknown> | null;
    const resourceId = typeof metadata?.resourceId === "string" ? metadata.resourceId : "call";
    if (transaction.amountCents < 0) {
      return `Unused voice preauthorization returned for ${resourceId}`;
    }
    if (transaction.amountCents > 0) {
      return `Final voice duration required an additional charge for ${resourceId}`;
    }
    return `Final voice duration matched the preauthorized charge for ${resourceId}`;
  }
  if (transaction.type.includes("subscription")) return "Plan lifecycle managed by Stripe";
  if (transaction.type.includes("invoice")) return "Recurring billing event";
  if (transaction.type.includes("checkout")) return "Stripe Checkout event";
  return "Billing ledger event";
}

function customerTransactionAmount(transaction: BillingTransactionListItem) {
  if (transaction.type === "usage.settlement_adjustment") {
    if (transaction.amountCents < 0) {
      return {
        value: Math.abs(transaction.amount),
        label: `+${formatUsd(Math.abs(transaction.amount))}`,
        tone: "credit" as const,
      };
    }
    if (transaction.amountCents > 0) {
      return {
        value: -transaction.amount,
        label: `−${formatUsd(Math.abs(transaction.amount))}`,
        tone: "debit" as const,
      };
    }
  }

  return {
    value: transaction.amount,
    label: `${transaction.amount >= 0 ? "+" : "−"}${formatUsd(Math.abs(transaction.amount))}`,
    tone: transaction.amount >= 0 ? ("credit" as const) : ("debit" as const),
  };
}

function prettifyType(type: string) {
  return type.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
