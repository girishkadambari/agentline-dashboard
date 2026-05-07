import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { InlineTabs } from "@/components/agentline/Tabs";
import { getAgent } from "@/lib/api/agents";
import { listNumbers } from "@/lib/api/numbers";
import { listCalls } from "@/lib/api/calls";
import { listConversations } from "@/lib/api/messages";
import { listUsageEvents } from "@/lib/api/usage";
import { listWebhooks } from "@/lib/api/webhooks";
import { ArrowLeft, MessageSquare, PhoneOutgoing, Power } from "lucide-react";

export const Route = createFileRoute("/_app/agents/$agentId")({
  component: AgentDetail,
  head: () => ({ meta: [{ title: "Agent — AgentLine" }] }),
});

function AgentDetail() {
  const { agentId } = Route.useParams();
  const { data: agent } = getAgent(agentId);
  if (!agent) throw notFound();

  const numbers = listNumbers().data.filter((n) => n.agentId === agent.id);
  const calls = listCalls({ agentId: agent.id }).data;
  const convos = listConversations({ agentId: agent.id }).data;
  const usage = listUsageEvents({ agentId: agent.id }).data;
  const webhooks = listWebhooks().data;

  return (
    <div>
      <Link to="/agents" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Agents</Link>
      <PageHeader
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><MessageSquare className="h-3.5 w-3.5" /> Test SMS</button>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"><PhoneOutgoing className="h-3.5 w-3.5" /> Test call</button>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"><Power className="h-3.5 w-3.5" /> Disable</button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Mono>{agent.id}</Mono>
        <span>·</span>
        <span className="capitalize">Mode: {agent.mode}</span>
        <span>·</span>
        <StatusBadge status={agent.status} />
      </div>

      <InlineTabs
        tabs={[
          { id: "overview", label: "Overview", content: (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Numbers" value={numbers.length} />
                <Stat label="Calls" value={agent.calls} />
                <Stat label="Messages" value={agent.messages} />
                <Stat label="Last activity" value={<span className="text-base font-medium">{agent.lastActivity}</span>} />
              </div>
              <Section title="Recent calls">
                <SimpleTable
                  head={["ID", "Direction", "Status", "Duration"]}
                  rows={calls.slice(0, 5).map((c) => [<Mono key="i">{c.id}</Mono>, c.direction, <StatusBadge key="s" status={c.status} />, `${c.duration}s`])}
                />
              </Section>
              <Section title="Recent messages">
                <SimpleTable
                  head={["Contact", "Last message", "Activity"]}
                  rows={convos.map((c) => [c.contactName, <span key="m" className="text-muted-foreground">{c.lastMessage}</span>, c.lastActivity])}
                />
              </Section>
              <Section title="Latest webhook events">
                <SimpleTable head={["Endpoint", "Events", "Status"]} rows={webhooks.map((w) => [<Mono key="u">{w.url}</Mono>, w.events.length + " events", <StatusBadge key="s" status={w.status} />])} />
              </Section>
            </div>
          ) },
          { id: "config", label: "Configuration", content: (
            <div className="max-w-2xl space-y-4">
              <Field label="Name" defaultValue={agent.name} />
              <Field label="Description" defaultValue={agent.description} />
              <Field label="Mode" defaultValue={agent.mode} mono />
              <Field label="Voice" defaultValue={agent.voice} mono />
              <Field label="Begin message" defaultValue={agent.beginMessage} />
              <Field label="Transfer number" defaultValue="+1 415 555 0000" mono />
              <Field label="Voicemail message" defaultValue="Please leave a message after the tone." />
              <Field label="Webhook URL" defaultValue={agent.webhookUrl ?? ""} mono />
              <div>
                <label className="block text-xs font-medium text-muted-foreground">System prompt</label>
                <textarea defaultValue={agent.systemPrompt} className="mt-1.5 h-32 w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Metadata (JSON)</label>
                <textarea defaultValue='{\n  "team": "support"\n}' className="mt-1.5 h-24 w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md border px-3 py-1.5 text-xs">Cancel</button>
                <button className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Save changes</button>
              </div>
            </div>
          ) },
          { id: "numbers", label: "Numbers", content: (
            <SimpleTable
              head={["Number", "Capabilities", "Provider", "Status", ""]}
              rows={numbers.map((n) => [
                <Mono key="n">{n.number}</Mono>,
                n.capabilities.join(", "),
                <span key="p" className="capitalize text-muted-foreground">{n.provider}</span>,
                <StatusBadge key="s" status={n.status} />,
                <button key="d" className="rounded border px-2 py-0.5 text-xs hover:bg-muted">Detach</button>,
              ])}
              empty="No numbers attached. Attach one from the Numbers page."
            />
          ) },
          { id: "convos", label: "Conversations", content: (
            <SimpleTable head={["Contact", "Last message", "Activity"]} rows={convos.map((c) => [c.contactName, c.lastMessage, c.lastActivity])} empty="No conversations yet." />
          ) },
          { id: "calls", label: "Calls", content: (
            <SimpleTable head={["ID", "Direction", "Status", "Outcome", "Duration"]} rows={calls.map((c) => [
              <Link key="i" to="/calls/$callId" params={{ callId: c.id }} className="hover:underline"><Mono>{c.id}</Mono></Link>,
              c.direction, <StatusBadge key="s" status={c.status} />, c.outcome, `${c.duration}s`,
            ])} empty="No calls yet." />
          ) },
          { id: "usage", label: "Usage", content: (
            <SimpleTable head={["Time", "Resource", "Channel", "Qty", "Total $"]} rows={usage.map((u) => [
              u.time, <Mono key="r">{u.resourceId}</Mono>, u.channel, u.quantity, `$${u.totalCost.toFixed(4)}`,
            ])} empty="No usage events." />
          ) },
          { id: "webhooks", label: "Webhooks", content: (
            <SimpleTable head={["URL", "Events", "Status"]} rows={webhooks.map((w) => [
              <Link key="u" to="/webhooks/$webhookId" params={{ webhookId: w.id }} className="hover:underline"><Mono>{w.url}</Mono></Link>,
              w.events.join(", "), <StatusBadge key="s" status={w.status} />,
            ])} />
          ) },
          { id: "logs", label: "Logs", content: (
            <div className="rounded-md border bg-foreground p-3 font-mono text-[12px] leading-relaxed text-background">
              {[
                "[10:55:01] agent.call.started call_e5f6",
                "[10:55:02] provider.connected twilio",
                "[10:55:43] agent.message.sent msg_2",
                "[10:55:48] webhook.delivered wh_01 (200, 142ms)",
              ].map((l) => <div key={l}>{l}</div>)}
            </div>
          ) },
        ]}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length && empty) return <div className="rounded-lg border border-dashed bg-surface px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="rounded-lg border bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              {r.map((cell, j) => <td key={j} className="px-4 py-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, defaultValue, mono }: { label: string; defaultValue: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <input defaultValue={defaultValue} className={`mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm ${mono ? "font-mono" : ""}`} />
    </div>
  );
}