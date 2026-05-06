export type AgentMode = "hosted" | "webhook" | "web";
export type AgentStatus = "active" | "draft" | "paused";

export interface Agent {
  id: string;
  name: string;
  description: string;
  mode: AgentMode;
  numbers: number;
  calls: number;
  messages: number;
  lastActivity: string;
  status: AgentStatus;
  systemPrompt: string;
  voice: string;
  beginMessage: string;
  webhookUrl?: string;
}

export const agents: Agent[] = [
  { id: "ag_8f2a", name: "Support Triage", description: "Handles inbound support and routes to humans", mode: "webhook", numbers: 2, calls: 1284, messages: 942, lastActivity: "2m ago", status: "active", systemPrompt: "You are a calm support agent for AcmeCo.", voice: "verse", beginMessage: "Hi, this is the AcmeCo support line.", webhookUrl: "https://api.acmeco.dev/agentline" },
  { id: "ag_3d11", name: "Outbound Booker", description: "Books demos for sales", mode: "hosted", numbers: 1, calls: 412, messages: 88, lastActivity: "14m ago", status: "active", systemPrompt: "You book product demos.", voice: "alloy", beginMessage: "Hey, calling from Northwind." },
  { id: "ag_71bc", name: "After-hours Voicemail", description: "Captures voicemails after 8pm", mode: "hosted", numbers: 1, calls: 96, messages: 0, lastActivity: "1h ago", status: "active", systemPrompt: "Take a clear voicemail.", voice: "sage", beginMessage: "We're closed. Leave a message." },
  { id: "ag_92ef", name: "Web Test Agent", description: "Browser-based playground agent", mode: "web", numbers: 0, calls: 22, messages: 5, lastActivity: "3h ago", status: "draft", systemPrompt: "You are a test agent.", voice: "verse", beginMessage: "Test mode." },
  { id: "ag_44a1", name: "Renewals Bot", description: "Handles subscription renewals", mode: "webhook", numbers: 1, calls: 318, messages: 211, lastActivity: "yesterday", status: "paused", systemPrompt: "Confirm renewals.", voice: "alloy", beginMessage: "Calling about your renewal.", webhookUrl: "https://api.renew.dev/hooks" },
];

export interface PhoneNumber {
  id: string;
  number: string;
  country: string;
  areaCode: string;
  capabilities: string[];
  provider: "twilio" | "telnyx" | "mock";
  agentId?: string;
  status: "active" | "released" | "pending";
  monthlyCost: number;
}

export const numbers: PhoneNumber[] = [
  { id: "pn_01", number: "+1 415 555 0182", country: "US", areaCode: "415", capabilities: ["voice", "sms"], provider: "twilio", agentId: "ag_8f2a", status: "active", monthlyCost: 1.15 },
  { id: "pn_02", number: "+1 628 555 0144", country: "US", areaCode: "628", capabilities: ["voice", "sms", "mms"], provider: "telnyx", agentId: "ag_3d11", status: "active", monthlyCost: 1.0 },
  { id: "pn_03", number: "+1 212 555 0199", country: "US", areaCode: "212", capabilities: ["voice"], provider: "twilio", agentId: "ag_71bc", status: "active", monthlyCost: 1.15 },
  { id: "pn_04", number: "+44 20 7946 0102", country: "GB", areaCode: "20", capabilities: ["voice", "sms"], provider: "telnyx", agentId: "ag_44a1", status: "active", monthlyCost: 1.5 },
  { id: "pn_05", number: "+1 415 555 0123", country: "US", areaCode: "415", capabilities: ["voice", "sms"], provider: "mock", status: "pending", monthlyCost: 0 },
];

export interface Call {
  id: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  agentId: string;
  status: "completed" | "failed" | "in_progress" | "no_answer";
  duration: number;
  outcome: string;
  startedAt: string;
  cost: number;
}

export const calls: Call[] = [
  { id: "call_a1b2", direction: "inbound", from: "+1 510 555 0144", to: "+1 415 555 0182", agentId: "ag_8f2a", status: "completed", duration: 184, outcome: "resolved", startedAt: "2026-05-06 10:42", cost: 0.18 },
  { id: "call_c3d4", direction: "outbound", from: "+1 628 555 0144", to: "+1 213 555 0922", agentId: "ag_3d11", status: "no_answer", duration: 0, outcome: "no_answer", startedAt: "2026-05-06 10:38", cost: 0.01 },
  { id: "call_e5f6", direction: "inbound", from: "+1 415 555 7711", to: "+1 415 555 0182", agentId: "ag_8f2a", status: "in_progress", duration: 42, outcome: "live", startedAt: "2026-05-06 10:55", cost: 0.04 },
  { id: "call_g7h8", direction: "outbound", from: "+1 628 555 0144", to: "+1 305 555 7720", agentId: "ag_3d11", status: "completed", duration: 312, outcome: "demo_booked", startedAt: "2026-05-06 09:21", cost: 0.31 },
  { id: "call_i9j0", direction: "inbound", from: "+1 718 555 0191", to: "+1 212 555 0199", agentId: "ag_71bc", status: "failed", duration: 0, outcome: "provider_error", startedAt: "2026-05-06 08:02", cost: 0 },
];

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  agentId: string;
  body: string;
  status: "delivered" | "queued" | "failed" | "sent";
  createdAt: string;
}

export const conversations = [
  { id: "cv_001", contact: "+1 510 555 0144", contactName: "Maya Chen", agentId: "ag_8f2a", lastMessage: "Thanks, that worked!", lastActivity: "2m ago", channel: "sms", unread: 0 },
  { id: "cv_002", contact: "+1 213 555 0922", contactName: "Jordan Reyes", agentId: "ag_3d11", lastMessage: "Can we reschedule?", lastActivity: "12m ago", channel: "sms", unread: 2 },
  { id: "cv_003", contact: "+1 305 555 7720", contactName: "Alex Park", agentId: "ag_3d11", lastMessage: "See you Thursday.", lastActivity: "1h ago", channel: "sms", unread: 0 },
  { id: "cv_004", contact: "+44 7700 900123", contactName: "Sam Patel", agentId: "ag_44a1", lastMessage: "Renewed.", lastActivity: "yesterday", channel: "sms", unread: 0 },
];

export const messages: Message[] = [
  { id: "msg_1", conversationId: "cv_001", direction: "inbound", from: "+1 510 555 0144", to: "+1 415 555 0182", agentId: "ag_8f2a", body: "Hey, my login isn't working.", status: "delivered", createdAt: "10:38" },
  { id: "msg_2", conversationId: "cv_001", direction: "outbound", from: "+1 415 555 0182", to: "+1 510 555 0144", agentId: "ag_8f2a", body: "Sorry to hear that. Can you try resetting your password from the email I just sent?", status: "delivered", createdAt: "10:39" },
  { id: "msg_3", conversationId: "cv_001", direction: "inbound", from: "+1 510 555 0144", to: "+1 415 555 0182", agentId: "ag_8f2a", body: "Thanks, that worked!", status: "delivered", createdAt: "10:42" },
];

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failing";
  lastDelivery: string;
  failureCount: number;
}

export const webhooks: Webhook[] = [
  { id: "wh_01", url: "https://api.acmeco.dev/agentline", events: ["agent.call.ended", "agent.message.received", "agent.call.started"], status: "active", lastDelivery: "1m ago", failureCount: 0 },
  { id: "wh_02", url: "https://hooks.northwind.io/al", events: ["agent.call.ended"], status: "failing", lastDelivery: "8m ago", failureCount: 14 },
  { id: "wh_03", url: "https://renew.dev/hooks/agentline", events: ["agent.message.received", "agent.call.ended"], status: "paused", lastDelivery: "2d ago", failureCount: 0 },
];

export interface Contact {
  id: string;
  name: string;
  phone: string;
  conversations: number;
  calls: number;
  messages: number;
  lastActivity: string;
}
export const contacts: Contact[] = [
  { id: "ct_1", name: "Maya Chen", phone: "+1 510 555 0144", conversations: 1, calls: 4, messages: 22, lastActivity: "2m ago" },
  { id: "ct_2", name: "Jordan Reyes", phone: "+1 213 555 0922", conversations: 1, calls: 2, messages: 8, lastActivity: "12m ago" },
  { id: "ct_3", name: "Alex Park", phone: "+1 305 555 7720", conversations: 1, calls: 5, messages: 11, lastActivity: "1h ago" },
  { id: "ct_4", name: "Sam Patel", phone: "+44 7700 900123", conversations: 1, calls: 1, messages: 3, lastActivity: "yesterday" },
];

export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  scope: "read" | "write" | "full";
  createdAt: string;
  lastUsed: string;
  status: "active" | "revoked";
}
export const apiKeys: ApiKey[] = [
  { id: "k_1", label: "Production server", prefix: "agl_live_8f2a…", scope: "full", createdAt: "2026-03-12", lastUsed: "1m ago", status: "active" },
  { id: "k_2", label: "Staging", prefix: "agl_test_3d11…", scope: "write", createdAt: "2026-04-02", lastUsed: "12h ago", status: "active" },
  { id: "k_3", label: "Old CI", prefix: "agl_test_71bc…", scope: "read", createdAt: "2025-12-09", lastUsed: "32d ago", status: "revoked" },
];

export interface UsageEvent {
  id: string;
  time: string;
  agentId: string;
  resourceType: "call" | "sms" | "number" | "webhook";
  resourceId: string;
  channel: "voice" | "sms" | "mms" | "system";
  quantity: number;
  unit: "minute" | "message" | "month" | "delivery";
  unitCost: number;
  totalCost: number;
}
export const usageEvents: UsageEvent[] = [
  { id: "u1", time: "10:55", agentId: "ag_8f2a", resourceType: "call", resourceId: "call_e5f6", channel: "voice", quantity: 0.7, unit: "minute", unitCost: 0.06, totalCost: 0.04 },
  { id: "u2", time: "10:42", agentId: "ag_8f2a", resourceType: "call", resourceId: "call_a1b2", channel: "voice", quantity: 3.07, unit: "minute", unitCost: 0.06, totalCost: 0.18 },
  { id: "u3", time: "10:39", agentId: "ag_8f2a", resourceType: "sms", resourceId: "msg_2", channel: "sms", quantity: 1, unit: "message", unitCost: 0.0075, totalCost: 0.0075 },
  { id: "u4", time: "09:21", agentId: "ag_3d11", resourceType: "call", resourceId: "call_g7h8", channel: "voice", quantity: 5.2, unit: "minute", unitCost: 0.06, totalCost: 0.31 },
];

export const usageTrend = [
  { day: "Mon", calls: 142, messages: 88 },
  { day: "Tue", calls: 168, messages: 102 },
  { day: "Wed", calls: 191, messages: 121 },
  { day: "Thu", calls: 174, messages: 96 },
  { day: "Fri", calls: 220, messages: 142 },
  { day: "Sat", calls: 88, messages: 51 },
  { day: "Sun", calls: 71, messages: 44 },
];

export const overview = {
  activeAgents: 3,
  activeNumbers: 4,
  callsToday: 1054,
  messagesToday: 644,
  failedWebhooks: 14,
  mtdSpend: 384.22,
  balance: 215.78,
};

export const services = [
  { name: "API", status: "operational" },
  { name: "Webhook worker", status: "operational" },
  { name: "Mock provider", status: "operational" },
  { name: "Twilio", status: "degraded" },
  { name: "Telnyx", status: "operational" },
  { name: "Queue", status: "operational" },
];
