import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { agents } from "@/lib/mock/data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/agents")({
  component: Agents,
  head: () => ({ meta: [{ title: "Agents — AgentLine" }] }),
});

function Agents() {
  return (
    <div>
      <PageHeader
        title="Agents"
        description="AI phone agents in your workspace."
        actions={<button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><Plus className="h-3.5 w-3.5" />Create agent</button>}
      />
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
              {agents.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{a.name}</div>
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
