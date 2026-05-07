import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { listCalls } from "@/lib/api/calls";
import { listAgents } from "@/lib/api/agents";
import { PhoneOutgoing, PhoneIncoming } from "lucide-react";

export const Route = createFileRoute("/_app/calls")({
  component: Calls,
  head: () => ({ meta: [{ title: "Calls — AgentLine" }] }),
});

function Calls() {
  const calls = listCalls().data;
  const agents = listAgents().data;
  return (
    <div>
      <PageHeader
        title="Calls"
        description="All inbound and outbound calls handled by your agents."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><PhoneIncoming className="h-3.5 w-3.5" />Simulate inbound</button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><PhoneOutgoing className="h-3.5 w-3.5" />Start outbound</button>
          </>
        }
      />
      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">ID</th>
              <th className="px-4 py-2.5 text-left font-medium">Direction</th>
              <th className="px-4 py-2.5 text-left font-medium">From</th>
              <th className="px-4 py-2.5 text-left font-medium">To</th>
              <th className="px-4 py-2.5 text-left font-medium">Agent</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Duration</th>
              <th className="px-4 py-2.5 text-left font-medium">Outcome</th>
              <th className="px-4 py-2.5 text-left font-medium">Started</th>
              <th className="px-4 py-2.5 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5"><Link to="/calls/$callId" params={{ callId: c.id }} className="hover:underline"><Mono>{c.id}</Mono></Link></td>
                <td className="px-4 py-2.5 capitalize">{c.direction}</td>
                <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{c.from}</Mono></td>
                <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{c.to}</Mono></td>
                <td className="px-4 py-2.5">{agents.find(a => a.id === c.agentId)?.name}</td>
                <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.duration}s</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.outcome}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.startedAt}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">${c.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
