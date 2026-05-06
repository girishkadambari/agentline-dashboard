import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/agentline/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  const [error, setError] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = "/onboarding";
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {!error ? (
          <>
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Signing you in</p>
            <button onClick={() => setError(true)} className="mt-8 text-xs text-muted-foreground underline">Simulate error</button>
          </>
        ) : (
          <div className="rounded-lg border bg-surface p-6">
            <h2 className="text-sm font-semibold">We couldn't sign you in</h2>
            <p className="mt-1 text-xs text-muted-foreground">Google returned an error. Please try again.</p>
            <Link to="/login" className="mt-4 inline-flex rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">Retry sign-in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
