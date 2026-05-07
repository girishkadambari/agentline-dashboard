/** Re-exports raw mock arrays so api/* modules don't import from lib/mock directly elsewhere. */
export {
  agents, numbers, calls, conversations, messages, webhooks,
  contacts, apiKeys, usageEvents, usageTrend, overview, services,
} from "@/lib/mock/data";