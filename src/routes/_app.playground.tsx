import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Copy,
  FlaskConical,
  Globe,
  Info,
  MessageSquare,
  PhoneOutgoing,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { CopyButton } from "@/components/agentline/CopyButton";
import { PhoneInput } from "@/components/agentline/PhoneInput";
import { Banner } from "@/components/agentline/Banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AgentLineApiError, API_BASE_URL, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import { createBackendWebCallToken, startOutboundBackendCall } from "@/lib/api/calls";
import { sendBackendMessage } from "@/lib/api/messages";
import {
  listBackendWebhooks,
  testBackendWebhook,
  type WebhookEndpointListItem,
} from "@/lib/api/webhooks";

export const Route = createFileRoute("/_app/playground")({
  component: Playground,
  head: () => ({ meta: [{ title: "Playground — Vukho" }] }),
});

type ScenarioId =
  | "outbound-call"
  | "web-call"
  | "send-sms"
  | "webhook-test"
  | "webhook-failure";

type LogLevel = "info" | "success" | "error";

interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  scenario: ScenarioId | "system";
  title: string;
  detail?: string;
  payload?: unknown;
}

interface Scenario {
  id: ScenarioId;
  title: string;
  description: string;
  icon: ReactNode;
  category: "voice" | "messaging" | "webhooks";
  needsAgent: boolean;
  needsDestination: boolean;
  needsBody: boolean;
  needsWebhook: boolean;
  destinationLabel?: string;
  destinationPlaceholder?: string;
  bodyLabel?: string;
  bodyPlaceholder?: string;
  cta: string;
  danger?: boolean;
  sampleDestination?: string;
  sampleBody?: string;
  successHint?: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "outbound-call",
    title: "Outbound voice call",
    description: "Place a live call from your agent to a phone number.",
    icon: <PhoneOutgoing className="h-4 w-4" />,
    category: "voice",
    needsAgent: true,
    needsDestination: true,
    needsBody: false,
    needsWebhook: false,
    destinationLabel: "Phone number to call",
    destinationPlaceholder: "+15551234567",
    cta: "Place call",
    sampleDestination: "+15551234567",
    successHint: "Inspect the call ID in the log to follow status webhooks.",
  },
  {
    id: "web-call",
    title: "Web call token",
    description: "Mint a short-lived token to start a browser-based voice session.",
    icon: <Globe className="h-4 w-4" />,
    category: "voice",
    needsAgent: true,
    needsDestination: false,
    needsBody: false,
    needsWebhook: false,
    cta: "Generate token",
    successHint: "Tokens expire in ~10 minutes. Use them with the Web SDK.",
  },
  {
    id: "send-sms",
    title: "Send SMS",
    description: "Trigger an outbound SMS through the selected agent.",
    icon: <MessageSquare className="h-4 w-4" />,
    category: "messaging",
    needsAgent: true,
    needsDestination: true,
    needsBody: true,
    needsWebhook: false,
    destinationLabel: "Recipient number",
    destinationPlaceholder: "+15551234567",
    bodyLabel: "Message body",
    bodyPlaceholder: "Hi! This is a test from the playground.",
    cta: "Send message",
    sampleDestination: "+15551234567",
    sampleBody: "Hi! This is a test from the AgentLine playground.",
    successHint: "Replies stream into Inbox under the same conversation ID.",
  },
  {
    id: "webhook-test",
    title: "Test webhook delivery",
    description: "Send a sample event to the selected endpoint and inspect the response.",
    icon: <Webhook className="h-4 w-4" />,
    category: "webhooks",
    needsAgent: false,
    needsDestination: false,
    needsBody: false,
    needsWebhook: true,
    cta: "Send test event",
    successHint: "Use this to verify your endpoint signature & 2xx response.",
  },
  {
    id: "webhook-failure",
    title: "Simulate webhook failure",
    description: "Force a delivery failure to verify retries and alerting.",
    icon: <AlertCircle className="h-4 w-4" />,
    category: "webhooks",
    needsAgent: false,
    needsDestination: false,
    needsBody: false,
    needsWebhook: true,
    cta: "Trigger failure",
    danger: true,
    successHint: "Watch retry attempts in Webhooks → Deliveries.",
  },
];

const CATEGORY_LABEL: Record<Scenario["category"], string> = {
  voice: "Voice",
  messaging: "Messaging",
  webhooks: "Webhooks",
};

const CATEGORY_TONE: Record<
  Scenario["category"],
  { dot: string; chip: string; soft: string; ring: string }
> = {
  voice: {
    dot: "bg-[oklch(0.55_0.16_255)]",
    chip: "bg-[oklch(0.55_0.16_255)]/10 text-[oklch(0.45_0.16_255)] border-[oklch(0.55_0.16_255)]/20",
    soft: "bg-[oklch(0.55_0.16_255)]/8",
    ring: "ring-[oklch(0.55_0.16_255)]/30",
  },
  messaging: {
    dot: "bg-success",
    chip: "bg-success/10 text-success border-success/20",
    soft: "bg-success/8",
    ring: "ring-success/30",
  },
  webhooks: {
    dot: "bg-warning",
    chip: "bg-warning/15 text-[oklch(0.45_0.14_75)] border-warning/25",
    soft: "bg-warning/10",
    ring: "ring-warning/35",
  },
};

function Playground() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpointListItem[]>([]);
  const [agentId, setAgentId] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [destination, setDestination] = useState("");
  const [body, setBody] = useState("");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("outbound-call");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | LogLevel>("all");
  const [logSearch, setLogSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<ScenarioId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === agentId),
    [agents, agentId],
  );
  const selectedWebhook = useMemo(
    () => webhooks.find((w) => w.id === webhookId),
    [webhooks, webhookId],
  );

  async function loadSetup() {
    setIsLoading(true);
    setError(null);
    try {
      const [a, w] = await Promise.all([listBackendAgents(), listBackendWebhooks()]);
      setAgents(a.data);
      setWebhooks(w.data);
      setAgentId((c) => c || a.data[0]?.id || "");
      setWebhookId((c) => c || w.data[0]?.id || "");
      append("system", "info", "Environment ready", `${a.data.length} agents · ${w.data.length} webhook endpoints`);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load playground setup.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, []);

  function append(scenario: ScenarioId | "system", level: LogLevel, title: string, detail?: string, payload?: unknown) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: new Date().toLocaleTimeString(),
      level,
      scenario,
      title,
      detail,
      payload,
    };
    setLog((curr) => [entry, ...curr].slice(0, 200));
  }

  function validate(): string | null {
    if (scenario.needsAgent && !agentId) return "Select an agent first.";
    if (scenario.needsWebhook && !webhookId) return "Select a webhook endpoint first.";
    if (scenario.needsDestination && !destination.trim()) return "Destination is required.";
    if (scenario.needsDestination && !/^\+?[0-9\s\-()]{6,}$/.test(destination.trim()))
      return "Destination doesn't look like a valid phone number.";
    if (scenario.needsBody && !body.trim()) return "Message body is required.";
    return null;
  }

  async function run() {
    const reason = validate();
    if (reason) {
      setError(reason);
      return;
    }
    setError(null);
    setPending(scenario.id);
    try {
      switch (scenario.id) {
        case "outbound-call": {
          const r = await startOutboundBackendCall({ agentId, to: destination.trim() });
          append(scenario.id, "success", `Call ${r.data.id}`, `status: ${r.data.status}`, {
            id: r.data.id, status: r.data.status, duration: r.data.duration, cost: r.data.cost,
          });
          toast.success("Call placed");
          break;
        }
        case "web-call": {
          const r = await createBackendWebCallToken({ agentId });
          append(scenario.id, "success", "Web call token issued", `expires ${new Date(r.data.expiresAt).toLocaleTimeString()}`, r.data);
          toast.success("Token issued");
          break;
        }
        case "send-sms": {
          const r = await sendBackendMessage({ agentId, to: destination.trim(), body: body.trim() });
          append(scenario.id, "success", `Message ${r.data.id}`, `status: ${r.data.status}`, {
            id: r.data.id, conversationId: r.data.conversationId, status: r.data.status,
          });
          toast.success("Message sent");
          break;
        }
        case "webhook-test":
        case "webhook-failure": {
          const fail = scenario.id === "webhook-failure";
          const r = await testBackendWebhook(webhookId, { simulateFailure: fail });
          append(
            scenario.id,
            fail ? "error" : "success",
            `Delivery ${r.data.delivery.id}`,
            `${r.data.delivery.eventType} · attempt ${r.data.delivery.attemptCount}`,
            {
              status: r.data.delivery.status,
              eventType: r.data.delivery.eventType,
              attemptCount: r.data.delivery.attemptCount,
              lastStatusCode: r.data.delivery.lastStatusCode,
            },
          );
          toast[fail ? "error" : "success"](fail ? "Webhook failure simulated" : "Webhook delivered");
          break;
        }
      }
    } catch (caught) {
      const msg = caught instanceof AgentLineApiError ? formatApiError(caught) : "Action failed.";
      setError(msg);
      append(scenario.id, "error", "Request failed", msg);
      toast.error(msg);
    } finally {
      setPending(null);
    }
  }

  const curl = useMemo(() => buildCurl(scenario, { agentId, webhookId, destination, body }), [scenario, agentId, webhookId, destination, body]);

  const filteredLog = useMemo(() => {
    return log.filter((e) => {
      if (logFilter !== "all" && e.level !== logFilter) return false;
      if (!logSearch.trim()) return true;
      const q = logSearch.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q) ||
        e.scenario.toLowerCase().includes(q)
      );
    });
  }, [log, logFilter, logSearch]);

  const grouped = useMemo(() => {
    return SCENARIOS.reduce<Record<Scenario["category"], Scenario[]>>(
      (acc, s) => {
        (acc[s.category] ||= []).push(s);
        return acc;
      },
      { voice: [], messaging: [], webhooks: [] },
    );
  }, []);

  const tone = CATEGORY_TONE[scenario.category];
  const runsCount = log.filter((e) => e.scenario !== "system").length;
  const successCount = log.filter((e) => e.level === "success").length;
  const errorCount = log.filter((e) => e.level === "error").length;
  const canFillSample = Boolean(scenario.sampleDestination || scenario.sampleBody);
  function fillSample() {
    if (scenario.sampleDestination) setDestination(scenario.sampleDestination);
    if (scenario.sampleBody) setBody(scenario.sampleBody);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Developer"
        title="Playground"
        description="Test every supported scenario against the live backend, inspect raw responses, and copy production-ready cURL snippets."
        actions={
          <>
            <div className="hidden items-center gap-1.5 rounded-md border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground md:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              <Mono className="text-[11px] text-muted-foreground">{API_BASE_URL}</Mono>
            </div>
            <button
              onClick={loadSetup}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Zap className="h-3.5 w-3.5" />} label="Agents" value={agents.length} hint="available" />
        <StatCard icon={<Webhook className="h-3.5 w-3.5" />} label="Webhooks" value={webhooks.length} hint="endpoints" />
        <StatCard icon={<FlaskConical className="h-3.5 w-3.5" />} label="Runs" value={runsCount} hint="this session" />
        <StatCard
          icon={<CircleDot className="h-3.5 w-3.5" />}
          label="Outcomes"
          value={successCount}
          hint={`${errorCount} error${errorCount === 1 ? "" : "s"}`}
          tone={errorCount > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[300px_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Scenario picker */}
        <aside className="min-w-0">
          <div className="sticky top-4 rounded-xl border bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Scenarios
              </div>
              <Badge variant="secondary" className="h-5 text-[10px]">{SCENARIOS.length}</Badge>
            </div>
            <div className="space-y-4">
              {(Object.keys(grouped) as Array<Scenario["category"]>).map((cat) => {
                const ct = CATEGORY_TONE[cat];
                return (
                  <div key={cat}>
                    <div className="mb-1.5 flex items-center gap-1.5 px-1">
                      <span className={cn("h-1.5 w-1.5 rounded-full", ct.dot)} />
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {CATEGORY_LABEL[cat]}
                      </div>
                      <div className="ml-auto text-[10px] text-muted-foreground/70">
                        {grouped[cat].length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {grouped[cat].map((s) => {
                        const active = s.id === scenarioId;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setScenarioId(s.id)}
                            className={cn(
                              "group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm transition-all",
                              active
                                ? cn("ring-1 ring-inset", ct.soft, ct.ring)
                                : "hover:bg-muted/60",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                                active
                                  ? cn("border-transparent text-foreground", ct.soft)
                                  : "border-border bg-background text-muted-foreground group-hover:text-foreground",
                                s.danger && !active && "text-destructive/70",
                              )}
                            >
                              {s.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-[13px] font-medium">{s.title}</span>
                                {active && <ChevronRight className="h-3.5 w-3.5 text-foreground/60" />}
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">
                                {s.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Form */}
        <section className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-sm">
            <div className={cn("flex items-start justify-between gap-3 border-b px-5 py-4", tone.soft)}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground shadow-sm ring-1", tone.ring)}>
                  {scenario.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold leading-tight">{scenario.title}</h2>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                    {scenario.description}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase tracking-wide", tone.chip)}>
                {CATEGORY_LABEL[scenario.category]}
              </Badge>
            </div>

            <div className="space-y-5 px-5 py-5">
              {scenario.needsAgent && (
                <Field label="Agent" hint={selectedAgent ? <Mono>{selectedAgent.id}</Mono> : "Choose which agent runs this scenario"}>
                  <Select value={agentId} onValueChange={setAgentId} disabled={isLoading || agents.length === 0}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={agents.length === 0 ? "No agents available" : "Select agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex flex-col">
                            <span className="text-sm">{a.name}</span>
                            <span className="text-[11px] text-muted-foreground">{a.mode} · {a.status}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {scenario.needsWebhook && (
                <Field label="Webhook endpoint" hint={selectedWebhook ? <Mono>{selectedWebhook.id}</Mono> : "Choose the destination endpoint"}>
                  <Select value={webhookId} onValueChange={setWebhookId} disabled={isLoading || webhooks.length === 0}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={webhooks.length === 0 ? "No endpoints configured" : "Select endpoint"} />
                    </SelectTrigger>
                    <SelectContent>
                      {webhooks.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <div className="flex max-w-[420px] flex-col">
                            <span className="truncate text-sm">{w.url}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {w.events.length} events · {w.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {scenario.needsDestination && (
                <Field label={scenario.destinationLabel ?? "Destination"} hint="E.164 format recommended (e.g. +15551234567)">
                  <PhoneInput
                    value={destination}
                    onChange={setDestination}
                    placeholder={scenario.destinationPlaceholder}
                  />
                </Field>
              )}

              {scenario.needsBody && (
                <Field
                  label={scenario.bodyLabel ?? "Body"}
                  hint={`${body.length} characters · keep under ~1600 for SMS`}
                >
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={scenario.bodyPlaceholder}
                    className="min-h-[112px] resize-y"
                  />
                </Field>
              )}

              {!scenario.needsAgent && !scenario.needsWebhook && !scenario.needsDestination && !scenario.needsBody && (
                <div className="flex items-start gap-2.5 rounded-lg border border-dashed bg-muted/30 px-3.5 py-3 text-[12.5px] text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <span>
                    No inputs needed — just press{" "}
                    <span className="font-medium text-foreground">{scenario.cta}</span> to run this scenario.
                  </span>
                </div>
              )}

              {scenario.successHint && (
                <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{scenario.successHint}</span>
                </div>
              )}

              {error && <Banner variant="error" message={error} />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3.5">
              <div className="flex items-center gap-2">
                {canFillSample && (
                  <button
                    onClick={fillSample}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" />
                    Use sample
                  </button>
                )}
                <CopyButton value={curl} label="Copy cURL" showLabel />
              </div>
              <button
                onClick={run}
                disabled={pending !== null || isLoading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-60",
                  scenario.danger
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-foreground hover:bg-foreground/90",
                )}
              >
                {pending === scenario.id ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    {scenario.cta}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* cURL preview */}
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-foreground shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2 text-white/80">
                <Terminal className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">Equivalent request</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-white/70">
                  cURL
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(curl).then(() => toast.success("Copied"))}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <ScrollArea className="max-h-[200px]">
              <pre className="whitespace-pre-wrap break-all p-4 font-mono text-[11.5px] leading-relaxed text-white/85">
                {curl}
              </pre>
            </ScrollArea>
          </div>
        </section>

        {/* Live log */}
        <section className="min-w-0">
          <div className="sticky top-4 flex h-[calc(100vh-6rem)] min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[13px] font-semibold">Live event log</span>
                <Badge variant="secondary" className="h-5 text-[10px]">{log.length}</Badge>
              </div>
              <button
                onClick={() => setLog([])}
                disabled={log.length === 0}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>

            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter events…"
                  className="h-8 pl-7 text-[12px]"
                />
              </div>
              <Select value={logFilter} onValueChange={(v) => setLogFilter(v as typeof logFilter)}>
                <SelectTrigger className="h-8 w-[120px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              {filteredLog.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">No events yet</div>
                  <div className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-muted-foreground">
                    Pick a scenario, fill the inputs, and run it. Every API call streams in here with full payloads.
                  </div>
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredLog.map((e) => (
                    <LogRow key={e.id} entry={e} />
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {hint && <div className="truncate text-[11px] text-muted-foreground/80">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border bg-surface px-4 py-3 shadow-sm transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md",
              tone === "warn"
                ? "bg-warning/15 text-[oklch(0.45_0.14_75)]"
                : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </span>
          {label}
        </div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const Icon =
    entry.level === "success" ? CheckCircle2 : entry.level === "error" ? XCircle : Info;
  const tone =
    entry.level === "success"
      ? "text-success"
      : entry.level === "error"
        ? "text-destructive"
        : "text-info";

  return (
    <li className="px-3 py-2.5 transition-colors hover:bg-muted/40">
      <button
        onClick={() => entry.payload && setOpen((o) => !o)}
        className="flex w-full items-start gap-2.5 text-left"
      >
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[12.5px] font-medium">{entry.title}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{entry.time}</span>
          </div>
          {entry.detail && (
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{entry.detail}</div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="h-4 px-1.5 text-[9.5px] font-normal capitalize">
              {entry.scenario.replace(/-/g, " ")}
            </Badge>
            {entry.payload != null && (
              <span className="text-[10px] text-muted-foreground/70">
                {open ? "hide" : "show"} payload
              </span>
            )}
          </div>
        </div>
      </button>
      {open && entry.payload != null && (
        <div className="mt-2 ml-6 overflow-hidden rounded-md border bg-foreground/95">
          <pre className="max-h-[200px] overflow-auto p-2.5 font-mono text-[11px] leading-relaxed text-background">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>
      )}
    </li>
  );
}

function buildCurl(
  scenario: Scenario,
  ctx: { agentId: string; webhookId: string; destination: string; body: string },
): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const headers = `  -H "Authorization: Bearer $AGENTLINE_API_KEY" \\\n  -H "Content-Type: application/json"`;
  const a = ctx.agentId || "<agent_id>";
  const to = ctx.destination || "+15551234567";
  switch (scenario.id) {
    case "outbound-call":
      return `curl -X POST ${base}/calls \\\n${headers} \\\n  -d '${JSON.stringify({ agentId: a, to })}'`;
    case "web-call":
      return `curl -X POST ${base}/calls/web \\\n${headers} \\\n  -d '${JSON.stringify({ agentId: a })}'`;
    case "send-sms":
      return `curl -X POST ${base}/messages \\\n${headers} \\\n  -d '${JSON.stringify({ agentId: a, to, body: ctx.body || "Hello" })}'`;
    case "webhook-test":
      return `curl -X POST ${base}/webhooks/${ctx.webhookId || "<endpoint_id>"}/test \\\n${headers} \\\n  -d '{"simulateFailure":false}'`;
    case "webhook-failure":
      return `curl -X POST ${base}/webhooks/${ctx.webhookId || "<endpoint_id>"}/test \\\n${headers} \\\n  -d '{"simulateFailure":true}'`;
  }
}

