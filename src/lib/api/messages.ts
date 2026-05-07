import { conversations, messages } from "./mock";
import { wrap, wrapList } from "./client";

export const listConversations = (opts: { agentId?: string; contact?: string } = {}) => {
  let rows = conversations;
  if (opts.agentId) rows = rows.filter((c) => c.agentId === opts.agentId);
  if (opts.contact) rows = rows.filter((c) => c.contact === opts.contact);
  return wrapList(rows);
};
export const getConversation = (id: string) => {
  const c = conversations.find((x) => x.id === id);
  return c ? wrap(c) : { data: null, error: { code: "not_found", message: id } };
};
export const listMessages = (conversationId: string) =>
  wrapList(messages.filter((m) => m.conversationId === conversationId));
export const sendMessage = (conversationId: string, body: string) =>
  wrap({ id: `msg_${Date.now()}`, conversationId, body, status: "queued" as const });