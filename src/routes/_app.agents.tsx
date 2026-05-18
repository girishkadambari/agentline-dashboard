import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/vukho/PageHeader";
import { DataTable, type Column } from "@/components/vukho/DataTable";
import { StatusBadge } from "@/components/vukho/StatusBadge";
import { Mono } from "@/components/vukho/Mono";
import { EmptyState } from "@/components/vukho/EmptyState";
import { CopyButton } from "@/components/vukho/CopyButton";
import { Banner } from "@/components/vukho/Banner";
import {
  VukhoApiError,
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
  head: () => ({ meta: [{ title: "Agents — Vukho" }] }),
});

function Agents() {
  const { pathname } = useLocation();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "update" | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);

  function openCreateDrawer() {
    setSelectedAgent(null);
    setDrawerMode("create");
  }

  function openAgentDrawer(mode: "update", agent: AgentListItem) {
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
      setError(caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load agents.");
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
        <Banner variant="error" className="mb-3" message={error} onDismiss={() => setError(null)} />
      )}

      <AgentTable
        rows={rows}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<Bot className="h-5 w-5" />}
            title="No agents yet"
            description="Create an agent to start testing SMS, calls, webhooks, and outcomes."
            action={<button onClick={openCreateDrawer} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Create agent</button>}
          />
        }
        onUpdate={(agent) => openAgentDrawer("update", agent)}
      />

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
      />
    </div>
  );
}

function AgentTable({
  rows,
  isLoading,
  emptyState,
  onUpdate,
}: {
  rows: AgentListItem[];
  isLoading: boolean;
  emptyState: React.ReactNode;
  onUpdate: (agent: AgentListItem) => void;
}) {
  const navigate = useNavigate();
  const columns: Column<AgentListItem>[] = [
    {
      key: "name",
      label: "Name",
      width: 260,
      sortable: true,
      sortAccessor: (a) => a.name,
      render: (agent) => (
        <>
          <Link
            to="/agents/$agentId"
            params={{ agentId: agent.id }}
            onClick={(e) => e.stopPropagation()}
            className="block truncate font-medium hover:underline"
          >
            {agent.name}
          </Link>
          <div className="truncate text-xs text-muted-foreground">{agent.description || "No description"}</div>
        </>
      ),
    },
    {
      key: "id",
      label: "ID",
      width: 240,
      render: (agent) => (
        <div className="flex items-center gap-2">
          <Mono className="block truncate text-muted-foreground">{agent.id}</Mono>
          <CopyButton value={agent.id} label="Copy agent ID" className="shrink-0" />
        </div>
      ),
    },
    { key: "mode", label: "Mode", width: 110, sortable: true, sortAccessor: (a) => a.mode, render: (a) => <span className="rounded border px-1.5 py-0.5 text-xs font-medium capitalize">{a.mode}</span> },
    { key: "numbers", label: "Numbers", width: 90, align: "right", sortable: true, sortAccessor: (a) => a.numbers, cellClassName: "tabular-nums", render: (a) => a.numbers },
    { key: "calls", label: "Calls", width: 80, align: "right", sortable: true, sortAccessor: (a) => a.calls, cellClassName: "tabular-nums", render: (a) => a.calls },
    { key: "messages", label: "Messages", width: 100, align: "right", sortable: true, sortAccessor: (a) => a.messages, cellClassName: "tabular-nums", render: (a) => a.messages },
    { key: "lastActivity", label: "Last activity", width: 150, sortable: true, sortAccessor: (a) => a.lastActivity, render: (a) => <span className="text-muted-foreground">{a.lastActivity}</span> },
    { key: "status", label: "Status", width: 110, sortable: true, sortAccessor: (a) => a.status, render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      label: "",
      width: 170,
      align: "right",
      render: (agent) => (
        <div className="flex justify-end gap-1.5">
          <Link
            to="/agents/$agentId"
            params={{ agentId: agent.id }}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Eye className="h-3 w-3" /> View
          </Link>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onUpdate(agent);
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="h-3 w-3" /> Update
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<AgentListItem>
      minWidth={1180}
      data={rows}
      columns={columns}
      isLoading={isLoading}
      emptyState={emptyState}
      stickyHeader
      maxBodyHeight={620}
      pageSize={25}
      defaultSort={{ key: "lastActivity", dir: "desc" }}
      onRowClick={(agent) => navigate({ to: "/agents/$agentId", params: { agentId: agent.id } })}
    />
  );
}

function AgentDrawer({
  mode,
  agent,
  onOpenChange,
  onCreated,
  onUpdated,
}: {
  mode: "create" | "update" | null;
  agent: AgentListItem | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (agent: AgentListItem) => void;
  onUpdated: (agent: AgentListItem) => void;
}) {
  const isCreate = mode === "create";
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
      setBeginMessage("Hi, this is Vukho. How can I help?");
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
      setError(caught instanceof VukhoApiError ? formatApiError(caught) : "Could not save agent.");
    } finally {
      setIsSaving(false);
    }
  }

  const open = mode !== null;
  const title = isCreate ? "Create agent" : "Update agent";
  const descriptionText = isCreate
    ? "Create a backend agent that can later be assigned numbers, SMS, calls, and webhooks."
    : "Update the backend configuration for this agent.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{descriptionText}</SheetDescription>
        </SheetHeader>
        <form className="space-y-4" onSubmit={submit}>
          {error && <Banner variant="error" message={error} />}
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
      </SheetContent>
    </Sheet>
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
