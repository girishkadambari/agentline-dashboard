import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Power, Save } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { InlineTabs } from "@/components/agentline/Tabs";
import { EmptyState } from "@/components/agentline/EmptyState";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  disableBackendAgent,
  getBackendAgent,
  updateBackendAgent,
  type AgentListItem,
  type BackendAgentMode,
} from "@/lib/api/agents";

export const Route = createFileRoute("/_app/agents/$agentId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "config" ? "config" : undefined,
  }),
  component: AgentDetail,
  head: () => ({ meta: [{ title: "Agent — AgentLine" }] }),
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
          setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load agent.");
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
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save agent.");
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
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not disable agent.");
    } finally {
      setIsDisabling(false);
    }
  }

  if (isLoading) {
    return <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">Loading agent...</div>;
  }

  if (!agent) {
    return <NotFound id={agentId} error={error} />;
  }

  return (
    <div>
      <Link to="/agents" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Agents</Link>
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
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
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
          { id: "overview", label: "Overview", content: <AgentOverview agent={agent} /> },
          { id: "config", label: "Configuration", content: <AgentConfigForm agent={agent} isSaving={isSaving} onSave={saveAgent} /> },
          { id: "numbers", label: "Numbers", content: <EmptyState title="Numbers are managed from the Numbers page" description="Attach real provider-backed numbers to this agent from Numbers." /> },
          { id: "conversations", label: "Conversations", content: <EmptyState title="No conversations loaded yet" description="Inbox integration is tracked after Agents and Numbers." /> },
          { id: "calls", label: "Calls", content: <EmptyState title="No calls loaded yet" description="Call history will use backend call records in a later phase." /> },
        ]}
      />
    </div>
  );
}

function AgentOverview({ agent }: { agent: AgentListItem }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Numbers" value={agent.numbers} />
        <Stat label="Calls" value={agent.calls} />
        <Stat label="Messages" value={agent.messages} />
        <Stat label="Last activity" value={<span className="text-base font-medium">{agent.lastActivity}</span>} />
      </div>
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
      <Field label="Description" value={form.description} onChange={(value) => setField("description", value)} />
      <label className="block text-sm font-medium">
        Mode
        <select value={form.mode} onChange={(event) => setField("mode", event.target.value as BackendAgentMode)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
          <option value="webhook">Webhook</option>
          <option value="hosted">Hosted</option>
          <option value="web">Web</option>
        </select>
      </label>
      <Field label="Voice" value={form.voice} onChange={(value) => setField("voice", value)} mono />
      <Field label="Begin message" value={form.beginMessage} onChange={(value) => setField("beginMessage", value)} />
      <Field label="Transfer number" value={form.transferNumber} onChange={(value) => setField("transferNumber", value)} mono />
      <Field label="Voicemail message" value={form.voicemailMessage} onChange={(value) => setField("voicemailMessage", value)} />
      <Field label="Webhook URL" value={form.webhookUrl} onChange={(value) => setField("webhookUrl", value)} mono />
      <label className="block text-sm font-medium">
        System prompt
        <textarea value={form.systemPrompt} onChange={(event) => setField("systemPrompt", event.target.value)} className="mt-1.5 h-32 w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm" />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={isSaving || !form.name.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm ${mono ? "font-mono" : ""}`} />
    </label>
  );
}

function NotFound({ id, error }: { id: string; error: string | null }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface px-6 py-16 text-center">
      <h2 className="text-sm font-semibold">Agent not found</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {error ?? <>No agent with id <span className="font-mono">{id}</span>.</>}
      </p>
      <Link to="/agents" className="mt-3 inline-block text-xs underline">Back to agents</Link>
    </div>
  );
}
