import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FlaskConical, MessageSquare, PhoneOutgoing, RefreshCw, Webhook } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import { createBackendWebCallToken, startOutboundBackendCall } from "@/lib/api/calls";
import { sendBackendMessage, simulateBackendInboundSms } from "@/lib/api/messages";
import { listBackendWebhooks, testBackendWebhook, type WebhookEndpointListItem } from "@/lib/api/webhooks";

export const Route = createFileRoute("/_app/playground")({
  component: Playground,
  head: () => ({ meta: [{ title: "Playground — AgentLine" }] }),
});

type PlaygroundAction = "outbound-call" | "web-call" | "send-sms" | "inbound-sms" | "webhook" | "webhook-failure";

function Playground() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpointListItem[]>([]);
  const [agentId, setAgentId] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [to, setTo] = useState("+14155550123");
  const [from, setFrom] = useState("+14155550144");
  const [body, setBody] = useState("Hello from AgentLine playground.");
  const [log, setLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PlaygroundAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSetup() {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsResponse, webhooksResponse] = await Promise.all([
        listBackendAgents(),
        listBackendWebhooks(),
      ]);
      setAgents(agentsResponse.data);
      setWebhooks(webhooksResponse.data);
      setAgentId((current) => current || agentsResponse.data[0]?.id || "");
      setWebhookId((current) => current || webhooksResponse.data[0]?.id || "");
      append("ready", `loaded ${agentsResponse.data.length} agents and ${webhooksResponse.data.length} webhook endpoints`);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load playground setup.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, []);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId), [agents, agentId]);
  const selectedWebhook = useMemo(() => webhooks.find((webhook) => webhook.id === webhookId), [webhooks, webhookId]);

  function append(event: string, detail: string, payload?: unknown) {
    const time = new Date().toLocaleTimeString();
    const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
    setLog((current) => [...current, `[${time}] ${event} - ${detail}${suffix}`]);
  }

  function requireAgent() {
    if (!agentId) {
      setError("Select or create an agent before running playground actions.");
      return false;
    }

    return true;
  }

  async function runAction(action: PlaygroundAction, task: () => Promise<void>) {
    setPendingAction(action);
    setError(null);
    try {
      await task();
    } catch (caught) {
      const message = caught instanceof AgentLineApiError ? formatApiError(caught) : "Playground action failed.";
      setError(message);
      append("error", message);
    } finally {
      setPendingAction(null);
    }
  }

  async function startOutboundCall() {
    if (!requireAgent()) {
      return;
    }

    await runAction("outbound-call", async () => {
      const response = await startOutboundBackendCall({ agentId, to });
      append("call.outbound", `created ${response.data.id}`, {
        status: response.data.status,
        duration: response.data.duration,
        cost: response.data.cost,
      });
    });
  }

  async function createWebToken() {
    if (!requireAgent()) {
      return;
    }

    await runAction("web-call", async () => {
      const response = await createBackendWebCallToken({ agentId });
      append("call.web_token", `created token for ${response.data.agentId}`, {
        token: response.data.token,
        expiresAt: response.data.expiresAt,
      });
    });
  }

  async function sendSms() {
    if (!requireAgent()) {
      return;
    }

    await runAction("send-sms", async () => {
      const response = await sendBackendMessage({ agentId, to, body });
      append("sms.outbound", `created ${response.data.id}`, {
        status: response.data.status,
        conversationId: response.data.conversationId,
      });
    });
  }

  async function simulateInboundSms() {
    if (!requireAgent()) {
      return;
    }

    await runAction("inbound-sms", async () => {
      const response = await simulateBackendInboundSms({ agentId, from, body });
      append("sms.inbound", `created ${response.data.id}`, {
        status: response.data.status,
        conversationId: response.data.conversationId,
      });
    });
  }

  async function testWebhook(simulateFailure = false) {
    if (!webhookId) {
      setError("Create or select a webhook endpoint before testing webhook delivery.");
      return;
    }

    await runAction(simulateFailure ? "webhook-failure" : "webhook", async () => {
      const response = await testBackendWebhook(webhookId, { simulateFailure });
      append(simulateFailure ? "webhook.failure" : "webhook.test", `delivery ${response.data.delivery.id}`, {
        status: response.data.delivery.status,
        eventType: response.data.delivery.eventType,
        attemptCount: response.data.delivery.attemptCount,
      });
    });
  }

  return (
    <div>
      <PageHeader
        title="Playground"
        description="Run backend-backed mock calls, SMS, web call tokens, and webhook deliveries."
        actions={
          <button onClick={loadSetup} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        }
      />

      {error && <div className="mb-3 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Test setup</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</span>
                <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-surface px-2.5 text-sm">
                  <option value="">Select agent</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhook endpoint</span>
                <select value={webhookId} onChange={(event) => setWebhookId(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-surface px-2.5 text-sm">
                  <option value="">Select webhook</option>
                  {webhooks.map((webhook) => <option key={webhook.id} value={webhook.id}>{webhook.url}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Destination" value={to} onChange={setTo} />
              <Field label="Inbound from" value={from} onChange={setFrom} />
              <label className="block md:col-span-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message body</span>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Agent: <Mono>{selectedAgent?.id ?? "none"}</Mono>
              <span className="mx-2">·</span>
              Webhook: <Mono>{selectedWebhook?.id ?? "none"}</Mono>
            </div>
          </div>

          <div className="rounded-lg border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton action="outbound-call" pendingAction={pendingAction} onClick={startOutboundCall} icon={<PhoneOutgoing className="h-3.5 w-3.5" />} label="Outbound call" />
              <ActionButton action="web-call" pendingAction={pendingAction} onClick={createWebToken} icon={<FlaskConical className="h-3.5 w-3.5" />} label="Web call token" />
              <ActionButton action="send-sms" pendingAction={pendingAction} onClick={sendSms} icon={<MessageSquare className="h-3.5 w-3.5" />} label="Send SMS" />
              <ActionButton action="inbound-sms" pendingAction={pendingAction} onClick={simulateInboundSms} icon={<MessageSquare className="h-3.5 w-3.5 rotate-180" />} label="Inbound SMS" />
              <ActionButton action="webhook" pendingAction={pendingAction} onClick={() => testWebhook(false)} icon={<Webhook className="h-3.5 w-3.5" />} label="Test webhook" />
              <ActionButton action="webhook-failure" pendingAction={pendingAction} onClick={() => testWebhook(true)} icon={<Webhook className="h-3.5 w-3.5" />} label="Webhook failure" danger />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-foreground p-0 text-background shadow-sm">
          <div className="flex items-center justify-between border-b border-background/10 px-3 py-2 text-xs">
            <span className="font-medium">Live event log</span>
            <button onClick={() => setLog([])} className="text-background/60 hover:text-background">Clear</button>
          </div>
          <pre className="max-h-[560px] min-h-[360px] overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
            {log.length === 0 ? "[ready] Run a playground action to see backend responses.\n" : log.map((line) => `${line}\n`).join("")}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground" />
    </label>
  );
}

function ActionButton({
  action,
  pendingAction,
  onClick,
  icon,
  label,
  danger = false,
}: {
  action: PlaygroundAction;
  pendingAction: PlaygroundAction | null;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  danger?: boolean;
}) {
  const isPending = pendingAction === action;

  return (
    <button
      onClick={onClick}
      disabled={pendingAction !== null}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 ${danger ? "text-destructive hover:bg-destructive/5" : ""}`}
    >
      {icon}
      {isPending ? "Running..." : label}
    </button>
  );
}
