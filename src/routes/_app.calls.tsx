import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, PhoneOutgoing } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  listBackendCalls,
  startOutboundBackendCall,
  type CallListItem,
} from "@/lib/api/calls";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/calls")({
  component: Calls,
  head: () => ({ meta: [{ title: "Calls — AgentLine" }] }),
});

function Calls() {
  const { pathname } = useLocation();
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [callsResponse, agentsResponse] = await Promise.all([
        listBackendCalls(),
        listBackendAgents(),
      ]);
      setCalls(callsResponse.data);
      setAgents(agentsResponse.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load calls.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  if (pathname !== "/calls") {
    return <Outlet />;
  }

  return (
    <div>
      <PageHeader
        title="Calls"
        description="All inbound and outbound calls handled by your agents."
        actions={
          <button
            onClick={() => setStartOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            <PhoneOutgoing className="h-3.5 w-3.5" />Start outbound
          </button>
        }
      />

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />)}</div>
        </div>
      ) : calls.length === 0 ? (
        <EmptyState
          icon={<PhoneOutgoing className="h-5 w-5" />}
          title="No calls yet"
          description="Start a live provider-backed call from an agent with an attached voice-capable number."
          action={<button onClick={() => setStartOpen(true)} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Start outbound</button>}
        />
      ) : (
        <CallsTable calls={calls} agentsById={agentsById} />
      )}

      <StartCallDrawer
        open={startOpen}
        onOpenChange={setStartOpen}
        agents={agents}
        onCreated={(call) => {
          setCalls((current) => [call, ...current]);
          setStartOpen(false);
        }}
      />
    </div>
  );
}

function CallsTable({
  calls,
  agentsById,
}: {
  calls: CallListItem[];
  agentsById: Map<string, AgentListItem>;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-surface shadow-sm overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[260px] px-4 py-3 text-left font-medium">ID</th>
            <th className="w-[110px] px-4 py-3 text-left font-medium">Direction</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">From</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">To</th>
            <th className="w-[170px] px-4 py-3 text-left font-medium">Agent</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[100px] px-4 py-3 text-right font-medium">Duration</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Outcome</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Started</th>
            <th className="w-[90px] px-4 py-3 text-right font-medium">Cost</th>
            <th className="w-[110px] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr
              key={call.id}
              onClick={() => navigate({ to: "/calls/$callId", params: { callId: call.id } })}
              className="group cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/35"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link to="/calls/$callId" params={{ callId: call.id }} className="min-w-0 truncate hover:underline"><Mono className="block truncate">{call.id}</Mono></Link>
                  <CopyButton value={call.id} label="Copy call ID" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </td>
              <td className="px-4 py-3 capitalize">{call.direction}</td>
              <td className="px-4 py-3"><Mono className="block truncate text-muted-foreground">{call.from}</Mono></td>
              <td className="px-4 py-3"><Mono className="block truncate text-muted-foreground">{call.to}</Mono></td>
              <td className="px-4 py-3"><span className="block truncate">{agentsById.get(call.agentId)?.name ?? call.agentId}</span></td>
              <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{call.duration}s</td>
              <td className="px-4 py-3 text-muted-foreground">{call.outcome}</td>
              <td className="px-4 py-3 text-muted-foreground">{call.startedAt}</td>
              <td className="px-4 py-3 text-right tabular-nums">${call.cost.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Link to="/calls/$callId" params={{ callId: call.id }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Eye className="h-3 w-3" /> View</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StartCallDrawer({
  open,
  onOpenChange,
  agents,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentListItem[];
  onCreated: (call: CallListItem) => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAgentId((current) => current || agents[0]?.id || "");
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

    setIsSaving(true);
    try {
      const response = await startOutboundBackendCall({ agentId, to: to.trim() });
      onCreated(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not start call.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Start outbound call</SheetTitle>
          <SheetDescription>
            The selected agent must have an active voice-capable number attached.
          </SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
          <label className="block text-sm font-medium">
            Agent
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
              <option value="">Choose agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Destination number
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="+19015550123" className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono" />
          </label>
          <SheetFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "Starting..." : "Start call"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
