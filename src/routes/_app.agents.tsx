import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import {
  AgentLineApiError,
  formatApiError,
} from "@/lib/api/client";
import {
  createAgentRecord,
  listBackendAgents,
  updateBackendAgent,
  type AgentListItem,
  type BackendAgentMode,
} from "@/lib/api/agents";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bot, Eye, Pencil, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_app/agents")({
  component: Agents,
  head: () => ({ meta: [{ title: "Agents — AgentLine" }] }),
});

function Agents() {
  const { pathname } = useLocation();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "view" | "update" | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);

  function openCreateDrawer() {
    setSelectedAgent(null);
    setDrawerMode("create");
  }

  function openAgentDrawer(mode: "view" | "update", agent: AgentListItem) {
    setSelectedAgent(agent);
    setDrawerMode(mode);
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedAgent(null);
  }

  async function loadAgents() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listBackendAgents();
      setAgents(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load agents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase();

    return agents.filter((agent) => {
      const matchesStatus = status === "all" || agent.status === status;
      const matchesSearch =
        !search ||
        agent.name.toLowerCase().includes(search) ||
        agent.id.toLowerCase().includes(search) ||
        agent.description.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [agents, q, status]);

  if (pathname !== "/agents") {
    return <Outlet />;
  }

  return (
    <div>
      <PageHeader
        title="Agents"
        description="AI phone agents in your workspace."
        actions={
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />Create agent
          </button>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search agents..."
            className="w-full rounded-md border bg-surface py-1.5 pl-7 pr-3 text-sm"
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border bg-surface px-2.5 py-1.5 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <AgentTableSkeleton />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-5 w-5" />}
          title="No agents yet"
          description="Create an agent to start testing SMS, calls, webhooks, and outcomes."
          action={<button onClick={openCreateDrawer} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Create agent</button>}
        />
      ) : (
        <AgentTable rows={rows} onView={(agent) => openAgentDrawer("view", agent)} onUpdate={(agent) => openAgentDrawer("update", agent)} />
      )}

      <AgentDrawer
        mode={drawerMode}
        agent={selectedAgent}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        onCreated={(agent) => {
          setAgents((current) => [agent, ...current]);
          closeDrawer();
        }}
        onUpdated={(agent) => {
          setAgents((current) => current.map((item) => (item.id === agent.id ? agent : item)));
          closeDrawer();
        }}
        onSwitchToUpdate={() => setDrawerMode("update")}
      />
    </div>
  );
}

function AgentTable({
  rows,
  onView,
  onUpdate,
}: {
  rows: AgentListItem[];
  onView: (agent: AgentListItem) => void;
  onUpdate: (agent: AgentListItem) => void;
}) {
  return (
    <div className="rounded-lg border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">ID</th>
              <th className="px-4 py-2.5 text-left font-medium">Mode</th>
              <th className="px-4 py-2.5 text-right font-medium">Numbers</th>
              <th className="px-4 py-2.5 text-right font-medium">Calls</th>
              <th className="px-4 py-2.5 text-right font-medium">Messages</th>
              <th className="px-4 py-2.5 text-left font-medium">Last activity</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No agents match.</td></tr>
            )}
            {rows.map((agent) => (
              <tr key={agent.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <Link to="/agents/$agentId" params={{ agentId: agent.id }} className="font-medium hover:underline">{agent.name}</Link>
                  <div className="text-xs text-muted-foreground">{agent.description || "No description"}</div>
                </td>
                <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{agent.id}</Mono></td>
                <td className="px-4 py-2.5"><span className="rounded border px-1.5 py-0.5 text-xs font-medium capitalize">{agent.mode}</span></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{agent.numbers}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{agent.calls}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{agent.messages}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{agent.lastActivity}</td>
                <td className="px-4 py-2.5"><StatusBadge status={agent.status} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onView(agent)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                    <button
                      onClick={() => onUpdate(agent)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" /> Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentTableSkeleton() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function AgentDrawer({
  mode,
  agent,
  onOpenChange,
  onCreated,
  onUpdated,
  onSwitchToUpdate,
}: {
  mode: "create" | "view" | "update" | null;
  agent: AgentListItem | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (agent: AgentListItem) => void;
  onUpdated: (agent: AgentListItem) => void;
  onSwitchToUpdate: () => void;
}) {
  const isCreate = mode === "create";
  const isView = mode === "view";
  const isUpdate = mode === "update";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentMode, setAgentMode] = useState<BackendAgentMode>("webhook");
  const [voice, setVoice] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [beginMessage, setBeginMessage] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setError(null);
    if (isCreate) {
      setName("Support Agent");
      setDescription("");
      setAgentMode("webhook");
      setVoice("alloy");
      setSystemPrompt("You are a concise phone agent.");
      setBeginMessage("Hi, this is AgentLine. How can I help?");
      setWebhookUrl("");
      return;
    }

    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setAgentMode(agent.mode);
      setVoice(agent.voice);
      setSystemPrompt(agent.systemPrompt);
      setBeginMessage(agent.beginMessage);
      setWebhookUrl(agent.webhookUrl ?? "");
    }
  }, [agent, isCreate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Agent name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        mode: agentMode,
        voice: voice.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        beginMessage: beginMessage.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
      };

      if (isCreate) {
        const response = await createAgentRecord(payload);
        onCreated(response.data);
      } else if (isUpdate && agent) {
        const response = await updateBackendAgent(agent.id, payload);
        onUpdated(response.data);
      }
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save agent.");
    } finally {
      setIsSaving(false);
    }
  }

  const open = mode !== null;
  const title = isCreate ? "Create agent" : isView ? "View agent" : "Update agent";
  const descriptionText = isCreate
    ? "Create a backend agent that can later be assigned numbers, SMS, calls, and webhooks."
    : isView
      ? "Inspect the current backend configuration for this agent."
      : "Update the backend configuration for this agent.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{descriptionText}</SheetDescription>
        </SheetHeader>
        {isView && agent ? (
          <AgentView agent={agent} onClose={() => onOpenChange(false)} onUpdate={onSwitchToUpdate} />
        ) : (
        <form className="space-y-4" onSubmit={submit}>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Description" value={description} onChange={setDescription} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Mode
              <select value={agentMode} onChange={(event) => setAgentMode(event.target.value as BackendAgentMode)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
                <option value="webhook">Webhook</option>
                <option value="hosted">Hosted</option>
                <option value="web">Web</option>
              </select>
            </label>
            <Field label="Voice" value={voice} onChange={setVoice} mono />
          </div>
          <Field label="Begin message" value={beginMessage} onChange={setBeginMessage} />
          <Field label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} mono />
          <label className="block text-sm font-medium">
            System prompt
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={4} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono" />
          </label>
          <SheetFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "Saving..." : isCreate ? "Create agent" : "Save changes"}
            </button>
          </SheetFooter>
        </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AgentView({
  agent,
  onClose,
  onUpdate,
}: {
  agent: AgentListItem;
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-lg border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{agent.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description || "No description"}</p>
          </div>
          <StatusBadge status={agent.status} />
        </div>
      </div>
      <dl className="grid gap-4 text-sm">
        <ReadOnlyField label="Agent ID" value={agent.id} mono />
        <ReadOnlyField label="Mode" value={agent.mode} />
        <ReadOnlyField label="Voice" value={agent.voice || "Not set"} mono />
        <ReadOnlyField label="Webhook URL" value={agent.webhookUrl || "Not set"} mono />
        <ReadOnlyField label="Begin message" value={agent.beginMessage || "Not set"} />
        <ReadOnlyField label="System prompt" value={agent.systemPrompt || "Not set"} />
        <ReadOnlyField label="Last activity" value={agent.lastActivity} />
      </dl>
      <SheetFooter>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Close</button>
        <button type="button" onClick={onUpdate} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90">Update</button>
      </SheetFooter>
    </div>
  );
}

function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
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
