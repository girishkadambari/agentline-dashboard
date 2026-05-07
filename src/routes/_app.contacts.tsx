import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/agentline/PageHeader";
import { Mono } from "@/components/agentline/Mono";
import { listContacts } from "@/lib/api/contacts";

export const Route = createFileRoute("/_app/contacts")({
  component: Contacts,
  head: () => ({ meta: [{ title: "Contacts — AgentLine" }] }),
});

function Contacts() {
  const contacts = listContacts().data;
  return (
    <div>
      <PageHeader title="Contacts" description="People your agents have interacted with." />
      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Phone</th>
              <th className="px-4 py-2.5 text-right font-medium">Conversations</th>
              <th className="px-4 py-2.5 text-right font-medium">Calls</th>
              <th className="px-4 py-2.5 text-right font-medium">Messages</th>
              <th className="px-4 py-2.5 text-left font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5"><Link to="/contacts/$contactId" params={{ contactId: c.id }} className="font-medium hover:underline">{c.name}</Link></td>
                <td className="px-4 py-2.5"><Mono className="text-muted-foreground">{c.phone}</Mono></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.conversations}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.calls}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.messages}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
