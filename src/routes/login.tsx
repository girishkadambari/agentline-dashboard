import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/agentline/Logo";
import { startGoogleLogin } from "@/lib/api/auth";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { getCurrentWorkspace } from "@/lib/api/workspace";
import { setStoredApiKey } from "@/lib/auth/session";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Sign in — AgentLine" }] }),
});

function Login() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("sk_test_agentline_local");
  const [showApiKeyFallback, setShowApiKeyFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!apiKey.trim()) {
      setError("Enter an AgentLine API key.");
      return;
    }

    setIsSubmitting(true);
    try {
      await getCurrentWorkspace(apiKey.trim());
      setStoredApiKey(apiKey.trim());
      await navigate({ to: "/" });
    } catch (caught) {
      if (caught instanceof AgentLineApiError) {
        setError(caught.status === 401 ? "Invalid API key." : formatApiError(caught));
      } else {
        setError("Could not connect to the AgentLine backend.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-xl border bg-surface p-7 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">Sign in to AgentLine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use Google SSO to create your backend session.
          </p>
          <button
            type="button"
            onClick={startGoogleLogin}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-md bg-foreground px-3 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => setShowApiKeyFallback((value) => !value)}
            className="mt-3 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Developer API-key fallback
          </button>
          {showApiKeyFallback && (
            <form className="mt-4 space-y-4" onSubmit={submit}>
              <div>
                <label className="block text-sm font-medium" htmlFor="api-key">API key</label>
                <input
                  id="api-key"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                  placeholder="sk_test_agentline_local"
                  autoComplete="off"
                />
              </div>
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-md border px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Checking backend..." : "Continue with API key"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Start the NestJS backend first, then sign in with Google.
        </p>
      </div>
    </div>
  );
}
