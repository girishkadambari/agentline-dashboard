import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Stat } from "@/components/agentline/Stat";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  listBackendDailyUsage,
  listBackendMonthlyUsage,
  listBackendUsageEvents,
  type UsageEventListItem,
  type UsageRollupListItem,
} from "@/lib/api/usage";

export const Route = createFileRoute("/_app/usage")({
  component: Usage,
  head: () => ({ meta: [{ title: "Usage — AgentLine" }] }),
});

type RangeValue = "7" | "30" | "month";

function Usage() {
  const [events, setEvents] = useState<UsageEventListItem[]>([]);
  const [daily, setDaily] = useState<UsageRollupListItem[]>([]);
  const [monthly, setMonthly] = useState<UsageRollupListItem[]>([]);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentId, setAgentId] = useState("");
  const [channel, setChannel] = useState("");
  const [range, setRange] = useState<RangeValue>("30");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => getDateRange(range), [range]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const query = {
        agentId: agentId || undefined,
        channel: channel || undefined,
        from: dateRange.from,
        to: dateRange.to,
        limit: 100,
      };
      const [eventsResponse, dailyResponse, monthlyResponse, agentsResponse] = await Promise.all([
        listBackendUsageEvents(query),
        listBackendDailyUsage(query),
        listBackendMonthlyUsage(query),
        listBackendAgents(),
      ]);
      setEvents(eventsResponse.data);
      setDaily(dailyResponse.data);
      setMonthly(monthlyResponse.data);
      setAgents(agentsResponse.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load usage.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [agentId, channel, dateRange.from, dateRange.to]);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const totalCost = events.reduce((sum, event) => sum + event.totalCost, 0);
  const totalQuantity = events.reduce((sum, event) => sum + event.quantity, 0);
  const voiceCost = events.filter((event) => event.channel === "voice").reduce((sum, event) => sum + event.totalCost, 0);
  const smsCost = events.filter((event) => event.channel === "sms").reduce((sum, event) => sum + event.totalCost, 0);

  return (
    <div>
      <PageHeader title="Usage" description="Billable activity across agents, channels, and resources." />

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={range} onChange={(event) => setRange(event.target.value as RangeValue)} className="rounded-md border bg-surface px-2.5 py-1.5 text-xs">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
        <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="rounded-md border bg-surface px-2.5 py-1.5 text-xs">
          <option value="">All agents</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        <select value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-md border bg-surface px-2.5 py-1.5 text-xs">
          <option value="">All channels</option>
          <option value="voice">Voice</option>
          <option value="sms">SMS</option>
          <option value="number">Numbers</option>
        </select>
      </div>

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total cost" value={formatUsd(totalCost)} hint={`${events.length} events`} />
        <Stat label="Quantity" value={totalQuantity.toLocaleString()} hint="Billable units" />
        <Stat label="Voice" value={formatUsd(voiceCost)} hint="Voice usage cost" />
        <Stat label="SMS" value={formatUsd(smsCost)} hint="SMS usage cost" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Daily cost</h2>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-md bg-muted" />
            ) : daily.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No daily usage yet.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip formatter={(value) => formatUsd(Number(value))} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="totalCost" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Monthly cost</h2>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-md bg-muted" />
            ) : monthly.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No monthly usage yet.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip formatter={(value) => formatUsd(Number(value))} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="totalCost" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-lg border bg-surface p-4">
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />)}</div>
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No usage events" description="Send SMS, provision numbers, or start mock calls to create usage events." />
        ) : (
          <UsageEventsTable events={events} agentsById={agentsById} />
        )}
      </div>
    </div>
  );
}

function UsageEventsTable({
  events,
  agentsById,
}: {
  events: UsageEventListItem[];
  agentsById: Map<string, AgentListItem>;
}) {
  return (
    <div className="rounded-lg border bg-surface shadow-sm overflow-x-auto scrollbar-thin">
      <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Usage events</h2></div>
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[150px] px-4 py-3 text-left font-medium">Time</th>
            <th className="w-[180px] px-4 py-3 text-left font-medium">Agent</th>
            <th className="px-4 py-3 text-left font-medium">Resource</th>
            <th className="w-[110px] px-4 py-3 text-left font-medium">Channel</th>
            <th className="w-[80px] px-4 py-3 text-right font-medium">Qty</th>
            <th className="w-[100px] px-4 py-3 text-left font-medium">Unit</th>
            <th className="w-[110px] px-4 py-3 text-right font-medium">Unit $</th>
            <th className="w-[110px] px-4 py-3 text-right font-medium">Total $</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b last:border-b-0 hover:bg-muted/35">
              <td className="px-4 py-3 text-muted-foreground">{event.occurredLabel}</td>
              <td className="px-4 py-3"><span className="block truncate">{agentsById.get(event.agentId)?.name ?? event.agentId}</span></td>
              <td className="px-4 py-3">
                <span className="capitalize">{event.resourceType}</span>
                <span className="text-muted-foreground"> · </span>
                <Mono className="text-muted-foreground">{event.resourceId}</Mono>
              </td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{event.channel}</td>
              <td className="px-4 py-3 text-right tabular-nums">{event.quantity}</td>
              <td className="px-4 py-3 text-muted-foreground">{event.unit}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatUsd(event.unitCost, 4)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">{formatUsd(event.totalCost, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDateRange(range: RangeValue) {
  const now = new Date();
  const from = new Date(now);

  if (range === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(now.getDate() - Number(range));
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function formatUsd(value: number, digits = 2) {
  return `$${value.toFixed(digits)}`;
}
