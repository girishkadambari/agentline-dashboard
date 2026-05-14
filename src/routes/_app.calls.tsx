import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, PhoneOutgoing } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable, DataTableBody, DataTableHead } from "@/components/agentline/DataTable";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { PhoneInput } from "@/components/agentline/PhoneInput";
import { Banner } from "@/components/agentline/Banner";
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

      {error && <Banner variant="error" message={error} className="mb-3" />}

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
    <DataTable minWidth={1080}>
      <DataTableHead>
        <tr>
          <th style={{ width: 220 }}>Call</th>
          <th style={{ width: 240 }}>Route</th>
          <th style={{ width: 160 }}>Agent</th>
          <th style={{ width: 120 }}>Status</th>
          <th style={{ width: 140 }}>Outcome</th>
          <th style={{ width: 80 }} className="!text-right">Duration</th>
          <th style={{ width: 80 }} className="!text-right">Cost</th>
          <th style={{ width: 130 }}>Started</th>
          <th style={{ width: 90 }} className="!text-right">Actions</th>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {calls.map((call) => (
          <tr
            key={call.id}
            onClick={() => navigate({ to: "/calls/$callId", params: { callId: call.id } })}
            className="group cursor-pointer"
          >
            <td>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/calls/$callId"
                  params={{ callId: call.id }}
                  className="min-w-0 truncate hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mono className="block truncate text-[12px]">{shortenId(call.id)}</Mono>
                </Link>
                <CopyButton value={call.id} label="Copy call ID" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="ml-1 inline-flex items-center rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {call.direction === "outbound" ? "Out" : "In"}
                </span>
              </div>
            </td>
            <td>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Mono className="truncate">{call.from}</Mono>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                <Mono className="truncate">{call.to}</Mono>
              </div>
            </td>
            <td><span className="block truncate">{agentsById.get(call.agentId)?.name ?? call.agentId}</span></td>
            <td><StatusBadge status={call.status} /></td>
            <td className="text-muted-foreground">{formatOutcome(call.outcome)}</td>
            <td className="text-right tabular-nums">{formatDuration(call.duration)}</td>
            <td className="text-right tabular-nums">${call.cost.toFixed(2)}</td>
            <td className="text-muted-foreground whitespace-nowrap">{call.startedAt}</td>
            <td>
              <div className="flex justify-end">
                <Link
                  to="/calls/$callId"
                  params={{ callId: call.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Eye className="h-3 w-3" /> View
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

function shortenId(id: string): string {
  if (id.length <= 18) return id;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const OUTCOME_LABELS: Record<string, string> = {
  completed: "Completed",
  no_answer: "No answer",
  failed: "Failed",
  busy: "Busy",
  canceled: "Canceled",
  cancelled: "Canceled",
  voicemail: "Voicemail",
  transferred: "Transferred",
  in_progress: "In progress",
  ringing: "Ringing",
  queued: "Queued",
};

function formatOutcome(outcome: string | null | undefined): string {
  if (!outcome) return "—";
  return (
    OUTCOME_LABELS[outcome] ??
    outcome
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
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
  const [touched, setTouched] = useState(false);

  const phoneError = touched && !/^\+?[0-9\s\-()]{6,}$/.test(to.trim()) ? "Enter a valid phone number (E.164, e.g. +15551234567)." : null;
  const agentError = touched && !agentId ? "Choose an agent." : null;

  useEffect(() => {
    if (open) {
      setAgentId((current) => current || agents[0]?.id || "");
      setError(null);
    }
  }, [agents, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!agentId || phoneError) return;

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
          {error && (
            <Banner variant="error" message={error} onDismiss={() => setError(null)} />
          )}
          <label htmlFor="call-agent" className="block text-sm font-medium">
            Agent <span aria-hidden="true" className="text-destructive">*</span>
            <select id="call-agent" aria-required="true" aria-invalid={!!agentError} value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
              <option value="">Choose agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            {agentError && <p className="type-caption-12-400 mt-1 text-destructive">{agentError}</p>}
          </label>
          <label htmlFor="call-to" className="block text-sm font-medium">
            Destination number <span aria-hidden="true" className="text-destructive">*</span>
            <div className="mt-1.5">
              <PhoneInput id="call-to" value={to} onChange={setTo} placeholder="+19015550123" />
            </div>
            {phoneError && <p className="type-caption-12-400 mt-1 text-destructive">{phoneError}</p>}
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
