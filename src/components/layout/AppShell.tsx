import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Inbox, PhoneCall, Users, Webhook, BarChart3,
  CreditCard, KeyRound, FlaskConical, Settings, Activity,
  LogOut, Menu, X, Check, Circle, ChevronUp, UserRound, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/agentline/Logo";
import {
  getCurrentUser,
  logoutSession,
  switchSessionWorkspace,
  type CurrentUser,
  type CurrentUserWorkspace,
} from "@/lib/api/auth";
import { AgentLineApiError } from "@/lib/api/client";
import { getCurrentWorkspace, type Workspace } from "@/lib/api/workspace";
import { clearStoredApiKey, getStoredApiKey } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function CollapsedTooltip({
  label,
  hint,
  children,
  enabled,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip delayDuration={80}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={10}
        className="border-sidebar-border bg-sidebar px-2.5 py-1.5 text-sidebar-accent-foreground shadow-lg"
      >
        <div className="text-[12px] font-medium leading-tight">{label}</div>
        {hint && <div className="mt-0.5 text-[10.5px] text-sidebar-muted">{hint}</div>}
      </TooltipContent>
    </Tooltip>
  );
}

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

function buildApiKeyUser(workspace: Workspace): CurrentUser {
  return {
    id: "api_key_user",
    email: workspace.billingEmail ?? "",
    name: "API key session",
    avatarUrl: null,
    activeWorkspaceId: workspace.id,
    activeProjectId: "api_key_project",
    activeWorkspace: {
      id: workspace.id,
      name: workspace.name,
    },
    activeProject: {
      id: "api_key_project",
      name: "API key project",
      environment: "test",
    },
    workspaces: [
      {
        id: workspace.id,
        name: workspace.name,
        role: "developer",
        status: "active",
        projects: [
          {
            id: "api_key_project",
            name: "API key project",
            environment: "test",
          },
        ],
      },
    ],
  };
}

function WorkspaceSwitcher({
  user,
  workspaceError,
  onWorkspaceChanged,
  collapsed,
}: {
  user: CurrentUser | null;
  workspaceError: string | null;
  onWorkspaceChanged: (user: CurrentUser) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
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

  const activeWorkspace = user?.activeWorkspace;
  const name = activeWorkspace?.name ?? (workspaceError ? "Backend offline" : "Loading...");
  const initial = (activeWorkspace?.name ?? "A").charAt(0).toUpperCase();
  const env = (import.meta.env.VITE_AGENTLINE_API_URL ?? "").includes("localhost") ? "Local" : "Live";
  const envColor = env === "Live" ? "text-success" : "text-sidebar-muted";

  async function switchWorkspace(workspace: CurrentUserWorkspace) {
    const projectId = workspace.projects[0]?.id;
    if (!projectId || workspace.id === user?.activeWorkspaceId) {
      setOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      await switchSessionWorkspace(workspace.id, { projectId });
      const response = await getCurrentUser();
      onWorkspaceChanged(response.data);
      setOpen(false);
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <div ref={ref} className={cn("relative pb-3", collapsed ? "px-2" : "px-3")}>
      <CollapsedTooltip enabled={collapsed} label={name} hint={`Workspace · ${env}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 text-left text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
          collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-white/95 to-white/70 text-[11px] font-semibold text-sidebar shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]">
          {initial}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12.5px] font-medium text-sidebar-accent-foreground">{name}</div>
              <div className="truncate text-[10.5px] text-sidebar-muted">
                {user?.activeProject.name ?? "Workspace"}
              </div>
            </div>
            <span className={cn("flex items-center gap-1 rounded-full bg-black/20 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide", envColor)}>
              <Circle className="h-1.5 w-1.5 fill-current" />
              {env}
            </span>
          </>
        )}
      </button>
      </CollapsedTooltip>
      {open && (
        <div className={cn(
          "absolute top-full z-50 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
          collapsed ? "left-2 w-60" : "left-3 right-3"
        )}>
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Current workspace</div>
          <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
            <Check className="h-3.5 w-3.5 text-success" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{name}</div>
              <div className="text-[11px] text-muted-foreground">
                {workspaceError ? "Backend unreachable" : user?.activeProject.name ?? "Active project"}
              </div>
            </div>
          </div>
          {user?.workspaces.map((workspace) => {
            const isActive = workspace.id === user.activeWorkspaceId;
            return (
              <button
                key={workspace.id}
                type="button"
                disabled={isActive || isSwitching}
                onClick={() => void switchWorkspace(workspace)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-default disabled:opacity-60"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-success" />}
              </button>
            );
          })}
          <div className="my-1 border-t" />
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
          >
            Workspace settings
          </Link>
          <div className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">
            Workspace changes update your backend session.
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  workspaceError,
  onWorkspaceChanged,
  onNav,
  onSignOut,
  collapsed,
  onToggleCollapse,
}: {
  pathname: string;
  user: CurrentUser | null;
  workspaceError: string | null;
  onWorkspaceChanged: (user: CurrentUser) => void;
  onNav?: () => void;
  onSignOut: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn(
        "flex items-center pb-4 pt-5",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-white/95 to-white/70 text-[13px] font-bold text-sidebar shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]">
            A
          </div>
        ) : (
          <Logo />
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className={cn(
              "hidden items-center justify-center rounded-full text-sidebar-foreground transition-all md:inline-flex",
              collapsed
                ? "absolute right-[-13px] top-7 z-30 h-6 w-6 border border-sidebar-border bg-[oklch(0.62_0.18_255)] text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35)] hover:bg-[oklch(0.68_0.18_255)] hover:scale-105"
                : "h-6 w-6 bg-sidebar-accent/40 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <WorkspaceSwitcher user={user} workspaceError={workspaceError} onWorkspaceChanged={onWorkspaceChanged} collapsed={collapsed} />
      <nav className={cn("flex-1 overflow-y-auto pb-4 pt-1", collapsed ? "px-1.5" : "px-2")}>
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {collapsed ? (
              <div className="mx-2 mb-1 mt-2 h-px bg-sidebar-border/60" aria-hidden />
            ) : (
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                {group.label}
              </div>
            )}
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
                    "group relative flex items-center rounded-md text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-[7px]",
                    active
                      ? "bg-sidebar-active text-sidebar-active-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[oklch(0.7_0.18_255)]" />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-active-foreground" : "text-sidebar-muted")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <ProfileSection user={user} workspaceError={workspaceError} onNav={onNav} onSignOut={onSignOut} collapsed={collapsed} />
    </div>
  );
}

function ProfileSection({
  user,
  workspaceError,
  onNav,
  onSignOut,
  collapsed,
}: {
  user: CurrentUser | null;
  workspaceError: string | null;
  onNav?: () => void;
  onSignOut: () => void;
  collapsed?: boolean;
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

  const email = user?.email ?? null;
  const displayName = user?.name ?? email?.split("@")[0] ?? user?.activeWorkspace.name ?? "Account";
  const subtitle = email ?? (workspaceError ? "Backend unreachable" : "Signed in");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className={cn("relative border-t border-sidebar-border/80", collapsed ? "p-1.5" : "p-2")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `${displayName}${email ? ` · ${email}` : ""}` : undefined}
        className={cn(
          "flex w-full items-center rounded-lg text-left transition-colors hover:bg-sidebar-accent/70",
          collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-2"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-accent to-sidebar-active text-[11px] font-semibold text-sidebar-accent-foreground ring-1 ring-inset ring-white/5">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-sidebar-accent-foreground">{displayName}</div>
              <div className="flex items-center gap-1 truncate text-[11px] text-sidebar-muted">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", workspaceError ? "bg-destructive" : "bg-success")} />
                <span className="truncate">{subtitle}</span>
              </div>
            </div>
            <ChevronUp className={cn("h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform", !open && "rotate-180")} />
          </>
        )}
      </button>
      {open && (
        <div className={cn(
          "absolute bottom-full z-50 mb-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
          collapsed ? "left-2 w-56" : "left-2 right-2"
        )}>
          <div className="px-2 py-2 text-xs">
            <div className="truncate font-medium">{displayName}</div>
            {email && <div className="truncate text-muted-foreground">{email}</div>}
          </div>
          <div className="my-1 border-t" />
          <Link
            to="/settings"
            onClick={() => { setOpen(false); onNav?.(); }}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
          >
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
            Account & workspace
          </Link>
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("agentline:sidebar:collapsed") === "1";
  });
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("agentline:sidebar:collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (!cancelled) {
          setUser(response.data);
          setWorkspaceError(null);
          setIsAuthed(true);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          if (caught instanceof AgentLineApiError && caught.status === 401) {
            const fallbackApiKey = getStoredApiKey();
            if (!fallbackApiKey) {
              window.location.href = "/login";
              return;
            }

            getCurrentWorkspace(fallbackApiKey)
              .then((response) => {
                if (!cancelled) {
                  setUser(buildApiKeyUser(response.data));
                  setWorkspaceError(null);
                  setIsAuthed(true);
                }
              })
              .catch(() => {
                if (!cancelled) {
                  clearStoredApiKey();
                  window.location.href = "/login";
                }
              })
              .finally(() => {
                if (!cancelled) {
                  setIsAuthChecked(true);
                }
              });
            return;
          }
          setWorkspaceError("Could not reach the backend.");
          setIsAuthed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAuthChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    try {
      await logoutSession();
    } catch {
      // Local cleanup still signs the user out if the backend session is already gone.
    }
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
    <div className="flex h-svh max-w-full overflow-hidden bg-background">
      <Toaster position="bottom-right" />
      <aside
        className={cn(
          "relative hidden h-svh shrink-0 bg-sidebar transition-[width] duration-200 ease-out md:flex md:flex-col",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarContent
          pathname={pathname}
          user={user}
          workspaceError={workspaceError}
          onWorkspaceChanged={setUser}
          onSignOut={signOut}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar">
            <SidebarContent
              pathname={pathname}
              user={user}
              workspaceError={workspaceError}
              onWorkspaceChanged={setUser}
              onNav={() => setOpen(false)}
              onSignOut={signOut}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-7 md:px-10 md:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
