import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { getCall, callTimeline, callTranscript } from "@/lib/api/calls";
import { getAgent } from "@/lib/api/agents";
import { ArrowLeft, Phone, PhoneOff, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/calls/$callId")({
  component: CallDetail,
  head: () => ({ meta: [{ title: "Call — AgentLine" }] }),
});

function CallDetail() {
  const { callId } = Route.useParams();
  const { data: call } = getCall(callId);
  if (!call) return <div className="rounded-lg border border-dashed bg-surface px-6 py-16 text-center"><h2 className="text-sm font-semibold">Call not found</h2><Link to="/calls" className="mt-3 inline-block text-xs underline">Back to calls</Link></div>;

  const agent = getAgent(call.agentId).data;
  const timeline = callTimeline(call.id).data;
  const transcript = callTranscript(call.id).data;

  return (
    <div>
      <Link to="/calls" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Calls</Link>
      <PageHeader
        title={`${call.direction === "inbound" ? "Inbound" : "Outbound"} call`}
        description={<><Mono>{call.from}</Mono> → <Mono>{call.to}</Mono></>}
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Repeat className="h-3.5 w-3.5" /> Transfer</button>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"><PhoneOff className="h-3.5 w-3.5" /> End call</button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Mono>{call.id}</Mono><span>·</span>
        <Link to="/agents/$agentId" params={{ agentId: call.agentId }} className="hover:underline">{agent?.name ?? call.agentId}</Link><span>·</span>
        <StatusBadge status={call.status} /><span>·</span>
        <span>{call.startedAt}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Duration" value={`${call.duration}s`} />
        <Stat label="Outcome" value={<span className="text-base font-medium capitalize">{call.outcome.replace(/_/g, " ")}</span>} />
        <Stat label="Cost" value={`$${call.cost.toFixed(2)}`} />
        <Stat label="Direction" value={<span className="text-base font-medium capitalize">{call.direction}</span>} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Transcript</h3>
            <div className="rounded-lg border bg-surface divide-y">
              {transcript.map((t, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 text-sm">
                  <Mono className="w-12 shrink-0 text-muted-foreground">{t.at}</Mono>
                  <span className={`w-16 shrink-0 text-xs font-medium uppercase ${t.role === "agent" ? "text-info" : "text-muted-foreground"}`}>{t.role}</span>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Summary</h3>
            <div className="rounded-lg border bg-surface px-4 py-3 text-sm">User reported login issue. Agent sent password reset email. User confirmed resolution.</div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Structured outcome</h3>
            <pre className="rounded-md border bg-foreground p-3 font-mono text-xs text-background overflow-x-auto">{JSON.stringify({ resolved: true, category: "auth", followup_required: false }, null, 2)}</pre>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Recording</h3>
            <div className="flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> Recording placeholder · stored 30 days</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Lifecycle</h3>
            <div className="rounded-lg border bg-surface px-3 py-2 text-xs">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-2 border-b py-1.5 last:border-0">
                  <Mono className="w-20 text-muted-foreground">{t.at}</Mono>
                  <span className="font-medium">{t.event}</span>
                  {t.detail && <span className="text-muted-foreground">— {t.detail}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Webhook events</h3>
            <div className="rounded-md border bg-surface px-3 py-2 text-xs"><Mono>agent.call.ended</Mono> <span className="text-success">200 OK</span></div>
          </div>
          {call.status === "failed" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
              <div className="font-medium text-destructive">Failure reason</div>
              <div className="mt-1 text-muted-foreground">provider_error: upstream returned 503</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}