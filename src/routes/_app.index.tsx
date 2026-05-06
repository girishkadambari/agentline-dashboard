import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Stat } from "@/components/agentline/Stat";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { overview, calls, conversations, usageTrend, agents } from "@/lib/mock/data";
import { Plus, Phone, FlaskConical, Webhook } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/")({
  component: Overview,
  head: () => ({ meta: [{ title: "Overview — AgentLine" }] }),
});

function nameFor(id: string) { return agents.find(a => a.id === id)?.name ?? id; }

function Overview() {
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active agents" value={overview.activeAgents} />
        <Stat label="Active numbers" value={overview.activeNumbers} />
        <Stat label="Calls today" value={overview.callsToday.toLocaleString()} />
        <Stat label="Messages today" value={overview.messagesToday.toLocaleString()} />
        <Stat label="Failed webhooks" value={overview.failedWebhooks} hint="last 24h" />
        <Stat label="MTD spend" value={`$${overview.mtdSpend.toFixed(2)}`} hint="simulated" />
        <Stat label="Balance" value={`$${overview.balance.toFixed(2)}`} hint="simulated" />
        <div className="rounded-lg border bg-surface px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhook</div>
            <div className="mt-1.5 text-sm font-medium">Configure</div>
          </div>
          <Link to="/webhooks" className="rounded-md border p-1.5 hover:bg-muted"><Webhook className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-surface p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Usage trend</h2>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={usageTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="calls" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="messages" stroke="var(--color-chart-2)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Recent messages</h2>
          <div className="space-y-3">
            {conversations.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{c.contactName}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.lastMessage}</div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">{c.lastActivity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-surface">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent calls</h2>
          <Link to="/calls" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">ID</th>
                <th className="px-4 py-2.5 text-left font-medium">Direction</th>
                <th className="px-4 py-2.5 text-left font-medium">From → To</th>
                <th className="px-4 py-2.5 text-left font-medium">Agent</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Duration</th>
                <th className="px-4 py-2.5 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2.5"><Mono>{c.id}</Mono></td>
                  <td className="px-4 py-2.5 capitalize">{c.direction}</td>
                  <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{c.from} → {c.to}</Mono></td>
                  <td className="px-4 py-2.5">{nameFor(c.agentId)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-2.5 tabular-nums">{c.duration}s</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">${c.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
