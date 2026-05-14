import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/agentline/PageHeader";
import { StatusBadge } from "@/components/agentline/StatusBadge";
import { Mono } from "@/components/agentline/Mono";
import { Stat } from "@/components/agentline/Stat";
import { EmptyState } from "@/components/agentline/EmptyState";
import { Banner } from "@/components/agentline/Banner";
import { BackLink } from "@/components/agentline/BackLink";
import { AgentLineApiError, formatApiError } from "@/lib/api/client";
import { listBackendAgents, type AgentListItem } from "@/lib/api/agents";
import {
  getBackendNumber,
  releaseBackendNumber,
  updateBackendNumber,
  type NumberListItem,
} from "@/lib/api/numbers";

export const Route = createFileRoute("/_app/numbers/$numberId")({
  component: NumberDetail,
  head: () => ({ meta: [{ title: "Number — AgentLine" }] }),
});

function NumberDetail() {
  const { numberId } = Route.useParams();
  const [number, setNumber] = useState<NumberListItem | null>(null);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentId, setAgentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([getBackendNumber(numberId), listBackendAgents()])
      .then(([numberResponse, agentsResponse]) => {
        if (!cancelled) {
          setNumber(numberResponse.data);
          setAgentId(numberResponse.data.agentId ?? "");
          setAgents(agentsResponse.data);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not load number.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [numberId]);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const agent = number?.agentId ? agentsById.get(number.agentId) : null;

  async function saveAssignment() {
    if (!number) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await updateBackendNumber(number.id, { agentId: agentId || null });
      setNumber(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not update number.");
    } finally {
      setIsSaving(false);
    }
  }

  async function releaseNumber() {
    if (!number || !window.confirm(`Release ${number.number}?`)) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await releaseBackendNumber(number.id);
      setNumber(response.data);
    } catch (caught) {
      setError(caught instanceof AgentLineApiError ? formatApiError(caught) : "Could not release number.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">Loading number...</div>;
  }

  if (!number) {
    return <Empty id={numberId} error={error} />;
  }

  return (
    <div>
      <Link to="/numbers" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Numbers</Link>
      <PageHeader
        title={number.number}
        description={`${number.country}${number.areaCode ? ` · ${number.areaCode}` : ""}`}
        actions={
          <>
            <button onClick={saveAssignment} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"><Pencil className="h-3.5 w-3.5" />Save assignment</button>
            <button onClick={releaseNumber} disabled={isSaving || number.status === "released"} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" />Release number</button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Mono>{number.id}</Mono><span>·</span>
        <span className="capitalize">Provider: {number.provider}</span><span>·</span>
        <StatusBadge status={number.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Capabilities" value={<span className="text-base font-medium uppercase">{number.capabilities.join(", ")}</span>} />
        <Stat label="Attached agent" value={<span className="text-base font-medium">{agent?.name ?? "Unassigned"}</span>} />
        <Stat label="Monthly cost" value={`$${number.monthlyCost.toFixed(2)}`} />
        <Stat label="Status" value={<StatusBadge status={number.status} />} />
      </div>

      <div className="mt-6 max-w-xl rounded-lg border bg-surface p-4">
        <h3 className="text-sm font-semibold">Assignment</h3>
        <label className="mt-4 block text-sm font-medium">
          Agent
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1.5 w-full rounded-md border bg-surface px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function Empty({ id, error }: { id: string; error: string | null }) {
  return (
    <EmptyState
      title="Number not found"
      description={error ?? `No number with id ${id}.`}
      action={<Link to="/numbers" className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">Back to numbers</Link>}
    />
  );
}
