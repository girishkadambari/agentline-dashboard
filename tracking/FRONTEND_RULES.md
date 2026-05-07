# AgentLine Frontend Rules

These rules apply to all frontend work.

## Product Rules

- AgentLine is a developer-first AI agent telephony dashboard.
- The UI should prioritize setup clarity, operational visibility, and fast agent
  testing over marketing content.
- Do not build landing pages in this app unless explicitly requested.
- Do not copy AgentPhone, Twilio, Vapi, Retell, Bland, or Lovable branding.

## API Rules

- New production flows should call the NestJS backend through `src/lib/api/`.
- Do not call `fetch` directly from route components unless a small exception is
  documented in the implementation ledger.
- Store backend-specific mapping in API modules, not UI components.
- Keep mock data only for design previews or explicitly marked backend gaps.
- Surface backend errors in user-visible states.

## Auth Rules

- Current MVP auth is API-key based.
- Google SSO is planned but should not fake successful authentication.
- Protected app routes must require a valid local API key.
- Store only the API key needed for local development until backend session auth
  exists.

## UX Rules

- Keep the quiet, precise, monochrome-plus-accent dashboard theme.
- Use compact operational layouts, not generic AI hero/product marketing layouts.
- Every page needs loading, empty, error, and success states when connected to an API.
- Drawers should have one primary action, one cancel/close action, and clear
  validation errors.
- Avoid nested cards and decorative gradients.

## Code Rules

- Prefer small modules with single responsibility.
- Keep route components focused on page composition.
- Keep API transformation, request, and auth/session logic outside route files.
- Use TypeScript types for backend responses.
- Run `npm run build` after meaningful implementation slices.
