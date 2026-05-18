import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Save, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/vukho/PageHeader";
import { DataTable, type Column } from "@/components/vukho/DataTable";
import { Mono } from "@/components/vukho/Mono";
import { EmptyState } from "@/components/vukho/EmptyState";
import { CopyButton } from "@/components/vukho/CopyButton";
import { Banner } from "@/components/vukho/Banner";
import { VukhoApiError, formatApiError } from "@/lib/api/client";
import {
  listBackendContacts,
  updateBackendContact,
  type ContactListItem,
} from "@/lib/api/contacts";

export const Route = createFileRoute("/_app/contacts")({
  component: Contacts,
  head: () => ({ meta: [{ title: "Contacts — Vukho" }] }),
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
      setError(caught instanceof VukhoApiError ? formatApiError(caught) : "Could not load contacts.");
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
      setError(caught instanceof VukhoApiError ? formatApiError(caught) : "Could not update contact.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Contacts" description="People your agents have interacted with." />

      {error && <Banner variant="error" message={error} className="mb-3" />}

      <DataTable<ContactListItem>
        minWidth={960}
        isLoading={isLoading}
        data={contacts}
        rowCount={contacts.length}
        emptyState={
          <EmptyState
            icon={<UserRound className="h-5 w-5" />}
            title="No contacts yet"
            description="Send or receive SMS and calls to create contacts automatically."
          />
        }
        columns={[
          {
            key: "name",
            label: "Name",
            width: 260,
            render: (contact) => {
              const isEditing = editingId === contact.id;
              return isEditing ? (
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveContact(contact);
                    if (event.key === "Escape") {
                      setEditingId(null);
                      setNameDraft("");
                    }
                  }}
                  placeholder="Display name"
                  className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
                  autoFocus
                />
              ) : (
                <span className="block truncate font-medium">{contact.name}</span>
              );
            },
          },
          {
            key: "phone",
            label: "Phone",
            render: (contact) => (
              <div className="flex items-center gap-2">
                <Mono className="min-w-0 truncate text-muted-foreground">{contact.phone}</Mono>
                <CopyButton value={contact.phone} label="Copy phone number" />
              </div>
            ),
          },
          { key: "conversations", label: "Conversations", width: 130, align: "right", cellClassName: "tabular-nums", render: (c) => c.conversations },
          { key: "calls", label: "Calls", width: 90, align: "right", cellClassName: "tabular-nums", render: (c) => c.calls },
          { key: "messages", label: "Messages", width: 100, align: "right", cellClassName: "tabular-nums", render: (c) => c.messages },
          { key: "lastActivity", label: "Last activity", width: 160, render: (c) => <span className="text-muted-foreground">{c.lastActivity}</span> },
          {
            key: "actions",
            label: "",
            width: 120,
            align: "right",
            render: (contact) => {
              const isEditing = editingId === contact.id;
              const isPending = pendingId === contact.id;
              return (
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
              );
            },
          },
        ] satisfies Column<ContactListItem>[]}
      />
    </div>
  );
}
