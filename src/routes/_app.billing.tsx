import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Stat } from "@/components/agentline/Stat";
import { overview } from "@/lib/mock/data";

export const Route = createFileRoute("/_app/billing")({
  component: Billing,
  head: () => ({ meta: [{ title: "Billing — AgentLine" }] }),
});

function Billing() {
  return (
    <div>
      <PageHeader title="Billing" description="Simulated billing for development. Real billing connects in production." />
      <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
        Test billing — no real charges are made.
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Balance" value={`$${overview.balance.toFixed(2)}`} />
        <Stat label="MTD spend" value={`$${overview.mtdSpend.toFixed(2)}`} />
        <Stat label="Spend limit" value="$1,000.00" />
        <Stat label="Auto-recharge" value="Off" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4">
          <h2 className="text-sm font-semibold">Recent billable events</h2>
          <div className="mt-3 space-y-2 text-sm">
            {[["Voice minutes — Support Triage", 18.42], ["SMS deliveries — Support Triage", 4.31], ["Number rental ×4", 4.80], ["Voice minutes — Outbound Booker", 7.66]].map(([l, v]) => (
              <div key={l as string} className="flex items-center justify-between border-b py-2 last:border-0">
                <span>{l}</span><span className="tabular-nums font-medium">${(v as number).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <h2 className="text-sm font-semibold">Invoices</h2>
          <div className="mt-3 text-sm text-muted-foreground">No invoices yet. Test mode does not generate invoices.</div>
        </div>
      </div>
    </div>
  );
}
