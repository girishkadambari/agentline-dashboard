import { calls } from "./mock";
import { wrap, wrapList } from "./client";
import type { Call } from "./types";

export const listCalls = (opts: { agentId?: string } = {}) =>
  wrapList<Call>(opts.agentId ? calls.filter((c) => c.agentId === opts.agentId) : calls);
export const getCall = (id: string) => {
  const c = calls.find((x) => x.id === id);
  return c ? wrap(c) : { data: null as Call | null, error: { code: "not_found", message: id } };
};
export const startOutboundCall = (input: { agentId: string; to: string }) => wrap({ id: `call_out_${Date.now()}`, ...input, status: "in_progress" as const });
export const simulateInboundCall = (input: { agentId: string; from: string }) => wrap({ id: `call_in_${Date.now()}`, ...input, status: "in_progress" as const });
export const endCall = (id: string) => wrap({ id, status: "completed" as const });
export const transferCall = (id: string, to: string) => wrap({ id, transferTo: to });

export const callTranscript = (_id: string) => wrap([
  { role: "agent", at: "00:00", text: "Hi, this is the AcmeCo support line. How can I help today?" },
  { role: "caller", at: "00:04", text: "Hi, my login isn't working." },
  { role: "agent", at: "00:09", text: "Sorry to hear. Let me get a reset link sent to you." },
  { role: "caller", at: "00:21", text: "Got it, thanks." },
]);

export const callTimeline = (_id: string) => wrap([
  { at: "10:42:01", event: "call.started" },
  { at: "10:42:02", event: "provider.connected", detail: "twilio · sip" },
  { at: "10:42:03", event: "agent.greeted" },
  { at: "10:45:08", event: "call.ended", detail: "duration 184s" },
  { at: "10:45:09", event: "webhook.delivered", detail: "200 OK in 142ms" },
]);