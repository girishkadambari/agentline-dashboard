import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { agents } from "@/lib/mock/data";
import { useState } from "react";
import { PhoneOutgoing, PhoneIncoming, MessageSquare, Webhook } from "lucide-react";

export const Route = createFileRoute("/_app/playground")({
  component: Playground,
  head: () => ({ meta: [{ title: "Playground — AgentLine" }] }),
});

function Playground() {
  const [log, setLog] = useState<string[]>([
    "[ready] mock provider connected",
    "[ready] webhook worker idle",
  ]);
  const append = (line: string) => setLog((l) => [...l, `[${new Date().toLocaleTimeString()}] ${line}`]);

  return (
    <div>
      <PageHeader title="Playground" description="Test agents end-to-end without real telecom." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-surface p-4">
            <h2 className="text-sm font-semibold">Test setup</h2>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Agent</label>
            <select className="mt-1 w-full rounded-md border bg-surface px-2.5 py-1.5 text-sm">
              {agents.map((a) => <option key={a.id}>{a.name}</option>)}
            </select>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Mock number</label>
            <Mono className="mt-1 block rounded-md border bg-muted/40 px-2.5 py-1.5">+1 415 555 0123</Mono>
          </div>

          <div className="rounded-lg border bg-surface p-4">
            <h2 className="text-sm font-semibold">Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => append("call.outbound started → call_mk_a1")} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"><PhoneOutgoing className="h-3.5 w-3.5" />Outbound call</button>
              <button onClick={() => append("call.inbound simulated from +1 510 555 0144")} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"><PhoneIncoming className="h-3.5 w-3.5" />Inbound call</button>
              <button onClick={() => append("sms.outbound queued msg_mk_b2")} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"><MessageSquare className="h-3.5 w-3.5" />Send SMS</button>
              <button onClick={() => append("webhook.delivery → 200 OK in 142ms")} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"><Webhook className="h-3.5 w-3.5" />Trigger webhook</button>
              <button onClick={() => append("webhook.delivery → 502 Bad Gateway (retry queued)")} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted col-span-2 text-destructive">Simulate webhook failure</button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-foreground p-0 text-background overflow-hidden">
          <div className="flex items-center justify-between border-b border-background/10 px-3 py-2 text-xs">
            <span className="font-medium">Live event log</span>
            <button onClick={() => setLog([])} className="text-background/60 hover:text-background">Clear</button>
          </div>
          <pre className="max-h-[460px] overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
{log.map((l) => l + "\n").join("")}
          </pre>
        </div>
      </div>
    </div>
  );
}
