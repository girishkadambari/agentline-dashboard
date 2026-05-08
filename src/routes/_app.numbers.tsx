import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { EmptyState } from "@/components/agentline/EmptyState";
import { CopyButton } from "@/components/agentline/CopyButton";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  listBackendNumbers,
  provisionBackendNumber,
  releaseBackendNumber,
  updateBackendNumber,
  type NumberListItem,
} from "@/lib/api/numbers";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/numbers")({
  component: Numbers,
  head: () => ({ meta: [{ title: "Numbers — AgentLine" }] }),
});

function Numbers() {
  const { pathname } = useLocation();
  const [numbers, setNumbers] = useState<NumberListItem[]>([]);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "update" | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<NumberListItem | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [numbersResponse, agentsResponse] = await Promise.all([
        listBackendNumbers(),
        listBackendAgents(),
      ]);
      setNumbers(numbersResponse.data);
      setAgents(agentsResponse.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load numbers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const agentsById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );

  function openDrawer(mode: "create" | "update", number?: NumberListItem) {
    setSelectedNumber(number ?? null);
    setDrawerMode(mode);
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedNumber(null);
  }

  if (pathname !== "/numbers") {
    return <Outlet />;
  }

  async function releaseNumber(number: NumberListItem) {
    if (!window.confirm(`Release ${number.number}?`)) {
      return;
    }

    try {
      const response = await releaseBackendNumber(number.id);
      setNumbers((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not release number.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Numbers"
        description="Phone numbers attached to your agents."
        actions={
          <button
            onClick={() => openDrawer("create")}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />Provision number
          </button>
        }
      />

      {error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />)}
          </div>
        </div>
      ) : numbers.length === 0 ? (
        <EmptyState
          icon={<Phone className="h-5 w-5" />}
          title="No numbers yet"
          description="Provision a mock number and attach it to a backend agent."
          action={<button onClick={() => openDrawer("create")} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">Provision number</button>}
        />
      ) : (
        <NumbersTable
          numbers={numbers}
          agentsById={agentsById}
          onUpdate={(number) => openDrawer("update", number)}
          onRelease={releaseNumber}
        />
      )}

      <NumberDrawer
        mode={drawerMode}
        number={selectedNumber}
        agents={agents}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        onCreated={(number) => {
          setNumbers((current) => [number, ...current]);
          closeDrawer();
        }}
        onUpdated={(number) => {
          setNumbers((current) => current.map((item) => (item.id === number.id ? number : item)));
          closeDrawer();
        }}
      />
    </div>
  );
}

function NumbersTable({
  numbers,
  agentsById,
  onUpdate,
  onRelease,
}: {
  numbers: NumberListItem[];
  agentsById: Map<string, AgentListItem>;
  onUpdate: (number: NumberListItem) => void;
  onRelease: (number: NumberListItem) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-surface shadow-sm overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[230px] px-4 py-3 text-left font-medium">Phone</th>
            <th className="w-[110px] px-4 py-3 text-left font-medium">Country</th>
            <th className="w-[170px] px-4 py-3 text-left font-medium">Capabilities</th>
            <th className="w-[120px] px-4 py-3 text-left font-medium">Provider</th>
            <th className="px-4 py-3 text-left font-medium">Agent</th>
            <th className="w-[110px] px-4 py-3 text-left font-medium">Status</th>
            <th className="w-[100px] px-4 py-3 text-right font-medium">Monthly</th>
            <th className="w-[250px] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {numbers.map((number) => {
            const agent = number.agentId ? agentsById.get(number.agentId) : null;
            return (
              <tr
                key={number.id}
                onClick={() => navigate({ to: "/numbers/$numberId", params: { numberId: number.id } })}
                className="group cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/35"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link to="/numbers/$numberId" params={{ numberId: number.id }} className="hover:underline"><Mono>{number.number}</Mono></Link>
                    <CopyButton value={number.number} label="Copy phone number" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-3">{number.country}{number.areaCode ? ` · ${number.areaCode}` : ""}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {number.capabilities.map((capability) => <span key={capability} className="rounded border px-1.5 py-0.5 text-[11px] uppercase">{capability}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{number.provider}</td>
                <td className="px-4 py-3"><span className="block truncate">{agent?.name ?? <span className="text-muted-foreground">Unassigned</span>}</span></td>
                <td className="px-4 py-3"><StatusBadge status={number.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">${number.monthlyCost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link to="/numbers/$numberId" params={{ numberId: number.id }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Eye className="h-3 w-3" /> View</Link>
                    <button onClick={(event) => { event.stopPropagation(); onUpdate(number); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"><Pencil className="h-3 w-3" /> Update</button>
                    <button onClick={(event) => { event.stopPropagation(); onRelease(number); }} disabled={number.status === "released"} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3 w-3" /> Release</button>
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

function NumberDrawer({
  mode,
  number,
  agents,
  onOpenChange,
  onCreated,
  onUpdated,
}: {
  mode: "create" | "update" | null;
  number: NumberListItem | null;
  agents: AgentListItem[];
  onOpenChange: (open: boolean) => void;
  onCreated: (number: NumberListItem) => void;
  onUpdated: (number: NumberListItem) => void;
}) {
  const isCreate = mode === "create";
  const isUpdate = mode === "update";
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("415");
  const [agentId, setAgentId] = useState("");
  const [sms, setSms] = useState(true);
  const [voice, setVoice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setError(null);
    if (isCreate) {
      setCountry("US");
      setAreaCode("415");
      setAgentId("");
      setSms(true);
      setVoice(true);
      return;
    }

    if (number) {
      setCountry(number.country);
      setAreaCode(number.areaCode);
      setAgentId(number.agentId ?? "");
      setSms(number.capabilities.includes("sms"));
      setVoice(number.capabilities.includes("voice"));
    }
  }, [isCreate, number]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (isCreate) {
        const capabilities = [sms ? "sms" : null, voice ? "voice" : null].filter(Boolean) as string[];
        const response = await provisionBackendNumber({
          country: country.trim() || "US",
          areaCode: areaCode.trim() || undefined,
          agentId: agentId || undefined,
          capabilities: capabilities.length ? capabilities : ["sms", "voice"],
        });
        onCreated(response.data);
      } else if (isUpdate && number) {
        const response = await updateBackendNumber(number.id, {
          agentId: agentId || null,
        });
        onUpdated(response.data);
      }
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not save number.");
    } finally {
      setIsSaving(false);
    }
  }

  const open = mode !== null;
  const title = isCreate ? "Provision number" : "Update number";
  const description = isCreate
    ? "Create a mock phone number and optionally attach it to an agent."
    : "Attach this number to an agent or leave it unassigned.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={submit}>
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
            {isCreate && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Country" value={country} onChange={setCountry} />
                <Field label="Area code" value={areaCode} onChange={setAreaCode} />
              </div>
            )}
            <label className="block text-sm font-medium">
              Agent assignment
              <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
            {isCreate && (
              <div>
                <div className="text-sm font-medium">Capabilities</div>
                <div className="mt-2 flex gap-3 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} /> SMS</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={voice} onChange={(event) => setVoice(event.target.checked)} /> Voice</label>
                </div>
              </div>
            )}
            {number && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                Updating assignment for <Mono>{number.number}</Mono>.
              </div>
            )}
            <SheetFooter>
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" disabled={isSaving} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Saving..." : isCreate ? "Provision number" : "Save changes"}
              </button>
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm" />
    </label>
  );
}
