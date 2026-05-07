import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox as InboxIcon, MessageSquarePlus, Send } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  listBackendConversationMessages,
  listBackendConversations,
  sendBackendMessage,
  simulateBackendInboundSms,
  type ConversationListItem,
  type MessageListItem,
} from "@/lib/api/messages";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/inbox")({
  component: Inbox,
  head: () => ({ meta: [{ title: "Inbox — AgentLine" }] }),
});

function Inbox() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"send" | "simulate" | null>(null);
  const threadRequestId = useRef(0);

  async function loadInbox(preferredConversationId = activeConversationId) {
    setIsLoading(true);
    setError(null);
    try {
      const [conversationResponse, agentResponse] = await Promise.all([
        listBackendConversations(),
        listBackendAgents(),
      ]);
      setConversations(conversationResponse.data);
      setAgents(agentResponse.data);

      const nextActive =
        preferredConversationId && conversationResponse.data.some((conversation) => conversation.id === preferredConversationId)
          ? preferredConversationId
          : conversationResponse.data[0]?.id ?? null;
      setActiveConversationId(nextActive);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load inbox.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadThread(conversationId: string) {
    const requestId = threadRequestId.current + 1;
    threadRequestId.current = requestId;
    setIsThreadLoading(true);
    setThreadError(null);
    try {
      const response = await listBackendConversationMessages(conversationId);
      if (threadRequestId.current !== requestId) {
        return;
      }
      setMessages(response.data);
    } catch (caught) {
      if (threadRequestId.current !== requestId) {
        return;
      }
      setMessages([]);
      setThreadError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load messages.");
    } finally {
      if (threadRequestId.current === requestId) {
        setIsThreadLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadInbox(null);
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      void loadThread(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const latestMessageByConversationId = useMemo(() => {
    const latest = new Map<string, MessageListItem>();
    for (const message of messages) {
      latest.set(message.conversationId, message);
    }
    return latest;
  }, [messages]);

  function openDrawer(mode: "send" | "simulate") {
    setDrawerMode(mode);
  }

  async function handleMessageCreated(message: MessageListItem) {
    await loadInbox(message.conversationId);
    await loadThread(message.conversationId);
    setDrawerMode(null);
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="SMS conversations across agents, numbers, contacts, and mock provider events."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => openDrawer("simulate")}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />Simulate inbound
            </button>
            <button
              onClick={() => openDrawer("send")}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />Send SMS
            </button>
          </div>
        }
      />

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="grid gap-3 md:grid-cols-[280px_1fr_280px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="h-5 w-5" />}
          title="No conversations yet"
          description="Send a mock SMS or simulate an inbound SMS from an agent with an active SMS-capable number."
          action={
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => openDrawer("simulate")} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">Simulate inbound</button>
              <button onClick={() => openDrawer("send")} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Send SMS</button>
            </div>
          }
        />
      ) : (
        <div className="grid h-[calc(100vh-220px)] grid-cols-1 overflow-hidden rounded-lg border bg-surface md:grid-cols-[300px_1fr_300px]">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            agentsById={agentsById}
            latestMessageByConversationId={latestMessageByConversationId}
            onSelect={setActiveConversationId}
          />
          <ThreadPanel
            conversation={activeConversation}
            messages={messages}
            agent={activeConversation ? agentsById.get(activeConversation.agentId) : undefined}
            isLoading={isThreadLoading}
            error={threadError}
            onSend={() => openDrawer("send")}
          />
          <DetailsPanel conversation={activeConversation} agent={activeConversation ? agentsById.get(activeConversation.agentId) : undefined} />
        </div>
      )}

      <MessageDrawer
        mode={drawerMode}
        open={drawerMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerMode(null);
          }
        }}
        agents={agents}
        onCreated={handleMessageCreated}
      />
    </div>
  );
}

function ConversationList({
  conversations,
  activeConversationId,
  agentsById,
  latestMessageByConversationId,
  onSelect,
}: {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  agentsById: Map<string, AgentListItem>;
  latestMessageByConversationId: Map<string, MessageListItem>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-y-auto border-r">
      {conversations.map((conversation) => {
        const latest = latestMessageByConversationId.get(conversation.id);
        const agent = agentsById.get(conversation.agentId);

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "flex w-full flex-col gap-1 border-b px-3 py-3 text-left hover:bg-muted/40",
              activeConversationId === conversation.id && "bg-muted/60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium">{agent?.name ?? "Unknown agent"}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{conversation.lastActivity}</span>
            </div>
            <Mono className="truncate text-[11px] text-muted-foreground">{conversation.contactId}</Mono>
            <span className="truncate text-xs text-muted-foreground">
              {latest?.body ?? `${conversation.channel.toUpperCase()} conversation`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThreadPanel({
  conversation,
  messages,
  agent,
  isLoading,
  error,
  onSend,
}: {
  conversation: ConversationListItem | null;
  messages: MessageListItem[];
  agent?: AgentListItem;
  isLoading: boolean;
  error: string | null;
  onSend: () => void;
}) {
  if (!conversation) {
    return <div className="flex min-w-0 items-center justify-center p-6 text-sm text-muted-foreground">Select a conversation.</div>;
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{agent?.name ?? "Unknown agent"}</div>
            <Mono className="truncate text-xs text-muted-foreground">{conversation.contactId}</Mono>
          </div>
          <StatusBadge status={conversation.status} />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No messages in this conversation yet.</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-lg border px-3 py-2 text-sm", message.direction === "outbound" ? "bg-muted" : "bg-surface")}>
                <div className="whitespace-pre-wrap">{message.body}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {message.status} · {message.timestamp}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-3">
        <button
          onClick={onSend}
          className="flex w-full items-center justify-between rounded-md border bg-surface px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/40"
        >
          <span>Send SMS from any backend agent...</span>
          <Send className="h-3.5 w-3.5" />
        </button>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Backend requires a recipient phone number, so sending opens a validated drawer.
        </div>
      </div>
    </div>
  );
}

function DetailsPanel({
  conversation,
  agent,
}: {
  conversation: ConversationListItem | null;
  agent?: AgentListItem;
}) {
  return (
    <div className="hidden border-l p-4 text-sm md:block">
      {conversation ? (
        <>
          <Detail label="Conversation ID" value={conversation.id} mono />
          <Detail label="Contact ID" value={conversation.contactId} mono />
          <Detail label="Agent" value={agent?.name ?? conversation.agentId} />
          <Detail label="Channel" value={conversation.channel.toUpperCase()} />
          <Detail label="Status" value={conversation.status} />
          <Detail label="Last activity" value={conversation.lastActivity} />
        </>
      ) : (
        <div className="text-muted-foreground">No conversation selected.</div>
      )}
    </div>
  );
}

function MessageDrawer({
  mode,
  open,
  onOpenChange,
  agents,
  onCreated,
}: {
  mode: "send" | "simulate" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentListItem[];
  onCreated: (message: MessageListItem) => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [phone, setPhone] = useState(mode === "simulate" ? "+14155550123" : "+14155550123");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAgentId((current) => current || agents[0]?.id || "");
      setPhone("+14155550123");
      setBody(mode === "simulate" ? "Can you help me reschedule my appointment?" : "Hi, this is your AgentLine assistant.");
      setError(null);
    }
  }, [agents, mode, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!agentId) {
      setError("Choose an agent.");
      return;
    }

    if (!phone.trim()) {
      setError(mode === "simulate" ? "From number is required." : "Recipient number is required.");
      return;
    }

    if (!body.trim()) {
      setError("Message body is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response =
        mode === "simulate"
          ? await simulateBackendInboundSms({ agentId, from: phone.trim(), body: body.trim() })
          : await sendBackendMessage({ agentId, to: phone.trim(), body: body.trim() });
      onCreated(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not create message.");
    } finally {
      setIsSaving(false);
    }
  }

  const title = mode === "simulate" ? "Simulate inbound SMS" : "Send outbound SMS";
  const description =
    mode === "simulate"
      ? "Create a mock inbound message as if a contact texted an attached AgentLine number."
      : "Send a mock outbound SMS through an agent with an active SMS-capable number.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error && <div className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
          <label className="block text-sm font-medium">
            Agent
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
              <option value="">Choose agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {mode === "simulate" ? "From number" : "Recipient number"}
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono" />
          </label>
          <label className="block text-sm font-medium">
            Message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm" />
          </label>
          <SheetFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "Saving..." : mode === "simulate" ? "Simulate SMS" : "Send SMS"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {mono ? <Mono className="mt-1 block break-all text-xs text-muted-foreground">{value}</Mono> : <div className="mt-1 font-medium">{value}</div>}
    </div>
  );
}
