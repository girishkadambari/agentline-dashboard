import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, RefreshCcw, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { DataTable, type Column } from "@/components/agentline/DataTable";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { Banner } from "@/components/agentline/Banner";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  createBackendWebhook,
  disableBackendWebhook,
  listBackendWebhookEvents,
  listBackendWebhookDeliveries,
  listBackendWebhooks,
  retryBackendWebhookDelivery,
  testBackendWebhook,
  updateBackendWebhook,
  type WebhookDeliveryListItem,
  type WebhookEventCatalogGroup,
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
  "agent.*",
  "agent.message.*",
  "agent.call.*",
  "agent.number.*",
  "agent.message.received",
  "agent.message.sent",
  "agent.message.delivery_updated",
  "agent.call.started",
  "agent.call.status_updated",
  "agent.call.transcript_updated",
  "agent.call.completed",
  "agent.call.failed",
  "agent.call.ended",
  "agent.call.transferred",
  "agent.number.provisioned",
  "agent.number.imported",
  "agent.number.attached",
  "agent.number.detached",
  "agent.number.released",
  "agent.number.failed",
  "agent.conversation.created",
  "agent.conversation.updated",
  "agent.contact.created",
  "agent.contact.updated",
  "agent.created",
  "agent.updated",
  "agent.disabled",
  "webhook.test",
];
const DEFAULT_SELECTED_EVENTS = ["agent.message.*", "agent.call.*"];

const FALLBACK_EVENT_CATALOG: WebhookEventCatalogGroup[] = [
  {
    group: "Recommended",
    events: [
      { name: "agent.message.*", description: "All SMS/message events." },
      { name: "agent.call.*", description: "All call lifecycle and transcript events." },
      { name: "agent.number.*", description: "All phone number lifecycle events." },
      { name: "agent.*", description: "All agent-scoped events." },
      { name: "*", description: "Every AgentLine event." },
    ],
  },
  {
    group: "Messages",
    events: DEFAULT_EVENTS.filter((event) => event.startsWith("agent.message.")).map((name) => ({
      name,
      description: "",
    })),
  },
  {
    group: "Calls",
    events: DEFAULT_EVENTS.filter((event) => event.startsWith("agent.call.")).map((name) => ({
      name,
      description: "",
    })),
  },
  {
    group: "Numbers",
    events: DEFAULT_EVENTS.filter((event) => event.startsWith("agent.number.")).map((name) => ({
      name,
      description: "",
    })),
  },
];

export const Route = createFileRoute("/_app/webhooks")({
  component: Webhooks,
  head: () => ({ meta: [{ title: "Webhooks — Vukho" }] }),
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
  const [eventCatalog, setEventCatalog] =
    useState<WebhookEventCatalogGroup[]>(FALLBACK_EVENT_CATALOG);

  async function loadEndpoints() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listBackendWebhooks();
      setEndpoints(response.data);
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load webhooks.",
      );
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
      setDeliveryError(
        caught instanceof AgentLineApiError
          ? formatApiError(caught)
          : "Could not load webhook deliveries.",
      );
    } finally {
      setIsDeliveriesLoading(false);
    }
  }

  useEffect(() => {
    void loadEndpoints();
    void loadDeliveries();
    void listBackendWebhookEvents()
      .then((catalog) => {
        if (catalog.length > 0) {
          setEventCatalog(catalog);
        }
      })
      .catch(() => undefined);
  }, []);

  const deliveriesByEndpointId = useMemo(() => {
    const map = new Map<string, WebhookDeliveryListItem[]>();
    for (const delivery of deliveries) {
      map.set(delivery.endpointId, [...(map.get(delivery.endpointId) ?? []), delivery]);
    }
    return map;
  }, [deliveries]);

  function openDrawer(
    mode: "create" | "view" | "update" | "test",
    endpoint?: WebhookEndpointListItem,
  ) {
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
      setEndpoints((current) =>
        current.map((item) => (item.id === endpoint.id ? response.data : item)),
      );
    } catch (caught) {
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not disable webhook.",
      );
    }
  }

  async function retryDelivery(delivery: WebhookDeliveryListItem) {
    try {
      const response = await retryBackendWebhookDelivery(delivery.id, { outcome: "succeeded" });
      setDeliveries((current) =>
        current.map((item) => (item.id === delivery.id ? response.data : item)),
      );
    } catch (caught) {
      setDeliveryError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not retry delivery.",
      );
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
            <Plus className="h-3.5 w-3.5" />
            Create endpoint
          </button>
        }
      />

      {error && <Banner variant="error" message={error} className="mb-3" />}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      ) : endpoints.length === 0 ? (
        <EmptyState
          icon={<WebhookIcon className="h-5 w-5" />}
          title="No webhook endpoints"
          description="Create an endpoint to receive signed AgentLine events from messages, calls, and tests."
          action={
            <button
              onClick={() => openDrawer("create")}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
            >
              Create endpoint
            </button>
          }
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
            <p className="text-xs text-muted-foreground">
              Latest webhook delivery attempts across endpoints.
            </p>
          </div>
          <button
            onClick={() => loadDeliveries()}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        {deliveryError && <Banner variant="error" message={deliveryError} className="mb-3" />}
        {isDeliveriesLoading ? (
          <div className="rounded-lg border bg-surface p-4">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            title="No webhook deliveries"
            description="Test an endpoint or trigger an AgentLine event to create delivery records."
          />
        ) : (
          <DeliveriesTable deliveries={deliveries} onRetry={retryDelivery} />
        )}
      </section>

      <WebhookDrawer
        mode={drawerMode}
        endpoint={selectedEndpoint}
        deliveries={selectedEndpoint ? (deliveriesByEndpointId.get(selectedEndpoint.id) ?? []) : []}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        onCreated={(endpoint) => {
          setEndpoints((current) => [endpoint, ...current]);
        }}
        onUpdated={(endpoint) => {
          setEndpoints((current) =>
            current.map((item) => (item.id === endpoint.id ? endpoint : item)),
          );
          closeDrawer();
        }}
        onTested={(delivery) => {
          setDeliveries((current) => [delivery, ...current]);
        }}
        onSwitchToUpdate={() => setDrawerMode("update")}
        onSwitchToTest={() => setDrawerMode("test")}
        eventCatalog={eventCatalog}
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
  type Row = WebhookEndpointListItem & {
    _lastDeliveryAt: number;
    _failureCount: number;
    _lastDeliveryLabel: string;
  };

  const rows: Row[] = endpoints.map((endpoint) => {
    const endpointDeliveries = deliveriesByEndpointId.get(endpoint.id) ?? [];
    const lastDelivery = endpointDeliveries[0];
    const failureCount = endpointDeliveries.filter((delivery) =>
      ["failed", "retrying", "exhausted"].includes(delivery.status),
    ).length;
    return {
      ...endpoint,
      _lastDeliveryAt: lastDelivery ? new Date(lastDelivery.createdAt).getTime() : 0,
      _lastDeliveryLabel: lastDelivery?.createdLabel ?? "Never",
      _failureCount: failureCount,
    };
  });

  const columns: Column<Row>[] = [
    {
      key: "url",
      label: "URL",
      width: 360,
      sortable: true,
      sortAccessor: (r) => r.url,
      render: (endpoint) => (
        <div className="group/url">
          <div className="flex max-w-full items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onView(endpoint);
              }}
              className="min-w-0 hover:underline"
            >
              <Mono className="block truncate">{endpoint.url}</Mono>
            </button>
            <CopyButton
              value={endpoint.url}
              label="Copy URL"
              className="shrink-0 opacity-0 transition-opacity group-hover/url:opacity-100"
            />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Mono className="text-[11px] text-muted-foreground">{endpoint.id}</Mono>
            <CopyButton
              value={endpoint.id}
              label="Copy ID"
              className="shrink-0 opacity-0 transition-opacity group-hover/url:opacity-100"
            />
          </div>
        </div>
      ),
    },
    {
      key: "events",
      label: "Events",
      render: (endpoint) => (
        <div className="flex max-h-16 flex-wrap gap-1 overflow-hidden">
          {endpoint.events.map((event) => (
            <Mono key={event} className="rounded border px-1.5 py-0.5 text-[11px]">
              {event}
            </Mono>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      sortable: true,
      sortAccessor: (r) => r.status,
      render: (endpoint) => <StatusBadge status={endpoint.status} />,
    },
    {
      key: "_lastDeliveryAt",
      label: "Last delivery",
      width: 150,
      sortable: true,
      sortAccessor: (r) => r._lastDeliveryAt,
      render: (endpoint) => (
        <span className="text-muted-foreground">{endpoint._lastDeliveryLabel}</span>
      ),
    },
    {
      key: "_failureCount",
      label: "Failures",
      width: 100,
      align: "right",
      sortable: true,
      sortAccessor: (r) => r._failureCount,
      cellClassName: "tabular-nums",
      render: (endpoint) => endpoint._failureCount,
    },
    {
      key: "actions",
      label: "Actions",
      width: 340,
      align: "right",
      render: (endpoint) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onView(endpoint);
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Eye className="h-3 w-3" /> View
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onUpdate(endpoint);
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="h-3 w-3" /> Update
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onTest(endpoint);
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Send className="h-3 w-3" /> Test
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDisable(endpoint);
            }}
            disabled={endpoint.status === "disabled"}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Disable
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<Row>
      columns={columns}
      data={rows}
      getRowKey={(r) => r.id}
      onRowClick={(r) => onView(r)}
      stickyHeader
      maxBodyHeight={560}
      pageSize={10}
      defaultSort={{ key: "_lastDeliveryAt", dir: "desc" }}
    />
  );
}

function DeliveriesTable({
  deliveries,
  onRetry,
}: {
  deliveries: WebhookDeliveryListItem[];
  onRetry: (delivery: WebhookDeliveryListItem) => void;
}) {
  const columns: Column<WebhookDeliveryListItem>[] = [
    {
      key: "eventType",
      label: "Event",
      sortable: true,
      sortAccessor: (d) => d.eventType,
      render: (delivery) => <Mono className="block truncate">{delivery.eventType}</Mono>,
    },
    {
      key: "endpointId",
      label: "Endpoint",
      width: 260,
      sortable: true,
      sortAccessor: (d) => d.endpointId,
      render: (delivery) => (
        <Mono className="block truncate text-muted-foreground">{delivery.endpointId}</Mono>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      sortable: true,
      sortAccessor: (d) => d.status,
      render: (delivery) => <StatusBadge status={delivery.status} />,
    },
    {
      key: "attemptCount",
      label: "Attempts",
      width: 100,
      align: "right",
      sortable: true,
      sortAccessor: (d) => d.attemptCount,
      cellClassName: "tabular-nums",
      render: (delivery) => delivery.attemptCount,
    },
    {
      key: "lastStatusCode",
      label: "Code",
      width: 80,
      align: "right",
      sortable: true,
      sortAccessor: (d) => d.lastStatusCode ?? -1,
      cellClassName: "tabular-nums",
      render: (delivery) => delivery.lastStatusCode ?? "-",
    },
    {
      key: "createdAt",
      label: "Created",
      width: 150,
      sortable: true,
      sortAccessor: (d) => new Date(d.createdAt).getTime(),
      render: (delivery) => (
        <span className="text-muted-foreground">{delivery.createdLabel}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: 110,
      align: "right",
      render: (delivery) => {
        const canRetry = ["failed", "retrying", "pending"].includes(delivery.status);
        return (
          <div className="flex justify-end">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRetry(delivery);
              }}
              disabled={!canRetry}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable<WebhookDeliveryListItem>
      columns={columns}
      data={deliveries}
      getRowKey={(d) => d.id}
      stickyHeader
      maxBodyHeight={560}
      pageSize={25}
      defaultSort={{ key: "createdAt", dir: "desc" }}
    />
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
  eventCatalog,
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
  eventCatalog: WebhookEventCatalogGroup[];
}) {
  const isCreate = mode === "create";
  const isView = mode === "view";
  const isUpdate = mode === "update";
  const isTest = mode === "test";
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_SELECTED_EVENTS);
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
      setSelectedEvents(DEFAULT_SELECTED_EVENTS);
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
        setError(
          caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not test webhook.",
        );
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
      setError(
        caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save webhook.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const title = isCreate
    ? "Create webhook endpoint"
    : isUpdate
      ? "Update webhook endpoint"
      : isTest
        ? "Test webhook endpoint"
        : "Webhook endpoint";
  const description = isCreate
    ? "Create a signed endpoint for AgentLine events."
    : isUpdate
      ? "Update endpoint URL, event subscriptions, and status."
      : isTest
        ? "Create a signed test delivery and show the exact request headers."
        : "Endpoint details, subscribed events, and recent delivery attempts.";

  return (
    <Sheet open={mode !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error && <Banner variant="error" message={error} />}
          {secret && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">Webhook secret</div>
                <CopyButton value={secret} label="Copy secret" />
              </div>
              <Mono className="mt-1 block break-all text-xs">{secret}</Mono>
              <div className="mt-1 text-xs text-muted-foreground">
                This secret is only returned immediately after creation.
              </div>
            </div>
          )}

          {isView && endpoint ? (
            <WebhookDetails endpoint={endpoint} deliveries={deliveries} />
          ) : isTest && endpoint ? (
            <>
              <ReadOnlyField label="Endpoint" value={endpoint.url} mono copyable />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(event) => setSimulateFailure(event.target.checked)}
                />
                Simulate failed delivery
              </label>
              {testHeaders && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Signed headers
                  </div>
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
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Testing..." : "Send test"}
                </button>
              </SheetFooter>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium">
                Endpoint URL
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono"
                />
              </label>
              <EventSelector
                selectedEvents={selectedEvents}
                customEvent={customEvent}
                onCustomEventChange={setCustomEvent}
                onToggleEvent={toggleEvent}
                onAddCustomEvent={addCustomEvent}
                onRemoveEvent={(event) =>
                  setSelectedEvents((current) => current.filter((item) => item !== event))
                }
                eventCatalog={eventCatalog}
              />
              {isUpdate && (
                <label className="block text-sm font-medium">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as WebhookEndpointStatus)}
                    className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              )}
              <SheetFooter>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : isCreate ? "Create endpoint" : "Save changes"}
                </button>
              </SheetFooter>
            </>
          )}

          {isView && endpoint && (
            <SheetFooter>
              <button
                type="button"
                onClick={onSwitchToTest}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Test
              </button>
              <button
                type="button"
                onClick={onSwitchToUpdate}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
              >
                Update
              </button>
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
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Events
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {endpoint.events.map((event) => (
            <Mono key={event} className="rounded border px-1.5 py-0.5 text-[11px]">
              {event}
            </Mono>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent deliveries
        </div>
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
                  {delivery.createdLabel} · attempts {delivery.attemptCount} · code{" "}
                  {delivery.lastStatusCode ?? "-"}
                </div>
                {delivery.lastError && (
                  <div className="mt-1 text-destructive">{delivery.lastError}</div>
                )}
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
  eventCatalog,
}: {
  selectedEvents: string[];
  customEvent: string;
  onCustomEventChange: (value: string) => void;
  onToggleEvent: (event: string) => void;
  onAddCustomEvent: () => void;
  onRemoveEvent: (event: string) => void;
  eventCatalog: WebhookEventCatalogGroup[];
}) {
  return (
    <div>
      <div className="text-sm font-medium">Event capabilities</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Choose exact events or wildcard families like agent.call.*.
      </div>
      <div className="mt-3 space-y-4">
        {eventCatalog.map((group) => (
          <div key={group.group}>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.group}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.events.map((event) => {
                const checked = selectedEvents.includes(event.name);
                return (
                  <label
                    key={event.name}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-foreground bg-muted/60" : "hover:bg-muted/40"}`}
                    title={event.description}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs">{event.name}</span>
                      {event.description && (
                        <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                          {event.description}
                        </span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleEvent(event.name)}
                      className="mt-0.5"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={customEvent}
          onChange={(event) => onCustomEventChange(event.target.value)}
          placeholder="custom.event.name"
          className="min-w-0 flex-1 rounded-md border bg-surface px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={onAddCustomEvent}
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Add
        </button>
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

function ReadOnlyField({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {copyable && <CopyButton value={value} label="Copy" />}
      </div>
      {mono ? (
        <Mono className="mt-1 block break-all text-xs">{value}</Mono>
      ) : (
        <div className="mt-1 text-sm font-medium">{value}</div>
      )}
    </div>
  );
}
