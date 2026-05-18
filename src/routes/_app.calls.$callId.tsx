import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Clock,
  Phone,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  Repeat,
  Server,
  User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/vukho/PageHeader";
import { StatusBadge } from "@/components/vukho/StatusBadge";
import { Mono } from "@/components/vukho/Mono";
import { EmptyState } from "@/components/vukho/EmptyState";
import { CopyButton } from "@/components/vukho/CopyButton";
import { Banner } from "@/components/vukho/Banner";
import { BackLink } from "@/components/vukho/BackLink";
import { cn } from "@/lib/utils";
import { VukhoApiError, formatApiError } from "@/lib/api/client";
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
  head: () => ({ meta: [{ title: "Call — Vukho" }] }),
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
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load call.",
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
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not end call.",
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
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not transfer call.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
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

  const terminal = isTerminalCallStatus(call.status);
  const isLive = !terminal;
  const lifecycle = buildLifecycleEvents(call);

  return (
    <div>
      <BackLink to="/calls" label="Calls" />

      <PageHeader
        eyebrow={`${call.direction === "inbound" ? "Inbound" : "Outbound"} call`}
        title={agent?.name ?? "Call"}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Mono className="text-foreground/80">{call.from}</Mono>
            <span className="text-muted-foreground/70">→</span>
            <Mono className="text-foreground/80">{call.to}</Mono>
          </span>
        }
        actions={
          <>
            <button
              onClick={transferCall}
              disabled={isActionLoading || terminal}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Repeat className="h-3.5 w-3.5" /> Transfer
            </button>
            <button
              onClick={() => void loadCall({ quiet: false })}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLive && "animate-spin")} /> Refresh
            </button>
            <button
              onClick={endCall}
              disabled={isActionLoading || terminal}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PhoneOff className="h-3.5 w-3.5" /> End call
            </button>
          </>
        }
      />

      {error && <Banner variant="error" message={error} className="mb-4" />}

      {/* Live status / summary strip */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border/80 bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2.5 text-[12px]">
          <span className="inline-flex items-center gap-2">
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
            )}
            <span className="font-medium">{isLive ? "Live" : "Ended"}</span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <StatusBadge status={call.status} />
          <span className="text-muted-foreground/60">·</span>
          <Link
            to="/agents/$agentId"
            params={{ agentId: call.agentId }}
            className="inline-flex items-center gap-1 text-foreground/80 hover:underline"
          >
            <Bot className="h-3 w-3" />
            {agent?.name ?? call.agentId}
          </Link>
          <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
            <Mono className="text-[11.5px]">{call.id}</Mono>
            <CopyButton value={call.id} label="Copy call ID" />
          </span>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
          <SummaryFact label="Duration" value={formatDuration(call.duration)} />
          <SummaryFact label="Outcome" value={call.outcome.replace(/_/g, " ")} capitalize />
          <SummaryFact label="Cost" value={`$${call.cost.toFixed(2)}`} />
          <SummaryFact label="Direction" value={call.direction} capitalize />
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title="Transcript" icon={<MessageIcon />}>
            {transcript.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {isLive ? "Waiting for the first turn…" : "No transcript turns recorded."}
              </div>
            ) : (
              <ol className="divide-y divide-border/60">
                {transcript.map((turn) => {
                  const isAgent = turn.speaker === "agent";
                  return (
                    <li key={turn.id} className="flex gap-3 px-4 py-3">
                      <Mono className="mt-0.5 w-12 shrink-0 text-[11px] text-muted-foreground">
                        {formatMs(turn.startedAtMs)}
                      </Mono>
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset",
                          isAgent
                            ? "bg-primary/10 text-primary ring-primary/20"
                            : "bg-muted text-foreground/70 ring-border/70",
                        )}
                        title={turn.speaker}
                      >
                        {isAgent ? <Bot className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                          {turn.speaker}
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                          {turn.text}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card title="Summary">
            <div className="px-4 py-3.5 text-[13.5px] leading-relaxed text-foreground">
              {call.summary || (
                <span className="text-muted-foreground">
                  {isLive ? "Summary will appear after the call ends." : "No summary available."}
                </span>
              )}
            </div>
          </Card>

          <Card title="Structured outcome">
            <pre className="overflow-x-auto bg-[oklch(0.18_0.012_260)] p-4 font-mono text-[12px] leading-relaxed text-[oklch(0.92_0.01_260)]">
{JSON.stringify({ outcome: call.outcome, status: call.status }, null, 2)}
            </pre>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card title="Lifecycle" icon={<Activity className="h-3.5 w-3.5" />}>
            <Timeline events={lifecycle} live={isLive} />
          </Card>

          <Card title="Provider diagnostics" icon={<Server className="h-3.5 w-3.5" />}>
            {call.providerDiagnostics.issues.length > 0 && (
              <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-[12px] text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {call.providerDiagnostics.issues.length} provider issue
                  {call.providerDiagnostics.issues.length === 1 ? "" : "s"} detected.
                </span>
              </div>
            )}
            {call.providerDiagnostics.events.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
                No provider callbacks recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {call.providerDiagnostics.events.map((event) => (
                  <li key={event.id} className="px-4 py-2.5 text-[12.5px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {event.status ?? event.eventType}
                      </span>
                      <StatusBadge status={event.status ?? "recorded"} />
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {formatProviderEventTime(event.createdAt)}
                    </div>
                    {(event.code || event.message) && (
                      <div className="mt-1 text-[12px] text-destructive">
                        {event.code ? `${event.code} · ` : ""}
                        {event.message}
                      </div>
                    )}
                    {event.providerEventId && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Mono className="truncate text-[11px] text-muted-foreground">
                          {event.providerEventId}
                        </Mono>
                        <CopyButton value={event.providerEventId} label="Copy provider event ID" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recording" icon={<Phone className="h-3.5 w-3.5" />}>
            <div className="flex items-center gap-3 px-4 py-3.5 text-[13px] text-muted-foreground">
              Recording playback isn’t available for this call.
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MessageIcon() {
  return <PhoneCall className="h-3.5 w-3.5" />;
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-surface">
      <header className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {title}
      </header>
      {children}
    </section>
  );
}

function SummaryFact({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 text-[15px] font-semibold tracking-tight text-foreground", capitalize && "capitalize")}>
        {value}
      </dd>
    </div>
  );
}

type LifecycleEvent = {
  id: string;
  label: string;
  detail?: string;
  state: "done" | "active" | "pending" | "error";
};

function buildLifecycleEvents(call: CallListItem): LifecycleEvent[] {
  const events: LifecycleEvent[] = [];
  events.push({
    id: "created",
    label: call.direction === "inbound" ? "Call received" : "Call initiated",
    detail: call.startedAt,
    state: "done",
  });
  if (call.provider) {
    events.push({
      id: "provider",
      label: `Routed via ${call.provider}`,
      detail: call.providerCallId ?? undefined,
      state: "done",
    });
  }

  const status = call.status;
  const terminal = isTerminalCallStatus(status);
  if (status === "ringing") {
    events.push({ id: "ringing", label: "Ringing", state: "active" });
  }
  if (
    status === "in_progress" ||
    status === "completed" ||
    status === "transferred" ||
    status === "failed"
  ) {
    events.push({
      id: "in_progress",
      label: "In progress",
      detail: terminal ? `${formatDuration(call.duration)} of conversation` : "Live conversation",
      state: status === "in_progress" ? "active" : "done",
    });
  }

  if (status === "transferred") {
    events.push({
      id: "transferred",
      label: "Transferred",
      detail: call.endedAt ?? undefined,
      state: "done",
    });
  }
  if (status === "completed") {
    events.push({
      id: "completed",
      label: "Completed",
      detail: call.endedAt ?? undefined,
      state: "done",
    });
  }
  if (status === "failed") {
    events.push({
      id: "failed",
      label: "Failed",
      detail: call.endedAt ?? undefined,
      state: "error",
    });
  }
  if (status === "no_answer" || status === "busy" || status === "canceled") {
    events.push({
      id: status,
      label: status.replace(/_/g, " "),
      detail: call.endedAt ?? undefined,
      state: "error",
    });
  }

  if (!terminal && status !== "ringing" && status !== "in_progress") {
    events.push({ id: "waiting", label: "Waiting for provider", state: "pending" });
  }

  return events;
}

function Timeline({ events, live }: { events: LifecycleEvent[]; live: boolean }) {
  if (events.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">
        No lifecycle events yet.
      </div>
    );
  }
  return (
    <ol className="relative px-4 py-3">
      <span className="absolute left-[22px] top-3 bottom-3 w-px bg-border/70" />
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.id} className={cn("relative flex gap-3", last ? "" : "pb-3")}>
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-2 ring-surface",
                event.state === "done" && "bg-success",
                event.state === "active" && "bg-info",
                event.state === "error" && "bg-destructive",
                event.state === "pending" && "bg-muted-foreground/40",
              )}
            >
              {event.state === "active" && live && (
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-info opacity-60" />
              )}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="text-[12.5px] font-medium capitalize text-foreground">
                {event.label}
              </div>
              {event.detail && (
                <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {event.detail}
                </div>
              )}
            </div>
            {event.state === "active" && (
              <Clock className="mt-0.5 h-3 w-3 shrink-0 text-info" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatDuration(seconds: number) {
  if (!seconds || seconds < 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
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
