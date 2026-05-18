import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/agentline/Logo";
import { Banner } from "@/components/agentline/Banner";
import { Check } from "lucide-react";
import { createBackendAgent } from "@/lib/api/agents";
import { getCurrentUser } from "@/lib/api/auth";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { updateCurrentWorkspace } from "@/lib/api/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const steps = ["Workspace", "First agent", "Integration", "Finish"];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState("Acme Workspace");
  const [agentName, setAgentName] = useState("Support Triage");
  const [mode, setMode] = useState<"hosted" | "webhook" | "web">("webhook");
  const [systemPrompt, setSystemPrompt] = useState("You are a calm support agent.");
  const [beginMessage, setBeginMessage] = useState("Hi, this is the AcmeCo support line.");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (!cancelled && response.data.activeWorkspace.name) {
          setWorkspace(response.data.activeWorkspace.name);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          if (caught instanceof AgentLineApiError && caught.status === 401) {
            window.location.href = "/login";
            return;
          }
          setError("Could not load your workspace. Check that the backend is running.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finishSetup() {
    setError(null);

    if (!workspace.trim()) {
      setError("Workspace name is required.");
      setStep(0);
      return;
    }

    if (!agentName.trim()) {
      setError("Agent name is required.");
      setStep(1);
      return;
    }

    setIsSaving(true);
    try {
      await updateCurrentWorkspace({ name: workspace.trim() });
      const response = await createBackendAgent({
        name: agentName.trim(),
        mode,
        systemPrompt: systemPrompt.trim() || undefined,
        beginMessage: beginMessage.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        metadata: { createdFrom: "frontend_onboarding" },
      });
      setCreatedAgentId(response.data.id);
      setStep(3);
    } catch (caught) {
      if (caught instanceof AgentLineApiError) {
        setError(formatApiError(caught));
      } else {
        setError("Could not complete onboarding. Check the backend and try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4"><Logo /></header>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-foreground bg-foreground text-background",
                i === step && "border-foreground text-foreground",
                i > step && "border-border text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-surface p-7">
          {error && <Banner variant="error" message={error} className="mb-5" />}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Set up your Vukho workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">Three quick steps: create an agent, attach a number, test a call or SMS.</p>
              <label className="mt-6 block text-sm font-medium">Workspace name</label>
              <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Create your first agent</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium">Agent name</label>
                  <input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Mode</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["hosted", "webhook", "web"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)} className={cn("rounded-md border px-3 py-2 text-left text-xs", mode === m ? "border-foreground bg-muted" : "hover:bg-muted/50")}>
                        <div className="font-semibold capitalize">{m}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {m === "hosted" && "Quick test"}
                          {m === "webhook" && "Recommended"}
                          {m === "web" && "Browser"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">System prompt</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Begin message</label>
                  <input
                    value={beginMessage}
                    onChange={(event) => setBeginMessage(event.target.value)}
                    className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Configure integration</h2>
              <p className="mt-1 text-sm text-muted-foreground">Webhooks let your backend control the agent. You can add this later.</p>
              <label className="mt-5 block text-sm font-medium">Webhook URL <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://api.yourapp.com/agentline"
                className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono"
              />
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">You're set</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your workspace and first agent are ready.</p>
              <div className="mt-5 space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Workspace</span><span className="font-medium">{workspace}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium">{agentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium capitalize">{mode}</span></div>
                {createdAgentId && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Agent ID</span><span className="font-mono text-xs">{createdAgentId}</span></div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className="text-sm text-muted-foreground disabled:opacity-40">Back</button>
            {step < 2 ? (
              <button onClick={next} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Continue</button>
            ) : step === 2 ? (
              <button
                onClick={finishSetup}
                disabled={isSaving}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Creating..." : "Create workspace setup"}
              </button>
            ) : (
              <div className="flex gap-2">
                <Link to="/playground" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Open playground</Link>
                <button onClick={() => navigate({ to: "/" })} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Open dashboard</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
