# Vukho Frontend Phase Review Checklist

Run this after every frontend implementation phase.

## Functionality

- Does the implemented flow work with the real NestJS backend?
- Are loading, empty, error, and success states covered?
- Are forms validated before submission?
- Are destructive actions confirmed?
- Does the flow still work after browser refresh?

## Integration

- Are API calls centralized under `src/lib/api/`?
- Are auth/session concerns centralized under `src/lib/auth/`?
- Are backend gaps documented in `NEXT_PHASE_PLAN.md` or the ledger?
- Are mock imports removed from production routes touched in this phase?

## UX

- Is the UI consistent with the Vukho dashboard theme?
- Does the layout work on desktop and mobile widths?
- Do drawers, dialogs, and menus open and close predictably?
- Does copy explain what happened without becoming marketing text?

## Engineering

- Does `npm run build` pass?
- Are types explicit enough for future agents to continue safely?
- Are changes scoped to the current phase?
- Was `IMPLEMENTATION_LEDGER.md` updated?
