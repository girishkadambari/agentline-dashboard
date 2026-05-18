# Vukho UI/UX Polish Audit

This document captures the product polish layer Vukho needs before the
dashboard feels like a premium agent infrastructure platform.

The goal is not to make Vukho look like a generic AI SaaS. The UI should
feel operational, intelligent, developer-first, and agent-native: calm, fast,
precise, and built for people who are wiring AI agents into real phone
workflows.

## Current UX Diagnosis

Vukho is now mostly backend-connected, but the interface still feels like a
Lovable-generated dashboard shell in several places.

Main issues:

- The app has product screens, but not yet a strong platform frame.
- Navigation is flat and not grouped by workflow.
- Workspace/project context is underdeveloped.
- Tables work, but do not feel like premium operational tables.
- Detail pages and drawers are inconsistent.
- The top bar is mostly empty utility space.
- The product hierarchy is not visible enough.
- Empty states and helper copy still sometimes sound like implementation notes.
- Some controls expose backend mechanics instead of guiding the user through the
  intended workflow.

## Product Hierarchy UX

Current backend hierarchy:

```text
User -> WorkspaceMember -> Workspace -> Project -> Agent / Number / Contact / Conversation / Call / Webhook / Usage
```

Current Phase 1 constraint:

- API-key auth selects one workspace and one project.
- Workspace switching is not real yet.
- Project switching is not real yet.

UX requirement:

- Do not show fake workspace or project switching.
- Show a clear current workspace/project context.
- Prepare the layout for future switching without pretending it exists.

Recommended UI:

- Top of sidebar should show a compact context block:
  - workspace name
  - environment badge: `Local`, `Test`, or `Live`
  - current project name when backend exposes it
  - small settings icon
- In Phase 1, clicking it opens workspace/project context details, not a fake
  switch menu.
- In future auth phase, it can become a real switcher.

Pain addressed:

- User currently expects workspace creation/switching because the UI resembles a
  switcher.
- The product hierarchy is not obvious.

## Navigation Improvements

Current nav is a single long flat list:

- Overview
- Agents
- Numbers
- Inbox
- Calls
- Contacts
- Webhooks
- Usage
- Billing
- API Keys
- Playground
- Settings
- Service Health

This works but does not communicate product structure.

Recommended nav grouping:

### Operate

- Overview
- Inbox
- Calls
- Contacts

### Build

- Agents
- Numbers
- Webhooks
- Playground

### Platform

- Usage
- Billing
- API Keys
- Service Health

### Admin

- Settings

UX rules:

- Use group labels, not more visual decoration.
- Keep sidebar compact and scan-friendly.
- Active nav should be more confident than the current light grey block.
- Add subtle unread/failure counters later:
  - failed webhooks
  - low balance
  - provider degraded

Pain addressed:

- Users currently need to infer what belongs together.
- The dashboard feels like a generated menu, not a product system.

## Top Bar Improvements

Current top bar:

- Feedback
- Notifications icon
- Sign out

It does not provide much operational value.

Recommended top bar:

- Left side:
  - current page breadcrumb or context label
  - environment badge (`Local`, `Test`, `Live`)
- Right side:
  - global create button menu:
    - Create agent
    - Provision number
    - Send SMS
    - Start call
    - Create webhook
  - command/search button placeholder
  - alerts/notifications
  - user/account menu

Phase 1 behavior:

- Global create menu should only include actions that are already wired.
- User/account menu can show API-key session and sign out.
- Do not pretend full user profile exists until backend profile endpoint exists.

Pain addressed:

- Creating key resources requires page-hunting.
- The header feels unused and not platform-grade.

## Table System Improvements

Current tables:

- Mostly backend-backed.
- Rows are clickable in some places.
- Copy buttons appear on hover in some places.
- Actions vary by screen.
- Dense data sometimes wraps awkwardly.

Recommended premium table standard:

### Table anatomy

Every resource table should support:

- title-area filters/search above table
- row click opens canonical detail page
- primary row action visible
- secondary actions in a kebab menu
- copyable IDs/phone numbers using icon-only copy button
- sticky or clearly separated header
- consistent status badge column
- empty, loading, error states with same layout

### Row click rule

- Clicking a row opens the full detail page.
- Clicking copy/action buttons must not trigger row navigation.
- `View` buttons should be removed from primary tables if row click exists.
- Use `Update`, `Test`, `Disable`, etc. as direct actions only when needed.

### Recommended table columns

Agents:

- Agent
- Mode
- Voice
- Attached number
- Recent activity
- Status
- Actions

Numbers:

- Number
- Capabilities
- Agent
- Provider
- Status
- Created
- Actions

Calls:

- Call
- Direction
- Agent
- Contact
- Status
- Duration
- Outcome
- Cost
- Started
- Actions

Inbox/conversations:

- Contact
- Agent
- Channel
- Last message
- Last activity
- Status

Webhooks:

- Endpoint
- Events
- Last delivery
- Failure count
- Status
- Actions

Usage:

- Resource
- Channel
- Agent
- Quantity
- Cost
- Occurred

API Keys:

- Label
- Prefix
- Scope/project
- Last used
- Status
- Created
- Actions

Pain addressed:

- Current tables feel serviceable but not designed.
- Action behavior differs between resources.
- The user has to move far right for basic actions.

## Detail Page Improvements

Current detail pages exist for some resources, but the hierarchy and narrative
are weak.

Recommended detail page structure:

### Header

- resource name/identifier
- status badge
- primary action
- secondary action menu
- copy ID

### Summary strip

Use 3-5 compact facts:

- owner agent
- linked number/contact
- provider
- last activity
- cost/usage where relevant

### Tabs

Use consistent tabs:

- Overview
- Activity
- Configuration
- Events/Webhooks
- Usage

Resource-specific examples:

Agent detail:

- Overview
- Configuration
- Numbers
- Conversations
- Calls
- Webhooks
- Usage

Number detail:

- Overview
- Agent assignment
- Messages
- Calls
- Provider events
- Usage

Call detail:

- Overview
- Transcript
- Summary/outcome
- Webhook events
- Provider/debug

Webhook detail:

- Overview
- Deliveries
- Test
- Secret/signing
- Events

Pain addressed:

- Drawers and detail pages overlap in purpose.
- Some detail tabs are placeholders or too thin.
- The product does not yet expose relationship context strongly.

## Drawer And Modal Rules

Current drawers are useful but inconsistent.

Use drawers for:

- create forms
- update forms
- quick test actions
- transfer call form
- resend/retry actions

Use detail pages for:

- full inspection
- history
- transcript
- webhook delivery logs
- usage and analytics

Do not use drawers for:

- read-only “View” if the full detail page exists
- deep history
- complex multi-tab inspection

Pain addressed:

- Drawer view + row detail creates duplicate pathways.
- Some users click “View” expecting a real page but get a thin drawer.

## Workflow Improvements

The product should guide users through complete agent-phone setup.

Recommended core setup flow:

1. Create agent
2. Provision number
3. Attach number to agent
4. Send test SMS or start test call
5. Inspect transcript/message
6. Configure webhook
7. Test webhook delivery
8. Check usage/billing

UI improvements:

- Overview should show a setup checklist until core resources exist.
- Agents page should show “missing number” warnings.
- Calls/SMS creation drawers should pre-filter agents that have required
  capability.
- If billing balance is low, show a contextual top-up link before submit.
- Webhooks should show suggested event presets:
  - SMS events
  - Call events
  - Lifecycle events
  - All events

Pain addressed:

- Users can hit backend errors before they understand prerequisites.
- The product has the pieces but not enough guided flow.

## Empty State Improvements

Current empty states are clear but sometimes generic.

Premium empty states should:

- name the object missing
- explain the next real action
- include one primary action
- avoid implementation language like “next phase” on user-facing screens

Examples:

- Agents: “Create your first phone agent”
- Numbers: “Provision a number for an agent”
- Calls: “Start a test call”
- Webhooks: “Create an endpoint to receive agent events”
- Usage: “Usage appears after SMS, calls, numbers, or webhook tests”

Avoid:

- “This connects in a later phase”
- “Backend gap”
- “Mock route”

Backend gaps can appear in internal tracking, not user-facing product UI.

Pain addressed:

- Product currently leaks roadmap/implementation language into UX.

## Visual Design Direction

Desired feel:

- premium infrastructure
- intelligent operations console
- agent-native
- calm, sharp, technical
- not purple-gradient AI SaaS
- not marketing-page heavy

Recommended visual system:

- mostly white/off-white canvas
- strong black/near-black text
- restrained borders
- small radius, 6-8px
- compact typography
- status colors used only for state
- monospace only for IDs, phone numbers, tokens, signatures
- subtle surface contrast between sidebar/header/main content

Avoid:

- generic AI gradients
- large decorative cards
- oversized hero typography inside app screens
- too many rounded pills
- pastel-only palette
- fake glassmorphism
- heavy shadows

Premium details to add:

- polished row hover and selected states
- consistent icon-only controls with tooltips
- compact badges
- better spacing rhythm
- command-style global action menu
- copy-to-clipboard feedback everywhere IDs/tokens/phones appear

## Missing UI Layers

### 1. Command Menu

Needed:

- quick navigate
- create agent
- provision number
- send SMS
- start call
- create webhook

Can be UI-only first if actions call existing drawers.

### 2. Global Create Menu

Needed in top bar.

Actions:

- Agent
- Number
- SMS
- Call
- Webhook
- API key

### 3. Resource Relationship Panels

Needed on detail pages.

Examples:

- Agent -> numbers, calls, conversations, webhooks, usage
- Number -> agent, calls, messages
- Contact -> conversations, calls, messages

### 4. Setup Checklist

Needed on Overview.

Checklist:

- Create agent
- Add number
- Attach number
- Send SMS
- Start call
- Add webhook

### 5. Notification Center

Can start simple.

Events:

- insufficient balance
- failed webhook
- provider degraded
- failed call/SMS

### 6. Environment/Mode Indicator

Needed globally.

States:

- Local
- Test
- Live

Important because Vukho touches real phone and billing flows.

### 7. Project Context Layer

Needed when backend exposes projects.

Phase 1:

- show implicit current project as read-only if available.

Future:

- project switcher inside active workspace.

### 8. Audit/Activity Timeline

Needed for platform feel.

Could start as read-only once backend audit endpoint exists.

## Priority Order

### P0: Fix Misleading UX

- Remove fake workspace/project switching affordances.
- Remove user-facing “next phase/backend gap/mock” wording from product pages.
- Standardize row click vs drawer behavior.
- Make global environment/current context clear.

### P1: Platform Shell Polish

- Group sidebar navigation.
- Improve top bar with global create menu, environment badge, account menu.
- Add current workspace/project context block.
- Add command/search placeholder.

### P2: Table And Resource Polish

- Create reusable premium table pattern.
- Remove unnecessary View buttons where row click exists.
- Add consistent copy buttons and action menus.
- Add filters/search where useful.
- Make status, dates, cost, and IDs visually consistent.

### P3: Workflow Guidance

- Add Overview setup checklist.
- Add prerequisite warnings before calls/SMS.
- Improve empty states with real next actions.
- Add contextual billing/top-up prompts.

### P4: Detail Page Depth

- Improve detail page headers.
- Add relationship tabs and summary strips.
- Reduce read-only drawers in favor of canonical detail pages.

### P5: Future Platform Layers

- Real workspace switcher after session auth.
- Project switcher after project APIs.
- Notification center.
- Audit log/activity timeline.

## Suggested Lovable Scope

Ask Lovable to polish only the UI shell and reusable patterns first.

Do ask Lovable for:

- sidebar grouping
- top bar redesign
- table visual system
- detail page layout pattern
- empty state design
- setup checklist UI
- command/create menu UI
- responsive polish

Do not ask Lovable for:

- fake workspace switching
- fake project switching
- fake Google SSO success
- fake billing credits
- fake provider status
- new mock data models
- landing page redesign

## Acceptance Criteria

The polished UI is ready when:

- A new user understands the hierarchy within 30 seconds.
- Creating/testing an agent phone flow requires less hunting.
- Tables feel consistent across Agents, Numbers, Calls, Webhooks, Usage, and API
  Keys.
- Row click opens canonical detail pages.
- Drawers are reserved for create/update/test actions.
- The sidebar communicates product structure.
- The top bar provides context and global action.
- The product feels like an agent infrastructure console, not a generic AI
  dashboard.
