import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { services } from "@/lib/mock/data";

export const Route = createFileRoute("/_app/service-health")({
  component: ServiceHealth,
  head: () => ({ meta: [{ title: "Service Health — AgentLine" }] }),
});

function ServiceHealth() {
  return (
    <div>
      <PageHeader title="Service Health" description="Live status across AgentLine systems and providers." />
      <div className="rounded-lg border bg-surface divide-y">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">{s.name}</span>
            <StatusBadge status={s.status} />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border bg-surface p-4">
        <h2 className="text-sm font-semibold">Recent incidents</h2>
        <p className="mt-2 text-sm text-muted-foreground">No recent incidents.</p>
      </div>
    </div>
  );
}
