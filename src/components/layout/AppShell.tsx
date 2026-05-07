import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Inbox, PhoneCall, Users, Webhook, BarChart3,
  CreditCard, KeyRound, FlaskConical, Settings, Activity, Bell, ChevronsUpDown,
  LogOut, MessageSquare, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/agentline/Logo";
import { getCurrentWorkspace, type Workspace } from "@/lib/api/workspace";
import { clearStoredApiKey, hasStoredApiKey } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/numbers", label: "Numbers", icon: Phone },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/calls", label: "Calls", icon: PhoneCall },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/usage", label: "Usage", icon: BarChart3 },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/playground", label: "Playground", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/service-health", label: "Service Health", icon: Activity },
] as const;

function SidebarContent({
  pathname,
  workspace,
  workspaceError,
  onNav,
}: {
  pathname: string;
  workspace: Workspace | null;
  workspaceError: string | null;
  onNav?: () => void;
}) {
  const workspaceName = workspace?.name ?? (workspaceError ? "Backend offline" : "Loading workspace");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Logo />
      </div>
      <button className="mx-3 mb-3 flex items-center justify-between rounded-md border bg-surface px-2.5 py-1.5 text-left text-sm hover:bg-sidebar-accent">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-[10px] font-semibold text-background">A</div>
          <span className="truncate font-medium">{workspaceName}</span>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNav}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-foreground" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-3">
        <div className="rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            {workspaceError ? "Backend disconnected" : "Backend connected"}
          </div>
          <div className="mt-0.5">
            {workspaceError ?? "Using the local AgentLine API."}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStoredApiKey()) {
      setIsAuthChecked(true);
      setIsAuthed(false);
      window.location.href = "/login";
      return;
    }

    setIsAuthed(true);
    setIsAuthChecked(true);
    let cancelled = false;
    getCurrentWorkspace()
      .then((response) => {
        if (!cancelled) {
          setWorkspace(response.data);
          setWorkspaceError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceError("Could not reach the backend.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    clearStoredApiKey();
    window.location.href = "/login";
  }

  if (!isAuthChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting to sign in...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <SidebarContent pathname={pathname} workspace={workspace} workspaceError={workspaceError} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r bg-sidebar">
            <SidebarContent
              pathname={pathname}
              workspace={workspace}
              workspaceError={workspaceError}
              onNav={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border p-1.5 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="md:hidden"><Logo /></div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted md:inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Feedback
            </button>
            <button className="rounded-md border p-1.5 hover:bg-muted" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={signOut}
              className="rounded-md border p-1.5 hover:bg-muted"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
