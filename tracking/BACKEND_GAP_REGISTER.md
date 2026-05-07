# AgentLine Backend Gap Register

This register keeps frontend-visible gaps explicit so future phases do not ship
fake UI states or invent unsupported contracts.

## Closed Or Partially Closed

### Workspace Settings

Status: partially closed

Implemented:

- `GET /v1/workspaces/current`
- `PATCH /v1/workspaces/current`
- Frontend Workspace settings panel loads and saves the workspace name.

Remaining:

- Workspace billing email and slug are not exposed by the backend serializer.
- Onboarding completion state is not persisted yet.

### Team Members And Invites

Status: partially closed

Implemented:

- `GET /v1/workspaces/current/members`
- `PATCH /v1/workspaces/current/members/:memberId`
- `DELETE /v1/workspaces/current/members/:memberId`
- `GET /v1/workspaces/current/invites`
- `POST /v1/workspaces/current/invites`
- `DELETE /v1/workspaces/current/invites/:inviteId`
- `POST /v1/workspaces/current/invites/:inviteId/resend`
- Frontend Settings Members and Invites panels are backend-backed.

Remaining:

- Invite acceptance flow is not implemented.
- Email delivery is not implemented; the backend returns a one-time raw token.
- Role permissions are not enforced across every product action yet.

## Open Gaps

### Real Auth, Google SSO, And User Profile

Priority: P1

Needed:

- Session-based authentication.
- Google OAuth start and callback endpoints.
- Current user/profile endpoint.
- Logout/session revocation endpoint.
- Route-level frontend session refresh.
- User workspace list endpoint.
- Workspace creation endpoint.
- Active workspace/project context endpoint.

Reason:

The current dashboard uses API-key login for fast local development. That is
good for backend/API work, but not enough for production user access.
API-key auth resolves one workspace/project pair, so workspace creation and
workspace switching must wait for real user sessions.

### Dashboard Summary Endpoint

Priority: P2

Needed:

- Single endpoint for overview totals, recent calls, recent conversations,
  usage, balance, and health state.

Reason:

The Overview page currently derives data from several endpoints. That works for
Phase 1 but will become noisy and slow as usage grows.

### Provider Runtime Status

Priority: P2

Needed:

- Safe provider status endpoint for active telecom provider, Twilio config
  readiness, callback URL readiness, and mode.
- No secrets in responses.

Reason:

Service Health can check app and Stripe status today, but telecom provider
readiness is still represented as a known backend gap.

### Usage Controls And Compliance Settings

Priority: P2

Needed:

- Editable spend limit endpoint.
- Recording consent controls.
- Data retention settings.
- Compliance/audit log viewer.

Reason:

The product needs safety controls before bounded paying beta usage.
