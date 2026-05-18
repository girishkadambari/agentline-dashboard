import { apiRequest } from "./client";

export interface BackendAuditEvent {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  actorApiKeyId: string | null;
  actor?: BackendAuditActor;
  display?: BackendAuditDisplay;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface BackendAuditActor {
  type: "user" | "api_key" | "system";
  name: string | null;
  email: string | null;
  apiKeyLabel: string | null;
  apiKeyPrefix: string | null;
  displayName?: string;
  detail?: string | null;
}

export interface BackendAuditDisplay {
  actionLabel: string;
  actorLabel: string;
  actorDetail: string | null;
  category: string;
  resourceLabel: string;
  summary: string;
}

export interface AuditEventListItem {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  actorApiKeyId: string | null;
  actorLabel: string;
  actorDetail: string | null;
  action: string;
  actionLabel: string;
  category: string;
  resourceType: string;
  resourceLabel: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  summary: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  createdLabel: string;
}

const actionLabels: Record<string, string> = {
  "workspace.created": "Workspace created",
  "workspace.updated": "Workspace updated",
  "member.role_updated": "Member role updated",
  "member.removed": "Member removed",
  "invite.created": "Invite created",
  "invite.revoked": "Invite revoked",
  "invite.resent": "Invite resent",
  "invite.accepted": "Invite accepted",
  "invite.expired": "Invite expired",
  "api_key.created": "API key created",
  "api_key.updated": "API key updated",
  "api_key.revoked": "API key revoked",
  "api_key.rotated": "API key rotated",
  "billing.controls_updated": "Billing controls updated",
  "billing.credit_applied": "Credit applied",
  "billing.checkout_expired": "Checkout expired",
  "billing.subscription_synced": "Subscription synced",
  "billing.invoice_paid": "Invoice paid",
  "billing.invoice_payment_failed": "Invoice payment failed",
  "call.created": "Call started",
  "call.failed": "Call failed",
  "call.ended": "Call ended",
  "call.transferred": "Call transferred",
  "number.provisioned": "Number provisioned",
  "number.imported": "Number imported",
  "number.attached": "Number attached",
  "number.detached": "Number detached",
  "number.released": "Number released",
  "webhook_endpoint.created": "Webhook endpoint created",
  "webhook_endpoint.updated": "Webhook endpoint updated",
  "webhook_endpoint.disabled": "Webhook endpoint disabled",
  "webhook_delivery.tested": "Webhook delivery tested",
  "webhook_delivery.retried": "Webhook delivery retried",
  "webhook_delivery.exhausted": "Webhook delivery exhausted",
};

const resourceLabels: Record<string, string> = {
  agent: "Agent",
  api_key: "API key",
  billing_balance: "Billing balance",
  billing_subscription: "Subscription",
  billing_transaction: "Billing transaction",
  call: "Call",
  contact: "Contact",
  conversation: "Conversation",
  message: "Message",
  phone_number: "Phone number",
  usage_event: "Usage event",
  webhook_endpoint: "Webhook endpoint",
  webhook_delivery: "Webhook delivery",
  workspace: "Workspace",
  workspace_invite: "Invite",
  workspace_member: "Member",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleize(value: string) {
  return value
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorLabel(event: BackendAuditEvent) {
  if (event.display?.actorLabel) {
    return event.display.actorLabel;
  }

  if (event.actor?.displayName) {
    return event.actor.displayName;
  }

  if (event.actor?.type === "user") {
    return event.actor.name || event.actor.email || "Workspace user";
  }

  if (event.actor?.type === "api_key") {
    return event.actor.apiKeyLabel
      ? `API key: ${event.actor.apiKeyLabel}`
      : event.actor.apiKeyPrefix
        ? `API key: ${event.actor.apiKeyPrefix}`
        : "API key";
  }

  if (event.actor?.type === "system") {
    return "Vukho system";
  }

  if (event.actorUserId) {
    return "Workspace user";
  }

  if (event.actorApiKeyId) {
    return "API key";
  }

  return "System";
}

function actorDetail(event: BackendAuditEvent) {
  if (event.display) {
    return event.display.actorDetail;
  }

  if (event.actor?.detail) {
    return event.actor.detail;
  }

  if (event.actor?.type === "user") {
    return event.actor.email;
  }

  if (event.actor?.type === "api_key") {
    return event.actor.apiKeyPrefix ? `Prefix ${event.actor.apiKeyPrefix}` : null;
  }

  if (event.actor?.type === "system") {
    return "Automated Vukho action";
  }

  return null;
}

function categoryFromAction(action: string) {
  return action.split(".")[0] ?? "activity";
}

function metadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  if (entries.length === 0) {
    return "No extra details captured.";
  }

  const important = [
    "email",
    "role",
    "name",
    "status",
    "planKey",
    "amountCents",
    "spendLimitCents",
  ];
  const selected = entries
    .filter(([key]) => important.includes(key))
    .slice(0, 3)
    .map(([key, value]) => `${titleize(key)}: ${String(value)}`);

  if (selected.length > 0) {
    return selected.join(" · ");
  }

  return `${entries.length} detail${entries.length === 1 ? "" : "s"} captured.`;
}

export function mapBackendAuditEvent(event: BackendAuditEvent): AuditEventListItem {
  const actionLabel =
    event.display?.actionLabel ?? actionLabels[event.action] ?? titleize(event.action);
  const resourceLabel =
    event.display?.resourceLabel ??
    resourceLabels[event.resourceType] ??
    titleize(event.resourceType);

  return {
    id: event.id,
    workspaceId: event.workspaceId,
    actorUserId: event.actorUserId,
    actorApiKeyId: event.actorApiKeyId,
    actorLabel: actorLabel(event),
    actorDetail: actorDetail(event),
    action: event.action,
    actionLabel,
    category: event.display?.category ?? categoryFromAction(event.action),
    resourceType: event.resourceType,
    resourceLabel,
    resourceId: event.resourceId,
    metadata: event.metadata ?? {},
    summary: event.display?.summary ?? metadataSummary(event.metadata ?? {}),
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    createdAt: event.createdAt,
    createdLabel: formatDateTime(event.createdAt),
  };
}

export async function listAuditEvents(limit = 50) {
  const response = await apiRequest<{
    data: BackendAuditEvent[];
    pagination: { limit: number; nextCursor: string | null };
  }>("/audit-events", {
    query: { limit },
  });

  return {
    data: response.data.map(mapBackendAuditEvent),
    pagination: response.pagination,
  };
}
