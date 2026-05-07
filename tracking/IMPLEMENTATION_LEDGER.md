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

Current mock areas:

- Overview, Inbox, Usage, Billing, API Keys, Playground, Service Health, and
  Contacts still use mock data directly or through legacy API wrappers.
- Webhooks, Usage, Billing, Contacts, and Messages API modules still contain
  mock wrappers.
