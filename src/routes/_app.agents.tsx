import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { listAgents } from "@/lib/api/agents";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/agents")({
  component: Agents,
  head: () => ({ meta: [{ title: "Agents — AgentLine" }] }),
});

function Agents() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const all = listAgents().data;
  const rows = all.filter(a => (status === "all" || a.status === status) && (a.name.toLowerCase().includes(q.toLowerCase()) || a.id.includes(q)));
  return (
    <div>
      <PageHeader
        title="Agents"
        description="AI phone agents in your workspace."
        actions={<button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><Plus className="h-3.5 w-3.5" />Create agent</button>}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" className="w-full rounded-md border bg-surface pl-7 pr-3 py-1.5 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border bg-surface px-2.5 py-1.5 text-sm">
          <option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="paused">Paused</option>
        </select>
      </div>
      <div className="rounded-lg border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">ID</th>
                <th className="px-4 py-2.5 text-left font-medium">Mode</th>
                <th className="px-4 py-2.5 text-right font-medium">Numbers</th>
                <th className="px-4 py-2.5 text-right font-medium">Calls</th>
                <th className="px-4 py-2.5 text-right font-medium">Messages</th>
                <th className="px-4 py-2.5 text-left font-medium">Last activity</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No agents match.</td></tr>
              )}
              {rows.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link to="/agents/$agentId" params={{ agentId: a.id }} className="font-medium hover:underline">{a.name}</Link>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </td>
                  <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{a.id}</Mono></td>
                  <td className="px-4 py-2.5"><span className="rounded border px-1.5 py-0.5 text-xs font-medium capitalize">{a.mode}</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.numbers}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.calls}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.messages}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.lastActivity}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
