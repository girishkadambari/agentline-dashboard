import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Logo } from "@/components/vukho/Logo";
import { acceptWorkspaceInvite, getCurrentUser, startGoogleLogin, switchSessionWorkspace } from "@/lib/api/auth";
import { VukhoApiError, formatApiError } from "@/lib/api/client";

export const Route = createFileRoute("/accept-invite")({
  component: AcceptInvite,
  validateSearch: (search) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Accept invite — Vukho" }] }),
});

type InviteState = "checking-session" | "needs-login" | "accepting" | "accepted" | "error";

function AcceptInvite() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [state, setState] = useState<InviteState>("checking-session");
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const tokenLooksValid = useMemo(() => token.trim().startsWith("inv_"), [token]);

  useEffect(() => {
    let cancelled = false;

    async function acceptInvite() {
      if (!tokenLooksValid) {
        setState("error");
        setError("This invite link is missing a valid invite token.");
        return;
      }

      try {
        setState("checking-session");
        await getCurrentUser();

        if (cancelled) {
          return;
        }

        setState("accepting");
        const response = await acceptWorkspaceInvite({ token });
        const acceptedWorkspaceId = response.data.workspaceId;
        setWorkspaceId(acceptedWorkspaceId);

        try {
          await switchSessionWorkspace(acceptedWorkspaceId);
        } catch {
          // Invite acceptance succeeded; switching can be retried from the workspace selector.
        }

        if (!cancelled) {
          setState("accepted");
        }
      } catch (caught) {
        if (cancelled) {
          return;
        }

        if (caught instanceof VukhoApiError && caught.status === 401) {
          setState("needs-login");
          return;
        }

        setState("error");
        setError(caught instanceof VukhoApiError ? formatApiError(caught) : "Could not accept this invite.");
      }
    }

    void acceptInvite();

    return () => {
      cancelled = true;
    };
  }, [token, tokenLooksValid]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border bg-surface p-7 text-center shadow-sm">
          {state === "checking-session" || state === "accepting" ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <h1 className="mt-5 text-lg font-semibold tracking-tight">
                {state === "checking-session" ? "Checking your session" : "Accepting invite"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Vukho is validating this workspace invite with the backend.
              </p>
            </>
          ) : null}

          {state === "needs-login" ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="mt-5 text-lg font-semibold tracking-tight">Sign in to accept this invite</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the Google account that received the invite, then open this invite link again.
              </p>
              <button
                type="button"
                onClick={startGoogleLogin}
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
              >
                Continue with Google
              </button>
            </>
          ) : null}

          {state === "accepted" ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="mt-5 text-lg font-semibold tracking-tight">Invite accepted</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You now have access to this Vukho workspace.
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/" })}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
                >
                  Open dashboard
                </button>
                {workspaceId ? (
                  <Link
                    to="/settings"
                    className="inline-flex flex-1 items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    View workspace
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}

          {state === "error" ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <h1 className="mt-5 text-lg font-semibold tracking-tight">Invite could not be accepted</h1>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {error ?? "This invite may be expired, revoked, or for a different email address."}
              </p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Go home
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
