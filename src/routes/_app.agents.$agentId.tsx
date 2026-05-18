import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Power, Save } from "lucide-react";
import { PageHeader } from "@/components/vukho/PageHeader";
import { StatusBadge } from "@/components/vukho/StatusBadge";
import { Mono } from "@/components/vukho/Mono";
import { Stat } from "@/components/vukho/Stat";
import { InlineTabs } from "@/components/vukho/Tabs";
import { EmptyState } from "@/components/vukho/EmptyState";
import { Banner } from "@/components/vukho/Banner";
import { BackLink } from "@/components/vukho/BackLink";
import { DataTable as StandardDataTable } from "@/components/vukho/DataTable";
import { VukhoApiError, formatApiError } from "@/lib/api/client";
import type { CallListItem } from "@/lib/api/calls";
import type { ConversationListItem } from "@/lib/api/messages";
import type { NumberListItem } from "@/lib/api/numbers";
import {
  disableBackendAgent,
  getBackendAgent,
  getBackendAgentSummary,
  updateBackendAgent,
  type AgentSummary,
  type AgentListItem,
  type BackendAgentMode,
} from "@/lib/api/agents";

export const Route = createFileRoute("/_app/agents/$agentId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "config" ? "config" : undefined,
  }),
  component: AgentDetail,
  head: () => ({ meta: [{ title: "Agent — Vukho" }] }),
});

function AgentDetail() {
  const { agentId } = Route.useParams();
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState(search.tab ?? "overview");
  const [agent, setAgent] = useState<AgentListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [numbers, setNumbers] = useState<NumberListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [agentSummary, setAgentSummary] = useState<AgentSummary | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [isRelatedLoading, setIsRelatedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getBackendAgent(agentId)
      .then((response) => {
        if (!cancelled) {
          setAgent(response.data);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load agent.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    let cancelled = false;
    setIsRelatedLoading(true);
    setRelatedError(null);

    getBackendAgentSummary(agentId)
      .then((response) => {
        if (!cancelled) {
          setAgent(response.data.agent);
          setNumbers(response.data.numbers);
          setConversations(response.data.recentConversations);
          setCalls(response.data.recentCalls);
          setMessageCount(response.data.counts.messages);
          setAgentSummary(response.data);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setRelatedError(
            caught instanceof VukhoApiError
              ? formatApiError(caught)
              : "Could not load agent activity.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRelatedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (search.tab === "config") {
      setActiveTab("config");
    }
  }, [search.tab]);

  async function saveAgent(input: AgentFormState) {
    if (!agent) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await updateBackendAgent(agent.id, {
        name: input.name,
        description: input.description || undefined,
        mode: input.mode,
        voice: input.voice || undefined,
        beginMessage: input.beginMessage || undefined,
        systemPrompt: input.systemPrompt || undefined,
        webhookUrl: input.webhookUrl || undefined,
        transferNumber: input.transferNumber || undefined,
        voicemailMessage: input.voicemailMessage || undefined,
      });
      setAgent(response.data);
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not save agent.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function disableAgent() {
    if (!agent || !window.confirm(`Disable ${agent.name}?`)) {
      return;
    }

    setIsDisabling(true);
    setError(null);
    try {
      const response = await disableBackendAgent(agent.id);
      setAgent(response.data);
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not disable agent.",
      );
    } finally {
      setIsDisabling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">
        Loading agent...
      </div>
    );
  }

  if (!agent) {
    return <NotFound id={agentId} error={error} />;
  }

  return (
    <div>
      <BackLink to="/agents" label="Agents" />
      <PageHeader
        title={agent.name}
        description={agent.description || "No description"}
        actions={
          <>
            <button
              onClick={() => setActiveTab("config")}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> Update config
            </button>
            <button
              onClick={disableAgent}
              disabled={isDisabling || agent.status === "disabled"}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Power className="h-3.5 w-3.5" /> {isDisabling ? "Disabling..." : "Disable"}
            </button>
          </>
        }
      />
      {error && <Banner variant="error" message={error} className="mb-4" />}
      {relatedError && <Banner variant="error" message={relatedError} className="mb-4" />}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Mono>{agent.id}</Mono>
        <span>·</span>
        <span className="capitalize">Mode: {agent.mode}</span>
        <span>·</span>
        <StatusBadge status={agent.status} />
      </div>

      <InlineTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <AgentOverview
                agent={agent}
                numbers={numbers}
                conversations={conversations}
                calls={calls}
                messageCount={messageCount}
                summary={agentSummary}
                isLoading={isRelatedLoading}
              />
            ),
          },
          {
            id: "config",
            label: "Configuration",
            content: <AgentConfigForm agent={agent} isSaving={isSaving} onSave={saveAgent} />,
          },
          {
            id: "numbers",
            label: "Numbers",
            content: <AgentNumbers numbers={numbers} isLoading={isRelatedLoading} />,
          },
          {
            id: "conversations",
            label: "Conversations",
            content: (
              <AgentConversations conversations={conversations} isLoading={isRelatedLoading} />
            ),
          },
          {
            id: "calls",
            label: "Calls",
            content: <AgentCalls calls={calls} isLoading={isRelatedLoading} />,
          },
          {
            id: "debug",
            label: "Debug",
            content: <AgentDebug summary={agentSummary} isLoading={isRelatedLoading} />,
          },
        ]}
      />
    </div>
  );
}

function AgentOverview({
  agent,
  numbers,
  conversations,
  calls,
  messageCount,
  summary,
  isLoading,
}: {
  agent: AgentListItem;
  numbers: NumberListItem[];
  conversations: ConversationListItem[];
  calls: CallListItem[];
  messageCount: number;
  summary: AgentSummary | null;
  isLoading: boolean;
}) {
  const lastActivity = useMemo(() => {
    const values = [
      ...calls.map((call) => call.startedAt),
      ...conversations.map((conversation) => conversation.lastActivity),
      agent.lastActivity,
    ].filter(Boolean);

    return values[0] ?? agent.lastActivity;
  }, [agent.lastActivity, calls, conversations]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Numbers" value={isLoading ? "..." : numbers.length} />
        <Stat label="Calls" value={isLoading ? "..." : calls.length} />
        <Stat label="Messages" value={isLoading ? "..." : messageCount} />
        <Stat
          label="Usage cost"
          value={isLoading ? "..." : `$${Number(summary?.usage.totalCost ?? 0).toFixed(4)}`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat
          label="Conversations"
          value={isLoading ? "..." : (summary?.counts.conversations ?? conversations.length)}
        />
        <Stat
          label="Webhook failures"
          value={isLoading ? "..." : (summary?.counts.failedWebhookDeliveries ?? 0)}
        />
        <Stat
          label="Provider issues"
          value={isLoading ? "..." : (summary?.counts.providerIssues ?? 0)}
        />
        <Stat label="Usage events" value={isLoading ? "..." : (summary?.usage.eventCount ?? 0)} />
        <Stat
          label="Last activity"
          value={
            <span className="text-base font-medium">{isLoading ? "Loading..." : lastActivity}</span>
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentPanel
          title="Recent conversations"
          empty="No conversations for this agent yet."
          hasContent={conversations.length > 0}
        >
          {conversations.slice(0, 4).map((conversation) => (
            <Link
              key={conversation.id}
              to="/inbox"
              className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{conversation.contactId}</span>
                <span className="block text-xs text-muted-foreground">
                  {conversation.channel.toUpperCase()} · {conversation.lastActivity}
                </span>
              </span>
              <StatusBadge status={conversation.status} />
            </Link>
          ))}
        </RecentPanel>
        <RecentPanel
          title="Recent calls"
          empty="No calls for this agent yet."
          hasContent={calls.length > 0}
        >
          {calls.slice(0, 4).map((call) => (
            <Link
              key={call.id}
              to="/calls/$callId"
              params={{ callId: call.id }}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {call.direction === "outbound" ? call.to : call.from}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {call.direction} · {call.startedAt}
                </span>
              </span>
              <StatusBadge status={call.status} />
            </Link>
          ))}
        </RecentPanel>
      </div>
      <AgentTimeline summary={summary} isLoading={isLoading} />
      <div className="rounded-lg border bg-surface p-4">
        <h3 className="text-sm font-semibold">Runtime configuration</h3>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Voice" value={agent.voice || "Not set"} />
          <Info label="Webhook URL" value={agent.webhookUrl || "Not set"} mono />
          <Info label="Begin message" value={agent.beginMessage || "Not set"} />
          <Info label="System prompt" value={agent.systemPrompt || "Not set"} />
        </dl>
      </div>
    </div>
  );
}

function AgentTimeline({
  summary,
  isLoading,
}: {
  summary: AgentSummary | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingPanel label="Loading agent activity..." />;
  }

  const items = summary?.timeline ?? [];
  if (items.length === 0) {
    return (
      <RecentPanel
        title="Activity timeline"
        empty="No calls, messages, usage charges, or webhook deliveries for this agent yet."
        hasContent={false}
      >
        {null}
      </RecentPanel>
    );
  }

  return (
    <RecentPanel title="Activity timeline" empty="" hasContent>
      {items.slice(0, 8).map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {formatTimelineDate(item.occurredAt)} · {item.resourceId}
            </span>
          </span>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </RecentPanel>
  );
}

function AgentDebug({ summary, isLoading }: { summary: AgentSummary | null; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingPanel label="Loading agent debug data..." />;
  }

  if (!summary) {
    return (
      <EmptyState
        title="No debug data"
        description="Agent usage and webhook delivery diagnostics will appear here after activity."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Usage events" value={summary.usage.eventCount} />
        <Stat label="Usage cost" value={`$${Number(summary.usage.totalCost).toFixed(4)}`} />
        <Stat label="Webhook deliveries" value={summary.recentWebhookDeliveries.length} />
        <Stat label="Webhook failures" value={summary.counts.failedWebhookDeliveries} />
        <Stat label="Provider issues" value={summary.counts.providerIssues} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentPanel
          title="Provider issues"
          empty="No provider failures or warning callbacks for this agent."
          hasContent={summary.providerIssues.length > 0}
        >
          {summary.providerIssues.slice(0, 8).map((issue) => (
            <div
              key={issue.id}
              className="flex items-start justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {issue.provider} · {issue.resourceType}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {issue.code ? `${issue.code} · ` : ""}
                  {issue.message ?? issue.status ?? "Provider reported an issue"}
                </span>
                <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                  {issue.resourceId}
                </span>
              </span>
              <StatusBadge status={issue.status ?? "failed"} />
            </div>
          ))}
        </RecentPanel>
        <RecentPanel
          title="Recent usage"
          empty="No usage events for this agent yet."
          hasContent={summary.recentUsageEvents.length > 0}
        >
          {summary.recentUsageEvents.slice(0, 8).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {event.resourceType} · {event.channel}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {event.resourceId} · {event.occurredLabel}
                </span>
              </span>
              <span className="font-mono text-xs">${event.totalCost.toFixed(4)}</span>
            </div>
          ))}
        </RecentPanel>
        <RecentPanel
          title="Recent webhook deliveries"
          empty="No webhook deliveries for this agent yet."
          hasContent={summary.recentWebhookDeliveries.length > 0}
        >
          {summary.recentWebhookDeliveries.slice(0, 8).map((delivery) => (
            <div
              key={delivery.id}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{delivery.eventType}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {delivery.lastStatusCode ?? "no status"} ·{" "}
                  {delivery.lastError || delivery.updatedLabel}
                </span>
              </span>
              <StatusBadge status={delivery.status} />
            </div>
          ))}
        </RecentPanel>
      </div>
    </div>
  );
}

function RecentPanel({
  title,
  empty,
  hasContent,
  children,
}: {
  title: string;
  empty: string;
  hasContent: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface">
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      {hasContent ? (
        children
      ) : (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

function formatTimelineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AgentNumbers({ numbers, isLoading }: { numbers: NumberListItem[]; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingPanel label="Loading agent numbers..." />;
  }

  if (numbers.length === 0) {
    return (
      <EmptyState
        title="No numbers attached"
        description="Attach a Twilio-backed number to this agent from the Numbers page."
      />
    );
  }

  return (
    <DataTable
      headers={["Number", "Capabilities", "Status", "Provider", "Updated"]}
      rows={numbers.map((number) => ({
        key: number.id,
        cells: [
          <Link
            key="number"
            to="/numbers/$numberId"
            params={{ numberId: number.id }}
            className="font-mono text-sm hover:underline"
          >
            {number.number}
          </Link>,
          number.capabilities.join(", ").toUpperCase(),
          <StatusBadge key="status" status={number.status} />,
          number.provider,
          number.updatedAt,
        ],
      }))}
    />
  );
}

function AgentConversations({
  conversations,
  isLoading,
}: {
  conversations: ConversationListItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingPanel label="Loading agent conversations..." />;
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="SMS and voice interactions for this agent will appear here."
      />
    );
  }

  return (
    <DataTable
      headers={["Conversation", "Contact", "Channel", "Status", "Last activity"]}
      rows={conversations.map((conversation) => ({
        key: conversation.id,
        cells: [
          <Mono key="conversation">{conversation.id}</Mono>,
          <Mono key="contact">{conversation.contactId}</Mono>,
          conversation.channel.toUpperCase(),
          <StatusBadge key="status" status={conversation.status} />,
          conversation.lastActivity,
        ],
      }))}
    />
  );
}

function AgentCalls({ calls, isLoading }: { calls: CallListItem[]; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingPanel label="Loading agent calls..." />;
  }

  if (calls.length === 0) {
    return (
      <EmptyState
        title="No calls yet"
        description="Inbound and outbound calls for this agent will appear here."
      />
    );
  }

  return (
    <DataTable
      headers={["Call", "Direction", "From", "To", "Status", "Duration", "Started"]}
      rows={calls.map((call) => ({
        key: call.id,
        cells: [
          <Link
            key="call"
            to="/calls/$callId"
            params={{ callId: call.id }}
            className="font-mono text-sm hover:underline"
          >
            {call.id}
          </Link>,
          call.direction,
          <span key="from" className="font-mono text-xs">
            {call.from}
          </span>,
          <span key="to" className="font-mono text-xs">
            {call.to}
          </span>,
          <StatusBadge key="status" status={call.status} />,
          `${call.duration}s`,
          call.startedAt,
        ],
      }))}
    />
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  return (
    <StandardDataTable minWidth={760}>
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t hover:bg-muted/40">
              {row.cells.map((cell, index) => (
                <td key={index} className="px-4 py-3 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
    </StandardDataTable>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">{label}</div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

interface AgentFormState {
  name: string;
  description: string;
  mode: BackendAgentMode;
  voice: string;
  beginMessage: string;
  systemPrompt: string;
  transferNumber: string;
  voicemailMessage: string;
  webhookUrl: string;
}

function AgentConfigForm({
  agent,
  isSaving,
  onSave,
}: {
  agent: AgentListItem;
  isSaving: boolean;
  onSave: (input: AgentFormState) => void;
}) {
  const [form, setForm] = useState<AgentFormState>({
    name: agent.name,
    description: agent.description,
    mode: agent.mode,
    voice: agent.voice,
    beginMessage: agent.beginMessage,
    systemPrompt: agent.systemPrompt,
    transferNumber: agent.transferNumber ?? "",
    voicemailMessage: agent.voicemailMessage ?? "",
    webhookUrl: agent.webhookUrl ?? "",
  });

  useEffect(() => {
    setForm({
      name: agent.name,
      description: agent.description,
      mode: agent.mode,
      voice: agent.voice,
      beginMessage: agent.beginMessage,
      systemPrompt: agent.systemPrompt,
      transferNumber: agent.transferNumber ?? "",
      voicemailMessage: agent.voicemailMessage ?? "",
      webhookUrl: agent.webhookUrl ?? "",
    });
  }, [agent]);

  function setField<Key extends keyof AgentFormState>(key: Key, value: AgentFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <form className="max-w-2xl space-y-4" onSubmit={submit}>
      <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
      <Field
        label="Description"
        value={form.description}
        onChange={(value) => setField("description", value)}
      />
      <label className="block text-sm font-medium">
        Mode
        <select
          value={form.mode}
          onChange={(event) => setField("mode", event.target.value as BackendAgentMode)}
          className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm"
        >
          <option value="webhook">Webhook</option>
          <option value="hosted">Hosted</option>
          <option value="web">Web</option>
        </select>
      </label>
      <Field label="Voice" value={form.voice} onChange={(value) => setField("voice", value)} mono />
      <Field
        label="Begin message"
        value={form.beginMessage}
        onChange={(value) => setField("beginMessage", value)}
      />
      <Field
        label="Transfer number"
        value={form.transferNumber}
        onChange={(value) => setField("transferNumber", value)}
        mono
      />
      <Field
        label="Voicemail message"
        value={form.voicemailMessage}
        onChange={(value) => setField("voicemailMessage", value)}
      />
      <Field
        label="Webhook URL"
        value={form.webhookUrl}
        onChange={(value) => setField("webhookUrl", value)}
        mono
      />
      <label className="block text-sm font-medium">
        System prompt
        <textarea
          value={form.systemPrompt}
          onChange={(event) => setField("systemPrompt", event.target.value)}
          className="mt-1.5 h-32 w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm"
        />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSaving || !form.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function NotFound({ id, error }: { id: string; error: string | null }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface px-6 py-16 text-center">
      <h2 className="text-sm font-semibold">Agent not found</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {error ?? (
          <>
            No agent with id <span className="font-mono">{id}</span>.
          </>
        )}
      </p>
      <Link to="/agents" className="mt-3 inline-block text-xs underline">
        Back to agents
      </Link>
    </div>
  );
}
