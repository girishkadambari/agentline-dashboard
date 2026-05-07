import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { InlineTabs } from "@/components/agentline/Tabs";
import { getNumber } from "@/lib/api/numbers";
import { getAgent } from "@/lib/api/agents";
import { listCalls } from "@/lib/api/calls";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/numbers/$numberId")({
  component: NumberDetail,
  head: () => ({ meta: [{ title: "Number — AgentLine" }] }),
});

function NumberDetail() {
  const { numberId } = Route.useParams();
  const { data: n } = getNumber(numberId);
  if (!n) return <Empty id={numberId} />;
  const agent = n.agentId ? getAgent(n.agentId).data : null;
  const recentCalls = listCalls().data.filter((c) => c.from === n.number || c.to === n.number);

  return (
    <div>
      <Link to="/numbers" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Numbers</Link>
      <PageHeader
        title={n.number}
        description={`${n.country} · ${n.areaCode}`}
        actions={
          <>
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">{n.agentId ? "Detach" : "Attach to agent"}</button>
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">Release number</button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Mono>{n.id}</Mono><span>·</span>
        <span className="capitalize">Provider: {n.provider}</span><span>·</span>
        <StatusBadge status={n.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Capabilities" value={<span className="text-base font-medium uppercase">{n.capabilities.join(", ")}</span>} />
        <Stat label="Attached agent" value={<span className="text-base font-medium">{agent?.name ?? "—"}</span>} />
        <Stat label="Monthly cost" value={`$${n.monthlyCost.toFixed(2)}`} />
        <Stat label="Compliance" value={<span className="text-base font-medium">10DLC verified</span>} />
      </div>

      <div className="mt-6">
        <InlineTabs tabs={[
          { id: "activity", label: "Recent activity", content: (
            <div className="rounded-lg border bg-surface overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2 text-left font-medium">Call</th><th className="px-4 py-2 text-left font-medium">Direction</th><th className="px-4 py-2 text-left font-medium">Status</th><th className="px-4 py-2 text-left font-medium">Started</th></tr>
                </thead>
                <tbody>{recentCalls.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">No recent calls.</td></tr> : recentCalls.map((c) => (
                  <tr key={c.id} className="border-t"><td className="px-4 py-2"><Link to="/calls/$callId" params={{ callId: c.id }} className="hover:underline"><Mono>{c.id}</Mono></Link></td><td className="px-4 py-2 capitalize">{c.direction}</td><td className="px-4 py-2"><StatusBadge status={c.status} /></td><td className="px-4 py-2 text-muted-foreground">{c.startedAt}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) },
          { id: "provider", label: "Provider metadata", content: (
            <pre className="rounded-md border bg-foreground p-3 font-mono text-xs text-background overflow-x-auto">{JSON.stringify({ sid: "PNxxxxxxxxxxxxxxxx", trunk: "default", region: "us-west", e164: n.number }, null, 2)}</pre>
          ) },
        ]} />
      </div>
    </div>
  );
}

function Empty({ id }: { id: string }) {
  return <div className="rounded-lg border border-dashed bg-surface px-6 py-16 text-center"><h2 className="text-sm font-semibold">Number not found</h2><p className="mt-1 text-xs text-muted-foreground"><Mono>{id}</Mono></p><Link to="/numbers" className="mt-3 inline-block text-xs underline">Back to numbers</Link></div>;
}