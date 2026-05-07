import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { getBackendStripeStatus, type StripeStatusView } from "@/lib/api/billing";
import { getBackendBaseUrl, getBackendHealth, type BackendHealth } from "@/lib/api/health";
import { getCurrentWorkspace, type Workspace } from "@/lib/api/workspace";

export const Route = createFileRoute("/_app/service-health")({
  component: ServiceHealth,
  head: () => ({ meta: [{ title: "Service Health — AgentLine" }] }),
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
  const [stripeStatus, setStripeStatus] = useState<StripeStatusView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  async function loadHealth() {
    setIsLoading(true);
    setError(null);
    try {
      const [healthResponse, workspaceResponse, stripeResponse] = await Promise.all([
        getBackendHealth(),
        getCurrentWorkspace(),
        getBackendStripeStatus(),
      ]);

      setHealth(healthResponse.data);
      setWorkspace(workspaceResponse.data);
      setStripeStatus(stripeResponse.data);
      setLastCheckedAt(new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }));
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load service health.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const rows = useMemo<ServiceRow[]>(() => {
    const stripeReady = stripeStatus?.secretKeyConfigured && stripeStatus.secretKeyMatchesMode && stripeStatus.webhookSecretConfigured;

    return [
      {
        name: "Backend API",
        status: health?.status === "ok" ? "operational" : "failing",
        detail: health ? `${health.name} · ${health.phase}` : "Health endpoint unavailable",
      },
      {
        name: "Authenticated API",
        status: workspace ? "operational" : "failing",
        detail: workspace ? `Workspace ${workspace.name}` : "Workspace check failed",
      },
      {
        name: "Dashboard",
        status: "operational",
        detail: "Frontend bundle loaded",
      },
      {
        name: "Stripe Billing",
        status: stripeReady ? "operational" : "degraded",
        detail: stripeStatus
          ? `${stripeStatus.mode} mode · key ${stripeStatus.secretKeyMatchesMode ? "matches" : "needs config"} · webhook ${stripeStatus.webhookSecretConfigured ? "configured" : "missing"}`
          : "Stripe status unavailable",
      },
      {
        name: "Telecom Provider",
        status: "degraded",
        detail: "Provider runtime status endpoint is not exposed yet",
      },
    ];
  }, [health, stripeStatus, workspace]);

  return (
    <div>
      <PageHeader
        title="Service Health"
        description="Live status across AgentLine systems and safe provider configuration checks."
        actions={
          <button onClick={loadHealth} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        }
      />

      {error && <div className="mb-3 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="mb-4 rounded-lg border bg-surface p-4 text-sm shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Detail label="Backend URL" value={getBackendBaseUrl()} mono />
          <Detail label="Last checked" value={lastCheckedAt ?? "Checking..."} />
          <Detail label="Workspace" value={workspace?.name ?? "Unknown"} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-surface shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
        ) : (
          <div className="divide-y">
            {rows.map((service) => (
              <div key={service.name} className="grid gap-3 px-4 py-3 md:grid-cols-[220px_150px_1fr] md:items-center">
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
        <p className="mt-2 text-sm text-muted-foreground">No incident feed is connected yet. Runtime checks above are live; incident history should come from monitoring once production infrastructure is deployed.</p>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {mono ? <Mono className="mt-1 block break-all text-xs">{value}</Mono> : <div className="mt-1 font-medium">{value}</div>}
    </div>
  );
}
