import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Phone, PhoneOff, RefreshCw, Repeat } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { EmptyState } from "@/components/agentline/EmptyState";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { getBackendAgent, type AgentListItem } from "@/lib/api/agents";
import {
  endBackendCall,
  getBackendCall,
  getBackendCallTranscript,
  transferBackendCall,
  type CallListItem,
  type TranscriptTurn,
} from "@/lib/api/calls";

export const Route = createFileRoute("/_app/calls/$callId")({
  component: CallDetail,
  head: () => ({ meta: [{ title: "Call — AgentLine" }] }),
});

function CallDetail() {
  const { callId } = Route.useParams();
  const [call, setCall] = useState<CallListItem | null>(null);
  const [agent, setAgent] = useState<AgentListItem | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCall(options: { quiet?: boolean } = {}) {
    if (!options.quiet) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const callResponse = await getBackendCall(callId);
      setCall(callResponse.data);
      const [agentResponse, transcriptResponse] = await Promise.all([
        getBackendAgent(callResponse.data.agentId).catch(() => null),
        getBackendCallTranscript(callResponse.data.id),
      ]);
      setAgent(agentResponse?.data ?? null);
      setTranscript(transcriptResponse.data);
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load call.",
      );
    } finally {
      if (!options.quiet) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadCall();
  }, [callId]);

  useEffect(() => {
    if (!call || isTerminalCallStatus(call.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadCall({ quiet: true });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [call?.id, call?.status]);

  async function endCall() {
    if (!call) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    try {
      const response = await endBackendCall(call.id);
      setCall(response.data);
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not end call.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  async function transferCall() {
    if (!call) {
      return;
    }

    const to = window.prompt("Transfer to phone number");
    if (!to) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    try {
      const response = await transferBackendCall(call.id, to);
      setCall(response.data);
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not transfer call.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">
        Loading call...
      </div>
    );
  }

  if (!call) {
    return (
      <EmptyState
        title="Call not found"
        description={error ?? `No call with id ${callId}.`}
        action={
          <Link
            to="/calls"
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Back to calls
          </Link>
        }
      />
    );
  }

  const terminal = ["completed", "failed", "busy", "no_answer", "canceled", "transferred"].includes(
    call.status,
  );

  return (
    <div>
      <Link
        to="/calls"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Calls
      </Link>
      <PageHeader
        title={`${call.direction === "inbound" ? "Inbound" : "Outbound"} call`}
        description={
          <>
            <Mono>{call.from}</Mono> {"->"} <Mono>{call.to}</Mono>
          </>
        }
        actions={
          <>
            <button
              onClick={transferCall}
              disabled={isActionLoading || terminal}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Repeat className="h-3.5 w-3.5" /> Transfer
            </button>
            <button
              onClick={() => void loadCall({ quiet: false })}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={endCall}
              disabled={isActionLoading || terminal}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PhoneOff className="h-3.5 w-3.5" /> End call
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
        <Mono>{call.id}</Mono>
        <span>·</span>
        <Link to="/agents/$agentId" params={{ agentId: call.agentId }} className="hover:underline">
          {agent?.name ?? call.agentId}
        </Link>
        <span>·</span>
        <StatusBadge status={call.status} />
        <span>·</span>
        <span>{call.startedAt}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Duration" value={`${call.duration}s`} />
        <Stat
          label="Outcome"
          value={
            <span className="text-base font-medium capitalize">
              {call.outcome.replace(/_/g, " ")}
            </span>
          }
        />
        <Stat label="Cost" value={`$${call.cost.toFixed(2)}`} />
        <Stat
          label="Direction"
          value={<span className="text-base font-medium capitalize">{call.direction}</span>}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Transcript</h3>
            <div className="divide-y rounded-lg border bg-surface">
              {transcript.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transcript turns yet.
                </div>
              ) : (
                transcript.map((turn) => (
                  <div key={turn.id} className="flex gap-3 px-4 py-3 text-sm">
                    <Mono className="w-14 shrink-0 text-muted-foreground">
                      {formatMs(turn.startedAtMs)}
                    </Mono>
                    <span
                      className={`w-16 shrink-0 text-xs font-medium uppercase ${turn.speaker === "agent" ? "text-info" : "text-muted-foreground"}`}
                    >
                      {turn.speaker}
                    </span>
                    <span>{turn.text}</span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Summary</h3>
            <div className="rounded-lg border bg-surface px-4 py-3 text-sm">
              {call.summary || "No summary available."}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Structured outcome</h3>
            <pre className="overflow-x-auto rounded-md border bg-foreground p-3 font-mono text-xs text-background">
              {JSON.stringify({ outcome: call.outcome, status: call.status }, null, 2)}
            </pre>
          </section>
        </div>
        <aside className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Lifecycle</h3>
            <div className="rounded-lg border bg-surface px-3 py-2 text-xs">
              <LifecycleRow label="started" value={call.startedAt} />
              <LifecycleRow label="ended" value={call.endedAt ?? "Not ended"} />
              <LifecycleRow label="provider" value={call.provider} />
              <LifecycleRow label="provider id" value={call.providerCallId ?? "Not available"} />
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Provider diagnostics</h3>
            <div className="divide-y rounded-lg border bg-surface text-xs">
              {call.providerDiagnostics.issues.length > 0 && (
                <div className="bg-destructive/5 px-3 py-2 text-destructive">
                  {call.providerDiagnostics.issues.length} provider issue
                  {call.providerDiagnostics.issues.length === 1 ? "" : "s"} detected.
                </div>
              )}
              {call.providerDiagnostics.events.length === 0 ? (
                <div className="px-3 py-6 text-center text-muted-foreground">
                  No provider callbacks recorded yet.
                </div>
              ) : (
                call.providerDiagnostics.events.map((event) => (
                  <div key={event.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{event.status ?? event.eventType}</span>
                      <StatusBadge status={event.status ?? "recorded"} />
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {formatProviderEventTime(event.createdAt)}
                    </div>
                    {(event.code || event.message) && (
                      <div className="mt-1 text-destructive">
                        {event.code ? `${event.code} · ` : ""}
                        {event.message}
                      </div>
                    )}
                    {event.providerEventId && (
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {event.providerEventId}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Recording</h3>
            <div className="flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> Recording support is tracked for a later phase.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function isTerminalCallStatus(status: string) {
  return ["completed", "failed", "busy", "no_answer", "canceled", "transferred"].includes(status);
}

function formatProviderEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMs(value: number) {
  const seconds = Math.floor(value / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function LifecycleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b py-1.5 last:border-0">
      <span className="w-20 font-medium">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
