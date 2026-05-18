import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Save, ShieldAlert, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable } from "@/components/agentline/DataTable";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { Banner } from "@/components/agentline/Banner";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createBackendApiKey,
  listBackendApiKeys,
  revokeBackendApiKey,
  updateBackendApiKey,
  type ApiKeyListItem,
  type CreatedApiKeyView,
} from "@/lib/api/api-keys";

export const Route = createFileRoute("/_app/api-keys")({
  component: ApiKeys,
  head: () => ({ meta: [{ title: "API Keys — Vukho" }] }),
});

function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([]);
  const [createdKey, setCreatedKey] = useState<CreatedApiKeyView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadApiKeys() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listBackendApiKeys();
      setApiKeys(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load API keys.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApiKeys();
  }, []);

  const activeCount = useMemo(() => apiKeys.filter((apiKey) => apiKey.status === "active").length, [apiKeys]);

  async function createApiKey() {
    const trimmedLabel = createLabel.trim();
    if (!trimmedLabel) {
      setError("label: Label is required.");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const response = await createBackendApiKey({ label: trimmedLabel });
      setCreatedKey(response.data);
      setCreateLabel("");
      await loadApiKeys();
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not create API key.");
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(apiKey: ApiKeyListItem) {
    setEditingId(apiKey.id);
    setLabelDraft(apiKey.label);
    setError(null);
  }

  async function saveLabel(apiKey: ApiKeyListItem) {
    const trimmedLabel = labelDraft.trim();
    if (!trimmedLabel) {
      setError("label: Label is required.");
      return;
    }

    setPendingActionId(apiKey.id);
    setError(null);
    try {
      const response = await updateBackendApiKey(apiKey.id, { label: trimmedLabel });
      setApiKeys((current) => current.map((item) => (item.id === apiKey.id ? response.data : item)));
      setEditingId(null);
      setLabelDraft("");
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not update API key.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function revokeApiKey(apiKey: ApiKeyListItem) {
    const confirmed = window.confirm(`Revoke "${apiKey.label}"? Existing integrations using this key will stop working.`);
    if (!confirmed) {
      return;
    }

    setPendingActionId(apiKey.id);
    setError(null);
    try {
      const response = await revokeBackendApiKey(apiKey.id);
      setApiKeys((current) => current.map((item) => (item.id === apiKey.id ? response.data : item)));
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not revoke API key.");
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage credentials for the Vukho API."
        actions={
          <div className="inline-flex items-center gap-2 rounded-md border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            {activeCount} active
          </div>
        }
      />

      {error && (
        <Banner variant="error" className="mb-3" message={error} onDismiss={() => setError(null)} />
      )}

      {createdKey && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">New API key created</div>
              <p className="mt-1 text-xs text-emerald-800">This full key is shown once. Store it before closing this panel.</p>
            </div>
            <button type="button" onClick={() => setCreatedKey(null)} className="rounded-md p-1 text-emerald-800 hover:bg-emerald-100" aria-label="Dismiss created key">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2">
            <Mono className="min-w-0 flex-1 truncate text-xs text-emerald-950">{createdKey.key}</Mono>
            <CopyButton value={createdKey.key} label="Copy API key" showLabel />
          </div>
        </div>
      )}

      <div className="mb-4 rounded-lg border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New key label</span>
            <input
              value={createLabel}
              onChange={(event) => setCreateLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void createApiKey();
                }
              }}
              placeholder="Production backend, local agent, staging dashboard"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
            />
          </label>
          <button
            type="button"
            onClick={createApiKey}
            disabled={isCreating}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Creating..." : "Create key"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />)}</div>
        </div>
      ) : apiKeys.length === 0 ? (
        <EmptyState icon={<KeyRound className="h-5 w-5" />} title="No API keys" description="Create a key to connect agents, scripts, and integrations to Vukho." />
      ) : (
        <ApiKeysTable
          apiKeys={apiKeys}
          editingId={editingId}
          labelDraft={labelDraft}
          pendingActionId={pendingActionId}
          onLabelDraftChange={setLabelDraft}
          onStartEditing={startEditing}
          onCancelEditing={() => {
            setEditingId(null);
            setLabelDraft("");
          }}
          onSaveLabel={saveLabel}
          onRevoke={revokeApiKey}
        />
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Full API keys are shown once at creation. Vukho stores only a hash and public prefix after that.</p>
      </div>
    </div>
  );
}

function ApiKeysTable({
  apiKeys,
  editingId,
  labelDraft,
  pendingActionId,
  onLabelDraftChange,
  onStartEditing,
  onCancelEditing,
  onSaveLabel,
  onRevoke,
}: {
  apiKeys: ApiKeyListItem[];
  editingId: string | null;
  labelDraft: string;
  pendingActionId: string | null;
  onLabelDraftChange: (value: string) => void;
  onStartEditing: (apiKey: ApiKeyListItem) => void;
  onCancelEditing: () => void;
  onSaveLabel: (apiKey: ApiKeyListItem) => void;
  onRevoke: (apiKey: ApiKeyListItem) => void;
}) {
  return (
    <DataTable minWidth={960}>
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[260px] px-4 py-3 text-left font-medium">Label</th>
            <th className="w-[170px] px-4 py-3 text-left font-medium">Prefix</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">Created</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">Last used</th>
            <th className="w-[170px] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((apiKey) => {
            const isEditing = editingId === apiKey.id;
            const isPending = pendingActionId === apiKey.id;

            return (
              <tr key={apiKey.id} className="border-b last:border-b-0 hover:bg-muted/35">
                <td className="px-4 py-3">
                  {isEditing ? (
                    <input
                      value={labelDraft}
                      onChange={(event) => onLabelDraftChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          onSaveLabel(apiKey);
                        }
                        if (event.key === "Escape") {
                          onCancelEditing();
                        }
                      }}
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
                      autoFocus
                    />
                  ) : (
                    <span className="block truncate font-medium">{apiKey.label}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mono className="min-w-0 truncate text-xs text-muted-foreground">{apiKey.prefix}</Mono>
                    <CopyButton value={apiKey.prefix} label="Copy key prefix" />
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={apiKey.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{apiKey.createdLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">{apiKey.lastUsedLabel}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSaveLabel(apiKey)}
                          disabled={isPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          title="Save label"
                          aria-label="Save label"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEditing}
                          disabled={isPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartEditing(apiKey)}
                        disabled={apiKey.status === "revoked" || isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        title="Rename API key"
                        aria-label="Rename API key"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRevoke(apiKey)}
                      disabled={apiKey.status === "revoked" || isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Revoke API key"
                      aria-label="Revoke API key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
  );
}
