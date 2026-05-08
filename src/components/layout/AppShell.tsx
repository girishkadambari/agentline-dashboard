import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Inbox, PhoneCall, Users, Webhook, BarChart3,
  CreditCard, KeyRound, FlaskConical, Settings, Activity,
  LogOut, Menu, X, Check, Circle,
} from "lucide-react";
import { Logo } from "@/components/agentline/Logo";
import { getCurrentWorkspace, type Workspace } from "@/lib/api/workspace";
import { clearStoredApiKey, hasStoredApiKey } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/inbox", label: "Inbox", icon: Inbox },
      { to: "/calls", label: "Calls", icon: PhoneCall },
      { to: "/contacts", label: "Contacts", icon: Users },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "/agents", label: "Agents", icon: Bot },
      { to: "/numbers", label: "Numbers", icon: Phone },
      { to: "/webhooks", label: "Webhooks", icon: Webhook },
      { to: "/playground", label: "Playground", icon: FlaskConical },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/usage", label: "Usage", icon: BarChart3 },
      { to: "/billing", label: "Billing", icon: CreditCard },
      { to: "/api-keys", label: "API Keys", icon: KeyRound },
      { to: "/service-health", label: "Service Health", icon: Activity },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

function isItemActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function WorkspaceSwitcher({
  workspace,
  workspaceError,
}: {
  workspace: Workspace | null;
  workspaceError: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const name = workspace?.name ?? (workspaceError ? "Backend offline" : "Loading...");
  const initial = (workspace?.name ?? "A").charAt(0).toUpperCase();
  const env = (import.meta.env.VITE_AGENTLINE_API_URL ?? "").includes("localhost") ? "Local" : "Live";
  const envColor = env === "Live" ? "text-success" : "text-sidebar-muted";

  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-left text-[13px] text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-foreground text-[10px] font-semibold text-sidebar">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sidebar-accent-foreground">{name}</div>
        </div>
        <span className={cn("flex items-center gap-1 text-[10px] uppercase tracking-wide", envColor)}>
          <Circle className="h-1.5 w-1.5 fill-current" />
          {env}
        </span>
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Current workspace</div>
          <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
            <Check className="h-3.5 w-3.5 text-success" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{name}</div>
              <div className="text-[11px] text-muted-foreground">
                {workspaceError ? "Backend unreachable" : "Selected by your API key"}
              </div>
            </div>
          </div>
          <div className="my-1 border-t" />
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
          >
            Workspace settings
          </Link>
          <div className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">
            Switching workspaces requires a different API key.
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  workspace,
  workspaceError,
  onNav,
  onSignOut,
}: {
  pathname: string;
  workspace: Workspace | null;
  workspaceError: string | null;
  onNav?: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Logo />
      </div>
      <WorkspaceSwitcher workspace={workspace} workspaceError={workspaceError} />
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isItemActive(pathname, item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNav}
                  title={item.label}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-sidebar-active text-sidebar-active-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-active-foreground" : "text-sidebar-muted")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="mb-2 flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] text-sidebar-muted">
          <span className={cn("h-1.5 w-1.5 rounded-full", workspaceError ? "bg-destructive" : "bg-success")} />
          {workspaceError ? "Backend disconnected" : "Backend connected"}
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 text-sidebar-muted" />
          Sign out
        </button>
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
      <Toaster position="bottom-right" />
      <aside className="hidden w-60 shrink-0 bg-sidebar md:flex md:flex-col">
        <SidebarContent
          pathname={pathname}
          workspace={workspace}
          workspaceError={workspaceError}
          onSignOut={signOut}
        />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar">
            <SidebarContent
              pathname={pathname}
              workspace={workspace}
              workspaceError={workspaceError}
              onNav={() => setOpen(false)}
              onSignOut={signOut}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <button
            className="rounded-md border p-1.5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Logo />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
