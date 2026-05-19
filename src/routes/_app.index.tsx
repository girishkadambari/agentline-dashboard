import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Bot, FlaskConical, Phone, Plus, Webhook, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/vukho/PageHeader";
import { DataTable } from "@/components/vukho/DataTable";
import { Stat } from "@/components/vukho/Stat";
import { StatusBadge } from "@/components/vukho/StatusBadge";
import { Mono } from "@/components/vukho/Mono";
import { EmptyState } from "@/components/vukho/EmptyState";
import { Banner } from "@/components/vukho/Banner";
import { VukhoApiError, formatApiError } from "@/lib/api/client";
import { getBackendDashboardSummary, type DashboardSummaryView } from "@/lib/api/dashboard";

export const Route = createFileRoute("/_app/")({
  component: Overview,
  head: () => ({ meta: [{ title: "Overview — Vukho" }] }),
});

function Overview() {
  const [summary, setSummary] = useState<DashboardSummaryView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getBackendDashboardSummary();
      setSummary(response.data);
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load overview.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  const dailyUsage = summary?.usage.daily ?? [];
  const calls = summary?.recentCalls ?? [];
  const conversations = summary?.recentConversations ?? [];
  const balance = summary?.billingBalance ?? null;
  const counts = summary?.counts;
  const activeAgents = counts?.activeAgents ?? 0;
  const activeNumbers = counts?.activeNumbers ?? 0;
  const mtdSpend = dailyUsage.reduce((sum, usage) => sum + usage.totalCost, 0);
  const recentCalls = calls.slice(0, 5);
  const recentConversations = conversations.slice(0, 4);
  const readiness = summary?.onboarding ?? null;
  const nextStep = readiness ? getOverviewNextStep(readiness.nextAction) : null;
  const NextStepIcon = nextStep?.icon;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Operational health across your agents, numbers, and integrations."
        actions={
          <>
            <Link
              to="/agents"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Create agent
            </Link>
            <Link
              to="/numbers"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Phone className="h-3.5 w-3.5" />
              Provision number
            </Link>
            <Link
              to="/playground"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Open playground
            </Link>
          </>
        }
      />

      {error && <Banner variant="error" message={error} className="mb-3" />}

      {!isLoading && readiness && !readiness.readyForLiveTraffic && nextStep && (
        <div className="mb-4 rounded-lg border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                {NextStepIcon && <NextStepIcon className="h-4 w-4" />}
              </span>
              <div>
                <div className="text-sm font-semibold">{nextStep.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{nextStep.description}</p>
              </div>
            </div>
            <Link
              to={nextStep.to}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              {nextStep.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Active agents" value={activeAgents} hint={`${counts?.agents ?? 0} total`} />
          <Stat
            label="Active numbers"
            value={activeNumbers}
            hint={`${counts?.numbers ?? 0} total`}
          />
          <Stat
            label="Calls"
            value={(counts?.calls ?? 0).toLocaleString()}
            hint="All call records"
          />
          <Stat
            label="Conversations"
            value={(counts?.conversations ?? 0).toLocaleString()}
            hint="Inbox threads"
          />
          <Stat
            label="Failed webhooks"
            value={summary?.failedWebhookDeliveries ?? 0}
            hint="Needs retry"
          />
          <Stat label="7d spend" value={formatUsd(mtdSpend)} hint="From usage" />
          <Stat
            label="Balance"
            value={formatUsd(balance?.balance ?? 0)}
            hint={balance?.currency ?? "USD"}
          />
          <div className="flex items-center justify-between rounded-lg border bg-surface px-4 py-3.5">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Webhook
              </div>
              <div className="mt-1.5 text-sm font-medium">Configure</div>
            </div>
            <Link
              to="/webhooks"
              className="rounded-md border p-1.5 hover:bg-muted"
              aria-label="Open webhooks"
            >
              <Webhook className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-surface p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Usage trend</h2>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-md bg-muted" />
            ) : dailyUsage.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No usage yet.
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={dailyUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overview-cost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    formatter={(value) => formatUsd(Number(value))}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCost"
                    stroke="var(--color-chart-1)"
                    fill="url(#overview-cost)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Recent conversations</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{conversation.contactId}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{conversation.channel}</span>
                      <span>·</span>
                      <Mono>{conversation.id}</Mono>
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {conversation.lastActivity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent calls</h2>
          <Link to="/calls" className="text-xs text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ) : recentCalls.length === 0 ? (
          <EmptyState
            title="No calls yet"
            description="Start an outbound call or receive an inbound call to populate this table."
          />
        ) : (
          <DataTable minWidth={960} className="rounded-none border-0 shadow-none">
            <thead className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-[220px] px-4 py-3 text-left font-medium">ID</th>
                <th className="w-[110px] px-4 py-3 text-left font-medium">Direction</th>
                <th className="px-4 py-3 text-left font-medium">From / To</th>
                <th className="w-[180px] px-4 py-3 text-left font-medium">Agent</th>
                <th className="w-[140px] px-4 py-3 text-left font-medium">Status</th>
                <th className="w-[100px] px-4 py-3 text-right font-medium">Duration</th>
                <th className="w-[100px] px-4 py-3 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => (
                <tr key={call.id} className="border-b last:border-b-0 hover:bg-muted/35">
                  <td className="px-4 py-3">
                    <Mono className="text-muted-foreground">{call.id}</Mono>
                  </td>
                  <td className="px-4 py-3 capitalize">{call.direction}</td>
                  <td className="px-4 py-3">
                    <Mono className="text-muted-foreground">
                      {call.from} / {call.to}
                    </Mono>
                  </td>
                  <td className="px-4 py-3">
                    <Mono className="text-muted-foreground">{call.agentId}</Mono>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={call.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{call.duration}s</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUsd(call.cost)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  );
}

function getOverviewNextStep(nextAction: DashboardSummaryView["onboarding"]["nextAction"]): {
  title: string;
  description: string;
  action: string;
  to: "/agents" | "/numbers" | "/webhooks" | "/playground";
  icon: LucideIcon;
} {
  switch (nextAction) {
    case "create_agent":
      return {
        title: "Create your first phone agent",
        description: "Start by defining the agent that will handle calls, SMS, and outcomes.",
        action: "Create agent",
        to: "/agents",
        icon: Bot,
      };
    case "attach_number":
      return {
        title: "Attach a live number",
        description: "Connect a phone number so people can reach your agent.",
        action: "Open numbers",
        to: "/numbers",
        icon: Phone,
      };
    case "configure_webhook":
      return {
        title: "Send outcomes to your app",
        description:
          "Configure webhook events so your backend receives messages, calls, and results.",
        action: "Configure webhook",
        to: "/webhooks",
        icon: Webhook,
      };
    case "run_live_smoke":
      return {
        title: "Run a live test",
        description:
          "Use the playground to confirm calls, messages, usage, and webhooks end to end.",
        action: "Open playground",
        to: "/playground",
        icon: FlaskConical,
      };
  }
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
