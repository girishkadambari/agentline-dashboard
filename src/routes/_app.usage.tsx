import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { usageEvents, usageTrend, agents } from "@/lib/mock/data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/usage")({
  component: Usage,
  head: () => ({ meta: [{ title: "Usage — AgentLine" }] }),
});

function Usage() {
  return (
    <div>
      <PageHeader title="Usage" description="Billable activity across agents and channels." />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded-md border bg-surface px-2.5 py-1.5 text-xs"><option>Last 7 days</option><option>Last 30 days</option></select>
        <select className="rounded-md border bg-surface px-2.5 py-1.5 text-xs"><option>All agents</option>{agents.map(a => <option key={a.id}>{a.name}</option>)}</select>
        <select className="rounded-md border bg-surface px-2.5 py-1.5 text-xs"><option>All channels</option><option>Voice</option><option>SMS</option></select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Daily volume</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={usageTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="calls" fill="var(--color-chart-1)" radius={[3,3,0,0]} />
                <Bar dataKey="messages" fill="var(--color-chart-2)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Cost by agent</h2>
          <div className="space-y-3">
            {agents.slice(0,4).map((a, i) => (
              <div key={a.id}>
                <div className="flex justify-between text-xs">
                  <span>{a.name}</span>
                  <span className="tabular-nums text-muted-foreground">${(120 - i * 28).toFixed(2)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${100 - i * 22}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-surface overflow-x-auto">
        <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Usage events</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Time</th>
              <th className="px-4 py-2.5 text-left font-medium">Agent</th>
              <th className="px-4 py-2.5 text-left font-medium">Resource</th>
              <th className="px-4 py-2.5 text-left font-medium">Channel</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 text-left font-medium">Unit</th>
              <th className="px-4 py-2.5 text-right font-medium">Unit $</th>
              <th className="px-4 py-2.5 text-right font-medium">Total $</th>
            </tr>
          </thead>
          <tbody>
            {usageEvents.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2.5 text-muted-foreground">{u.time}</td>
                <td className="px-4 py-2.5">{agents.find(a => a.id === u.agentId)?.name}</td>
                <td className="px-4 py-2.5"><span className="capitalize">{u.resourceType}</span> · <Mono className="text-muted-foreground">{u.resourceId}</Mono></td>
                <td className="px-4 py-2.5 capitalize text-muted-foreground">{u.channel}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{u.quantity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.unit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">${u.unitCost.toFixed(4)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">${u.totalCost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
