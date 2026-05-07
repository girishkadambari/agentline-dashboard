import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { listWebhooks } from "@/lib/api/webhooks";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/webhooks")({
  component: Webhooks,
  head: () => ({ meta: [{ title: "Webhooks — AgentLine" }] }),
});

function Webhooks() {
  const webhooks = listWebhooks().data;
  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Endpoints that receive AgentLine event deliveries."
        actions={<button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><Plus className="h-3.5 w-3.5" />Create endpoint</button>}
      />
      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">URL</th>
              <th className="px-4 py-2.5 text-left font-medium">Events</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Last delivery</th>
              <th className="px-4 py-2.5 text-right font-medium">Failures</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((w) => (
              <tr key={w.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5"><Link to="/webhooks/$webhookId" params={{ webhookId: w.id }} className="hover:underline"><Mono>{w.url}</Mono></Link></td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {w.events.map((e) => <Mono key={e} className="rounded border px-1.5 py-0.5 text-[11px]">{e}</Mono>)}
                  </div>
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={w.status} /></td>
                <td className="px-4 py-2.5 text-muted-foreground">{w.lastDelivery}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{w.failureCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
