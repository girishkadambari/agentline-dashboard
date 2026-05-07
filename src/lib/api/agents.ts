import { agents } from "./mock";
import { wrap, wrapList } from "./client";
import type { Agent } from "./types";

export const listAgents = () => wrapList<Agent>(agents);
export const getAgent = (id: string) => {
  const a = agents.find((x) => x.id === id);
  return a ? wrap(a) : { data: null as Agent | null, error: { code: "not_found", message: `Agent ${id} not found` } };
};
export const createAgent = (input: Partial<Agent>) => wrap<Agent>({
  id: `ag_${Math.random().toString(36).slice(2, 6)}`,
  name: input.name ?? "New Agent",
  description: input.description ?? "",
  mode: input.mode ?? "hosted",
  numbers: 0, calls: 0, messages: 0,
  lastActivity: "just now",
  status: "draft",
  systemPrompt: input.systemPrompt ?? "",
  voice: input.voice ?? "verse",
  beginMessage: input.beginMessage ?? "",
  webhookUrl: input.webhookUrl,
});
export const updateAgent = (id: string, patch: Partial<Agent>) => {
  const a = agents.find((x) => x.id === id);
  return a ? wrap({ ...a, ...patch }) : { data: null as Agent | null, error: { code: "not_found", message: id } };
};
export const disableAgent = (id: string) => wrap({ id, status: "paused" as const });
export const sendTestSms = (id: string, body: string) => wrap({ id: `msg_test_${Date.now()}`, agentId: id, body, status: "queued" as const });
export const startTestCall = (id: string, to: string) => wrap({ id: `call_test_${Date.now()}`, agentId: id, to, status: "in_progress" as const });