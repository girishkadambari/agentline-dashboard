import { usageEvents, usageTrend } from "./mock";
import { wrap, wrapList } from "./client";

export const listUsageEvents = (opts: { agentId?: string } = {}) =>
  wrapList(opts.agentId ? usageEvents.filter((u) => u.agentId === opts.agentId) : usageEvents);
export const getUsageTrend = () => wrap(usageTrend);