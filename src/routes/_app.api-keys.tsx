import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { apiKeys } from "@/lib/mock/data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/api-keys")({
  component: ApiKeys,
  head: () => ({ meta: [{ title: "API Keys — AgentLine" }] }),
});

function ApiKeys() {
  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage credentials for the AgentLine API."
        actions={<button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"><Plus className="h-3.5 w-3.5" />Create key</button>}
      />
      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Label</th>
              <th className="px-4 py-2.5 text-left font-medium">Key</th>
              <th className="px-4 py-2.5 text-left font-medium">Scope</th>
              <th className="px-4 py-2.5 text-left font-medium">Created</th>
              <th className="px-4 py-2.5 text-left font-medium">Last used</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((k) => (
              <tr key={k.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{k.label}</td>
                <td className="px-4 py-2.5"><Mono>{k.prefix}</Mono></td>
                <td className="px-4 py-2.5"><span className="rounded border px-1.5 py-0.5 text-xs capitalize">{k.scope}</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">{k.createdAt}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{k.lastUsed}</td>
                <td className="px-4 py-2.5"><StatusBadge status={k.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Full API keys are shown once at creation. Store them securely.</p>
    </div>
  );
}
