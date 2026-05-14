import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, MailPlus, RefreshCw, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/agentline/CopyButton";
import { DataTable } from "@/components/agentline/DataTable";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Mono } from "@/components/agentline/Mono";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Banner } from "@/components/agentline/Banner";
import { getCurrentUser, type CurrentUser } from "@/lib/api/auth";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createWorkspaceInvite,
  getCurrentWorkspace,
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
} from "@/lib/api/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — AgentLine" }] }),
});

const tabs = ["Workspace", "Members", "Invites", "Auth", "Providers", "Controls"] as const;
const roles: WorkspaceRole[] = ["owner", "admin", "developer", "billing", "viewer", "member"];

function Settings() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Workspace");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
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
      setWorkspace(workspaceResponse.data);
      setCurrentUser(userResponse.data);
      setMembers(memberResponse.data);
      setInvites(inviteResponse.data);
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load settings.",
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
        description="Workspace controls, team access, provider readiness, and product gaps."
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
          <WorkspacePanel workspace={workspace} loading={loading} onSaved={setWorkspace} />
        )}
        {tab === "Members" && (
          <MembersPanel members={members} loading={loading} onChanged={loadSettings} />
        )}
        {tab === "Invites" && (
          <InvitesPanel invites={invites} loading={loading} onChanged={loadSettings} />
        )}
        {tab === "Auth" && (
          <AuthPanel currentUser={currentUser} loading={loading} />
        )}
        {tab === "Providers" && (
          <BackendGapPanel
            title="Provider settings"
            items={[
              "Twilio runtime status endpoint",
              "Provider credential validation endpoint",
              "10DLC/compliance status fields",
              "Provider failover preference",
            ]}
          />
        )}
        {tab === "Controls" && (
          <BackendGapPanel
            title="Usage and compliance controls"
            items={[
              "Editable spend limit endpoint",
              "Recording consent controls",
              "Audit log viewer",
              "Data retention settings",
            ]}
          />
        )}
      </div>
    </div>
  );
}

function WorkspacePanel({
  workspace,
  loading,
  onSaved,
}: {
  workspace: Workspace | null;
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save workspace.",
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not update member.",
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not remove member.",
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not create invite.",
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not revoke invite.",
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
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not resend invite.",
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

function BackendGapPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <PanelShell title={title}>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-lg border bg-muted/15 px-4 py-3"
          >
            <span className="text-sm font-medium">{item}</span>
            <StatusBadge status="pending" />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function AuthPanel({ currentUser, loading }: { currentUser: CurrentUser | null; loading: boolean }) {
  return (
    <PanelShell title="Auth and Google SSO">
      {loading ? (
        <SkeletonRows />
      ) : !currentUser ? (
        <EmptyState
          title="No session loaded"
          description="Sign in with Google to create a backend session."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">User</div>
            <div className="mt-2 text-sm font-medium">{currentUser.name ?? currentUser.email}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentUser.email}</span>
              <CopyButton value={currentUser.email} label="Copy email" />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session context</div>
            <div className="mt-2 text-sm font-medium">{currentUser.activeWorkspace.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{currentUser.activeProject.name}</div>
          </div>
          <div className="rounded-lg border bg-muted/15 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspaces</div>
            <div className="mt-2 text-2xl font-semibold">{currentUser.workspaces.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">Available through backend session switching.</div>
          </div>
          <div className="rounded-lg border bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Google SSO</span>
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
