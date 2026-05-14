import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, DollarSign, MessageSquare, PhoneCall, Sigma } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable, type Column } from "@/components/agentline/DataTable";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Banner } from "@/components/agentline/Banner";
import { cn } from "@/lib/utils";
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
    <div className="min-w-0">
      <PageHeader
        eyebrow="Platform"
        title="Usage"
        description="Billable activity across agents, channels, and resources."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={range}
          onChange={(event) => setRange(event.target.value as RangeValue)}
          className="rounded-md border border-border/80 bg-surface px-2.5 py-1.5 text-xs outline-none ring-ring focus:ring-2"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
        <select
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
          className="rounded-md border border-border/80 bg-surface px-2.5 py-1.5 text-xs outline-none ring-ring focus:ring-2"
        >
          <option value="">All agents</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          className="rounded-md border border-border/80 bg-surface px-2.5 py-1.5 text-xs outline-none ring-ring focus:ring-2"
        >
          <option value="">All channels</option>
          <option value="voice">Voice</option>
          <option value="sms">SMS</option>
          <option value="number">Numbers</option>
        </select>
      </div>

      {error && <Banner variant="error" message={error} className="mb-3" />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Total cost"
          value={formatUsd(totalCost)}
          hint={`${events.length} events`}
          icon={<DollarSign className="h-3.5 w-3.5" />}
          accent="emerald"
        />
        <MetricCard
          label="Quantity"
          value={totalQuantity.toLocaleString()}
          hint="Billable units"
          icon={<Sigma className="h-3.5 w-3.5" />}
          accent="slate"
        />
        <MetricCard
          label="Voice"
          value={formatUsd(voiceCost)}
          hint="Voice usage cost"
          icon={<PhoneCall className="h-3.5 w-3.5" />}
          accent="indigo"
        />
        <MetricCard
          label="SMS"
          value={formatUsd(smsCost)}
          hint="SMS usage cost"
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CostChart
          title="Daily cost"
          subtitle={dateRange.label}
          total={daily.reduce((sum, item) => sum + item.totalCost, 0)}
          data={daily}
          variant="indigo"
          isLoading={isLoading}
        />
        <CostChart
          title="Monthly cost"
          subtitle="Billed totals per month"
          total={monthly.reduce((sum, item) => sum + item.totalCost, 0)}
          data={monthly}
          variant="emerald"
          isLoading={isLoading}
          chart="bar"
        />
      </div>

      <div className="mt-6 min-w-0">
        {isLoading ? (
          <div className="rounded-xl border border-border/80 bg-surface p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No usage events"
            description="Send SMS, provision numbers, or start calls to create usage events."
          />
        ) : (
          <UsageEventsTable events={events} agentsById={agentsById} />
        )}
      </div>
    </div>
  );
}

const ACCENTS: Record<string, { bg: string; ring: string; text: string }> = {
  emerald: { bg: "bg-success/10", ring: "ring-success/25", text: "text-success" },
  indigo: { bg: "bg-info/10", ring: "ring-info/25", text: "text-info" },
  amber: {
    bg: "bg-warning/15",
    ring: "ring-warning/30",
    text: "text-[oklch(0.45_0.12_75)]",
  },
  slate: { bg: "bg-muted", ring: "ring-border", text: "text-muted-foreground" },
};

function MetricCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
}) {
  const tone = ACCENTS[accent];
  return (
    <div className="rounded-xl border border-border/80 bg-surface px-4 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-inset",
            tone.bg,
            tone.ring,
            tone.text,
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const CHART_VARIANTS = {
  indigo: { stroke: "oklch(0.55 0.16 255)", fill: "oklch(0.55 0.16 255)" },
  emerald: { stroke: "oklch(0.62 0.13 155)", fill: "oklch(0.62 0.13 155)" },
} as const;

function CostChart({
  title,
  subtitle,
  total,
  data,
  variant,
  chart = "area",
  isLoading,
}: {
  title: string;
  subtitle: string;
  total: number;
  data: UsageRollupListItem[];
  variant: keyof typeof CHART_VARIANTS;
  chart?: "area" | "bar";
  isLoading: boolean;
}) {
  const tone = CHART_VARIANTS[variant];
  const gradientId = `cost-gradient-${variant}-${chart}`;

  return (
    <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[13.5px] font-semibold tracking-tight">{title}</h2>
          <p className="text-[11.5px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Total
          </div>
          <div className="text-[16px] font-semibold tabular-nums tracking-tight">
            {formatUsd(total)}
          </div>
        </div>
      </div>
      <div className="h-56">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-md bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">
            No data in this range yet.
          </div>
        ) : (
          <ResponsiveContainer>
            {chart === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tone.fill} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={tone.fill} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => formatUsdCompact(Number(value))}
                />
                <Tooltip
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                  content={<MoneyTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="totalCost"
                  stroke={tone.stroke}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tone.fill} stopOpacity={1} />
                    <stop offset="100%" stopColor={tone.fill} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => formatUsdCompact(Number(value))}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  content={<MoneyTooltip />}
                />
                <Bar dataKey="totalCost" fill={`url(#${gradientId})`} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-lg border border-border/80 bg-surface px-2.5 py-2 text-[12px] shadow-md">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">
        {formatUsd(value)}
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
    <div className="min-w-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-[13.5px] font-semibold tracking-tight">Usage events</h2>
        <span className="text-[11.5px] text-muted-foreground">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>
      <DataTable<UsageEventListItem>
        minWidth={1000}
        data={events}
        stickyHeader
        maxBodyHeight={560}
        pageSize={25}
        defaultSort={{ key: "time", dir: "desc" }}
        columns={[
          { key: "time", label: "Time", width: 160, sortable: true, sortAccessor: (e) => e.occurredLabel, render: (e) => <span className="text-muted-foreground">{e.occurredLabel}</span> },
          { key: "agent", label: "Agent", width: 180, sortable: true, sortAccessor: (e) => agentsById.get(e.agentId)?.name ?? e.agentId, render: (e) => <span className="block truncate font-medium">{agentsById.get(e.agentId)?.name ?? e.agentId}</span> },
          { key: "resource", label: "Resource", render: (e) => (<><span className="capitalize">{e.resourceType}</span><span className="text-muted-foreground"> · </span><Mono className="text-muted-foreground">{e.resourceId}</Mono></>) },
          { key: "channel", label: "Channel", width: 110, sortable: true, sortAccessor: (e) => e.channel, cellClassName: "capitalize text-muted-foreground", render: (e) => e.channel },
          { key: "qty", label: "Qty", width: 80, align: "right", sortable: true, sortAccessor: (e) => e.quantity, cellClassName: "tabular-nums", render: (e) => e.quantity },
          { key: "unit", label: "Unit", width: 100, render: (e) => <span className="text-muted-foreground">{e.unit}</span> },
          { key: "unitCost", label: "Unit $", width: 110, align: "right", sortable: true, sortAccessor: (e) => e.unitCost, cellClassName: "tabular-nums", render: (e) => formatUsd(e.unitCost, 4) },
          { key: "totalCost", label: "Total $", width: 110, align: "right", sortable: true, sortAccessor: (e) => e.totalCost, cellClassName: "tabular-nums font-semibold text-foreground", render: (e) => formatUsd(e.totalCost, 4) },
        ] satisfies Column<UsageEventListItem>[]}
      />
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

  const label =
    range === "month"
      ? "This month"
      : `Last ${range} days`;

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    label,
  };
}

function formatUsd(value: number, digits = 2) {
  return `$${value.toFixed(digits)}`;
}

function formatUsdCompact(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) >= 10) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}
