import { webhooks } from "./mock";
import { wrap, wrapList } from "./client";
import type { Webhook } from "./types";

export const listWebhooks = () => wrapList<Webhook>(webhooks);
export const getWebhook = (id: string) => {
  const w = webhooks.find((x) => x.id === id);
  return w ? wrap(w) : { data: null as Webhook | null, error: { code: "not_found", message: id } };
};
export const createWebhook = (input: Partial<Webhook>) => wrap<Webhook>({
  id: `wh_${Math.random().toString(36).slice(2, 6)}`,
  url: input.url ?? "",
  events: input.events ?? [],
  status: input.status ?? "active",
  lastDelivery: "never",
  failureCount: 0,
});
export const updateWebhook = (id: string, patch: Partial<Webhook>) => {
  const w = webhooks.find((x) => x.id === id);
  return w ? wrap({ ...w, ...patch }) : { data: null as Webhook | null, error: { code: "not_found", message: id } };
};
export const rotateWebhookSecret = (id: string) => wrap({ id, secret: `whsec_${Math.random().toString(36).slice(2, 18)}` });
export const sendTestEvent = (id: string, event = "agent.call.ended") => wrap({ id, event, status: "delivered", responseCode: 200 });
export const replayDelivery = (id: string, deliveryId: string) => wrap({ id, deliveryId, status: "queued" as const });

export const listDeliveries = (_id: string) => wrapList([
  { id: "dl_01", event: "agent.call.ended", at: "10:45", responseCode: 200, durationMs: 142, attempt: 1 },
  { id: "dl_02", event: "agent.message.received", at: "10:39", responseCode: 200, durationMs: 88, attempt: 1 },
  { id: "dl_03", event: "agent.call.ended", at: "10:21", responseCode: 502, durationMs: 30000, attempt: 3 },
  { id: "dl_04", event: "agent.call.ended", at: "10:18", responseCode: 502, durationMs: 30000, attempt: 2 },
]);