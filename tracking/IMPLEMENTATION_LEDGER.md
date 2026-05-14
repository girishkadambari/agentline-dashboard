# AgentLine Frontend Implementation Ledger

This ledger records frontend work as it is implemented. Update it after each
meaningful slice so another engineer or AI agent can resume without guessing.

## 2026-05-07 - Frontend Tracking Started

Status: in progress

Implemented:

- Created frontend tracking structure under `tracking/`.
- Established the frontend refactor direction: move from Lovable mock UI to real
  backend-connected AgentLine dashboard.

Decisions:

- Frontend and backend remain separate repositories for now.
- Backend source of truth is the NestJS API at `http://localhost:3000/v1`.
- Initial usable login is API-key based because the backend currently supports
  API-key authentication before Google SSO sessions.
- Google SSO UI can remain visible only as a future auth path; it must not fake
  a successful login.

Verification:

- `npm run build` passed on 2026-05-07 after Phase F1 code changes.
- `npm run build` passed again after onboarding backend integration.

## Current Slice - Phase F1

Goal:

- Create a real frontend API foundation and login flow that can validate against
  the backend.

Planned files:

- `src/lib/auth/session.ts`
- `src/lib/api/client.ts`
- `src/lib/api/workspace.ts`
- `src/routes/login.tsx`
- `src/components/layout/AppShell.tsx`
- `.env.example`

Implemented:

- Added API-key session helpers.
- Added real backend API request client with configurable base URL.
- Added current-workspace API module.
- Replaced fake Google-only login with API-key validation flow.
- Added app-shell auth guard, sign out, backend connection state, and workspace
  name loading.
- Connected onboarding to backend workspace update and first-agent creation.

Expected behavior:

- User enters an AgentLine API key on `/login`.
- Frontend validates the key with `GET /workspaces/current`.
- Valid key is stored locally.
- App shell redirects unauthenticated users to `/login`.
- Sidebar displays the real workspace name when backend is reachable.

## 2026-05-07 - Frontend Review After Working Login

Status: reviewed

What is working:

- API-key login flow is connected to the backend workspace endpoint.
- Local API key is stored and reused by the central API client.
- App shell loads the real workspace and exposes a sign-out action.
- Onboarding can update workspace name and create a first backend agent.
- Production build passes.

Review findings to address next:

- Protected app routes currently redirect from inside `AppShell` after render.
  Move this into a route-level guard or render a blocking auth state before
  children mount.
- `/auth/callback` still simulates Google SSO and redirects to onboarding. This
  route must be disabled or replaced before Google auth is exposed again.
- Agents page still reads mock agents through `listAgents().data`, so agents
  created from onboarding do not appear there yet.
- Most dashboard pages still import `src/lib/mock/data` directly or through
  mock API wrappers.
- Onboarding can create duplicate agents if the user repeats setup. Decide
  whether onboarding should create once, update an existing onboarding agent, or
  ask the user before creating another.

Next implementation priority:

1. Connect Agents list/detail/create/update/disable to backend APIs.
2. Add route-level auth guard behavior for protected app routes.
3. Disable fake `/auth/callback` until real Google SSO exists.
4. Continue page-by-page mock removal in the order: Numbers, Calls, Inbox,
   Webhooks, Usage/Billing, API Keys.

## 2026-05-07 - Phase F3A Agents Backend Integration

Status: implemented

Implemented:

- Converted the Agents list screen to load from `GET /agents`.
- Added backend-backed create agent dialog using `POST /agents`.
- Converted agent detail screen to load from `GET /agents/:id`.
- Added backend-backed agent configuration save using `PATCH /agents/:id`.
- Added backend-backed disable action using `DELETE /agents/:id`.
- Removed mock agent data usage from the Agents list/detail routes.
- Added backend agent mapping for UI fields that do not exist as backend rollups
  yet, such as numbers, calls, messages, and last activity.
- Disabled fake Google callback behavior; `/auth/callback` now clearly says
  Google SSO is not configured.
- App shell now blocks protected content until the local auth check has run.

Verification:

- `npm run build` passed after Phase F3A.

Known follow-ups:

- Agents still show zero rollups until backend summary/count fields exist.
- Agent detail tabs for numbers, conversations, and calls are placeholders until
  those pages are connected to backend APIs.
- Auth should eventually move to a true route-level guard when backend session
  auth exists.

UI clarity follow-up implemented:

- Added explicit `View` and `Update` actions to the Agents table.
- Added `?tab=config` support so Update opens the agent detail page directly on
  the editable Configuration tab.
- Added an `Update config` action on the agent detail header.
- Made `InlineTabs` support controlled active tab state for deep-linked update
  flows.

Drawer flow correction:

- Converted Agents `Create` from a centered dialog to a right-side drawer.
- Converted Agents table `View` into a right-side read-only drawer.
- Converted Agents table `Update` into a right-side editable drawer.
- Added a View drawer `Update` action that switches into the editable drawer
  without navigating away.
- `npm run build` passed after drawer conversion.

## 2026-05-07 - Phase F3B Numbers Backend Integration

Status: implemented

Implemented:

- Converted `src/lib/api/numbers.ts` from mock wrappers to backend API calls.
- Connected `/numbers` to `GET /numbers`.
- Added a right-side Provision number drawer using `POST /numbers`.
- Added agent assignment during provisioning using backend agents.
- Added right-side View and Update drawers for numbers.
- Added attach/detach behavior through `PATCH /numbers/:id`.
- Added release behavior through `DELETE /numbers/:id`.
- Connected `/numbers/$numberId` to `GET /numbers/:id`.
- Added number detail assignment save and release actions.
- Removed mock number usage from Numbers list/detail routes.

Verification:

- `npm run build` passed after Phase F3B.
- Mock import audit passed for numbers API and numbers routes.

Known follow-ups:

- Monthly number cost is still a frontend constant until backend exposes pricing
  metadata on number records or usage pricing APIs.
- Number activity tabs should be revisited after Calls and Inbox are connected
  to backend data.

## 2026-05-07 - Phase F3C Calls Backend Integration

Status: implemented

Implemented:

- Converted `src/lib/api/calls.ts` from mock wrappers to backend API calls.
- Connected `/calls` to `GET /calls`.
- Added a right-side Start outbound call drawer using `POST /calls`.
- Loaded backend agents for call creation and call list agent names.
- Connected `/calls/$callId` to `GET /calls/:id`.
- Connected transcript rendering to `GET /calls/:id/transcript`.
- Added end call action using `POST /calls/:id/end`.
- Added transfer action using `POST /calls/:id/transfer`.
- Removed mock call usage from Calls list/detail routes.

Verification:

- `npm run build` passed after Phase F3C.
- Mock import audit passed for calls API and calls routes.

Known follow-ups:

- Outbound call creation requires a voice-capable number attached to the agent.
  The UI shows the backend conflict today; later it should warn before submit.
- Transfer currently uses a browser prompt and should become a drawer/form in a
  voice workflow quality pass.

## 2026-05-13 - Phase F7 Agent Operating Console

Status: implemented first slice

Implemented:

- Added frontend mapping for `GET /agents/:id/summary`.
- Agent detail now uses the backend summary response for real agent-scoped
  numbers, conversations, calls, message count, usage, webhook deliveries, and
  timeline.
- Added usage cost, usage event count, webhook failure count, and conversation
  count to the Agent overview.
- Added an activity timeline to the Agent overview.
- Added a Debug tab for recent usage events and webhook delivery diagnostics.
- Added provider issue count and provider issue diagnostics to the Agent
  overview/debug flow.

Verification:

- Frontend `npm run build` passed. Wrangler printed its known local log-file
  permission warning, but the build completed successfully.

## 2026-05-13 - Phase F8 Call Lifecycle Detail

Status: implemented

Implemented:

- Call detail refreshes automatically while a call is queued, ringing, or in
  progress.
- Added manual Refresh action on call detail.
- Added provider callback diagnostics to the call detail sidebar.
- Frontend call API mapping now includes provider call id and provider
  diagnostics.

Verification:

- Frontend `npm run build` passed. Wrangler printed the known local log-file
  permission warning, but the build completed successfully.

Route rendering fix:

- Fixed nested detail route rendering for Agents, Numbers, and Calls by
  rendering child `Outlet` content when the URL is on a detail route.
- This resolves the issue where clicking a table `View` link changed the route
  but appeared to open nothing because the parent list route kept rendering.
- `npm run build` passed after the fix.

## 2026-05-07 - Review After Agents, Numbers, Calls

Status: reviewed

Review result:

- Agents, Numbers, and Calls list/detail flows are now backend-backed.
- Agents, Numbers, and Calls touched routes no longer rely on production mock
  route data.
- Nested detail routes now render correctly through parent route outlets.
- Backend validation details are formatted into user-facing field messages.
- Local backend top-up flow exists for exhausting mock billing balance during
  development.

Fix applied during review:

- Calls frontend cost estimate now matches backend Phase 1 mock voice pricing:
  3 cents per billable minute. A 64 second mock call displays `$0.06` instead
  of `$0.08`.

Remaining risks:

- `src/lib/api/agents.ts` still contains legacy mock wrapper exports used by
  untouched pages. Remove them once all route consumers are backend-backed.
- Some parent routes fetch list data even when rendering a child detail route.
  This is acceptable for now but can be optimized with route-level loaders or
  cleaner layout routes.
- Call transfer still uses `window.prompt`; replace with a drawer/form in a
  future call quality pass.
- Frontend cost/monthly price displays should eventually come from backend
  usage/pricing endpoints instead of frontend constants.

Current mock areas before Phase F3D:

- Overview, Inbox, Usage, Billing, API Keys, Playground, Service Health, and
  Contacts still used mock data directly or through legacy API wrappers.
- Webhooks, Usage, Billing, Contacts, and Messages API modules still contained
  mock wrappers.

## 2026-05-07 - Phase F3D Inbox And Messages Backend Integration

Status: implemented

Implemented:

- Converted `src/lib/api/messages.ts` from mock wrappers to backend API calls.
- Connected `/inbox` to `GET /conversations`.
- Connected selected conversation threads to
  `GET /conversations/:id/messages`.
- Added a right-side Send SMS drawer using `POST /messages`.
- Added a right-side Simulate inbound SMS drawer using
  `POST /simulations/inbound-sms`.
- Loaded backend agents for SMS send/simulation forms and conversation labels.
- Preserved the three-panel Inbox layout with backend conversations, thread
  messages, and details.
- Removed legacy mock-compatible exports from `src/lib/api/agents.ts` because
  no production route consumers remained.

Verification:

- `npm run build` passed after Phase F3D.
- Mock import audit passed for Inbox and Messages:
  `src/routes/_app.inbox.tsx` and `src/lib/api/messages.ts` no longer import
  mock data.
- Legacy mock export audit passed for Agents: no route consumers remain for
  `listAgents`, `getAgent`, `createAgent`, `updateAgent`, `disableAgent`,
  `sendTestSms`, or `startTestCall`.

Known follow-ups:

- Inbox displays contact IDs because the backend conversation serializer does
  not yet include contact phone/name fields.
- Inline reply is intentionally routed through a drawer until the backend
  exposes a safe recipient on conversations.
- SMS send/simulation still requires the selected agent to have an active
  SMS-capable number; the drawer surfaces backend conflicts.

Next implementation priority:

1. Connect Webhooks list/create/update/delete/test/deliveries to backend APIs.
2. Convert Usage and Billing screens to backend APIs.
3. Replace direct Overview mock data with backend-derived summaries or explicit
   backend-gap placeholders.
4. Replace `window.prompt` call transfer with a drawer during the call quality
   pass.

## 2026-05-07 - Review After Phase F3D

Status: reviewed

Review result:

- Inbox and Messages are backend-backed and no longer import mock data.
- Send SMS and Simulate inbound SMS use backend drawers and refresh the selected
  conversation after success.
- Build passes after the phase.
- Agent legacy mock exports were removed safely.

Review finding to address:

- Inbox thread loading can race if a user changes selected conversations quickly.
  A slower response for an older conversation can overwrite the current thread.
  Guard `loadThread` responses against stale conversation IDs before deeper
  Inbox polish or live data testing.

Next implementation phase:

- Phase F3E Webhooks Backend Integration.
- Primary files:
  - `src/lib/api/webhooks.ts`
  - `src/routes/_app.webhooks.tsx`
- Backend endpoints:
  - `GET /webhooks`
  - `POST /webhooks`
  - `PATCH /webhooks/:id`
  - `DELETE /webhooks/:id`
  - `POST /webhooks/:id/test`
  - `GET /webhooks/deliveries`
  - `POST /webhooks/deliveries/:id/retry`

## 2026-05-07 - Phase F3E Webhooks Backend Integration

Status: implemented

Implemented:

- Converted `src/lib/api/webhooks.ts` from mock wrappers to backend API calls.
- Connected `/webhooks` to `GET /webhooks`.
- Added endpoint creation with `POST /webhooks`.
- Added endpoint update with `PATCH /webhooks/:id`.
- Added endpoint disable with `DELETE /webhooks/:id`.
- Added endpoint test delivery with `POST /webhooks/:id/test`.
- Connected recent delivery logs to `GET /webhooks/deliveries`.
- Added retry action with `POST /webhooks/deliveries/:id/retry`.
- Added one-time secret display after create when backend returns `secret`.
- Added backend validation/error display for create/update/test/retry flows.
- Added empty/loading/error states for endpoints and deliveries.

Navigation cleanup:

- Fixed the Inbox stale thread response race with a request token.
- Standardized resource view behavior:
  - Agents `View` now navigates to `/agents/:agentId`.
  - Numbers `View` now navigates to `/numbers/:numberId`.
  - Calls already navigated to `/calls/:callId`.
  - Update/create flows remain drawers.
- Removed dead Agents and Numbers view-drawer branches after changing View to
  full-page navigation.

Verification:

- `npm run build` passed after implementation.
- Mock import audit passed for Webhooks, Inbox, Messages, Agents, and Numbers
  touched files.

Known follow-ups:

- Webhooks currently use a drawer for view because no webhook detail route
  exists. Add `/webhooks/:webhookId` later if webhook details/deliveries grow.
- Retry delivery table action assumes a successful retry. A later drawer can
  expose mock retry outcomes.
- Remaining mock areas are Overview, Playground, Usage, Billing, API Keys,
  Service Health, Contacts, and legacy wrapper modules for Usage/Billing/
  Contacts.

Next implementation priority:

1. Connect Usage and Billing screens to backend APIs.
2. Connect API Keys to backend APIs.
3. Replace Overview mock data with backend-derived summaries or explicit
   backend-gap placeholders.
4. Add Contacts backend support or mark Contacts as a tracked backend gap.

## 2026-05-07 - Navigation And Premium Interaction Pass

Status: implemented and refined

Implemented:

- Added row-click navigation for primary resource tables:
  - Agents rows open full agent detail.
  - Numbers rows open full number detail.
  - Calls rows open full call detail.
- Kept row actions secondary:
  - View still exists as an explicit action.
  - Update/test/release/disable buttons stop row navigation and keep their
    action behavior.
- Added reusable `CopyButton` component for clipboard actions.
- Added copy actions where they are useful:
  - agent IDs
  - phone numbers
  - call IDs
  - webhook URLs
  - webhook endpoint IDs
  - webhook secrets
  - webhook test signature headers
- Replaced webhook freeform event textarea with a clearer event capability
  picker:
  - selectable common AgentLine events
  - selected event chips
  - custom event add flow
  - easy remove behavior
- Made webhook endpoint rows clickable to open the endpoint detail drawer until
  a dedicated webhook detail route exists.
- Refined copy controls:
  - copy is icon-only in dense tables.
  - copy shows a "Copied to clipboard" toast.
  - text labels are hidden unless explicitly needed.
- Improved table visual quality:
  - fixed table columns for primary resource tables.
  - softer row hover states.
  - cleaner header/background separation.
  - tighter row spacing and truncated long identifiers.
  - hover-only copy icons to reduce visual noise.

Verification:

- `npm run build` passed after the interaction pass.
- `npm run build` passed again after icon-only copy, toast, and table styling
  refinements.

Decision:

- Table row click is now the fastest path to inspect a resource.
- Full pages remain the best destination for resources with complete details.
- Drawers remain best for focused actions like create, update, test, and retry.

## 2026-05-07 - Review After Navigation And Interaction Pass

Status: reviewed

Review result:

- Row-click navigation now gives the fastest path to inspect Agents, Numbers,
  Calls, and Webhooks.
- Copy controls are icon-only in dense tables and show toast feedback.
- Webhook event selection is clearer than the previous textarea approach.
- Build passed after the interaction pass.

No blocking findings.

## 2026-05-07 - Phase F3F-1 Usage And Billing Backend Integration

Status: implemented

Implemented:

- Converted `src/lib/api/usage.ts` from mock wrappers to backend API calls.
- Connected `/usage` to `GET /usage`, `GET /usage/daily`, and
  `GET /usage/monthly`.
- Added Usage filters for range, agent, and channel.
- Added backend-derived summary stats for total cost, quantity, voice cost, and
  SMS cost.
- Added backend daily/monthly cost charts.
- Added backend usage event table with empty/loading/error states.
- Converted `src/lib/api/billing.ts` from mock wrappers to backend API calls.
- Connected `/billing` to `GET /billing/balance` and
  `GET /billing/transactions`.
- Derived monthly spend from backend usage events for the current month.
- Added Stripe checkout and billing portal actions using backend session
  endpoints.
- Added backend transaction table and balance detail panel.

Verification:

- `npm run build` passed after implementation.
- Mock import audit passed for:
  - `src/routes/_app.usage.tsx`
  - `src/lib/api/usage.ts`
  - `src/routes/_app.billing.tsx`
  - `src/lib/api/billing.ts`

Known follow-ups:

- Billing spend-limit editing needs a backend update endpoint before the
  frontend can support it.
- Checkout and portal actions need Stripe environment variables configured in
  the backend.
- Billing summary should eventually come from a dedicated backend endpoint
  instead of deriving MTD spend from usage events in the frontend.

Next implementation priority:

1. Connect API Keys to backend APIs.
2. Replace Overview mock data with backend-derived summaries or explicit
   backend-gap placeholders.
3. Add Contacts backend support or convert Contacts to a tracked backend-gap
   placeholder.
4. Connect Playground to backend-backed agents, calls, messages, and webhooks.

## 2026-05-07 - Phase F3F-2 Stripe Billing Status Wiring

Status: implemented

Implemented:

- Added `GET /billing/stripe/status` frontend API wrapper.
- Added Stripe mode/configuration status to the Billing page.
- Billing page now shows whether the backend Stripe secret key is configured,
  whether it matches `STRIPE_MODE`, and whether webhook signing is configured.
- Billing stats now include Stripe mode/readiness before users launch Checkout.

Verification:

- `npm run build` passed.

## 2026-05-07 - Usage Route Placeholder Fix

Status: implemented

Issue:

- `/usage` was rendering the TanStack generated placeholder text
  `Hello "/_app/usage"!` instead of the backend-backed Usage page.

Fix:

- Restored `src/routes/_app.usage.tsx` to the real Usage implementation with
  backend usage events, daily/monthly rollups, filters, stats, charts, loading
  states, empty states, and error handling.
- Checked for remaining generated `Hello "/_app..."` placeholders in route
  files; none remain.

Verification:

- `npm run build` passed.

## 2026-05-07 - Phase F3F-2 API Keys Backend Integration

Status: implemented

Implemented:

- Added `src/lib/api/api-keys.ts` for backend API-key list/create/update/revoke
  calls.
- Replaced the API Keys route mock import with real backend data.
- Connected `/api-keys` to:
  - `GET /api-keys`
  - `POST /api-keys`
  - `PATCH /api-keys/:id`
  - `DELETE /api-keys/:id`
- Added one-time full key reveal after key creation.
- Added copy controls for created keys and key prefixes.
- Added rename and revoke actions.
- Added loading, empty, validation, and API error states.
- Updated the frontend next-phase plan and mock import audit.

Verification:

- `npm run build` passed.

Next implementation priority:

1. Replace Overview mock data with backend-derived summaries.
2. Connect Playground to backend-backed agents, calls, messages, and webhooks.
3. Replace Service Health mock data with backend health/status checks.
4. Add Contacts backend support or convert Contacts to a tracked backend-gap
   placeholder.

## 2026-05-07 - Phase F3F-3 Overview Backend Integration

Status: implemented

Implemented:

- Replaced Overview route mock imports with backend API calls.
- Connected `/` overview to:
  - `GET /agents`
  - `GET /numbers`
  - `GET /calls`
  - `GET /conversations`
  - `GET /usage/daily`
  - `GET /billing/balance`
  - `GET /webhooks/deliveries?status=failed`
- Added backend-derived stats for active agents, active numbers, recent calls,
  conversations, failed webhooks, seven-day spend, and billing balance.
- Added backend-derived usage trend chart.
- Added backend-derived recent conversations and recent calls sections.
- Added loading, empty, and API error states.
- Updated the next-phase plan to make Playground backend integration the next
  frontend priority.

Verification:

- `npm run build` passed.
- Mock import audit now shows direct mock route imports only in Playground and
  Service Health.

Next implementation priority:

1. Connect Playground to backend-backed agents, calls, messages, and webhooks.
2. Replace Service Health mock data with backend health/status checks.
3. Add Contacts backend support or convert Contacts to a tracked backend-gap
   placeholder.

## 2026-05-07 - Phase F3F-4 Playground Backend Integration

Status: implemented

Implemented:

- Replaced Playground route mock imports with backend API calls.
- Connected `/playground` to:
  - `GET /agents`
  - `GET /webhooks`
  - `POST /calls`
  - `POST /calls/web`
  - `POST /messages`
  - `POST /simulations/inbound-sms`
  - `POST /webhooks/:id/test`
- Added selectable agent and webhook endpoint setup.
- Added editable destination number, inbound-from number, and message body.
- Added backend-backed actions for outbound calls, web call token creation,
  outbound SMS, inbound SMS simulation, webhook test, and webhook failure
  simulation.
- Added a live event log with serialized backend response details.
- Added loading, pending-action, validation, and API error states.
- Updated the next-phase plan to make Service Health backend integration the
  next frontend priority.

Verification:

- `npm run build` passed.
- Mock import audit now shows direct mock route imports only in Service Health.

Next implementation priority:

1. Replace Service Health mock data with backend health/status checks.
2. Add Contacts backend support or convert Contacts to a tracked backend-gap
   placeholder.

## 2026-05-07 - Phase F3F-5 Service Health Backend Integration

Status: implemented

Implemented:

- Added `src/lib/api/health.ts` for public backend health checks.
- Replaced Service Health route mock imports with live backend checks.
- Connected `/service-health` to:
  - `GET /health`
  - `GET /workspaces/current`
  - `GET /billing/stripe/status`
- Added live status rows for Backend API, Authenticated API, Dashboard, Stripe
  Billing, and Telecom Provider.
- Marked Telecom Provider as degraded with an explicit note that no safe runtime
  provider status endpoint exists yet.
- Added backend URL, last-checked, workspace metadata, refresh, loading, and API
  error states.
- Updated the next-phase plan to make Contacts backend gap closure the next
  frontend/backend priority.

Verification:

- `npm run build` passed.
- Mock import audit now shows no direct route imports from `src/lib/mock/data`.

Next implementation priority:

1. Close the Contacts backend gap and remove remaining Contacts mock API usage.
2. Remove or quarantine legacy mock helper modules once no production route
   depends on them.

## 2026-05-07 - Phase F3F-6 Contacts Backend Gap Closure

Status: implemented

Implemented:

- Added backend Contacts API support in the backend repository:
  - `GET /contacts`
  - `GET /contacts/:id`
  - `PATCH /contacts/:id`
- Backend Contacts responses now include relation counts for conversations,
  messages, and calls.
- Added backend contact list/update service coverage.
- Replaced dashboard Contacts mock API wrapper with backend calls.
- Replaced Contacts route mock data with backend data.
- Added inline display-name editing.
- Added phone-number copy action.
- Added loading, empty, validation, and API error states.
- Updated the next-phase plan to move remaining mock work into mock helper
  quarantine.

Verification:

- Backend `npm test -- contacts.service.spec.ts` passed.
- Backend `npm run lint` passed.
- Backend `npm run build` passed.
- Frontend `npm run build` passed.
- Mock import audit now shows no production route importing `src/lib/mock/data`.

Next implementation priority:

1. Quarantine or remove legacy mock helper modules.
2. Track remaining backend gaps: dashboard summary endpoint, auth/session,
   user profile, team/member screens, and provider status endpoint.

## 2026-05-07 - Phase F3F-7 Mock Helper Quarantine

Status: implemented

Implemented:

- Removed unused production-facing mock bridge `src/lib/api/mock.ts`.
- Removed orphaned mock fixture file `src/lib/mock/data.ts`.
- Removed mock fixture type re-exports from `src/lib/api/types.ts`.
- Removed unused `wrap`, `wrapList`, and `delay` helpers from
  `src/lib/api/client.ts`.
- Verified no source imports remain for `src/lib/mock`, `mock/data`, `wrap`,
  `wrapList`, or `delay`.

Verification:

- `npm run build` passed.

Next implementation priority:

1. Create a backend/frontend gap register for dashboard summary, real auth,
   user profile, team/member screens, and provider runtime status.
2. Start the highest-priority backend gap from that register.

## 2026-05-07 - Phase F4A Settings Workspace, Members, And Gap Register

Status: implemented

Implemented:

- Added `tracking/BACKEND_GAP_REGISTER.md` for frontend-visible backend gaps.
- Extended `src/lib/api/workspace.ts` with workspace members and invite API
  functions.
- Replaced the static Settings screen with backend-backed panels for Workspace,
  Members, and Invites.
- Added workspace name save through `PATCH /workspaces/current`.
- Added member role update and remove actions through the existing backend
  workspace member APIs.
- Added invite creation, resend, revoke, and one-time raw token copy flow
  through the existing backend invite APIs.
- Replaced fake connected Google SSO/provider settings with explicit pending
  backend-gap panels.

Verification:

- `npm run build` passed.
- `npx eslint src/routes/_app.settings.tsx src/lib/api/workspace.ts` passed.
- Full `npm run lint` still fails on existing repo-wide Prettier issues outside
  this phase; this slice's changed source files pass targeted lint.

Next implementation priority:

1. Implement the highest-priority backend gap: real auth/session, Google SSO,
   and current-user profile planning or endpoints.
2. Add provider runtime status endpoint so Service Health can stop using a
   known telecom-provider gap row.

## 2026-05-07 - Workspace Hierarchy Review

Status: implemented

Review finding:

- The sidebar looked like a workspace switcher, but the backend currently only
  supports the current workspace resolved from the active API key.
- There is no create-workspace, list-workspaces, or switch-workspace API yet.
- This is not a Settings CRUD bug; it is a real-auth/session gap.

Implemented:

- Changed the sidebar workspace control into a current-workspace link to
  Settings instead of a fake switcher.
- Added workspace creation/switching requirements to the frontend backend gap
  register.

Verification:

- `npx eslint src/components/layout/AppShell.tsx src/routes/_app.settings.tsx src/lib/api/workspace.ts` passed.
- `npm run build` passed.

Product rule:

- With API-key auth, the API key selects one workspace and one project. To work
  in another workspace/project during Phase 1, sign in with that workspace's
  API key.

## 2026-05-08 - Live Provider Flow Cleanup

Status: implemented

Implemented:

- Removed the frontend inbound SMS simulation action from Inbox.
- Removed the `POST /simulations/inbound-sms` client helper.
- Removed inbound SMS simulation from Playground.
- Removed the orphaned `src/lib/mock/data.ts` fixture file.
- Replaced user-facing "mock" copy in primary live-flow screens with
  provider-backed language.
- Cleared default fake phone numbers from SMS/call forms so live testing uses
  the tester's actual verified destination number.
- Left webhook test delivery controls in place because they call the backend
  webhook test endpoint and are explicitly labeled as tests.

Verification:

- Source audit shows no production source imports from `src/lib/mock`.
- Source audit shows no frontend calls to `/simulations`.
- `npm run build` passed.

Live test note:

- Inbound SMS must now come from Twilio calling
  `/v1/providers/twilio/sms/inbound`.
- Outbound SMS and calls go through the backend provider APIs.

## 2026-05-08 - Existing Number Import UI

Status: implemented

Implemented:

- Added an **Import existing** action to the Numbers page.
- Added a Numbers drawer mode for importing a Twilio number that already exists
  in the connected Twilio account.
- Import flow calls `POST /numbers/import` instead of provisioning/buying a new
  number.
- Empty state now offers both paths:
  - Import existing: connect the trial/live-dev Twilio number already owned.
  - Provision number: buy a new provider number when the Twilio account allows
    it.

Verification:

- `npm run build` passed.

Product rule:

- During Twilio trial testing, use **Import existing** for the one Twilio-owned
  number. Use **Provision number** only after upgrading or when intentionally
  buying another number.

## 2026-05-13 - Session Auth Frontend Integration

Status: implemented

Implemented:

- Added `src/lib/api/auth.ts` for backend session APIs:
  - `GET /users/me`
  - `POST /auth/logout`
  - `GET /auth/google/start` redirect helper
  - session workspace list/create/switch/invite accept helpers
- Updated the API client to:
  - send cookies with requests
  - add `X-CSRF-Token` from the `agentline_csrf` cookie for session writes
  - keep developer API-key fallback support when explicitly stored
- Updated login:
  - primary action now starts real backend Google OAuth
  - API-key login is hidden behind a developer fallback
- Updated the app shell:
  - primary auth check is now `GET /users/me`
  - sidebar/profile use real current-user/session context
  - workspace switcher calls backend session switch endpoint
  - sign out calls backend logout and then clears local fallback state
- Updated onboarding:
  - loads active workspace from `GET /users/me`
  - uses the same session-aware API client for workspace and agent writes
- Updated `/auth/callback` copy so it no longer says Google SSO is pending.

Verification:

- `npm run build` passed.

Follow-ups:

- Run a live browser smoke test with backend Google OAuth configured.
- Clean up Settings auth copy to show real session status.

## 2026-05-13 - Webhook Event Catalog UI

Status: implemented

Implemented:

- Added `GET /webhooks/events` client support.
- Updated the Webhooks create/update drawer to load event groups from the
  backend event catalog.
- Expanded selectable events beyond the old five hardcoded options:
  - wildcard families
  - agent lifecycle
  - number lifecycle
  - message lifecycle
  - call lifecycle
  - conversation lifecycle
  - contact lifecycle
  - test events
- Default new endpoint selection is now `agent.message.*` and `agent.call.*`
  so live SMS/call testing receives all core communication events.
- Kept custom event input for forward compatibility.

Verification:

- targeted `eslint` passed for `src/routes/_app.webhooks.tsx` and
  `src/lib/api/webhooks.ts`.
- `npm run build` completed; Wrangler still logs a sandbox warning while trying
  to write under the user preferences directory, but Vite client/server bundles
  were generated.
