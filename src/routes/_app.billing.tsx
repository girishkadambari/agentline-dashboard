import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, Wallet } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Stat } from "@/components/agentline/Stat";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Mono } from "@/components/agentline/Mono";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createBackendCheckoutSession,
  createBackendPortalSession,
  getBackendBillingBalance,
  getBackendStripeStatus,
  listBackendBillingTransactions,
  type BillingBalanceView,
  type StripeStatusView,
  type BillingTransactionListItem,
} from "@/lib/api/billing";
import { listBackendUsageEvents } from "@/lib/api/usage";

export const Route = createFileRoute("/_app/billing")({
  component: Billing,
  head: () => ({ meta: [{ title: "Billing — AgentLine" }] }),
});

function Billing() {
  const [balance, setBalance] = useState<BillingBalanceView | null>(null);
  const [transactions, setTransactions] = useState<BillingTransactionListItem[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusView | null>(null);
  const [mtdSpend, setMtdSpend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [balanceResponse, transactionResponse, usageResponse, stripeStatusResponse] = await Promise.all([
        getBackendBillingBalance(),
        listBackendBillingTransactions(),
        listBackendUsageEvents({ from: monthStart.toISOString(), to: new Date().toISOString(), limit: 200 }),
        getBackendStripeStatus(),
      ]);
      setBalance(balanceResponse.data);
      setTransactions(transactionResponse.data);
      setStripeStatus(stripeStatusResponse.data);
      setMtdSpend(usageResponse.data.reduce((sum, event) => sum + event.totalCost, 0));
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load billing.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const successfulCredits = useMemo(
    () => transactions.filter((transaction) => transaction.amountCents > 0 && transaction.status === "succeeded").reduce((sum, transaction) => sum + transaction.amount, 0),
    [transactions],
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
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not start checkout.");
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
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not open billing portal.");
    } finally {
      setIsActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Workspace balance, spend, Stripe sessions, and billing transactions."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={openPortal} disabled={isActionLoading !== null} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
              <ExternalLink className="h-3.5 w-3.5" />{isActionLoading === "portal" ? "Opening..." : "Billing portal"}
            </button>
            <button onClick={openCheckout} disabled={isActionLoading !== null} className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              <CreditCard className="h-3.5 w-3.5" />{isActionLoading === "checkout" ? "Starting..." : "Add $25"}
            </button>
          </div>
        }
      />

      <div className={`mb-4 rounded-md border px-3 py-2 text-xs ${stripeStatus && isStripeReady(stripeStatus) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-warning/30 bg-warning/10 text-warning-foreground"}`}>
        {stripeStatus ? (
          <span>
            Stripe is in <strong>{stripeStatus.mode}</strong> mode. Secret key {stripeStatus.secretKeyConfigured ? "configured" : "missing"}, mode match {stripeStatus.secretKeyMatchesMode ? "ok" : "failed"}, webhook secret {stripeStatus.webhookSecretConfigured ? "configured" : "missing"}.
          </span>
        ) : (
          "Stripe sessions depend on backend Stripe configuration. Configure Stripe before collecting real top-ups."
        )}
      </div>

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Balance" value={formatUsd(balance?.balance ?? 0)} hint={balance?.currency ?? "USD"} />
          <Stat label="MTD spend" value={formatUsd(mtdSpend)} hint="From usage events" />
          <Stat label="Spend limit" value={balance?.spendLimit === null ? "Not set" : formatUsd(balance?.spendLimit ?? 0)} />
          <Stat label="Credits" value={formatUsd(successfulCredits)} hint="Successful top-ups" />
          <Stat label="Stripe" value={stripeStatus?.mode ?? "Unknown"} hint={stripeStatus && isStripeReady(stripeStatus) ? "Ready" : "Needs config"} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          {isLoading ? (
            <div className="rounded-lg border bg-surface p-4">
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />)}</div>
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={<Wallet className="h-5 w-5" />} title="No billing transactions" description="Top-ups and Stripe webhook credits will appear here." />
          ) : (
            <BillingTransactionsTable transactions={transactions} />
          )}
        </div>
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Balance details</h2>
          <div className="mt-4 space-y-4 text-sm">
            <Detail label="Balance ID" value={balance?.id ?? "Unknown"} mono />
            <Detail label="Workspace" value={balance?.workspaceId ?? "Unknown"} mono />
            <Detail label="Updated" value={balance?.updatedLabel ?? "Unknown"} />
            <Detail label="Currency" value={balance?.currency ?? "USD"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function isStripeReady(status: StripeStatusView) {
  return status.secretKeyConfigured && status.secretKeyMatchesMode && status.webhookSecretConfigured;
}

function BillingTransactionsTable({ transactions }: { transactions: BillingTransactionListItem[] }) {
  return (
    <div className="rounded-lg border bg-surface shadow-sm overflow-x-auto scrollbar-thin">
      <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Billing transactions</h2></div>
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
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
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${transaction.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {transaction.amount >= 0 ? "+" : "-"}{formatUsd(Math.abs(transaction.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {mono ? <Mono className="mt-1 block break-all text-xs">{value}</Mono> : <div className="mt-1 font-medium">{value}</div>}
    </div>
  );
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
