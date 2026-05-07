import { apiRequest } from "./client";

export interface BackendContact {
  id: string;
  workspaceId: string;
  projectId: string;
  phoneNumber: string;
  displayName: string | null;
  metadata: unknown;
  counts: {
    conversations: number;
    messages: number;
    calls: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactListItem {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  phone: string;
  conversations: number;
  calls: number;
  messages: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateContactInput {
  displayName?: string | null;
  metadata?: Record<string, unknown>;
}

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

export function mapBackendContact(contact: BackendContact): ContactListItem {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    projectId: contact.projectId,
    name: contact.displayName ?? "Unnamed contact",
    phone: contact.phoneNumber,
    conversations: contact.counts.conversations,
    calls: contact.counts.calls,
    messages: contact.counts.messages,
    lastActivity: formatDateTime(contact.updatedAt),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export async function listBackendContacts(limit = 50) {
  const response = await apiRequest<{ data: BackendContact[]; pagination: { limit: number; nextCursor: string | null } }>("/contacts", {
    query: { limit },
  });

  return {
    data: response.data.map(mapBackendContact),
    pagination: response.pagination,
  };
}

export async function getBackendContact(id: string) {
  const response = await apiRequest<{ data: BackendContact }>(`/contacts/${id}`);

  return { data: mapBackendContact(response.data) };
}

export async function updateBackendContact(id: string, input: UpdateContactInput) {
  const response = await apiRequest<{ data: BackendContact }>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendContact(response.data) };
}

export const listContacts = listBackendContacts;
export const getContact = getBackendContact;
export const updateContact = updateBackendContact;
