import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  CreditCard,
  KeyRound,
  MailCheck,
  MailPlus,
  Phone,
  PlayCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/vukho/CopyButton";
import { DataTable } from "@/components/vukho/DataTable";
import { EmptyState } from "@/components/vukho/EmptyState";
import { Mono } from "@/components/vukho/Mono";
import { PageHeader } from "@/components/vukho/PageHeader";
import { StatusBadge } from "@/components/vukho/StatusBadge";
import { Banner } from "@/components/vukho/Banner";
import { listAuditEvents, type AuditEventListItem } from "@/lib/api/audit";
import { getCurrentUser, type CurrentUser } from "@/lib/api/auth";
import { VukhoApiError, formatApiError } from "@/lib/api/client";
import { updateBackendBillingControls } from "@/lib/api/billing";
import {
  createWorkspaceInvite,
  getCurrentWorkspace,
  getCurrentWorkspaceSettings,
  listWorkspaceInvites,
  listWorkspaceMembers,
  removeWorkspaceMember,
  resendWorkspaceInvite,
  revokeWorkspaceInvite,
  updateCurrentWorkspace,
  updateWorkspaceMember,
  type Workspace,
  type WorkspaceInvite,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceSettings,
} from "@/lib/api/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — Vukho" }] }),
});

const tabs = [
  "Workspace",
  "Members",
  "Invites",
  "Sign-in",
  "Channels",
  "Controls",
  "Audit log",
] as const;
const roles: WorkspaceRole[] = ["owner", "admin", "developer", "billing", "viewer", "member"];

function Settings() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Workspace");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const [workspaceResponse, userResponse, memberResponse, inviteResponse] = await Promise.all([
        getCurrentWorkspace(),
        getCurrentUser(),
        listWorkspaceMembers(),
        listWorkspaceInvites(),
      ]);
      const settingsResponse = await getCurrentWorkspaceSettings();
      setWorkspace(workspaceResponse.data);
      setWorkspaceSettings(settingsResponse.data);
      setCurrentUser(userResponse.data);
      setMembers(memberResponse.data);
      setInvites(inviteResponse.data);
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace identity, team access, phone channels, billing controls, and trust settings."
        actions={
          <button
            onClick={loadSettings}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <div className="border-b">
        <div className="flex flex-wrap gap-1">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === item
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && <Banner variant="error" message={error} className="mt-5" />}

      <div className="mt-6">
        {tab === "Workspace" && (
          <WorkspacePanel
            workspace={workspace}
            settings={workspaceSettings}
            loading={loading}
            onSaved={setWorkspace}
          />
        )}
        {tab === "Members" && (
          <MembersPanel members={members} loading={loading} onChanged={loadSettings} />
        )}
        {tab === "Invites" && (
          <InvitesPanel invites={invites} loading={loading} onChanged={loadSettings} />
        )}
        {tab === "Sign-in" && <AuthPanel currentUser={currentUser} loading={loading} />}
        {tab === "Channels" && <ChannelsPanel settings={workspaceSettings} loading={loading} />}
        {tab === "Controls" && (
          <ControlsPanel settings={workspaceSettings} loading={loading} onChanged={loadSettings} />
        )}
        {tab === "Audit log" && <AuditLogPanel />}
      </div>
    </div>
  );
}

function WorkspacePanel({
  workspace,
  settings,
  loading,
  onSaved,
}: {
  workspace: Workspace | null;
  settings: WorkspaceSettings | null;
  loading: boolean;
  onSaved: (workspace: Workspace) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(workspace?.name ?? "");
  }, [workspace?.name]);

  async function saveWorkspace() {
    setSaving(true);
    setError(null);
    try {
      const response = await updateCurrentWorkspace({ name });
      onSaved(response.data);
      toast.success("Workspace saved");
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not save workspace.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PanelShell title="Workspace">
        <SkeletonRows />
      </PanelShell>
    );
  }

  return (
    <div className="space-y-5">
      <LaunchReadinessPanel settings={settings} />

      <PanelShell title="Workspace">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(260px,1fr)]">
          <div className="space-y-5">
            {error && <InlineError error={error} />}
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Workspace name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={saveWorkspace}
              disabled={saving || name.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save workspace"}
            </button>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workspace ID
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Mono>{workspace?.id ?? "Unavailable"}</Mono>
              {workspace?.id && <CopyButton value={workspace.id} label="Copy workspace ID" />}
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Meta label="Created" value={formatDate(workspace?.createdAt)} />
              <Meta label="Updated" value={formatDate(workspace?.updatedAt)} />
            </div>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}

function LaunchReadinessPanel({ settings }: { settings: WorkspaceSettings | null }) {
  if (!settings) {
    return null;
  }

  const steps = [
    {
      key: "agent",
      title: "Create an agent",
      description: "Define the phone agent that will handle conversations.",
      complete: settings.onboarding.hasAgent,
      icon: Bot,
      to: "/agents",
      action: "Open agents",
    },
    {
      key: "number",
      title: "Attach a live number",
      description: "Connect a phone number so customers can call or text the agent.",
      complete: settings.onboarding.hasActiveNumber,
      icon: Phone,
      to: "/numbers",
      action: "Open numbers",
    },
    {
      key: "webhook",
      title: "Send events to your app",
      description: "Choose the webhook events your backend should receive.",
      complete: settings.onboarding.hasWebhook,
      icon: Webhook,
      to: "/webhooks",
      action: "Open webhooks",
    },
  ] as const;

  const nextStep = steps.find((step) => !step.complete);
  const liveReady = settings.onboarding.readyForLiveTraffic;

  return (
    <section className="rounded-lg border bg-surface p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Launch readiness</h2>
            <StatusBadge status={liveReady ? "ready" : "setup"} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveReady
              ? "This workspace has the core pieces needed for live calls, messages, and webhook outcomes."
              : nextStep
                ? `Next: ${nextStep.title.toLowerCase()}.`
                : "Finish setup before sending production traffic."}
          </p>
        </div>
        <Link
          to={liveReady ? "/playground" : (nextStep?.to ?? "/agents")}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          <PlayCircle className="h-4 w-4" />
          {liveReady ? "Run live test" : (nextStep?.action ?? "Continue setup")}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              to={step.to}
              className={cn(
                "rounded-lg border p-4 transition-colors hover:bg-muted/30",
                step.complete ? "border-success/25 bg-success/5" : "bg-muted/15",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md border bg-surface p-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <StatusBadge status={step.complete ? "complete" : "next"} />
              </div>
              <div className="mt-4 text-sm font-semibold">{step.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MembersPanel({
  members,
  loading,
  onChanged,
}: {
  members: WorkspaceMember[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const activeMembers = useMemo(
    () => members.filter((member) => member.status !== "removed"),
    [members],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(member: WorkspaceMember, role: WorkspaceRole) {
    setBusyId(member.id);
    setError(null);
    try {
      await updateWorkspaceMember(member.id, { role });
      toast.success("Member role updated");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not update member.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!window.confirm(`Remove ${member.user.email} from this workspace?`)) {
      return;
    }

    setBusyId(member.id);
    setError(null);
    try {
      await removeWorkspaceMember(member.id);
      toast.success("Member removed");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not remove member.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PanelShell title="Members">
      {error && <InlineError error={error} />}
      {loading ? (
        <SkeletonRows />
      ) : activeMembers.length === 0 ? (
        <EmptyState
          title="No members"
          description="Invite a teammate to give them workspace access."
        />
      ) : (
        <DataTable minWidth={820}>
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{member.user.name ?? member.user.email}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{member.user.email}</span>
                    <CopyButton value={member.user.email} label="Copy email" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.role}
                    onChange={(event) =>
                      void changeRole(member, event.target.value as WorkspaceRole)
                    }
                    disabled={busyId === member.id}
                    className="rounded-md border bg-surface px-2 py-1 text-xs"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={member.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void removeMember(member)}
                    disabled={busyId === member.id || member.role === "owner"}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </PanelShell>
  );
}

function InvitesPanel({
  invites,
  loading,
  onChanged,
}: {
  invites: WorkspaceInvite[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<WorkspaceInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createInvite() {
    setSubmitting(true);
    setError(null);
    setCreatedInvite(null);
    try {
      const response = await createWorkspaceInvite({ email, role });
      setCreatedInvite(response.data);
      setEmail("");
      setRole("member");
      toast.success("Invite created");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not create invite.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(invite: WorkspaceInvite) {
    setBusyId(invite.id);
    setError(null);
    try {
      await revokeWorkspaceInvite(invite.id);
      toast.success("Invite revoked");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not revoke invite.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function resend(invite: WorkspaceInvite) {
    setBusyId(invite.id);
    setError(null);
    try {
      await resendWorkspaceInvite(invite.id);
      toast.success("Invite resent");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not resend invite.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PanelShell title="Invites">
      <div className="space-y-6">
        {error && <InlineError error={error} />}
        <div className="grid gap-3 rounded-lg border bg-muted/15 p-4 md:grid-cols-[minmax(240px,1fr)_160px_auto]">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="rounded-md border bg-surface px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as WorkspaceRole)}
            className="rounded-md border bg-surface px-3 py-2 text-sm"
          >
            {roles
              .filter((item) => item !== "owner")
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>
          <button
            onClick={createInvite}
            disabled={submitting || email.trim().length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            <MailPlus className="h-4 w-4" />
            {submitting ? "Inviting..." : "Invite"}
          </button>
        </div>

        {createdInvite?.rawToken && (
          <div className="rounded-lg border border-success/25 bg-success/5 p-4">
            <div className="text-sm font-medium text-success">One-time invite token created</div>
            <div className="mt-2 flex items-center gap-2">
              <Mono>{createdInvite.rawToken}</Mono>
              <CopyButton value={createdInvite.rawToken} label="Copy invite token" />
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : invites.length === 0 ? (
          <EmptyState
            title="No invites"
            description="Create an invite when you are ready to add a teammate."
          />
        ) : (
          <DataTable minWidth={920}>
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invite.email}</span>
                      <CopyButton value={invite.email} label="Copy email" />
                    </div>
                    <div className="mt-1">
                      <Mono>{invite.id}</Mono>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{invite.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invite.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(invite.expiresAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void resend(invite)}
                        disabled={busyId === invite.id || invite.status !== "pending"}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => void revoke(invite)}
                        disabled={busyId === invite.id || invite.status !== "pending"}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </PanelShell>
  );
}

function ChannelsPanel({
  settings,
  loading,
}: {
  settings: WorkspaceSettings | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <PanelShell title="Vukho readiness">
        <SkeletonRows />
      </PanelShell>
    );
  }

  if (!settings) {
    return (
      <PanelShell title="Vukho readiness">
        <EmptyState
          title="Readiness unavailable"
          description="Refresh settings after the backend is reachable."
        />
      </PanelShell>
    );
  }

  const phoneReadiness = settings.providers.telecom;
  const billingReadiness = settings.providers.stripe;
  const emailReadiness = settings.providers.brevo;
  const auth = settings.providers.auth;
  const channelItems = [
    {
      icon: Activity,
      title: "Phone number operations",
      description: phoneReadiness.credentialsReady
        ? "Numbers can be assigned to agents for calls and SMS."
        : "Finish phone account setup before assigning live numbers to agents.",
      status: phoneReadiness.credentialsReady ? "active" : "pending",
      meta: ["Numbers", "Calls", "SMS"],
    },
    {
      icon: ShieldCheck,
      title: "Inbound events",
      description: phoneReadiness.callbackUrlsReady
        ? "Incoming messages, call updates, and speech turns can reach Vukho."
        : "Finish event routing so live calls and messages update the workspace.",
      status: phoneReadiness.callbackUrlsReady ? "active" : "pending",
      meta: ["Inbound SMS", "Call updates", "Speech capture"],
    },
    {
      icon: CreditCard,
      title: "Billing and payments",
      description:
        billingReadiness.secretKeyConfigured && billingReadiness.webhookSecretConfigured
          ? "Plans, credits, invoices, and usage settlement are connected."
          : "Connect billing before paid workspaces can self-serve plans and credits.",
      status:
        billingReadiness.secretKeyConfigured && billingReadiness.webhookSecretConfigured
          ? "active"
          : "pending",
      meta: [
        "Credits",
        "Plans",
        "Invoices",
        billingReadiness.usageMeterEventNameConfigured ? "Usage charging" : "Usage ledger",
      ],
    },
    {
      icon: MailCheck,
      title: "Team emails",
      description:
        emailReadiness.apiKeyConfigured && emailReadiness.fromEmailConfigured
          ? "Workspace invitations and account notices can be delivered."
          : "Finish email setup before relying on invite delivery.",
      status:
        emailReadiness.apiKeyConfigured && emailReadiness.fromEmailConfigured
          ? "active"
          : "pending",
      meta: ["Invites", "Account notices"],
    },
    {
      icon: KeyRound,
      title: "Secure sign-in",
      description: auth.googleConfigured
        ? "Workspace users can sign in with a protected dashboard session."
        : "Finish sign-in setup before inviting production teammates.",
      status: auth.googleConfigured ? "active" : "pending",
      meta: ["Google sign-in", "Secure sessions", "Protected writes"],
    },
  ];

  return (
    <PanelShell title="Vukho readiness">
      <div className="grid gap-3 lg:grid-cols-2">
        {channelItems.map((item) => (
          <CapabilityReadinessCard key={item.title} item={item} />
        ))}
      </div>
    </PanelShell>
  );
}

function ControlsPanel({
  settings,
  loading,
  onChanged,
}: {
  settings: WorkspaceSettings | null;
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [spendLimit, setSpendLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.billing.spendLimitCents == null) {
      setSpendLimit("");
      return;
    }
    setSpendLimit((settings.billing.spendLimitCents / 100).toFixed(2));
  }, [settings?.billing.spendLimitCents]);

  async function saveSpendLimit() {
    setSaving(true);
    setError(null);
    try {
      const normalized = spendLimit.trim();
      const spendLimitCents =
        normalized.length === 0 ? null : Math.round(Number.parseFloat(normalized) * 100);
      if (spendLimitCents !== null && (!Number.isFinite(spendLimitCents) || spendLimitCents < 0)) {
        setError("Spend limit must be a positive dollar amount.");
        return;
      }
      await updateBackendBillingControls({ spendLimitCents });
      toast.success("Billing controls saved");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError
          ? formatApiError(caught)
          : "Could not save billing controls.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PanelShell title="Usage and compliance controls">
        <SkeletonRows />
      </PanelShell>
    );
  }

  if (!settings) {
    return (
      <PanelShell title="Usage and compliance controls">
        <EmptyState
          title="Controls unavailable"
          description="Refresh settings after the backend is reachable."
        />
      </PanelShell>
    );
  }

  const canManageBilling = settings.controls.canManageBilling;
  const balance = settings.billing.balanceCents / 100;
  const retention = settings.controls.retention;
  const recording = settings.controls.recording;
  const recordingDescription =
    recording?.enabled === true
      ? "Recording consent policy is configured for call recording."
      : "Call recording is disabled until a workspace consent policy is configured.";
  const retentionDescription = retention
    ? `Transcripts are retained for ${retention.transcriptsDays} days and raw event evidence for ${retention.rawEventsDays} days.`
    : "Default retention windows apply until custom retention controls are enabled.";

  return (
    <PanelShell title="Usage and compliance controls">
      <div className="space-y-5">
        {error && <InlineError error={error} />}
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)]">
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Workspace spend limit</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stop new billable calls, messages, and number actions once tracked usage reaches
                  this cap.
                </p>
              </div>
              <StatusBadge
                status={settings.billing.spendLimitCents == null ? "disabled" : "active"}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Monthly cap, USD</span>
                <input
                  value={spendLimit}
                  onChange={(event) => setSpendLimit(event.target.value)}
                  placeholder="No limit"
                  disabled={!canManageBilling}
                  inputMode="decimal"
                  className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={saveSpendLimit}
                disabled={saving || !canManageBilling}
                className="self-end rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save limit"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-sm font-semibold">Billing guardrails</div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Meta
                label="Available balance"
                value={`${settings.billing.currency} ${balance.toFixed(2)}`}
              />
              <Meta
                label="Prepaid required"
                value={settings.billing.prepaidRequired ? "Enabled" : "Disabled"}
              />
              <Meta label="Low balance state" value={settings.billing.lowBalance ? "Yes" : "No"} />
              <Meta label="Can manage billing" value={canManageBilling ? "Yes" : "No"} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ControlStatus
            title="Audit log viewer"
            status="active"
            description="Every workspace, team, API key, billing, number, call, and webhook change is captured for review."
          />
          <ControlStatus
            title="Recording consent controls"
            status={recording?.enabled ? "active" : "disabled"}
            description={recordingDescription}
          />
          <ControlStatus
            title="Data retention settings"
            status={retention?.configurable ? "active" : "disabled"}
            description={retentionDescription}
          />
          <ControlStatus
            title="Team permission controls"
            status="active"
            description="Workspace roles gate member, invite, API key, and billing actions."
          />
        </div>
      </div>
    </PanelShell>
  );
}

function CapabilityReadinessCard({
  item,
}: {
  item: {
    icon: LucideIcon;
    title: string;
    description: string;
    status: string;
    meta: string[];
  };
}) {
  const Icon = item.icon;
  return (
    <div className="rounded-lg border bg-muted/15 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="rounded-md border bg-surface p-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{item.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.meta.map((meta) => (
          <span
            key={meta}
            className="rounded-md border bg-surface px-2 py-1 text-xs text-muted-foreground"
          >
            {meta}
          </span>
        ))}
      </div>
    </div>
  );
}

function ControlStatus({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/15 p-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

function AuthPanel({
  currentUser,
  loading,
}: {
  currentUser: CurrentUser | null;
  loading: boolean;
}) {
  return (
    <PanelShell title="Sign-in and sessions">
      {loading ? (
        <SkeletonRows />
      ) : !currentUser ? (
        <EmptyState
          title="No session loaded"
          description="Sign in again to create a secure dashboard session."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              User
            </div>
            <div className="mt-2 text-sm font-medium">{currentUser.name ?? currentUser.email}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentUser.email}</span>
              <CopyButton value={currentUser.email} label="Copy email" />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session context
            </div>
            <div className="mt-2 text-sm font-medium">{currentUser.activeWorkspace.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {currentUser.activeProject.name}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workspaces
            </div>
            <div className="mt-2 text-2xl font-semibold">{currentUser.workspaces.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Available through backend session switching.
            </div>
          </div>
          <div className="rounded-lg border bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Single sign-on
              </span>
              <StatusBadge status="active" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Dashboard requests use HTTP-only session cookies and CSRF-protected writes.
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEventListItem[]>([]);
  const [selected, setSelected] = useState<AuditEventListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAuditEvents() {
    setLoading(true);
    setError(null);
    try {
      const response = await listAuditEvents(75);
      setEvents(response.data);
      setSelected((current) => {
        if (!current) {
          return response.data[0] ?? null;
        }
        return response.data.find((event) => event.id === current.id) ?? response.data[0] ?? null;
      });
    } catch (caught) {
      setError(
        caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load audit log.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAuditEvents();
  }, []);

  const columns = [
    {
      key: "createdAt",
      label: "Time",
      width: 150,
      sortable: true,
      sortAccessor: (event: AuditEventListItem) => new Date(event.createdAt),
      render: (event: AuditEventListItem) => (
        <span className="text-muted-foreground">{event.createdLabel}</span>
      ),
    },
    {
      key: "action",
      label: "Activity",
      width: 260,
      sortable: true,
      render: (event: AuditEventListItem) => (
        <div>
          <div className="font-medium">{event.actionLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">{event.summary}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Area",
      width: 130,
      sortable: true,
      render: (event: AuditEventListItem) => <StatusBadge status={event.category} />,
    },
    {
      key: "actor",
      label: "Actor",
      width: 150,
      sortable: true,
      sortAccessor: (event: AuditEventListItem) => event.actorLabel,
      render: (event: AuditEventListItem) => (
        <div>
          <div>{event.actorLabel}</div>
          {event.actorDetail && (
            <div className="mt-1 text-xs text-muted-foreground">{event.actorDetail}</div>
          )}
        </div>
      ),
    },
    {
      key: "resource",
      label: "Object",
      width: 220,
      sortable: true,
      sortAccessor: (event: AuditEventListItem) => event.resourceLabel,
      render: (event: AuditEventListItem) => (
        <div>
          <div>{event.resourceLabel}</div>
          {event.resourceId && (
            <div className="mt-1 flex items-center gap-2">
              <Mono>{event.resourceId}</Mono>
              <CopyButton value={event.resourceId} label="Copy object ID" />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <PanelShell title="Audit log">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Review workspace, team, billing, API key, number, call, and webhook changes.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use this when you need to answer who changed something, when it happened, and what
              object was affected.
            </p>
          </div>
          <button
            onClick={loadAuditEvents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {error && <InlineError error={error} />}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DataTable
            columns={columns}
            data={events}
            isLoading={loading}
            skeletonRows={6}
            minWidth={900}
            stickyHeader
            maxBodyHeight={520}
            defaultSort={{ key: "createdAt", dir: "desc" }}
            getRowKey={(event) => event.id}
            onRowClick={(event) => setSelected(event)}
            emptyState={
              <EmptyState
                title="No audit activity yet"
                description="Workspace changes will appear here after users edit settings, billing, API keys, calls, numbers, or webhooks."
              />
            }
          />

          <AuditEventDetails event={selected} />
        </div>
      </div>
    </PanelShell>
  );
}

function AuditEventDetails({ event }: { event: AuditEventListItem | null }) {
  if (!event) {
    return (
      <aside className="rounded-lg border bg-muted/15 p-4">
        <div className="text-sm font-semibold">Activity details</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an audit event to inspect the affected object and captured context.
        </p>
      </aside>
    );
  }

  const details = friendlyAuditDetails(event);

  return (
    <aside className="rounded-lg border bg-muted/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{event.actionLabel}</div>
          <p className="mt-1 text-sm text-muted-foreground">{event.createdLabel}</p>
        </div>
        <StatusBadge status={event.category} />
      </div>

      <div className="mt-5 space-y-4">
        <Meta
          label="Actor"
          value={
            event.actorDetail ? `${event.actorLabel} (${event.actorDetail})` : event.actorLabel
          }
        />
        <Meta label="Object" value={event.resourceLabel} />
        {event.resourceId && (
          <div>
            <div className="text-xs font-medium text-muted-foreground">Object ID</div>
            <div className="mt-1 flex items-center gap-2">
              <Mono>{event.resourceId}</Mono>
              <CopyButton value={event.resourceId} label="Copy object ID" />
            </div>
          </div>
        )}
        <Meta label="Summary" value={event.summary} />

        {details.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground">Captured details</div>
            <div className="mt-2 divide-y rounded-lg border bg-surface">
              {details.map((detail) => (
                <div key={detail.label} className="grid gap-2 px-3 py-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">{detail.label}</span>
                  <span className="break-words">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-muted-foreground">Audit event ID</div>
          <div className="mt-1 flex items-center gap-2">
            <Mono>{event.id}</Mono>
            <CopyButton value={event.id} label="Copy audit event ID" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function friendlyAuditDetails(event: AuditEventListItem) {
  const entries = Object.entries(event.metadata).filter(
    ([key, value]) => isCustomerSafeAuditMetadata(key) && value !== null && value !== undefined,
  );

  return entries.slice(0, 8).map(([key, value]) => ({
    label: formatAuditMetadataLabel(key),
    value: formatAuditMetadataValue(key, value),
  }));
}

function isCustomerSafeAuditMetadata(key: string) {
  const lower = key.toLowerCase();
  return !(
    lower.includes("provider") ||
    lower.includes("stripe") ||
    lower.includes("twilio") ||
    lower.includes("secret") ||
    lower.includes("token") ||
    lower.includes("raw")
  );
}

function formatAuditMetadataLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAuditMetadataValue(key: string, value: unknown) {
  if (typeof value === "number" && key.toLowerCase().endsWith("cents")) {
    return `$${(value / 100).toFixed(2)}`;
  }

  if (typeof value === "string" && key.toLowerCase().endsWith("cents")) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return `$${(parsed / 100).toFixed(2)}`;
    }
  }

  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-surface p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InlineError({ error }: { error: string }) {
  return <Banner variant="error" message={error} />;
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
