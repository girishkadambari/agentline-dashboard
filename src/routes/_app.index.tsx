import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConical, Phone, Plus, Webhook } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Stat } from "@/components/agentline/Stat";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import { getBackendBillingBalance, type BillingBalanceView } from "@/lib/api/billing";
import { listBackendCalls, type CallListItem } from "@/lib/api/calls";
import { listBackendConversations, type ConversationListItem } from "@/lib/api/messages";
import { listBackendNumbers, type NumberListItem } from "@/lib/api/numbers";
import { listBackendDailyUsage, type UsageRollupListItem } from "@/lib/api/usage";
import { listBackendWebhookDeliveries } from "@/lib/api/webhooks";

export const Route = createFileRoute("/_app/")({
  component: Overview,
  head: () => ({ meta: [{ title: "Overview — AgentLine" }] }),
});

function Overview() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [numbers, setNumbers] = useState<NumberListItem[]>([]);
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [dailyUsage, setDailyUsage] = useState<UsageRollupListItem[]>([]);
  const [balance, setBalance] = useState<BillingBalanceView | null>(null);
  const [failedWebhooks, setFailedWebhooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    setIsLoading(true);
    setError(null);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [agentsResponse, numbersResponse, callsResponse, conversationsResponse, usageResponse, balanceResponse, failedWebhookResponse] = await Promise.all([
        listBackendAgents(),
        listBackendNumbers(),
        listBackendCalls(),
        listBackendConversations(),
        listBackendDailyUsage({ from: sevenDaysAgo.toISOString(), to: new Date().toISOString(), limit: 7 }),
        getBackendBillingBalance(),
        listBackendWebhookDeliveries({ status: "failed" }),
      ]);

      setAgents(agentsResponse.data);
      setNumbers(numbersResponse.data);
      setCalls(callsResponse.data);
      setConversations(conversationsResponse.data);
      setDailyUsage(usageResponse.data);
      setBalance(balanceResponse.data);
      setFailedWebhooks(failedWebhookResponse.data.length);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load overview.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const activeAgents = agents.filter((agent) => agent.status === "active").length;
  const activeNumbers = numbers.filter((number) => number.status === "active").length;
  const mtdSpend = dailyUsage.reduce((sum, usage) => sum + usage.totalCost, 0);
  const recentCalls = calls.slice(0, 5);
  const recentConversations = conversations.slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Operational health across your agents, numbers, and integrations."
        actions={
          <>
            <Link to="/agents" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Plus className="h-3.5 w-3.5" />Create agent</Link>
            <Link to="/numbers" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Phone className="h-3.5 w-3.5" />Provision number</Link>
            <Link to="/playground" className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><FlaskConical className="h-3.5 w-3.5" />Open playground</Link>
          </>
        }
      />

      {error && <div className="mb-3 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Active agents" value={activeAgents} hint={`${agents.length} total`} />
          <Stat label="Active numbers" value={activeNumbers} hint={`${numbers.length} total`} />
          <Stat label="Recent calls" value={calls.length.toLocaleString()} hint="Latest records" />
          <Stat label="Conversations" value={conversations.length.toLocaleString()} hint="Inbox threads" />
          <Stat label="Failed webhooks" value={failedWebhooks} hint="Needs retry" />
          <Stat label="7d spend" value={formatUsd(mtdSpend)} hint="From usage" />
          <Stat label="Balance" value={formatUsd(balance?.balance ?? 0)} hint={balance?.currency ?? "USD"} />
          <div className="flex items-center justify-between rounded-lg border bg-surface px-4 py-3.5">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhook</div>
              <div className="mt-1.5 text-sm font-medium">Configure</div>
            </div>
            <Link to="/webhooks" className="rounded-md border p-1.5 hover:bg-muted" aria-label="Open webhooks"><Webhook className="h-4 w-4" /></Link>
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
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No usage yet.</div>
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
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip formatter={(value) => formatUsd(Number(value))} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="totalCost" stroke="var(--color-chart-1)" fill="url(#overview-cost)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Recent conversations</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
          ) : recentConversations.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conversation) => (
                <div key={conversation.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{agentsById.get(conversation.agentId)?.name ?? conversation.agentId}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{conversation.channel}</span>
                      <span>·</span>
                      <Mono>{conversation.id}</Mono>
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-[11px] text-muted-foreground">{conversation.lastActivity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent calls</h2>
          <Link to="/calls" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
        </div>
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />)}</div>
          </div>
        ) : recentCalls.length === 0 ? (
          <EmptyState title="No calls yet" description="Start an outbound call or receive an inbound call to populate this table." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
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
                    <td className="px-4 py-3"><Mono className="text-muted-foreground">{call.id}</Mono></td>
                    <td className="px-4 py-3 capitalize">{call.direction}</td>
                    <td className="px-4 py-3"><Mono className="text-muted-foreground">{call.from} / {call.to}</Mono></td>
                    <td className="px-4 py-3"><span className="block truncate">{agentsById.get(call.agentId)?.name ?? call.agentId}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{call.duration}s</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatUsd(call.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
