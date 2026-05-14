import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox as InboxIcon, MessageSquare, Search, Send, User } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { CopyButton } from "@/components/agentline/CopyButton";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  listBackendConversationMessages,
  listBackendConversations,
  sendBackendMessage,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const agent = agentsById.get(conversation.agentId);
      return (
        conversation.contactId.toLowerCase().includes(query) ||
        (agent?.name.toLowerCase().includes(query) ?? false) ||
        conversation.id.toLowerCase().includes(query)
      );
    });
  }, [conversations, search, agentsById]);

  async function handleMessageCreated(message: MessageListItem) {
    await loadInbox(message.conversationId);
    await loadThread(message.conversationId);
    setDrawerOpen(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operate"
        title="Inbox"
        description="A live communication console for every SMS thread your agents and numbers are part of."
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm transition-opacity hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" /> Send SMS
          </button>
        }
      />

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border/80 bg-surface p-4">
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
          description="Send your first SMS from any agent, or text one of your provisioned numbers to open a thread."
          action={
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" /> Send SMS
            </button>
          }
        />
      ) : (
        <div className="grid h-[calc(100svh-240px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-xl border border-border/80 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.02)] md:grid-cols-[320px_minmax(0,1fr)_320px] [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden">
          <ConversationList
            conversations={filteredConversations}
            totalCount={conversations.length}
            search={search}
            onSearchChange={setSearch}
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
            onSend={() => setDrawerOpen(true)}
          />
          <DetailsPanel conversation={activeConversation} agent={activeConversation ? agentsById.get(activeConversation.agentId) : undefined} />
        </div>
      )}

      <MessageDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerOpen(false);
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
  totalCount,
  search,
  onSearchChange,
  activeConversationId,
  agentsById,
  latestMessageByConversationId,
  onSelect,
}: {
  conversations: ConversationListItem[];
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  activeConversationId: string | null;
  agentsById: Map<string, AgentListItem>;
  latestMessageByConversationId: Map<string, MessageListItem>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-r border-border/70">
      <div className="border-b border-border/70 bg-muted/30 px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search agent, contact, or ID"
            className="w-full rounded-md border border-border/80 bg-surface py-1.5 pl-8 pr-2 text-[12.5px] outline-none ring-ring placeholder:text-muted-foreground/70 focus:ring-2"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
          </span>
          {search && conversations.length !== totalCount && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">
            No threads match your search.
          </div>
        ) : (
          conversations.map((conversation) => {
            const latest = latestMessageByConversationId.get(conversation.id);
            const agent = agentsById.get(conversation.agentId);
            const active = activeConversationId === conversation.id;
            const initial = (agent?.name ?? "?").charAt(0).toUpperCase();
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "relative flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-3 text-left transition-colors",
                  active ? "bg-accent/5" : "hover:bg-muted/40",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-[2px] rounded-r-full bg-accent" />
                )}
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-[11px] font-semibold text-foreground/80 ring-1 ring-inset ring-border/70">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                      {agent?.name ?? "Unknown agent"}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">
                      {conversation.lastActivity}
                    </span>
                  </div>
                  <Mono className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {conversation.contactId}
                  </Mono>
                  <span className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">
                    {latest?.body ?? `${conversation.channel.toUpperCase()} conversation`}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
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
    return (
      <div className="flex min-w-0 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-5 w-5 opacity-50" />
        Select a conversation to open the thread.
      </div>
    );
  }

  const groups = groupMessagesByDay(messages);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-[12px] font-semibold text-foreground/80 ring-1 ring-inset ring-border/70">
            {(agent?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">{agent?.name ?? "Unknown agent"}</div>
            <div className="flex items-center gap-1.5">
              <Mono className="truncate text-[11px] text-muted-foreground">{conversation.contactId}</Mono>
              <CopyButton value={conversation.contactId} label="Copy contact ID" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
            {conversation.channel}
          </span>
          <StatusBadge status={conversation.status} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[oklch(0.98_0.003_90)] px-4 py-5">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages in this conversation yet.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="space-y-2.5">
                {group.messages.map((message, index) => {
                  const previous = group.messages[index - 1];
                  const continued = previous?.direction === message.direction;
                  const outbound = message.direction === "outbound";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", outbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)]",
                          outbound
                            ? "rounded-br-md bg-foreground text-background"
                            : "rounded-bl-md border border-border/70 bg-surface text-foreground",
                          continued && (outbound ? "rounded-tr-md" : "rounded-tl-md"),
                        )}
                      >
                        <div className="whitespace-pre-wrap">{message.body}</div>
                        <div
                          className={cn(
                            "mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide",
                            outbound ? "text-background/60" : "text-muted-foreground",
                          )}
                        >
                          <span>{message.timestamp}</span>
                          <span>·</span>
                          <span>{message.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border/70 bg-surface p-3">
        <button
          onClick={onSend}
          className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/80 bg-background px-3 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/40"
        >
          <span>Reply from any agent…</span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-[11.5px] font-medium text-background opacity-90 group-hover:opacity-100">
            <Send className="h-3 w-3" /> Send
          </span>
        </button>
        <div className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Validated drawer ensures a recipient number and an SMS-capable agent.
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
    <div className="hidden min-h-0 flex-col border-l border-border/70 bg-surface md:flex">
      {conversation ? (
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          <div className="mb-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Status
            </div>
            <div className="mt-2"><StatusBadge status={conversation.status} /></div>
          </div>
          <div className="mb-5 space-y-3">
            <DetailRow label="Conversation ID" value={conversation.id} mono copyable />
            <DetailRow label="Contact ID" value={conversation.contactId} mono copyable />
          </div>
          <div className="mb-5 space-y-3 border-t border-border/60 pt-5">
            <DetailRow label="Agent" value={agent?.name ?? conversation.agentId} icon={<User className="h-3 w-3" />} />
            <DetailRow label="Channel" value={conversation.channel.toUpperCase()} />
            <DetailRow label="Last activity" value={conversation.lastActivity} />
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm text-muted-foreground">No conversation selected.</div>
      )}
    </div>
  );
}

function MessageDrawer({
  open,
  onOpenChange,
  agents,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentListItem[];
  onCreated: (message: MessageListItem) => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAgentId((current) => current || agents[0]?.id || "");
      setPhone("");
      setBody("");
      setError(null);
    }
  }, [agents, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!agentId) {
      setError("Choose an agent.");
      return;
    }

    if (!phone.trim()) {
      setError("Recipient number is required.");
      return;
    }

    if (!body.trim()) {
      setError("Message body is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await sendBackendMessage({ agentId, to: phone.trim(), body: body.trim() });
      onCreated(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not create message.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Send outbound SMS</SheetTitle>
          <SheetDescription>Send a real provider-backed SMS through an agent with an active SMS-capable number.</SheetDescription>
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
            Recipient number
            <div className="mt-1.5">
              <PhoneInput value={phone} onChange={setPhone} placeholder="+19015550123" />
            </div>
          </label>
          <label className="block text-sm font-medium">
            Message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm" />
          </label>
          <SheetFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "Sending..." : "Send SMS"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  copyable = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-start gap-1.5">
        {icon && <span className="mt-1 text-muted-foreground">{icon}</span>}
        {mono ? (
          <Mono className="block break-all text-[12px] text-foreground/80">{value}</Mono>
        ) : (
          <div className="text-[13px] font-medium text-foreground">{value}</div>
        )}
        {copyable && <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />}
      </div>
    </div>
  );
}

type MessageGroup = { label: string; messages: MessageListItem[] };
function groupMessagesByDay(messages: MessageListItem[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const message of messages) {
    const label = formatDayLabel(message.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.messages.push(message);
    } else {
      groups.push({ label, messages: [message] });
    }
  }
  return groups;
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
