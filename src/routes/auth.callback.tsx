import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/agentline/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-lg border bg-surface p-6">
          <h2 className="text-sm font-semibold">Google SSO is not configured yet</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            AgentLine is using API-key login while backend session auth is being built.
          </p>
          <Link to="/login" className="mt-4 inline-flex rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
