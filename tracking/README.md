# Vukho Frontend Tracking

This folder is the frontend implementation source of truth.

Use it to track what has been implemented, what is next, what needs review,
and which frontend rules must stay true while the Lovable-generated UI is
converted into a production Vukho dashboard.

## Files

- `IMPLEMENTATION_LEDGER.md`: completed frontend work, decisions, and verification.
- `NEXT_PHASE_PLAN.md`: current phase, planned slices, exit criteria, and next steps.
- `FRONTEND_RULES.md`: coding, UX, API integration, and open-source readiness rules.
- `PHASE_REVIEW_CHECKLIST.md`: checklist to run after every frontend phase.

## Current Direction

Frontend work should move from mock screens to real backend flows in this order:

1. Authentication and workspace bootstrap.
2. Real API client foundation.
3. Onboarding connected to backend workspace and agents.
4. Core dashboard pages connected to backend APIs.
5. Drawer/action fixes and empty/loading/error states.
6. Remove mock data from production routes.
