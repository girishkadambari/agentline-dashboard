import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Save, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import {
  listBackendContacts,
  updateBackendContact,
  type ContactListItem,
} from "@/lib/api/contacts";

export const Route = createFileRoute("/_app/contacts")({
  component: Contacts,
  head: () => ({ meta: [{ title: "Contacts — AgentLine" }] }),
});

function Contacts() {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadContacts() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listBackendContacts();
      setContacts(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load contacts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContacts();
  }, []);

  function startEditing(contact: ContactListItem) {
    setEditingId(contact.id);
    setNameDraft(contact.name === "Unnamed contact" ? "" : contact.name);
    setError(null);
  }

  async function saveContact(contact: ContactListItem) {
    const displayName = nameDraft.trim() || null;
    setPendingId(contact.id);
    setError(null);
    try {
      const response = await updateBackendContact(contact.id, { displayName });
      setContacts((current) => current.map((item) => (item.id === contact.id ? response.data : item)));
      setEditingId(null);
      setNameDraft("");
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not update contact.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Contacts" description="People your agents have interacted with." />

      {error && <div className="mb-3 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />)}</div>
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState icon={<UserRound className="h-5 w-5" />} title="No contacts yet" description="Send or receive SMS and calls to create contacts automatically." />
      ) : (
        <div className="rounded-lg border bg-surface shadow-sm overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-[260px] px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="w-[130px] px-4 py-3 text-right font-medium">Conversations</th>
                <th className="w-[90px] px-4 py-3 text-right font-medium">Calls</th>
                <th className="w-[100px] px-4 py-3 text-right font-medium">Messages</th>
                <th className="w-[160px] px-4 py-3 text-left font-medium">Last activity</th>
                <th className="w-[120px] px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const isEditing = editingId === contact.id;
                const isPending = pendingId === contact.id;

                return (
                  <tr key={contact.id} className="border-b last:border-b-0 hover:bg-muted/35">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={nameDraft}
                          onChange={(event) => setNameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void saveContact(contact);
                            }
                            if (event.key === "Escape") {
                              setEditingId(null);
                              setNameDraft("");
                            }
                          }}
                          placeholder="Display name"
                          className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate font-medium">{contact.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mono className="min-w-0 truncate text-muted-foreground">{contact.phone}</Mono>
                        <CopyButton value={contact.phone} label="Copy phone number" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{contact.conversations}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{contact.calls}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{contact.messages}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.lastActivity}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveContact(contact)}
                              disabled={isPending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                              title="Save contact"
                              aria-label="Save contact"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setNameDraft("");
                              }}
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
                            onClick={() => startEditing(contact)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            title="Edit contact"
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
