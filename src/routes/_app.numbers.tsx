import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { listNumbers } from "@/lib/api/numbers";
import { listAgents } from "@/lib/api/agents";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/numbers")({
  component: Numbers,
  head: () => ({ meta: [{ title: "Numbers — AgentLine" }] }),
});

function Numbers() {
  const numbers = listNumbers().data;
  const agents = listAgents().data;
  return (
    <div>
      <PageHeader
        title="Numbers"
        description="Phone numbers attached to your agents."
        actions={<button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><Plus className="h-3.5 w-3.5" />Provision number</button>}
      />
      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Phone</th>
              <th className="px-4 py-2.5 text-left font-medium">Country</th>
              <th className="px-4 py-2.5 text-left font-medium">Capabilities</th>
              <th className="px-4 py-2.5 text-left font-medium">Provider</th>
              <th className="px-4 py-2.5 text-left font-medium">Agent</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n) => {
              const agent = agents.find((a) => a.id === n.agentId);
              return (
                <tr key={n.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5"><Link to="/numbers/$numberId" params={{ numberId: n.id }} className="hover:underline"><Mono>{n.number}</Mono></Link></td>
                  <td className="px-4 py-2.5">{n.country} · {n.areaCode}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {n.capabilities.map((c) => <span key={c} className="rounded border px-1.5 py-0.5 text-[11px] uppercase">{c}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{n.provider}</td>
                  <td className="px-4 py-2.5">{agent?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">${n.monthlyCost.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
