import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, RefreshCcw, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createBackendWebhook,
  disableBackendWebhook,
  listBackendWebhookDeliveries,
  listBackendWebhooks,
  retryBackendWebhookDelivery,
  testBackendWebhook,
  updateBackendWebhook,
  type WebhookDeliveryListItem,
  type WebhookEndpointListItem,
  type WebhookEndpointStatus,
} from "@/lib/api/webhooks";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DEFAULT_EVENTS = [
  "agent.message.received",
  "agent.message.sent",
  "agent.call.completed",
  "agent.call.ended",
  "webhook.test",
];

export const Route = createFileRoute("/_app/webhooks")({
  component: Webhooks,
  head: () => ({ meta: [{ title: "Webhooks — AgentLine" }] }),
});

function Webhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpointListItem[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryListItem[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpointListItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "view" | "update" | "test" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  async function loadEndpoints() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listBackendWebhooks();
      setEndpoints(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load webhooks.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDeliveries(endpointId?: string) {
    setIsDeliveriesLoading(true);
    setDeliveryError(null);
    try {
      const response = await listBackendWebhookDeliveries({ endpointId });
      setDeliveries(response.data);
    } catch (caught) {
      setDeliveryError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load webhook deliveries.");
    } finally {
      setIsDeliveriesLoading(false);
    }
  }

  useEffect(() => {
    void loadEndpoints();
    void loadDeliveries();
  }, []);

  const deliveriesByEndpointId = useMemo(() => {
    const map = new Map<string, WebhookDeliveryListItem[]>();
    for (const delivery of deliveries) {
      map.set(delivery.endpointId, [...(map.get(delivery.endpointId) ?? []), delivery]);
    }
    return map;
  }, [deliveries]);

  function openDrawer(mode: "create" | "view" | "update" | "test", endpoint?: WebhookEndpointListItem) {
    setSelectedEndpoint(endpoint ?? null);
    setDrawerMode(mode);
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedEndpoint(null);
  }

  async function disableEndpoint(endpoint: WebhookEndpointListItem) {
    if (!window.confirm(`Disable webhook endpoint ${endpoint.url}?`)) {
      return;
    }

    try {
      const response = await disableBackendWebhook(endpoint.id);
      setEndpoints((current) => current.map((item) => (item.id === endpoint.id ? response.data : item)));
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not disable webhook.");
    }
  }

  async function retryDelivery(delivery: WebhookDeliveryListItem) {
    try {
      const response = await retryBackendWebhookDelivery(delivery.id, { outcome: "succeeded" });
      setDeliveries((current) => current.map((item) => (item.id === delivery.id ? response.data : item)));
    } catch (caught) {
      setDeliveryError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not retry delivery.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Endpoints that receive AgentLine event deliveries."
        actions={
          <button
            onClick={() => openDrawer("create")}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />Create endpoint
          </button>
        }
      />

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />)}</div>
        </div>
      ) : endpoints.length === 0 ? (
        <EmptyState
          icon={<WebhookIcon className="h-5 w-5" />}
          title="No webhook endpoints"
          description="Create an endpoint to receive signed AgentLine events from messages, calls, and tests."
          action={<button onClick={() => openDrawer("create")} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Create endpoint</button>}
        />
      ) : (
        <WebhookTable
          endpoints={endpoints}
          deliveriesByEndpointId={deliveriesByEndpointId}
          onView={(endpoint) => openDrawer("view", endpoint)}
          onUpdate={(endpoint) => openDrawer("update", endpoint)}
          onTest={(endpoint) => openDrawer("test", endpoint)}
          onDisable={disableEndpoint}
        />
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent deliveries</h2>
            <p className="text-xs text-muted-foreground">Latest webhook delivery attempts across endpoints.</p>
          </div>
          <button onClick={() => loadDeliveries()} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            <RefreshCcw className="h-3.5 w-3.5" />Refresh
          </button>
        </div>
        {deliveryError && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{deliveryError}</div>}
        {isDeliveriesLoading ? (
          <div className="rounded-lg border bg-surface p-4">
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-8 animate-pulse rounded-md bg-muted" />)}</div>
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState title="No webhook deliveries" description="Test an endpoint or trigger an AgentLine event to create delivery records." />
        ) : (
          <DeliveriesTable deliveries={deliveries} onRetry={retryDelivery} />
        )}
      </section>

      <WebhookDrawer
        mode={drawerMode}
        endpoint={selectedEndpoint}
        deliveries={selectedEndpoint ? deliveriesByEndpointId.get(selectedEndpoint.id) ?? [] : []}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        onCreated={(endpoint) => {
          setEndpoints((current) => [endpoint, ...current]);
        }}
        onUpdated={(endpoint) => {
          setEndpoints((current) => current.map((item) => (item.id === endpoint.id ? endpoint : item)));
          closeDrawer();
        }}
        onTested={(delivery) => {
          setDeliveries((current) => [delivery, ...current]);
        }}
        onSwitchToUpdate={() => setDrawerMode("update")}
        onSwitchToTest={() => setDrawerMode("test")}
      />
    </div>
  );
}

function WebhookTable({
  endpoints,
  deliveriesByEndpointId,
  onView,
  onUpdate,
  onTest,
  onDisable,
}: {
  endpoints: WebhookEndpointListItem[];
  deliveriesByEndpointId: Map<string, WebhookDeliveryListItem[]>;
  onView: (endpoint: WebhookEndpointListItem) => void;
  onUpdate: (endpoint: WebhookEndpointListItem) => void;
  onTest: (endpoint: WebhookEndpointListItem) => void;
  onDisable: (endpoint: WebhookEndpointListItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface shadow-sm">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[360px] px-4 py-3 text-left font-medium">URL</th>
            <th className="px-4 py-3 text-left font-medium">Events</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">Last delivery</th>
            <th className="w-[100px] px-4 py-3 text-right font-medium">Failures</th>
            <th className="w-[340px] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((endpoint) => {
            const endpointDeliveries = deliveriesByEndpointId.get(endpoint.id) ?? [];
            const lastDelivery = endpointDeliveries[0];
            const failureCount = endpointDeliveries.filter((delivery) => ["failed", "retrying", "exhausted"].includes(delivery.status)).length;

            return (
              <tr
                key={endpoint.id}
                onClick={() => onView(endpoint)}
                className="group cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/35"
              >
                <td className="px-4 py-3">
                  <div className="flex max-w-full items-center gap-2">
                    <button onClick={() => onView(endpoint)} className="min-w-0 hover:underline">
                      <Mono className="block truncate">{endpoint.url}</Mono>
                    </button>
                    <CopyButton value={endpoint.url} label="Copy URL" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Mono className="text-[11px] text-muted-foreground">{endpoint.id}</Mono>
                    <CopyButton value={endpoint.id} label="Copy ID" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-h-16 flex-wrap gap-1 overflow-hidden">
                    {endpoint.events.map((event) => <Mono key={event} className="rounded border px-1.5 py-0.5 text-[11px]">{event}</Mono>)}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={endpoint.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{lastDelivery?.createdLabel ?? "Never"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{failureCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={(event) => { event.stopPropagation(); onView(endpoint); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Eye className="h-3 w-3" /> View</button>
                    <button onClick={(event) => { event.stopPropagation(); onUpdate(endpoint); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Pencil className="h-3 w-3" /> Update</button>
                    <button onClick={(event) => { event.stopPropagation(); onTest(endpoint); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Send className="h-3 w-3" /> Test</button>
                    <button onClick={(event) => { event.stopPropagation(); onDisable(endpoint); }} disabled={endpoint.status === "disabled"} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3 w-3" /> Disable</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeliveriesTable({
  deliveries,
  onRetry,
}: {
  deliveries: WebhookDeliveryListItem[];
  onRetry: (delivery: WebhookDeliveryListItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface shadow-sm">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Event</th>
            <th className="w-[260px] px-4 py-3 text-left font-medium">Endpoint</th>
            <th className="w-[130px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[100px] px-4 py-3 text-right font-medium">Attempts</th>
            <th className="w-[80px] px-4 py-3 text-right font-medium">Code</th>
            <th className="w-[150px] px-4 py-3 text-left font-medium">Created</th>
            <th className="w-[110px] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => {
            const canRetry = ["failed", "retrying", "pending"].includes(delivery.status);
            return (
              <tr key={delivery.id} className="border-b last:border-b-0 hover:bg-muted/35">
                <td className="px-4 py-3"><Mono className="block truncate">{delivery.eventType}</Mono></td>
                <td className="px-4 py-3"><Mono className="block truncate text-muted-foreground">{delivery.endpointId}</Mono></td>
                <td className="px-4 py-3"><StatusBadge status={delivery.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{delivery.attemptCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{delivery.lastStatusCode ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{delivery.createdLabel}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button onClick={() => onRetry(delivery)} disabled={!canRetry} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                      <RefreshCcw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WebhookDrawer({
  mode,
  endpoint,
  deliveries,
  onOpenChange,
  onCreated,
  onUpdated,
  onTested,
  onSwitchToUpdate,
  onSwitchToTest,
}: {
  mode: "create" | "view" | "update" | "test" | null;
  endpoint: WebhookEndpointListItem | null;
  deliveries: WebhookDeliveryListItem[];
  onOpenChange: (open: boolean) => void;
  onCreated: (endpoint: WebhookEndpointListItem) => void;
  onUpdated: (endpoint: WebhookEndpointListItem) => void;
  onTested: (delivery: WebhookDeliveryListItem) => void;
  onSwitchToUpdate: () => void;
  onSwitchToTest: () => void;
}) {
  const isCreate = mode === "create";
  const isView = mode === "view";
  const isUpdate = mode === "update";
  const isTest = mode === "test";
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS.slice(0, 2));
  const [customEvent, setCustomEvent] = useState("");
  const [status, setStatus] = useState<WebhookEndpointStatus>("active");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [testHeaders, setTestHeaders] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setError(null);
    setSecret(null);
    setTestHeaders(null);
    setSimulateFailure(false);
    if (isCreate) {
      setUrl("https://example.com/agentline/webhook");
      setSelectedEvents(DEFAULT_EVENTS.slice(0, 2));
      setCustomEvent("");
      setStatus("active");
    } else if (endpoint) {
      setUrl(endpoint.url);
      setSelectedEvents(endpoint.events);
      setCustomEvent("");
      setStatus(endpoint.status);
    }
  }, [endpoint, isCreate, mode]);

  function toggleEvent(event: string) {
    setSelectedEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event],
    );
  }

  function addCustomEvent() {
    const event = customEvent.trim();
    if (!event) {
      return;
    }
    setSelectedEvents((current) => (current.includes(event) ? current : [...current, event]));
    setCustomEvent("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isView) {
      return;
    }

    if (isTest && endpoint) {
      setIsSaving(true);
      try {
        const response = await testBackendWebhook(endpoint.id, { simulateFailure });
        setTestHeaders(response.data.headers);
        onTested(response.data.delivery);
      } catch (caught) {
        setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not test webhook.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!url.trim()) {
      setError("Webhook URL is required.");
      return;
    }

    if (selectedEvents.length === 0) {
      setError("Add at least one event type.");
      return;
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        const response = await createBackendWebhook({ url: url.trim(), events: selectedEvents });
        setSecret(response.data.secret ?? null);
        onCreated(response.data);
      } else if (isUpdate && endpoint) {
        const response = await updateBackendWebhook(endpoint.id, {
          url: url.trim(),
          events: selectedEvents,
          status,
        });
        onUpdated(response.data);
      }
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save webhook.");
    } finally {
      setIsSaving(false);
    }
  }

  const title = isCreate ? "Create webhook endpoint" : isUpdate ? "Update webhook endpoint" : isTest ? "Test webhook endpoint" : "Webhook endpoint";
  const description = isCreate
    ? "Create a signed endpoint for AgentLine events."
    : isUpdate
      ? "Update endpoint URL, event subscriptions, and status."
      : isTest
        ? "Create a mock delivery and show the signed test headers."
        : "Endpoint details, subscribed events, and recent delivery attempts.";

  return (
    <Sheet open={mode !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error && <div className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
          {secret && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">Webhook secret</div>
                <CopyButton value={secret} label="Copy secret" />
              </div>
              <Mono className="mt-1 block break-all text-xs">{secret}</Mono>
              <div className="mt-1 text-xs text-muted-foreground">This secret is only returned immediately after creation.</div>
            </div>
          )}

          {isView && endpoint ? (
            <WebhookDetails endpoint={endpoint} deliveries={deliveries} />
          ) : isTest && endpoint ? (
            <>
              <ReadOnlyField label="Endpoint" value={endpoint.url} mono copyable />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} />
                Simulate failed delivery
              </label>
              {testHeaders && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signed headers</div>
                  {Object.entries(testHeaders).map(([key, value]) => (
                    <div key={key} className="mt-2">
                      <div className="flex items-center justify-between gap-3">
                        <Mono className="text-[11px] text-muted-foreground">{key}</Mono>
                        <CopyButton value={value} label="Copy" />
                      </div>
                      <Mono className="mt-1 block break-all text-xs">{value}</Mono>
                    </div>
                  ))}
                </div>
              )}
              <SheetFooter>
                <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Close</button>
                <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Testing..." : "Send test"}
                </button>
              </SheetFooter>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium">
                Endpoint URL
                <input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono" />
              </label>
              <EventSelector
                selectedEvents={selectedEvents}
                customEvent={customEvent}
                onCustomEventChange={setCustomEvent}
                onToggleEvent={toggleEvent}
                onAddCustomEvent={addCustomEvent}
                onRemoveEvent={(event) => setSelectedEvents((current) => current.filter((item) => item !== event))}
              />
              {isUpdate && (
                <label className="block text-sm font-medium">
                  Status
                  <select value={status} onChange={(event) => setStatus(event.target.value as WebhookEndpointStatus)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              )}
              <SheetFooter>
                <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Saving..." : isCreate ? "Create endpoint" : "Save changes"}
                </button>
              </SheetFooter>
            </>
          )}

          {isView && endpoint && (
            <SheetFooter>
              <button type="button" onClick={onSwitchToTest} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Test</button>
              <button type="button" onClick={onSwitchToUpdate} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90">Update</button>
            </SheetFooter>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function WebhookDetails({
  endpoint,
  deliveries,
}: {
  endpoint: WebhookEndpointListItem;
  deliveries: WebhookDeliveryListItem[];
}) {
  return (
    <div className="space-y-4">
      <ReadOnlyField label="Endpoint ID" value={endpoint.id} mono copyable />
      <ReadOnlyField label="URL" value={endpoint.url} mono copyable />
      <ReadOnlyField label="Status" value={endpoint.status} />
      <ReadOnlyField label="Created" value={endpoint.createdLabel} />
      <ReadOnlyField label="Updated" value={endpoint.updatedLabel} />
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Events</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {endpoint.events.map((event) => <Mono key={event} className="rounded border px-1.5 py-0.5 text-[11px]">{event}</Mono>)}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent deliveries</div>
        {deliveries.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">No deliveries yet.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {deliveries.slice(0, 5).map((delivery) => (
              <div key={delivery.id} className="rounded-md border p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Mono>{delivery.eventType}</Mono>
                  <StatusBadge status={delivery.status} />
                </div>
                <div className="mt-1 text-muted-foreground">
                  {delivery.createdLabel} · attempts {delivery.attemptCount} · code {delivery.lastStatusCode ?? "-"}
                </div>
                {delivery.lastError && <div className="mt-1 text-destructive">{delivery.lastError}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventSelector({
  selectedEvents,
  customEvent,
  onCustomEventChange,
  onToggleEvent,
  onAddCustomEvent,
  onRemoveEvent,
}: {
  selectedEvents: string[];
  customEvent: string;
  onCustomEventChange: (value: string) => void;
  onToggleEvent: (event: string) => void;
  onAddCustomEvent: () => void;
  onRemoveEvent: (event: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Event capabilities</div>
      <div className="mt-1 text-xs text-muted-foreground">Choose the AgentLine events this endpoint should receive.</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DEFAULT_EVENTS.map((event) => {
          const checked = selectedEvents.includes(event);
          return (
            <label
              key={event}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-foreground bg-muted/60" : "hover:bg-muted/40"}`}
            >
              <span className="min-w-0 truncate font-mono text-xs">{event}</span>
              <input type="checkbox" checked={checked} onChange={() => onToggleEvent(event)} />
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={customEvent}
          onChange={(event) => onCustomEventChange(event.target.value)}
          placeholder="custom.event.name"
          className="min-w-0 flex-1 rounded-md border bg-surface px-3 py-2 text-sm font-mono"
        />
        <button type="button" onClick={onAddCustomEvent} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Add</button>
      </div>
      {selectedEvents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedEvents.map((event) => (
            <button
              key={event}
              type="button"
              onClick={() => onRemoveEvent(event)}
              className="rounded-md border bg-surface px-2 py-1 font-mono text-[11px] hover:bg-muted"
              title="Remove event"
            >
              {event} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value, mono = false, copyable = false }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {copyable && <CopyButton value={value} label="Copy" />}
      </div>
      {mono ? <Mono className="mt-1 block break-all text-xs">{value}</Mono> : <div className="mt-1 text-sm font-medium">{value}</div>}
    </div>
  );
}
