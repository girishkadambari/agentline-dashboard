# AgentLine Frontend Next Phase Plan

## Phase F1: Backend Auth And API Foundation

Status: implemented, pending live backend smoke test

Goal:

Make the dashboard usable against the NestJS backend without waiting for Google
SSO or a full frontend rewrite.

Build:

- API client with base URL config.
- API-key session storage.
- Login form that validates API key against the backend.
- App-shell auth guard.
- Workspace loading in sidebar/header.
- Environment example for local backend URL.

Exit Criteria:

- `/login` can validate `sk_test_agentline_local` against a running backend.
- Authenticated users can enter the dashboard.
- Unauthenticated users are sent to `/login`.
- Build passes. Completed with `npm run build` on 2026-05-07.

Remaining Review:

- Run the dashboard with the backend server and manually smoke test login.
- Confirm whether the backend route is exactly `/workspaces/current` in the
  active backend branch.

## Phase F2: Onboarding Connected To Backend

Status: partially implemented, pending live backend smoke test

Goal:

Turn onboarding from local mock state into real workspace and first-agent setup.

Build:

- Load current workspace.
- Update workspace name. Implemented.
- Create first agent. Implemented.
- Optional webhook setup if endpoint exists.
- Route completed onboarding to dashboard/playground.
- Add clear backend-offline and validation states.

Exit Criteria:

- Onboarding creates or updates real backend records.
- User can see the created agent on the Agents page once that page is connected.

## Phase F3A: Agents Backend Integration

Status: implemented

Goal:

Make the agent created during onboarding visible and manageable from the Agents
screens.

Build:

- Convert `src/lib/api/agents.ts` from mock wrappers to backend functions.
- Add backend agent mappers for list/detail UI needs.
- Connect `/agents` to `GET /agents`.
- Connect `/agents/$agentId` to `GET /agents/:id` and `PATCH /agents/:id`.
- Connect create action to `POST /agents`.
- Connect disable action to `DELETE /agents/:id`.
- Add loading, empty, error, and invalid-agent states.
- Refresh list/detail state after create/update/disable.

Exit Criteria:

- Agent created from onboarding appears on `/agents`.
- Agent detail opens from backend data.
- User can edit agent prompt/mode/voice/webhook URL and see persisted changes.
- User can disable an agent without mutating mock data.
- No production route touched in this phase imports mock agents.

Verification:

- `npm run build` passed after implementation.

Review Risks:

- Current UI expects fields like `numbers`, `calls`, `messages`, and
  `lastActivity`, but backend agent responses do not include those rollups yet.
  Use zero/empty display values or derive later from related endpoints.
- Agent status values differ between Lovable mock data and backend status.
  Normalize status in the API mapper.
- The current create button has no drawer wired to real backend behavior.
  Resolved with a backend-backed create dialog.

## Phase F3B: Numbers Backend Integration

Status: implemented

Goal:

Make phone-number provisioning and agent assignment usable from the frontend
against the backend mock provider.

Build:

- Convert `src/lib/api/numbers.ts` from mock wrappers to backend functions.
- Connect `/numbers` to `GET /numbers`.
- Connect provision action to `POST /numbers`.
- Support agent assignment during provisioning.
- Support attach/detach via `PATCH /numbers/:id`.
- Connect number detail to `GET /numbers/:id`.
- Support release via `DELETE /numbers/:id`.
- Add loading, empty, error, insufficient-balance, and provider-error states.

Exit Criteria:

- User can provision a mock number from the dashboard.
- User can attach that number to an agent created from onboarding or Agents.
- Number appears in list/detail from backend data after refresh.
- No production route touched in this phase imports mock numbers.

Verification:

- `npm run build` passed after implementation.
- Mock import audit passed for `src/lib/api/numbers.ts`, `/numbers`, and
  `/numbers/$numberId`.

Known follow-ups:

- Monthly number cost is a frontend display constant until backend exposes price
  metadata.
- Number detail does not show real SMS/call activity yet; those wait for Inbox
  and Calls backend integration.

## Phase F3C: Calls Backend Integration

Status: implemented

Goal:

Make outbound mock calls and call history usable from the frontend against the
backend.

Build:

- Convert `src/lib/api/calls.ts` from mock wrappers to backend functions.
- Connect `/calls` to `GET /calls`.
- Add start outbound call drawer using `POST /calls`.
- Let user choose a backend agent and enter destination phone number.
- Connect `/calls/$callId` to `GET /calls/:id`.
- Connect transcript view to `GET /calls/:id/transcript`.
- Support end/transfer actions only where backend state allows them.
- Add loading, empty, error, and validation states.

Exit Criteria:

- User can start a mock outbound call from the frontend.
- Call appears in list/detail from backend data after refresh.
- Transcript renders from backend data.
- No production route touched in this phase imports mock calls.

Verification:

- `npm run build` passed after implementation.
- Mock import audit passed for calls API and calls routes.

Known follow-ups:

- Starting a call requires the selected agent to have an active voice-capable
  number. The drawer surfaces the backend conflict, but the UI can later
  pre-filter or warn before submit.
- Transfer uses a browser prompt for now; convert to a drawer/form once live
  voice workflows are deeper.

## Phase F3D: Inbox And Messages Backend Integration

Status: implemented

Goal:

Make conversations and SMS messages usable from backend data.

Build:

- Convert `src/lib/api/messages.ts` from mock wrappers to backend functions.
- Connect `/inbox` to `GET /conversations`.
- Connect conversation messages to `GET /conversations/:id/messages`.
- Add outbound SMS drawer using `POST /messages`.
- Add inbound SMS simulation form using `POST /simulations/inbound-sms` if the
  backend route exists in the active branch.
- Add loading, empty, error, and validation states.
- Load backend agents for send/simulate forms.
- Preserve the three-panel inbox layout: conversations list, message thread,
  conversation/contact details.
- Show backend conflicts clearly, especially missing SMS-capable agent number
  and insufficient balance.

Exit Criteria:

- User can send a mock outbound SMS from the frontend.
- User can simulate inbound SMS from the frontend.
- Conversations and messages appear from backend data after refresh.
- Selected conversation survives list refresh when still present.
- No production route touched in this phase imports mock conversations/messages.

Backend endpoints confirmed:

- `GET /conversations`
- `GET /conversations/:id`
- `PATCH /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /messages`
- `POST /simulations/inbound-sms`

Implementation Notes:

- `POST /messages` requires `agentId`, `to`, and `body`.
- `POST /simulations/inbound-sms` requires `agentId`, `from`, and `body`.
- Backend will create or reuse contact/conversation records for SMS flows.
- Like calls, SMS requires the selected agent to have a suitable active number.
  The UI should surface that before or after submit.

Verification:

- `npm run build` passed after implementation on 2026-05-07.
- Mock import audit passed for `src/lib/api/messages.ts` and `/inbox`.

Known follow-ups:

- Backend conversation/message responses currently expose contact IDs but not
  contact phone/name details, so the Inbox uses contact IDs in list/detail
  panels until Contacts or expanded conversation responses are available.
- Inline reply remains a drawer action because `POST /messages` requires an
  explicit recipient phone number and conversations do not yet include it.

## Phase F3E: Webhooks Backend Integration

Status: implemented

Goal:

Make webhook configuration, testing, and delivery logs usable from backend data.

Build:

- Convert `src/lib/api/webhooks.ts` from mock wrappers to backend functions.
- Connect `/webhooks` to `GET /webhooks`.
- Map backend webhook endpoint records:
  - `id`
  - `url`
  - `events`
  - `status`
  - `createdAt`
  - `updatedAt`
- Map backend webhook delivery records:
  - `id`
  - `endpointId`
  - `eventId`
  - `eventType`
  - `status`
  - `attemptCount`
  - `lastStatusCode`
  - `lastError`
  - `nextAttemptAt`
  - `createdAt`
  - `updatedAt`
- Add create webhook drawer using `POST /webhooks`.
- Add update drawer using `PATCH /webhooks/:id`.
- Add delete action using `DELETE /webhooks/:id`.
- Add test delivery action using `POST /webhooks/:id/test`.
- Display delivery logs from `GET /webhooks/deliveries`.
- Add delivery retry action using `POST /webhooks/deliveries/:id/retry`.
- Keep test/retry mock controls explicit:
  - test endpoint can simulate success/failure.
  - retry delivery can simulate succeeded/failed/exhausted.
- Surface validation, signing, retry, and failed delivery states clearly.
- Add empty state for no endpoints.
- Add empty state for no deliveries.
- Keep endpoint secret display one-time-only on create response if backend
  returns `secret`.

Exit Criteria:

- User can create, view, update, delete, and test webhook endpoints from the
  dashboard.
- Delivery logs render from backend data.
- User can retry a failed/retrying/exhausted delivery from the dashboard.
- Validation errors show field-level backend messages, especially invalid URL
  and empty events.
- No production Webhooks route or API module silently reads mock data.

Backend endpoints confirmed:

- `GET /webhooks`
- `POST /webhooks`
- `PATCH /webhooks/:id`
- `DELETE /webhooks/:id`
- `POST /webhooks/:id/test`
- `GET /webhooks/deliveries`
- `POST /webhooks/deliveries/:id/retry`

Implementation Notes:

- `POST /webhooks` requires `url` and at least one event string.
- `PATCH /webhooks/:id` accepts optional `url`, `events`, and `status`.
- `DELETE /webhooks/:id` disables the endpoint rather than hard-deleting it.
- `POST /webhooks/:id/test` accepts an optional body:
  `{ "simulateFailure": boolean }`.
- `POST /webhooks/deliveries/:id/retry` accepts an optional body:
  `{ "outcome": "succeeded" | "failed", "exhaust": boolean }`.
- Webhook delivery status query values are `pending`, `succeeded`, `failed`,
  `retrying`, and `exhausted`.
- Frontend should not fabricate webhook secrets; only display a secret returned
  by the backend create response.

Verification:

- `npm run build` passed after implementation on 2026-05-07.
- Mock import audit passed for `src/lib/api/webhooks.ts` and
  `/webhooks`.

Known follow-ups:

- Webhook View uses a drawer because the app does not have a webhook detail
  route yet. If webhook workflows become deeper, add `/webhooks/:webhookId`.
- Delivery retry currently defaults to a successful retry from the table. A
  later quality pass can add a retry drawer for failed/exhausted simulation.

## Phase F3E-NAV: Resource View Navigation Alignment

Status: implemented and refined

Decision:

- If a resource has a detail page, `View` navigates to that full page.
- Drawers are for create, update, test, and quick actions.
- Agents, Numbers, and Calls now follow this rule.
- Webhooks stay drawer-based until a webhook detail route exists.
- Resource table rows are clickable:
  - Agents rows navigate to full detail.
  - Numbers rows navigate to full detail.
  - Calls rows navigate to full detail.
  - Webhook rows open endpoint details in a drawer for now.
- Copy-to-clipboard is available for identifiers, phone numbers, webhook URLs,
  webhook secrets, and signed test headers.
- Copy controls are icon-only in tables and show a toast after successful copy.
- Webhook event capability selection uses a multi-select style picker instead
  of a raw textarea.
- Resource tables use tighter fixed columns, softer hover states, and truncated
  long values for a cleaner operational dashboard feel.

Reason:

- Full detail pages are better for complete information such as configuration,
  call history, transcripts, number assignment, and future activity tabs.
- Drawers are faster for focused mutations and avoid overloading the list page.

## Phase F3F: Core Dashboard Data Integration

Goal:

Replace mock data on primary dashboard screens with backend API calls.

Build:

- Overview from agents, numbers, calls, conversations, usage, billing.
- Agents CRUD.
- Numbers list/provision/attach/release.
- Inbox conversations/messages.
- Calls list/detail/transcript.
- Webhooks list/test/delivery logs.
- Usage and billing.
- API keys.

Exit Criteria:

- Main navigation screens use backend APIs or explicit backend-gap placeholders.
- No route silently imports `src/lib/mock/data` for production data.

## Phase F3F-1: Usage And Billing Backend Integration

Status: implemented

Goal:

Connect the Usage and Billing screens to real backend records.

Implemented:

- Replaced `src/lib/api/usage.ts` mock wrapper with backend API calls.
- Connected Usage screen to:
  - `GET /usage`
  - `GET /usage/daily`
  - `GET /usage/monthly`
- Added Usage filters for date range, agent, and channel.
- Added backend daily/monthly cost charts.
- Added backend usage event table.
- Replaced `src/lib/api/billing.ts` mock wrapper with backend API calls.
- Connected Billing screen to:
  - `GET /billing/balance`
  - `GET /billing/transactions`
  - `POST /billing/checkout-sessions`
  - `POST /billing/portal-sessions`
- Derived MTD spend from usage events.
- Added Stripe checkout/portal buttons that open returned session URLs.

Verification:

- `npm run build` passed after implementation.
- Mock import audit passed for Usage and Billing routes/API modules.

Known follow-ups:

- Spend-limit editing is not exposed because the backend currently has no
  frontend-facing update endpoint for it.
- Stripe checkout and portal actions depend on backend Stripe configuration.
- MTD spend is derived from usage events until backend exposes a billing summary
  endpoint.

Current Mock Import Audit:

- Direct route mock imports remain only in Service Health.
- API wrapper mock imports remain in legacy mock/type helpers and Contacts.
- Contacts still needs a backend API or a temporary backend-gap placeholder.

## Phase F3F-2: API Keys Backend Integration

Status: implemented

Goal:

Connect API Keys to the backend and remove local mock data from the API Keys route.

Implemented:

- Added `src/lib/api/api-keys.ts`.
- Connected API Keys screen to:
  - `GET /api-keys`
  - `POST /api-keys`
  - `PATCH /api-keys/:id`
  - `DELETE /api-keys/:id`
- Added one-time full key reveal after creation.
- Added copy controls for the full created key and public key prefixes.
- Added rename and revoke actions.
- Added loading, empty, and backend validation/error states.

Verification:

- `npm run build` passed.

## Phase F3F-3: Overview Backend Integration

Status: implemented

Goal:

Replace Overview mock dashboard numbers with backend-derived data.

Implemented:

- Agents count from `GET /agents`.
- Numbers count from `GET /numbers`.
- Recent call count and recent calls table from `GET /calls`.
- Conversation count/recent inbox activity from `GET /conversations`.
- Usage trend from `GET /usage/daily`.
- Billing balance from `GET /billing/balance`.
- Failed webhook count from `GET /webhooks/deliveries?status=failed`.
- Loading and empty states for backend-derived sections.

Verification:

- `npm run build` passed.

## Phase F3F-4: Playground Backend Integration

Status: implemented

Goal:

Replace Playground mock agent data with backend-backed agent, call, message, and webhook test actions.

Implemented:

- Load agents from `GET /agents`.
- Load webhook endpoints from `GET /webhooks`.
- Start outbound calls through `POST /calls`.
- Create web call tokens through `POST /calls/web`.
- Send SMS through `POST /messages`.
- Simulate inbound SMS through `POST /simulations/inbound-sms`.
- Test webhooks through `POST /webhooks/:id/test` after selecting endpoint.
- Simulate webhook failure through `POST /webhooks/:id/test`.
- Show response/error panels for each action.
- Add editable destination, inbound-from, and message body fields.
- Add backend response event log.

Verification:

- `npm run build` passed.

## Phase F3F-5: Service Health Backend Integration

Status: implemented

Goal:

Replace Service Health mock service rows with backend health/status checks.

Implemented:

- Use `GET /health` for backend status.
- Use `GET /workspaces/current` for authenticated API reachability.
- Use `GET /billing/stripe/status` for safe Stripe billing configuration.
- Show frontend/backend/API connectivity states.
- Mark telecom provider status as a tracked backend gap because no safe provider
  status endpoint is exposed yet.
- Add backend URL and last-checked metadata.
- Add refresh, loading, and API error states.

Verification:

- `npm run build` passed.

## Phase F3F-6: Contacts Backend Gap Closure

Status: implemented

Goal:

Make Contacts real or explicitly tracked as unavailable until backend list/detail endpoints exist.

Implemented:

- Added backend Contacts list/detail/update endpoints in the backend repository.
- Connected dashboard Contacts to:
  - `GET /contacts`
  - `GET /contacts/:id`
  - `PATCH /contacts/:id`
- Added contact activity counts from backend relation counts.
- Added inline display-name editing.
- Added phone-number copy action.
- Added loading, empty, validation, and API error states.
- Removed Contacts route/API dependency on mock data.

Verification:

- Backend `npm test -- contacts.service.spec.ts` passed.
- Backend `npm run lint` passed.
- Backend `npm run build` passed.
- Frontend `npm run build` passed.

## Next Priority: Mock Helper Quarantine

Goal:

Remove production-facing legacy mock helper imports after all navigation routes are backend-backed.

Build:

- Inspect remaining `src/lib/api/mock.ts` and `src/lib/api/types.ts` usage.
- Keep mock fixtures only for clearly named dev/demo modules if still useful.
- Ensure no production route imports `src/lib/mock/data`.
- Update tracking with the remaining backend gaps: dashboard summary endpoint, auth/session, user profile, team/member screens, provider status endpoint.

## Phase F4: Drawer And Action Quality Pass

Goal:

Fix Lovable-generated interaction issues before deep backend wiring continues.

Build:

- Standard drawer layout.
- Consistent loading, error, and empty states.
- Form validation and disabled states.
- Confirm destructive actions.
- Responsive drawer behavior.

Exit Criteria:

- Drawer flows are predictable on desktop and mobile.
- Actions do not mutate local-only mock state.

## Phase F5: Backend Gap Closure

Goal:

Track frontend needs that require backend additions.

Likely gaps:

- Contacts API.
- Dashboard summary endpoint.
- Onboarding completion field.
- Google SSO/session endpoints.
- User profile endpoint.
- Team/member invitation screens.

Exit Criteria:

- Every frontend screen either has a backend API, a tracked backend gap, or is
  removed from the MVP navigation until it is real.
