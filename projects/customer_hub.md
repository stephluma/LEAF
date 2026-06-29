# LEAF Customer Project Hub — Technical Build Document

## Overview

The **LEAF Customer Project Hub** is a single-page, client-rendered project status dashboard embedded as a LEAF programmer page. It fetches live project data from the LEAF API and presents a customer-facing view of project phases, tasks, attachments, and team contacts — with no server-side rendering or external dependencies.

---

## Architecture

| Concern | Approach |
|---|---|
| Rendering | Vanilla JavaScript (IIFE, `"use strict"`) |
| Styling | Scoped CSS under `#hub` to prevent bleed |
| Data source | LEAF REST API (`/api/form/query`, `/api/formEditor/indicator`) |
| Attachments | LEAF `ajaxIndex.php?a=getprintindicator` endpoint |
| Record targeting | URL hash (`window.location.hash`) |
| State management | In-memory only — no localStorage |

---

## Configuration (`CONFIG`)

All tunable values live in a single `CONFIG` object at the top of the IIFE.

### `CONFIG.categoryID`
The LEAF form category ID this hub is bound to (`"55445"`).

### `CONFIG.indicators`
Maps human-readable field names to LEAF indicator IDs. Key mappings:

| Key | Indicator ID | Purpose |
|---|---|---|
| `projectName` | 59 | Display name of the project |
| `projectType` | 60 | e.g. "National Project", "Managed Services" |
| `poc` | 67 | LEAF POC (orgchart employee) |
| `servicePoc` | 74 | Customer POC (orgchart employee) |
| `objective` | 86 | Project scope/objective text |
| `leafURL` | 87 | Customer's LEAF site URL |
| `currentPhase` | 61 | Used to fetch phase label options |
| `phase1`–`phase5` | 62–66 | Phase narrative content |
| `leafTasks1`–`leafTasks5` | 88, 90, 92, 94, 96 | LEAF team task lists per phase |
| `orgTasks1`–`orgTasks5` | 89, 91, 93, 95, 97 | Customer task lists per phase |

### `CONFIG.phases`
Array of 5 phase descriptor objects. Each contains:
- `step` — phase number (1–5)
- `label` — default label (overridden by live API options if available)
- `key` — maps to `phaseContents` keys
- `fileInd` / `imageInd` — indicator IDs for file and image attachments
- `leafTasksKey` / `orgTasksKey` — maps to `taskContents` keys

### `CONFIG.workflowStepToPhase`
Maps LEAF workflow step IDs to display phase numbers:
- Steps < 19 → not yet started (no active phase highlighted)
- Steps 19–23 → phases 1–5 respectively
- Steps > 23 → clamped to phase 5

### `CONFIG.PROJECT_TYPE_BLURBS`
Plain-text descriptions shown for known project types ("national project", "managed services"), keyed by lowercase string match.

---

## Data Fetching

### `fetchProjectData(recordID)`
Primary data fetch. Sends a JSON query to `/api/form/query` requesting all indicator values for the record. Returns `{ s1, stepID }` where `s1` is the flat key-value field map and `stepID` is the raw workflow step identifier.

### `fetchPhaseOptions(indicatorID)`
Fetches label options for the `currentPhase` indicator from `/api/formEditor/indicator/:id`. Used to override default phase labels (Discovery, Planning, etc.) with any custom names configured in the LEAF form editor.

### `fetchWorkflowStep(recordID)`
Secondary fetch to `/api/form/query` with `joins: ["status"]` and no `getData`. Extracts the workflow step ID from the record's status join to drive phase state resolution. Tried keys: `stepID`, `step_id`, `currentStep`, `workflowStepID`.

### `fetchIndicatorHTML(recordID, indicatorID)`
Fetches rendered HTML for a single indicator from `ajaxIndex.php?a=getprintindicator`. Used exclusively for attachment rendering.

All fetches use `credentials: "include"` and `x-requested-with: XMLHttpRequest` headers to satisfy LEAF's session authentication.

---

## Record ID Resolution

The record ID is read from `window.location.hash` (e.g. `report.php?a=hub#590`). The `getRecordIDFromHash()` function validates it as a numeric string. The page re-runs `init()` on every `hashchange` event, enabling navigation between records without a full page reload.

---

## Rendering Pipeline

On each `init()` call:

1. Validate record ID from hash — show error if missing.
2. Fire three parallel async calls: `fetchProjectData`, `fetchPhaseOptions`, `fetchWorkflowStep`.
3. Apply phase label overrides via `applyPhaseLabels()`.
4. Resolve active phase number via `resolveActiveStep(stepID)`.
5. Populate header metadata (project name, type, scope, POC, LEAF URL).
6. Render progress bar (`renderProgressBar`).
7. Render phase detail cards (`renderPhaseDetails`).
8. Kick off async attachment loads per phase (`loadPhaseAttachments`).
9. Transition UI from loading → content state.

---

## UI Components

### Progress Bar
An `<ol>` of 5 step items rendered by `renderProgressBar()`. Each step receives a state class (`hub-step--complete`, `hub-step--active`, `hub-step--upcoming`). A CSS custom property `--hub-progress-pct` drives the filled portion of the connecting line. Clicking a step button scrolls to and expands the corresponding phase card.

### Phase Cards
Rendered by `renderPhaseDetails()` as `<article>` elements. Each card shows:
- Phase number badge (checkmark if complete)
- Narrative content (via `textContent` assignment to avoid double-encoding LEAF HTML entities)
- Task columns (LEAF Team / Customer), parsed from newline-delimited text with `[x]` prefix for checked state
- Async attachment section (images + files)

Completed phases with content are collapsed by default. Collapse/expand is toggled via `togglePhase()`, which manages `aria-expanded` and class state. A "Show/Hide completed phases" toolbar button batch-toggles all complete cards.

### Lightbox
A singleton overlay (`#hub-lightbox`) for full-screen image preview. Supports keyboard navigation (Arrow keys, Escape), focus trapping, previous/next controls (hidden for single images), and a "Full size" link opening the source URL in a new tab. Restores focus to the triggering element on close.

### Share Button
Copies the current `window.location.href` to the clipboard using `navigator.clipboard.writeText` with a `textarea`/`execCommand` fallback. Shows a brief "Copied!" toast via an `aria-live` region.

### Jump to Top
A fixed-position button that appears after scrolling 120px (when page is taller than the viewport). Smooth-scrolls to top on click.

---

## Accessibility

- Scoped skip link (`#hub .hub-skip-link`) targeting `#hub-phase-details`
- Two `aria-live` regions (polite and assertive) for status announcements
- All interactive elements have `aria-label`, `aria-expanded`, and `aria-controls` as appropriate
- Phase header buttons manage `aria-expanded` state on collapse/expand
- Progress step buttons carry descriptive labels including phase state
- Lightbox implements `role="dialog"`, `aria-modal="true"`, and full focus trap
- Reduced motion respected for the active step pulse animation via `@media (prefers-reduced-motion: no-preference)`
- Print stylesheet collapses gradient banner, hides interactive controls, and forces all phases visible

---

## Security

- All user-supplied or API-sourced strings rendered into HTML pass through `esc()` (HTML entity encoding) before insertion.
- Phase narrative content is set via `textContent` (never `innerHTML`) after entity decoding, preventing XSS.
- Attachment links use `rel="noopener noreferrer"` on all `target="_blank"` anchors.
- All API fetches are same-origin and session-authenticated.

---

## Utility Functions

| Function | Purpose |
|---|---|
| `esc(str)` | HTML-encodes a string for safe DOM insertion |
| `decodeEntities(str)` | Reverses LEAF's pre-encoded HTML entities |
| `getField(s1, id)` | Reads and trims a field value from the `s1` data map |
| `stepState(n, active)` | Returns `"complete"`, `"active"`, or `"upcoming"` |
| `resolveActiveStep(stepID)` | Maps raw workflow step ID to phase number 1–5 |
| `announce(msg, assertive)` | Pushes a message to the appropriate `aria-live` region |
| `dbg(msg)` | Conditional debug logger (controlled by `CONFIG.debug`) |

---

## Debug Mode

Set `CONFIG.debug = true` to enable:
- An on-page monospace debug panel (`#hub-debug-panel`) showing fetch URLs, resolved step IDs, record keys, and phase label application.
- `console.log` output prefixed with `[Hub]`.
- Error messages that include the raw error string.
