[Documentation created by Claude.ai]: #

# LEAF Project Dashboard — v10 Technical Documentation

## 1) Overview

The LEAF Project Dashboard provides a unified view into Projects, Tasks, and Analytics (including OKR roll-ups). The dashboard is a single-page application rendered from HTML/CSS/JS with client-side aggregation over LEAF form query data.

Primary functional views:

- Projects
- Tasks (Table, Kanban, Gantt)
- Analytics (Project analytics + OKR roll-up)

Version reference: v10.

---

## 2) File Structure and Versioning

- `project_v10.html`
  - Page structure, layout scaffolding, tab containers, and modal plumbing.
  - OKR Analytics containers (filters, quick view, index, roll-up).
  - Add menu (Project, Task, Objective, Key Result) and View Inbox button.
  - Gantt view container (`pmGanttWrap`, `pmGanttBoard`, `pmGanttInner`).
  - Project Health Sticky bar container (`pmProjectHealthSticky`).
  - Tasks table pagination container (`pmTasksTablePagination`).
  - Jump-to-top button (`pmJumpTopBtn`).
- `project_v10.css`
  - Dashboard styling (tables, cards, filters, tasks, OKR roll-up UI, badges, progress bars).
  - Gantt view styles (`.pm-gantt*` family).
  - Project Health Sticky bar styles (`.pm-healthSticky`, `.pm-healthInner`, `.pm-healthCell`).
  - Pagination styles (`.pm-pagination`, `.pm-paginationControls`, etc.).
  - Jump-to-top button styles (`.pm-jumpTop`).
  - Add menu popover styles (`.pm-addMenu`, `.pm-addMenuPopover`, `.pm-menuItem`).
- `project_v10.js`
  - Data fetching, normalization, filtering, aggregation, rendering, and UI behavior.
  - Gantt rendering (`renderGantt`), Gantt priority color logic (`ganttPriorityClass`).
  - Project Health Sticky rendering (`renderProjectHealthSticky`).
  - Pagination system (`buildPaginationModel`, `renderPaginationControls`, `ensurePaginationState`).
  - Jump-to-top wiring (`wireJumpToTop`).
  - Add menu and View Inbox wiring (`wireAddButtons`).
  - CSRF token resolution (`ensureCSRFToken`, `fetchCSRFTokenFromIframe`, `extractCSRFTokenFromHTML`).

v10 supersedes v9 and adds: Gantt timeline view for tasks, Project Health Sticky bar, tasks table pagination, jump-to-top button, Add menu (Project / Task / Objective / Key Result) with full keyboard support, View Inbox button, Projects fiscal year filter, Projects by Project Type analytics chart, robust multi-strategy CSRF token resolution, recurring task auto-copy system, Actual Completion Date field on tasks, Schedule Variance analytics chart, and % Completion column on the Projects table. v9 performance architecture (lazy tab/view init, derived caching, task table virtualization, Kanban caps + load more, incremental analytics updates) is preserved.

---

## 3) Access Control and Environment Setup

The dashboard uses LEAF Smarty template conditionals to gate visibility:

```html
<!--{if $empMembership['groupID'][435]}-->
<!-- Outer gate: read-only group 435. All users need this. -->
<div class="pm-wrap">
  <span id="pmEnv"
    data-csrf="{$CSRFToken}"
    data-csrf-alt="{$csrf_token}"
    data-csrf2="{$csrfToken}"
    style="display:none"></span>

  <!--{if $empMembership['groupID'][12]}-->
  <!-- Inner gate: LEAF Team group 12. Shows Add menu and View Inbox. -->
  <div class="pm-actionsRow pm-actionsRowSpaced">
    <!-- Add menu and View Inbox buttons rendered here -->
  </div>
  <!--{/if}-->
</div>
<!--{/if}-->
```

- **Group 435** — read-only access; all dashboard users must be in this group AND added to the view.
- **Group 12 (LEAF Team)** — team members only; grants the Add menu and View Inbox action buttons.

CSRF tokens are injected as `data-*` attributes on `#pmEnv` and read at initialization. See Section 12 for full CSRF resolution logic.

---

## 4) Data Model and Indicator Mapping

All relationships are derived via string matching (no foreign keys). Indicators are sourced from LEAF form data.

Tasks (Task form):

- `indicatorID 8` — Project Key
- `indicatorID 9` — Task Title
- `indicatorID 10` — Status
- `indicatorID 44` — Other subtype (Blocked / On Hold)
- `indicatorID 11` — Assigned To
- `indicatorID 12` — Start Date
- `indicatorID 13` — Due Date
- `indicatorID 14` — Priority
- `indicatorID 16` — Category
- `indicatorID 17` — Dependencies
- `indicatorID 18` — Support Ticket
- `indicatorID 30` — Task OKR Key
- `indicatorID 39` — Task Key Result
- `indicatorID 45` — Is Recurring (Yes/No checkbox)
- `indicatorID 47` — Actual Completion Date (auto-stamped when task status is set to "Completed")

Projects (Project form):

- `indicatorID 2` — Project Key
- `indicatorID 3` — Project Name
- `indicatorID 4` — Description
- `indicatorID 5` — Owner
- `indicatorID 6` — Project Status
- `indicatorID 38` — Project Fiscal Year
- `indicatorID 29` — Project OKR Key
- `indicatorID 32` — Project Type
- `indicatorID 37` — Project Key Result

OKRs (Project form):

- `indicatorID 23` — OKR Key
- `indicatorID 24` — Objective Title
- `indicatorID 25` — Objective Start Date
- `indicatorID 26` — Objective End Date
- `indicatorID 33` — OKR Fiscal Year

Key Results (Key Result form):

- `indicatorID 35` — Key Result OKR Key
- `indicatorID 36` — Key Result Name

Relationships:

- Objective → Key Result via OKR Key (23/35) and KR name (36)
- Project → Objective/KR via project OKR key (29) and project KR name (37)
- Task → Objective/KR via task OKR key (30) and task KR name (39)
- Task → Project via task project key (8) matched to project key (2)

Normalization:

- OKR keys are normalized via `normalizeOkrKey`.
- Key Result matching uses normalized names (`normalizeKeyResultMatch`).
- Project keys are normalized by replacing NBSP, trimming, collapsing whitespace, and uppercasing (`normalizeProjectKey`).

New or expanded mappings post-v7:

- `supportTicket` (18) powers ticket links/chips and the Tickets Imported analytics series.
- `projectType` (32) drives the Projects by Type analytics chart.
- `projectFiscalYear` (38) drives the Projects fiscal year filter.
- Analytics windows use task/project `createdAt` when available (fallback to start/due).
- `actualCompletionDate` (47) is auto-stamped with today's date (YYYY-MM-DD) when a task's status is changed to "Completed" via `updateTaskStatus()`. It is also fetched in the tasks query and exposed as `t.actualCompletion` on normalized task objects.
- `isRecurring` (45) is used by the recurring task auto-copy system (see Section 23).

---

## 5) Status Configuration

All statuses and Kanban column orderings are centralized in `STATUS_CONFIG`:

```js
var STATUS_CONFIG = {
  ALL_STATUSES: [
    "Not Started", "In Progress", "Ready for HCD Review",
    "Ready for Testing", "Ready for PO Review", "Other", "Completed"
  ],
  LEGACY_KANBAN_COLUMNS: [
    "Not Started", "In Progress", "Ready for HCD Review",
    "Ready for PO Review", "Completed", "Other"
  ],
  DEV_KANBAN_COLUMNS: [
    "Not Started", "In Progress", "Ready for HCD Review",
    "Ready for Testing", "Ready for PO Review", "Completed", "Other"
  ],
  OTHER_SUBTYPES: ["Blocked", "On Hold"]
};
```

- Dev mode Kanban includes "Ready for Testing" as an additional column.
- "Other" status maps to a subtype (Blocked / On Hold) stored in indicator 44.
- Status changes via drag-and-drop or the Other Status modal update both indicator 10 and indicator 44 as needed.

---

## 6) OKR Analytics View

### O and KR Health Quick View

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
- Expanded OKR cards show all Key Results (no pagination of KRs).
- Each Key Result row includes name, percent bar + value, task counts and project count, and a details toggle to show nested content.

Nested content:

- Projects list with tasks nested under each project.
- "Other contributing items" bucket for tasks that cannot resolve to a project in the FY-filtered project map.

Project resolution logic (authoritative dataset + normalization):

- Authoritative project dataset: `state.projectsAll` filtered by OKR Fiscal Year selection → `okrBaseProjects`.
- A project map is built from `okrBaseProjects` using normalized project keys as map keys.
- Each KR classification computes: `krProjects`, `krTasks` (deduped by stable task key), `projectsToRender` (union), `tasksByProjectKey`, and `otherTasks`.

Percent completion calculations:

- KR percent = completed tasks / total tasks for the KR.
- OKR percent = average of KR percents.
- Quick View overall percent = average of OKR percents.

---

## 7) Tasks View

### Views

Three mutually exclusive views accessible via a tab strip:

1. **Table** — virtualized task table with pagination (see Section 8).
2. **Kanban** — column-based card board with drag-and-drop (see Section 9).
3. **Gantt** — timeline bar chart (see Section 10).

### Task ID Styling

- Background: `#1f1f1f`
- Sharp rectangle edges (radius 0)
- Applied consistently across Table, Kanban, and Gantt views.

### Task Table Virtualization

- Fixed row height with top/bottom spacers to preserve scroll height.
- Only visible rows + buffer are rendered.
- Keyboard focus is preserved within the visible window.

### Task Table Columns

The task table (as of v10) includes the following sortable columns in order:
Project Key, Task ID, Title, Status, Dependencies, Priority, Category, Assigned To, Start, Due, Completed Date, Ticket.

`colCount` is set to 12 to account for the Completed Date column addition.

---

## 8) Tasks Table Pagination (v10)

The tasks table supports server-side–style pagination rendered client-side.

### Configuration

```js
var PAGINATION_CONFIG = {
  tasks: {
    storageKey: "pm_tasks_pagination_v9",
    containerId: "pmTasksTablePagination",
    defaultPageSize: 100,
    pageSizes: [50, 100, 200]
  }
};
```

### Key Functions

- `buildPaginationModel(total, page, pageSize)` — returns `{ total, page, pageSize, totalPages, start, end }`.
- `ensurePaginationState(key, signature, total)` — loads persisted state from `localStorage`, resets to page 1 when the data signature changes (e.g. filter changes), and returns the current pagination model.
- `renderPaginationControls(key, model)` — renders "Showing X–Y of Z" range label, page navigation buttons (Prev/Next), and a rows-per-page `<select>`. Injects the result into the container defined in `PAGINATION_CONFIG`.
- `savePaginationState(key, pag)` — persists page and pageSize to `localStorage` keyed by `storageKey`.
- `handlePaginationChange(key)` — re-renders the active view slice after a page or page-size change.
- `bindPaginationControls(container)` — attaches click and change listeners to the rendered pagination controls.

### HTML

```html
<div
  id="pmTasksTablePagination"
  class="pm-pagination"
  role="navigation"
  aria-label="Tasks table pagination"
></div>
```

### Behavior

- Pagination state persists across sessions via `localStorage`.
- Signature changes (filter, sort, search) automatically reset the page to 1.
- Pagination controls are placed below the tasks table.
- Virtualization and pagination work together: virtualization controls DOM row count; pagination controls which slice of the filtered/sorted list is rendered.

---

## 9) Kanban View

- Columns defined by `STATUS_CONFIG` (legacy vs dev mode).
- Per-column render caps (`KANBAN_RENDER_LIMIT = 100`) with "Load more" (`KANBAN_RENDER_STEP = 50`) to append cards.
- Drag-and-drop operates on rendered cards and updates status + indicator 44 as needed.
- Column headers and counts always render, even with zero matches.
- Keyboard drag-and-drop is supported.

---

## 10) Gantt View (v10)

A timeline bar chart for tasks with start/due dates.

### HTML Structure

```html
<div id="pmGanttWrap" role="tabpanel" aria-labelledby="pmViewGanttBtn"
     aria-hidden="true" style="display:none">
  <div class="pm-ganttMeta" id="pmGanttMeta"></div>
  <div id="pmGanttBoard" class="pm-gantt">
    <div id="pmGanttInner"></div>
  </div>
</div>
```

### Rendering Logic (`renderGantt`)

1. Archived tasks are excluded from the Gantt view.
2. Tasks are sorted by start date (falling back to due date), then mapped to `{ task, start, end }` row objects.
3. Tasks with no start or due date are hidden and counted; the count is reported in the meta line.
4. The global range (`rangeStart` / `rangeEnd`) is computed from all visible rows.
5. Each bar's `left` and `width` are computed as percentages of the total range in days.
6. Bars with a computed width under 1.5% are floored to 1.5% for visibility.
7. The meta line reports: task count, date range, and count of hidden tasks (no dates).

### Priority Color Classes

| Priority | CSS Class     | Color     |
|----------|---------------|-----------|
| High     | `pm-ganttHigh` | `#f2938c` |
| Medium   | `pm-ganttMed`  | `#e6c74c` |
| Low      | `pm-ganttLow`  | `#aacdec` |
| None     | `pm-ganttNone` | `#cfcfcf` |

### CSS Summary

```css
.pm-gantt          /* container */
.pm-ganttMeta      /* summary line above board */
.pm-ganttRow       /* one task row */
.pm-ganttTop       /* task name + date label row */
.pm-ganttName      /* task title */
.pm-ganttDates     /* "start → due" text */
.pm-ganttBarWrap   /* full-width relative bar track */
.pm-ganttBar       /* positioned bar, colored by priority class */
```

### Reproducing in Another Site

1. Add the Gantt HTML structure above to your tasks section.
2. Add a Gantt tab button (`id="pmViewGanttBtn"`) alongside Table and Kanban buttons.
3. Wire the Gantt button in `wireTaskViewToggle` to call `renderGantt(filteredTasks)`.
4. Implement `renderGantt` with the range-scaling logic above.
5. Add `ganttPriorityClass(priority)` to map priority strings to CSS classes.
6. Add the `pm-gantt*` CSS classes.

---

## 11) Project Health Sticky Bar (v10)

A sticky summary bar that appears above the tasks table when a specific project is selected in the Project filter.

### Behavior

- Visible only on the Tasks tab with a project key selected.
- Hidden (and cleared) when no project is selected or when switching tabs.
- Shows: Project Key, Project Title, Total Tasks, Completed count, Completed %, Overdue count.
- Completed % turns green (`pm-completeGreen`) at 100%.
- Overdue count turns red (`pm-overdueRed`) when > 0.

### HTML

```html
<div id="pmProjectHealthSticky" class="pm-healthSticky" style="display:none">
  <div class="pm-healthInner"></div>
</div>
```

### Rendering Logic (`renderProjectHealthSticky(activeTab, selectedProjectKey)`)

```js
// Called whenever the tab changes or the project filter changes.
// activeTab must be "tasks" and selectedProjectKey must be non-empty for the bar to show.
// Reads from state.tasksAll — no additional fetch needed.
```

### CSS

```css
.pm-healthSticky  { position: sticky; top: var(--space-2); z-index: 10; }
.pm-healthInner   { display: flex; flex-wrap: wrap; gap: 12px 18px; }
.pm-healthCell    { font-size: 1.05rem; white-space: nowrap; }
.pm-healthLabel   { font-weight: 900; }
.pm-healthValue   { font-weight: 400; }
```

### Reproducing in Another Site

1. Add `#pmProjectHealthSticky` with `position: sticky` above the tasks table.
2. Call `renderProjectHealthSticky(activeTab, selectedProjectKey)` on tab change and on project filter change.
3. Compute `completed` and `overdue` by iterating `state.tasksAll` filtered to the project key.
4. Use `isOverdueTask(t, now)` (or equivalent) to detect overdue tasks.

---

## 12) Add Menu and View Inbox (v10)

A team-member–only action row at the top of the dashboard (gated by LEAF group 12).

### Add Menu

A popover menu button that opens a small dropdown with four creation options:

| Menu Item   | Action key     | Opens modal for              |
|-------------|----------------|------------------------------|
| + Project   | `project`       | New Project form             |
| + Task      | `task`          | New Task form                |
| + Objective | `objective`     | New OKR (Objective) form     |
| + Key Result| `keyResult`     | New Key Result form          |

Each action calls `openModal(title, url)` with the appropriate `START_*_URL` constant.

### Keyboard Behavior (`wireAddButtons`)

- **Arrow Down / Enter / Space** on the menu button opens the popover and focuses the first item.
- **Arrow Up** opens and focuses the last item.
- **Arrow Down / Arrow Up** in the open menu cycle through items (wraps).
- **Home / End** jump to first/last item.
- **Enter / Space** activates the focused item.
- **Tab** closes the menu without activating.
- **Escape** closes and returns focus to the menu button.
- Clicking outside the menu closes it.

### View Inbox Button

A "View Inbox" ghost button that opens `report.php?a=LEAF_Inbox` in the record modal.

### HTML Structure

```html
<!--{if $empMembership['groupID'][12]}-->
<div class="pm-actionsRow pm-actionsRowSpaced">
  <div class="pm-addMenu">
    <button type="button" class="pm-primaryBtn pm-addBtn" id="pmAddMenuBtn"
      aria-haspopup="menu" aria-expanded="false" aria-controls="pmAddMenuList">
      Add
    </button>
    <div class="pm-addMenuPopover" id="pmAddMenuList"
      role="menu" aria-label="Add menu" aria-orientation="vertical" hidden>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="project">+ Project</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="task">+ Task</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="objective">+ Objective</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="keyResult">+ Key Result</button>
    </div>
  </div>
  <button type="button" class="pm-ghostBtn pm-inboxBtn" id="pmViewInboxBtn">View Inbox</button>
</div>
<!--{/if}-->
```

### URL Constants (replace with your own LEAF instance paths)

```js
var START_PROJECT_URL    = "report.php?a=LEAF_Start_Request&id=form_55445&title=Project";
var START_TASK_URL       = "report.php?a=LEAF_Start_Request&id=form_9b302&title=Task";
var START_OKR_URL        = "report.php?a=LEAF_Start_Request&id=form_a2b55&title=OKR";
var START_KEY_RESULT_URL = "report.php?a=LEAF_Start_Request&id=form_6530b&title=Key+Result";
```

---

## 13) Jump-to-Top Button (v10)

A fixed-position circular button in the bottom-right corner that scrolls the page to the top.

### Behavior (`wireJumpToTop`)

- Visible only when the page is scrollable (scroll height > viewport + 80px) AND the user has scrolled down > 120px.
- Toggled via `.is-visible` class; when hidden, `pointer-events: none` and `opacity: 0`.
- Click triggers `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- Visibility updates on `scroll` (passive) and `resize`.
- `aria-hidden` and `tabindex` are kept in sync with visibility.

### HTML

```html
<button class="pm-jumpTop" id="pmJumpTopBtn"
  aria-label="Jump to top" aria-hidden="true" tabindex="-1">↑</button>
```

### CSS

```css
.pm-jumpTop          { position: fixed; right: 24px; bottom: 24px;
                       width: 46px; height: 46px; border-radius: 999px;
                       opacity: 0; pointer-events: none; z-index: 1200; }
.pm-jumpTop.is-visible { opacity: 1; pointer-events: auto; }
```

---

## 14) Projects View — Fiscal Year Filter (v10)

The Projects tab now includes a Fiscal Year filter.

### HTML

```html
<select id="pmProjectFiscalYearSelect" class="pm-select">
  <option value="">All Fiscal Years</option>
</select>
```

### Logic

- `populateProjectFiscalYearDropdown(projects)` — populates the select with unique, sorted `projectFiscalYear` values from all projects.
- `buildProjectFilterState()` reads the selection as `filters.fiscalYear`.
- `projectMatchesFilters(project, filters)` applies an exact-match check on `project.projectFiscalYear` when `fiscalYear` is set.
- The signature function `buildProjectsSignature` includes `fiscalYear` so the cache invalidates correctly on filter changes.
- Project search (`matchesQuery`) includes `projectFiscalYear` in the haystack so users can search by FY directly.

### % Completion Column (v10.1)

The Projects table includes a sortable **% Complete** column as the last column.

**Helper function**: `getProjectCompletionPct(projectKey)` filters `state.tasksAll` by project key, counts tasks whose status contains "completed" (case-insensitive), and returns `Math.round((completed / total) * 100)`, or 0 if there are no tasks.

**Styling**: Uses the same color classes as the Project Health Sticky bar:
- `pm-completeGreen` (green) when % = 100
- `pm-completeMid` (amber, `#b26a00`) when % ≥ 50 and < 100
- No color class when % < 50

**Visual**: Each cell renders a small inline progress bar (`pm-compPctBar`, max-width 60px, height 6px, blue fill) alongside the numeric label (`pm-compPctLabel`).

**Sorting**: When `state.sort.projects.key === "completionPct"`, `getProjectCompletionPct()` is called on each project during the sort comparison using `compareValues` with type `"number"`.

New CSS classes added:
```css
.pm-colCompletion   { width: 110px; min-width: 90px; text-align: center; }
.pm-compPctWrap     { display: inline-flex; align-items: center; gap: 6px; width: 100%; }
.pm-compPctBar      { display: inline-block; height: 6px; background: #2563eb;
                      border-radius: 3px; min-width: 2px; max-width: 60px; }
.pm-compPctLabel    { font-weight: 600; font-size: 13px; min-width: 36px; }
.pm-completeMid     { color: #b26a00; }
```

---

## 15) Analytics View (v10)

### Analytics Charts

All charts are rendered via Chart.js and support Year/Quarter filtering. The following charts are present:

| Chart Title                   | Canvas ID                     | Data Source               |
|-------------------------------|-------------------------------|---------------------------|
| Due date buckets              | `pmChartDueBuckets`            | Tasks (due date)          |
| Completed tasks by quarter    | `pmChartCompletedByQuarter`    | Tasks (completion date)   |
| Completed tasks by category   | `pmChartCompletedByCategory`   | Tasks (category)          |
| Tasks by priority             | `pmChartTasksByPriority`       | Tasks                     |
| Tasks by Status               | `pmChartTasksByStatus`         | Tasks                     |
| Tasks per Project Key         | `pmChartTasksByProject`        | Tasks                     |
| Tickets imported by month     | `pmChartTicketsImported`       | Tasks (support ticket)    |
| **Projects by Project Type**  | `pmChartProjectsByType`        | **Projects (type field)**  |
| **Schedule Variance (Days Late/Early)** | `pmChartScheduleVariance` | **Completed tasks (actualCompletion vs due date)** |

"Projects by Project Type" is new in v10 and uses `buildProjectTypeChartData(projects)` which aggregates `project.projectType` (indicator 32) with `formatProjectTypeLabel` for display normalization.

**Schedule Variance chart** is new in v10.1. It is computed by `computeScheduleVariance(tasks)` which:
- Only considers completed tasks that have both a `due` date and an `actualCompletion` date.
- Computes `gap = actualCompletion - due` in whole days.
- Buckets into: "Early/On Time" (gap ≤ 0), "1–7 days late", "8–14 days late", "15+ days late".
- Returns `{ labels, data }` for use in a Chart.js bar chart.

### Analytics Tables

Two tabular summaries appear above the charts:

1. **Project health rollup** (`#pmProjectHealthTable`) — per-project-key: Total Tasks, Completed, % Complete, Overdue. Overdue count is red when > 0; completion is green at 100%.
2. **Overdue tasks** (`#pmOverdueTasksTable`) — sorted by due date ascending. Columns: Project Key (linked), Task ID (linked), Title, Assigned To, Due Date, Status.

Both tables are generated by `renderAnalyticsTablesFromCache(cache)` and rendered by `renderAnalyticsTablesFromState()`.

### Project Health Rollup vs. Health Sticky Bar

| Feature                   | Analytics Project Health Table     | Tasks Health Sticky Bar             |
|---------------------------|-------------------------------------|--------------------------------------|
| Location                  | Analytics tab                       | Tasks tab                            |
| Scope                     | All projects, all tasks             | One selected project                 |
| Trigger                   | Analytics view activation           | Project filter selection             |
| Updates on task change    | Yes (incremental cache update)      | Yes (re-renders on filter change)    |

---

## 16) CSRF Token Resolution (v10)

Status writes (drag-and-drop, Other Status modal) require a valid CSRF token. The token is resolved via a multi-strategy cascade:

1. Read from `#pmEnv` `data-csrf` / `data-csrf-alt` / `data-csrf2` attributes (injected by Smarty template at page load).
2. If not found, check `<meta name="csrf-token">` in the page `<head>`.
3. If not found, check hidden `<input name="CSRFToken|csrf_token|csrfToken">` elements.
4. If not found, check `window.CSRFToken`, `window.csrfToken`, `window.csrf_token`.
5. If not found, check cookies named `CSRFToken`, `csrf_token`, or `XSRF-TOKEN`.
6. If still not found, fetch the new-project form HTML (`START_PROJECT_URL`) via `fetchCSRFTokenFromIframe`, which loads the URL in a hidden iframe and extracts the token from the iframe's DOM, meta tags, JS globals, or raw HTML using `extractCSRFTokenFromHTML`.

Resolved tokens are cached in `state.csrfToken` / `state.csrfField` via `cacheCSRF`. Subsequent calls to `ensureCSRFToken` return the cached value.

### Reproducing in Another Site

1. Inject the CSRF token into `#pmEnv` as `data-csrf` attributes from your template engine.
2. Implement the cascade above in `getCSRFToken()` and `ensureCSRFToken(recordID)`.
3. Use the resolved token in all `POST` requests as the `CSRFToken` field in the form body.

---

## 17) Selector UI Pattern (Shared htmlEdit Scripts)

Shared selector UI behaviors used in htmlEdit scripts for OKR/Project/KR pickers:

- Collapsed summary row with selected value and "Change" button.
- Panel expands for search + selection; auto-collapses after selection.
- Shared CSS injection using a single `style` tag (`#pm-picker-styles`).
- Accessible focus styles and keyboard operability.
- Persistence logic unchanged (selectors write to existing indicator fields).

---

## 18) Filter Architecture

- Filters are single-select `<select>` controls (one value or "All").
- Filter logic: AND across filters; each filter matches exact value. Empty selection = "All".
- **Projects filters**: Fiscal Year (new in v10), search.
- **Tasks filters**: Project, Status, Assigned To, Category, Priority, Actual Completion Date (date range: from/to), Dev-Only toggle.

The Actual Completion Date filter uses two `<input type="date">` controls (`pmActualCompletionFrom` and `pmActualCompletionTo`). If a from-date is set, tasks with an actualCompletion date before it are excluded. If a to-date is set, tasks with an actualCompletion date after it are excluded. Tasks with no actualCompletion date are excluded when either bound is active.

- Search is debounced (≈275ms) and applied across multiple fields.
- Analytics filters (Year/Quarter) constrain chart windows for tasks and projects.
- OKR Fiscal Year filter constrains the project dataset used for OKR roll-ups and OKR tables.

FY interaction with OKR calculations:

- FY selection filters `okrBaseProjects` (authoritative project dataset for OKR rollups).
- Tasks are not directly filtered by FY; tasks referencing projects outside the FY map are surfaced under "Other contributing items."

---

## 19) Performance Considerations

- Lazy tab/view initialization: heavy content is rendered only on first view activation.
- Derived caches for filters/sorts/kanban/analytics/OKRs keyed by signatures with versioning.
- Incremental cache updates on task changes (status, indicator 44, etc.).
- Analytics buckets (including Other/Blocked/On Hold) are incrementally updated.
- Debounced search input to avoid recomputation on each keystroke.
- Task table virtualization reduces DOM load for large datasets.
- Pagination further constrains the DOM to a single page slice (default 100 rows).
- Kanban caps (`KANBAN_RENDER_LIMIT = 100`) prevent rendering thousands of cards per column.

---

## 20) Lifecycle & Initialization Flow

- `DOMContentLoaded` → `main()` wires all UI, then fetches data.
- UI wiring order: `wireTabs`, `wireTaskViewToggle`, `wireDevOnlyToggle`, `wireAnalyticsViewToggle`, `wireOkrTableViewToggle`, `wireSortingDelegation`, `wireClearFilters`, `wireOkrFilters`, `wireOkrRollupToggle`, `wireRecordModalLinks`, `wireSupportMessageListener`, `wireModalControls`, `wireOtherStatusModal`, `wireAddButtons`, `wireAnalyticsSharedFilters`, `wireJumpToTop`.
- Data loads (parallel Promise.all):
  - Projects query (Project form indicators: 2, 3, 4, 5, 6, 38, 29, 32, 37, 23, 24, 25, 26, 33)
  - Tasks query (Task form indicators: 8, 9, 10, 44, 14, 16, 17, 11, 12, 13, 18, 30, 39)
  - Key Results query (Key Result form indicators: 35, 36)
- After fetch:
  - Normalize and store `state.projectsAll`, `state.tasksAll`, `state.keyResultsAll`.
  - Build project key → record ID/title maps for linking and labels.
  - Populate filter options (including new Projects FY dropdown).
  - Apply initial render based on active tab (from localStorage).
- Tab activation:
  - Stores `activeTab` in localStorage.
  - Renders only the active tab; first-time initialization is gated by `tabInit` and `viewInit` flags.
- Filter changes:
  - `applySearchAndFilters()` re-renders only the active tab.
  - Cached results are reused when signatures match.

---

## 21) Version History

- v7: OKR roll-up structural refactor (Quick View, Index, Roll-up details).
- v7.1: Multi-select filters introduced in some deployments.
- v8: Performance refactor baseline (lazy tab init and caching).
- v9: Stabilized performance and UX (virtualized task table, Kanban caps + load more, incremental analytics updates, lazy view initialization).
- v10: Gantt timeline view, Project Health Sticky bar, tasks table pagination, jump-to-top button, Add menu with full keyboard support, View Inbox button, Projects fiscal year filter, Projects by Project Type analytics chart, robust multi-strategy CSRF resolution.
- v10.1: Actual Completion Date field on tasks (indicator 47, auto-stamped on completion), Completed Date column in task table (sortable, filterable by date range), Schedule Variance analytics chart, % Completion column on Projects table (sortable, with inline progress bar).

---

## 23) Recurring Task Auto-Copy System (v10)

Tasks marked with `isRecurring = Yes` (indicator 45) are automatically copied when resolved.

### How It Works

1. On each data load, `checkAndCopyResolvedRecurringTasks()` queries for tasks with `stepID = resolved` AND `indicator 45 = Yes`.
2. For each such task, if it has not already been copied (checked via `localStorage` key `pm_recurring_copied_v10` and an in-memory lock `recurringInProgress`), `copyRecurringTask(sourceRecordID)` is called.
3. The copy process:
   - Reads all task fields from the source record via query API.
   - Creates a new task record via `/api/form/new` POST, copying all indicator fields except status (reset to "Not Started") and otherSubType (cleared).
   - Writes the source record ID to indicator 46 for traceability.
   - Re-copies the `assignedTo` field via the LEAF orgchart API sequence (search → import → write empUID).
   - Submits the new record into the workflow via `/api/form/{id}/submit`.
4. Deduplication: the `pm_recurring_copied_v10` localStorage key persists copied record IDs across page refreshes. The in-memory `recurringInProgress` Set prevents concurrent copies within the same poll cycle.

### Relevant Indicators

- `indicatorID 45` (`RECURRING_INDICATOR_ID`) — Is Recurring flag (Yes/No).
- `indicatorID 46` — Source record ID (written on the copy for traceability).

### Gotchas

- The auto-copy only runs once per resolved record ID per browser session (plus persistence via localStorage). If a copy fails, it is removed from both locks so it can retry on the next load.

---

## 22) Troubleshooting and Common Gotchas

- **CSRF failures on status save**: If drag-and-drop or Other Status modal POSTs fail, check that `#pmEnv` is present and its `data-csrf` attribute is populated by the template engine. The iframe fallback requires the `START_PROJECT_URL` to be accessible from the user's session.
- **Project key normalization**: Keys containing non-breaking spaces (NBSP, `\u00A0`) must be normalized before comparison. Use `normalizeProjectKey` which replaces NBSP, trims, collapses whitespace, and uppercases. Mismatches here cause tasks to fall into "Other contributing items."
- **KR name matching edge cases**: KR names are normalized via `normalizeKeyResultMatch` before comparison. Minor formatting differences (extra spaces, case) are handled. If a task's KR still doesn't match, verify the raw `indicatorID 39` value matches the `indicatorID 36` name in the Key Result form exactly after normalization.
- **Gantt shows no bars**: Tasks without both start and due dates are excluded from the bar chart. The meta line reports the hidden count. Check that indicator 12 (Start Date) and indicator 13 (Due Date) are populated on the form.
- **Pagination resets unexpectedly**: Pagination resets to page 1 whenever the data signature changes (filter, sort, or search change). This is intentional. If it resets on every load, check that localStorage is accessible and not cleared between sessions.
- **Project Health Sticky not showing**: The bar requires (a) the Tasks tab to be active and (b) a project key to be selected in the Project filter. If no project is selected, the bar is hidden regardless of tasks.
- **"Other contributing items" bucket unexpectedly populated**: Tasks appear here when their project key (indicator 8) does not match any project in the FY-filtered project map. Check that the task's project key exactly matches (post-normalization) a project record's key (indicator 2) and that the project is within the selected OKR Fiscal Year.
- **Completed Date column always blank**: The Actual Completion Date (indicator 47) is only auto-stamped when a task's status is changed to "Completed" through the dashboard's `updateTaskStatus()` function. Tasks completed before v10.1 was deployed, or tasks completed via direct LEAF form edits, will not have this field populated unless manually backfilled.
- **Schedule Variance chart shows no data**: The chart requires completed tasks that have both a `due` date (indicator 13) and an `actualCompletion` date (indicator 47). If both fields are present but the chart is empty, verify the task's status contains "completed" (case-insensitive check).
- **% Complete column shows 0 for all projects**: This column is computed client-side from `state.tasksAll`. If tasks are not loading or the project key on tasks (indicator 8) does not match the project key on the project record (indicator 2) after normalization, all projects will show 0%. Use `getProjectCompletionPct(projectKey)` in the browser console to debug a specific key.
- **Recurring tasks being copied multiple times**: Check `localStorage.getItem('pm_recurring_copied_v10')` in the browser console. If the key is missing or corrupted, clear it with `localStorage.removeItem('pm_recurring_copied_v10')`. Each resolved recurring task should appear in this set exactly once.
