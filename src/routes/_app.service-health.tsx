import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Banner } from "@/components/agentline/Banner";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { getBackendHealth, type BackendHealth } from "@/lib/api/health";
import {
  getCurrentWorkspace,
  getCurrentWorkspaceSettings,
  type Workspace,
  type WorkspaceSettings,
} from "@/lib/api/workspace";

export const Route = createFileRoute("/_app/service-health")({
  component: ServiceHealth,
  head: () => ({ meta: [{ title: "Service Health — Vukho" }] }),
});

type ServiceStatus = "operational" | "degraded" | "failing";

interface ServiceRow {
  name: string;
  status: ServiceStatus;
  detail: string;
}

function ServiceHealth() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  async function loadHealth() {
    setIsLoading(true);
    setError(null);
    try {
      const [healthResponse, workspaceResponse, settingsResponse] = await Promise.all([
        getBackendHealth(),
        getCurrentWorkspace(),
        getCurrentWorkspaceSettings(),
      ]);

      setHealth(healthResponse.data);
      setWorkspace(workspaceResponse.data);
      setSettings(settingsResponse.data);
      setLastCheckedAt(
        new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError
          ? formatApiError(caught)
          : "Could not load service health.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const rows = useMemo<ServiceRow[]>(() => {
    const platformReady = health?.status === "ok";
    const phoneReady = settings?.providers.telecom.credentialsReady === true;
    const eventRoutingReady = settings?.providers.telecom.callbackUrlsReady === true;
    const billingReady =
      settings?.providers.stripe.secretKeyConfigured === true &&
      settings.providers.stripe.webhookSecretConfigured === true;

    return [
      {
        name: "Dashboard",
        status: "operational",
        detail: "The workspace UI is loaded and ready.",
      },
      {
        name: "Workspace access",
        status: workspace ? "operational" : "failing",
        detail: workspace ? "Your current workspace can be loaded." : "Workspace access failed.",
      },
      {
        name: "Agent API",
        status: platformReady ? "operational" : "failing",
        detail: platformReady
          ? "Agents, conversations, calls, and messages can be managed."
          : "Agent operations are currently unavailable.",
      },
      {
        name: "Phone numbers",
        status: phoneReady ? "operational" : "degraded",
        detail: phoneReady
          ? "Numbers can be assigned to agents."
          : "Number operations need account setup.",
      },
      {
        name: "Messaging",
        status: phoneReady && eventRoutingReady ? "operational" : "degraded",
        detail:
          phoneReady && eventRoutingReady
            ? "Inbound and outbound SMS updates can reach Vukho."
            : "Message delivery or inbound updates need setup.",
      },
      {
        name: "Voice calls",
        status: phoneReady && eventRoutingReady ? "operational" : "degraded",
        detail:
          phoneReady && eventRoutingReady
            ? "Call lifecycle and speech capture callbacks can reach Vukho."
            : "Call routing or status updates need setup.",
      },
      {
        name: "Billing",
        status: billingReady ? "operational" : "degraded",
        detail: billingReady
          ? "Plans, credits, and invoices are ready."
          : "Billing setup is incomplete.",
      },
      {
        name: "Customer webhooks",
        status: platformReady ? "operational" : "degraded",
        detail:
          settings && settings.counts.activeWebhooks > 0
            ? `${settings.counts.activeWebhooks} active endpoint${settings.counts.activeWebhooks === 1 ? "" : "s"} configured.`
            : "No customer webhook endpoints are configured yet.",
      },
    ];
  }, [health, settings, workspace]);

  return (
    <div>
      <PageHeader
        title="Service Health"
        description="Operational status for the Vukho capabilities your agents depend on."
        actions={
          <button
            onClick={loadHealth}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      {error && (
        <Banner variant="error" className="mb-3" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="mb-4 rounded-lg border bg-surface p-4 text-sm shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <Detail label="Last checked" value={lastCheckedAt ?? "Checking..."} />
          <Detail label="Workspace" value={workspace?.name ?? "Unknown"} />
          <Detail label="Agents" value={formatCount(settings?.counts.agents)} />
          <Detail label="Active webhooks" value={formatCount(settings?.counts.activeWebhooks)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-surface shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((service) => (
              <div
                key={service.name}
                className="grid gap-3 px-4 py-3 md:grid-cols-[220px_150px_1fr] md:items-center"
              >
                <span className="text-sm font-medium">{service.name}</span>
                <StatusBadge status={service.status} />
                <span className="text-sm text-muted-foreground">{service.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Recent incidents</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No active incidents reported for this workspace.
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function formatCount(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "Checking...";
}
