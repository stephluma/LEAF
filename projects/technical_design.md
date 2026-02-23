# LEAF Project Dashboard — v7 Technical Documentation

## 1) Overview

The LEAF Project Dashboard provides a unified view into Projects, Tasks, and Analytics (including OKR roll-ups) for project management. The dashboard is a single-page application rendered from HTML/CSS/JS with client-side aggregation over LEAF form query data.

Primary functional views:

- Projects
- Tasks
- Analytics (Project analytics + OKR roll-up)

Version reference: v7.

## 2) File Structure and Versioning

- `project_v7.html (view_homepage.tpl)`
  - Page structure, layout scaffolding, tab containers, and modal plumbing.
  - OKR Analytics containers (filters, quick view, index, roll-up).
- `project_v7.css`
  - Dashboard styling (tables, cards, filters, tasks, OKR roll-up UI, badges, progress bars).
- `project_v7.js`
  - Data fetching, normalization, filtering, aggregation, rendering, and UI behavior.

v6 remains unchanged. v7 is additive/refined on top of v6 behavior.

## 3) Data Model and Indicator Mapping

All relationships are derived via string matching (no foreign keys). Indicators are sourced from LEAF form data.

Objectives / OKRs:

- `indicatorID 23` — OKR Key
- `indicatorID 24` — Objective Title
- `indicatorID 35` — Key Result link to OKR
- `indicatorID 36` — Key Result name

Projects:

- `indicatorID 2` — Project Key
- `indicatorID 29` — Project OKR Key
- `indicatorID 37` — Project Key Result

Tasks:

- `indicatorID 8` — Task Project Key
- `indicatorID 30` — Task OKR Key
- `indicatorID 39` — Task Key Result
- `indicatorID 33` — Fiscal Year filter context

Relationships:

- Objective → Key Result via OKR Key (23/35) and KR name (36)
- Project → Objective/KR via project OKR key (29) and project KR name (37)
- Task → Objective/KR via task OKR key (30) and task KR name (39)
- Task → Project via task project key (8) matched to project key (2)

Normalization:

- OKR keys are normalized via `normalizeOkrKey`.
- Key Result matching uses normalized names (`normalizeKeyResultMatch`).
- Project keys are normalized by replacing NBSP, trimming, collapsing whitespace, and uppercasing.

## 4) OKR Analytics View (v7 Behavior)

### OKR Health Quick View

Displays compact metrics for the selected Fiscal Year:

- Objectives count
- Key Results count
- Overall percent = average of OKR card percentages

All values use the same OKR aggregation as the cards and update when the FY filter changes.

### OKR Index

- Compact scan list of OKRs: OKR key, objective title (single line, truncated), percent with progress bar.
- Clicking an index item scrolls to and expands the OKR card.
- Keyboard operable (Enter/Space).

### OKR Details

- OKR cards are collapsed by default with summary metrics.
- Expanded OKR cards show all Key Results (no “show all” toggle).
- Each Key Result row includes:
  - Name
  - Percent bar + value
  - Task counts and project count
  - Details toggle to show nested content

Nested content:

- Projects list with tasks nested under each project
- “Other contributing items” bucket

Projects and tasks logic:

- Tasks are grouped under projects when they match OKR+KR and the task project key resolves to a project key in the authoritative project dataset.
- Projects displayed for a KR are the union of:
  - Projects tagged to that KR (project OKR key + project KR name), and
  - Projects referenced by tasks for that KR that can be resolved in the project map.
- Tasks are deduped by stable task identifiers to prevent double counting.

Percent completion:

- KR percent = completed tasks / total tasks for the KR.
- OKR percent = average of KR percents.
- Quick View overall percent = average of OKR percents.

## 5) Expansion Logic

- Objective cards: collapsed by default; expand to show all Key Results.
- Key Result details: expanding shows nested projects and tasks immediately.
- Collapsible controls use `aria-expanded` and `aria-controls` and remain keyboard operable.
- “Show more Objectives” remains for long OKR lists.

## 6) Tasks View Enhancements (v7)

Task ID styling update (presentation only):

- Background: `#1f1f1f`
- Sharp rectangle edges (radius 0)
- Applied consistently to Tasks table and Kanban view

No ID values or links are changed, only appearance.

## 7) Selector UI Pattern (Shared htmlEdit scripts)

Shared selector UI behaviors used in htmlEdit scripts for OKR/Project/KR pickers:

- Collapsed summary row with selected value and “Change” button.
- Panel expands for search + selection; auto-collapses after selection.
- Shared CSS injection using a single `style` tag (`#pm-picker-styles`).
- Accessible focus styles and keyboard operability.
- Persistence logic unchanged (selectors write to existing indicator fields).
