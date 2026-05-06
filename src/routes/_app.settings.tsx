import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — AgentLine" }] }),
});

const tabs = ["Workspace", "Members", "Google SSO", "Integrations", "Provider Settings", "Notifications", "Usage Controls", "Compliance", "Developer Tools"];

function Settings() {
  const [tab, setTab] = useState(tabs[0]);
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="border-b">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-surface p-6">
        {tab === "Workspace" && (
          <div className="max-w-lg space-y-5">
            <Field label="Workspace name" defaultValue="Acme Workspace" />
            <Field label="Slug" defaultValue="acme" mono />
            <Field label="Default timezone" defaultValue="America/Los_Angeles" />
          </div>
        )}
        {tab === "Members" && <div className="text-sm text-muted-foreground">Team members will appear here.</div>}
        {tab === "Google SSO" && (
          <div className="max-w-lg">
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Google Workspace</div>
                <div className="text-xs text-muted-foreground">Connected · acme.com</div>
              </div>
              <span className="rounded border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">Active</span>
            </div>
          </div>
        )}
        {tab === "Integrations" && (
          <div className="grid gap-3 md:grid-cols-2">
            {["Twilio", "Telnyx"].map((p) => (
              <div key={p} className="rounded-md border p-4">
                <div className="text-sm font-medium">{p}</div>
                <div className="mt-1 text-xs text-muted-foreground">Provider integration placeholder.</div>
                <button className="mt-3 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">Connect</button>
              </div>
            ))}
          </div>
        )}
        {tab === "Provider Settings" && <div className="text-sm text-muted-foreground">Configure routing preferences across providers.</div>}
        {tab === "Notifications" && (
          <div className="space-y-3 max-w-lg">
            {["Failed webhook deliveries", "Spend limit reached", "New call summaries", "Provider incidents"].map((n) => (
              <label key={n} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{n}</span><input type="checkbox" defaultChecked className="h-4 w-4" /></label>
            ))}
          </div>
        )}
        {tab === "Usage Controls" && (
          <div className="max-w-lg space-y-4">
            <Field label="Monthly spend limit" defaultValue="$1000.00" />
            <Field label="Daily call cap" defaultValue="2000" />
          </div>
        )}
        {tab === "Compliance" && (
          <div className="max-w-lg space-y-4">
            <Field label="Recording consent mode" defaultValue="dual_consent" mono />
            <Field label="SMS opt-out keyword" defaultValue="STOP" mono />
          </div>
        )}
        {tab === "Developer Tools" && (
          <div className="max-w-lg space-y-4">
            <label className="flex items-center justify-between border-b py-2 text-sm"><span>Verbose webhook logging</span><input type="checkbox" defaultChecked className="h-4 w-4" /></label>
            <label className="flex items-center justify-between border-b py-2 text-sm"><span>Allow mock numbers</span><input type="checkbox" defaultChecked className="h-4 w-4" /></label>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, defaultValue, mono }: { label: string; defaultValue: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <input defaultValue={defaultValue} className={cn("mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm", mono && "font-mono")} />
    </div>
  );
}
