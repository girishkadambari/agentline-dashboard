import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { conversations, messages, agents } from "@/lib/mock/data";
import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inbox")({
  component: Inbox,
  head: () => ({ meta: [{ title: "Inbox — AgentLine" }] }),
});

function Inbox() {
  const [active, setActive] = useState(conversations[0].id);
  const conv = conversations.find((c) => c.id === active)!;
  const thread = messages.filter((m) => m.conversationId === active);
  const agent = agents.find((a) => a.id === conv.agentId);

  return (
    <div>
      <PageHeader title="Inbox" description="SMS and message conversations across all numbers." />
      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-0 overflow-hidden rounded-lg border bg-surface md:grid-cols-[280px_1fr_280px]">
        <div className="border-r overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn("flex w-full flex-col gap-0.5 border-b px-3 py-3 text-left hover:bg-muted/40", active === c.id && "bg-muted/60")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.contactName}</span>
                <span className="text-[11px] text-muted-foreground">{c.lastActivity}</span>
              </div>
              <Mono className="text-[11px] text-muted-foreground">{c.contact}</Mono>
              <span className="mt-0.5 truncate text-xs text-muted-foreground">{c.lastMessage}</span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">{conv.contactName}</div>
            <Mono className="text-xs text-muted-foreground">{conv.contact}</Mono>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {thread.map((m) => (
              <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-lg border px-3 py-2 text-sm", m.direction === "outbound" ? "bg-muted" : "bg-surface")}>
                  <div>{m.body}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{m.status} · {m.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2 rounded-md border bg-surface px-3 py-2">
              <input placeholder="Send SMS as agent…" className="flex-1 bg-transparent text-sm focus:outline-none" />
              <button className="rounded-md bg-foreground p-1.5 text-background"><Send className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">Mock mode — messages aren't actually sent.</div>
          </div>
        </div>

        <div className="hidden border-l p-4 text-sm md:block">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</div>
          <div className="mt-1 font-medium">{conv.contactName}</div>
          <Mono className="text-xs text-muted-foreground">{conv.contact}</Mono>
          <div className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</div>
          <div className="mt-1">{agent?.name}</div>
          <div className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Last webhook</div>
          <div className="mt-1"><Mono className="text-xs">agent.message.received</Mono></div>
        </div>
      </div>
    </div>
  );
}
