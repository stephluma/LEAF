[Documentation created by Claude.ai]: #

# LEAF Project Dashboard — v12 Technical Documentation

## 1) Overview

The LEAF Project Dashboard provides a unified view into Projects, Tasks, and Analytics (including OKR roll-ups). The dashboard is a single-page application rendered from HTML/CSS/JS with client-side aggregation over LEAF form query data.

Primary functional views:

- Projects
- Tasks (Table, Kanban, Gantt)
- Analytics (Project analytics + OKR roll-up)

Version reference: v12.

---

## 2) File Structure and Versioning

- `project_v12.html` [view_homepage.tpl]
  - Page structure, layout scaffolding, tab containers, and modal plumbing.
  - OKR Analytics containers (filters, quick view, index, roll-up).
  - Add menu (Project, Task, **Recurring Task**, Objective, Key Result) and View Inbox button.
  - **`<h1 class="pm-title">` dashboard title** promoted into a new `.pm-header` wrapper element.
  - **`.pm-inboxWrap`** wrapper around View Inbox button and new `#pmInboxBadge` badge element.
  - **`#pmTourBtn`** help button (Material Icon: `tour`) added to actions row for replaying the tour.
  - **`#pmFeedbackBtn`** fixed feedback button (Material Icon: `add_reaction`) added at bottom of page.
  - **`#pmFeedbackModal`** feedback dialog with textarea, submit button, and `role="status"` status span.
  - **`#pmTourOverlay`**, **`#pmTourSpotlight`**, **`#pmTourTooltip`** tour overlay structure added.
  - Tour tooltip contains: `#pmTourStepLabel` (step counter), `#pmTourTitle`, `#pmTourBody`, Back/Next/Skip buttons.
  - `+ Recurring Task` menu item added to Add Menu popover (between `+ Task` and `+ Objective`), uses `data-action="recurringTask"` and `data-tooltip` for inline tooltip.
  - Gantt view container (`pmGanttWrap`, `pmGanttBoard`, `pmGanttInner`).
  - Project Health Sticky bar container (`pmProjectHealthSticky`).
  - Tasks table pagination container (`pmTasksTablePagination`).
  - Jump-to-top button (`pmJumpTopBtn`).
  - Font preconnect hint for Google Fonts (performance).
  - Material Icons stylesheet included (required by tour button and feedback button).
  - Analytics chart titles are `<h3>` elements.
  - Modal titles (`#pmModalTitle`, `#pmOtherModalTitle`) are `<h2>` elements.
  - Hidden panels use the native `hidden` attribute instead of `style="display:none"`.
  - Tour overlay `role="dialog"` / `aria-modal` correctly scoped to inner `#pmTourTooltip` only.
- `project_v12.css`
  - Dashboard styling (tables, cards, filters, tasks, OKR roll-up UI, badges, progress bars).
  - **`.pm-header`** — flex column wrapper for title and actions row.**`.pm-title`** — `<h1>` at 28px/800 weight.**`.pm-subtitle`** — `<h2>` for tab panel headings.
  - **Tour styles**: `.pm-tourOverlay`, `.pm-tourSpotlight`, `.pm-tourTooltip`, `.pm-tourStepLabel`, `.pm-tourTitle`, `.pm-tourBody`, `.pm-tourFooter`, `.pm-tourSkip`, `.pm-tourNav`, `.pm-tourBack`, `.pm-tourNext`, `.pm-tourWelcome`.
  - **Feedback styles**: `.pm-feedbackBtn`, `.pm-feedbackModal`, `.pm-feedbackInner`, `.pm-feedbackHeader`, `.pm-feedbackTitle`, `.pm-feedbackClose`, `.pm-feedbackTextarea`, `.pm-feedbackFooter`, `.pm-feedbackStatus`.
  - **Inbox badge styles**: `.pm-inboxWrap`, `.pm-inboxBadge`.
  - **Help button styles**: `.pm-helpBtn` (circular ghost button for tour replay).
  - **Recurring banner styles**: `.pm-recurringBanner`, `.pm-recurringBannerCheck`.
  - **Add menu tooltip styles**: `.pm-menuItemTip`, `.pm-menuItemTip::after` (hover/focus-visible tooltip via `data-tooltip` attribute).
  - **Task table Project Key de-emphasis**: `#pmTasksTableWrap .pm-table td:first-child` muted to `#6b7280`, 11px, weight 500.
  - **Responsive table scrolling**: `#pmProjectHealthTable`, `#pmOverdueTasksTable`, `#pmOkrsTableWrap` gain `overflow-x: auto`. Mobile breakpoint (≤768px) sets min-widths on inner tables.
  - Z-index scale comment block updated: `1300` added for feedback modal.
  - All v11 styles preserved.
- `project_v12.js`
  - Data fetching, normalization, filtering, aggregation, rendering, and UI behavior.
  - **`initTour()`** — new interactive onboarding tour (see Section 25).
  - **`wireFeedbackWidget()`** — new feedback dialog wired to LEAF form submission (see Section 26).
  - **`fetchAndRenderInboxCount()`** — live inbox badge count fetched across all portal URLs from sitemap (see Section 12).
  - **`wireRecurringFieldHider()`** — MutationObserver hides the `isRecurring` field from new-task forms opened via the Recurring Task menu item.
  - **`START_RECURRING_TASK_URL`** — new constant: same as `START_TASK_URL` with `&i_` + `RECURRING_INDICATOR_ID` + `=Yes` appended to pre-populate indicator 45.
  - **`+ Recurring Task` action in `wireAddButtons`** — opens modal with `START_RECURRING_TASK_URL` and a post-load callback that polls the iframe DOM (up to 20 × 250ms) to force-check the "Yes" radio for indicator 45 and hide the field wrapper.
  - `STORAGE_KEYS.FILTER_STATE_KEY` bumped to `pm_filter_state_v12`; all other storage keys remain at v11.
  - `main()` wiring order updated: adds `fetchAndRenderInboxCount`, `wireRecurringFieldHider`, `wireFeedbackWidget`, and `initTour` after existing wires.
  - All v11 capabilities preserved.

v12 supersedes v11. All v11 capabilities are preserved. v12 adds: interactive onboarding tour with spotlight and keyboard navigation, feedback submission widget backed by a LEAF form, live inbox badge count on View Inbox button, `+ Recurring Task` Add Menu shortcut with automatic indicator pre-population and field hiding, dashboard `<h1>` title and header layout, responsive horizontal scrolling for analytics and OKR tables, de-emphasized Project Key column in the task table, and updated z-index documentation for the feedback modal.

---

## 3) Access Control and Environment Setup

The dashboard uses LEAF Smarty template conditionals to gate visibility:

```html
<!--{if $empMembership['groupID'][435]}-->
<!-- Outer gate: read-only group 435. All users need this. -->
<div class="pm-wrap">
  <span
    id="pmEnv"
    data-csrf="{$CSRFToken}"
    data-csrf-alt="{$csrf_token}"
    data-csrf2="{$csrfToken}"
    style="display:none"
  ></span>

  <!--{if $empMembership['groupID'][12]}-->
  <!-- Inner gate: LEAF Team group 12. Shows Add menu and View Inbox. -->
  <div class="pm-actionsRow pm-actionsRowSpaced">
    <!-- Add menu, View Inbox (with badge), and Tour button rendered here -->
  </div>
  <!--{/if}-->
</div>
<!--{/if}-->
```

- **Group 435** — read-only access; all dashboard users must be in this group AND added to the view.
- **Group 12 (LEAF Team)** — team members only; grants the Add menu, View Inbox button (with live badge), and Tour replay button.

CSRF tokens are injected as `data-*` attributes on `#pmEnv` and read at initialization. See Section 16 for full CSRF resolution logic.

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
- `indicatorID 46` — Copied from Task # (source record ID written on copies for traceability)
- `indicatorID 47` — Actual Completion Date (auto-stamped when task status is set to "Completed")
- `indicatorID 48` — Continued as Task # (new copy's record ID written back to the source task)

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

**Feedback form** (new in v12):

- `indicatorID 50` — Feedback text (written by `wireFeedbackWidget`; form ID `1c5b6`, workflow step 13)

Relationships:

- Objective → Key Result via OKR Key (23/35) and KR name (36)
- Project → Objective/KR via project OKR key (29) and project KR name (37)
- Task → Objective/KR via task OKR key (30) and task KR name (39)
- Task → Project via task project key (8) matched to project key (2)

Normalization:

- OKR keys are normalized via `normalizeOkrKey`.
- Key Result matching uses normalized names (`normalizeKeyResultMatch`).
- Project keys are normalized by replacing NBSP, trimming, collapsing whitespace, and uppercasing (`normalizeProjectKey`).

---

## 5) Status Configuration

All statuses and Kanban column orderings are centralized in `STATUS_CONFIG` (unchanged from v11):

```js
var STATUS_CONFIG = {
  ALL_STATUSES: [
    "Not Started",
    "In Progress",
    "Ready for HCD Review",
    "Ready for Testing",
    "Ready for PO Review",
    "Other",
    "Completed",
  ],
  LEGACY_KANBAN_COLUMNS: [
    "Not Started",
    "In Progress",
    "Ready for HCD Review",
    "Ready for PO Review",
    "Completed",
    "Other",
  ],
  DEV_KANBAN_COLUMNS: [
    "Not Started",
    "In Progress",
    "Ready for HCD Review",
    "Ready for Testing",
    "Ready for PO Review",
    "Completed",
    "Other",
  ],
  OTHER_SUBTYPES: ["Blocked", "On Hold"],
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

### Project Key Column De-emphasis (v12)

The Project Key column (first column) in the task table is visually de-emphasized in v12:

```css
#pmTasksTableWrap .pm-table td:first-child .pm-recordLink,
#pmTasksTableWrap .pm-table td:first-child {
  color: #6b7280;
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
}
#pmTasksTableWrap .pm-table th:first-child .pm-sortBtn {
  color: #6b7280;
  font-size: 11px;
}
```

Hover on the link restores `var(--accent-strong)` and underline. This reduces visual noise when scanning tasks within a known project context.

### Task Table Virtualization

- Fixed row height with top/bottom spacers to preserve scroll height.
- Only visible rows + buffer are rendered.
- Keyboard focus is preserved within the visible window.

### Task Table Columns

The task table includes the following sortable columns in order:
Project Key, Task ID, Title, Status, Dependencies, Priority, Category, Assigned To, Start, Due, Completed Date, Ticket.

`colCount` is set to 12 to account for the Completed Date column.

---

## 8) Tasks Table Pagination (v10)

The tasks table supports server-side–style pagination rendered client-side.

### Configuration

```js
var PAGINATION_CONFIG = {
  tasks: {
    storageKey: "pm_tasks_pagination_v11",
    containerId: "pmTasksTablePagination",
    defaultPageSize: 100,
    pageSizes: [50, 100, 200],
  },
};
```

### Key Functions

- `buildPaginationModel(total, page, pageSize)` — returns `{ total, page, pageSize, totalPages, start, end }`.
- `ensurePaginationState(key, signature, total)` — loads persisted state from `localStorage`, resets to page 1 when the data signature changes, and returns the current pagination model.
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
<div
  id="pmGanttWrap"
  role="tabpanel"
  aria-labelledby="pmViewGanttBtn"
  aria-hidden="true"
  style="display:none"
>
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

| Priority | CSS Class      | Color     |
| -------- | -------------- | --------- |
| High     | `pm-ganttHigh` | `#f2938c` |
| Medium   | `pm-ganttMed`  | `#e6c74c` |
| Low      | `pm-ganttLow`  | `#aacdec` |
| None     | `pm-ganttNone` | `#cfcfcf` |

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
<div id="pmProjectHealthSticky" class="pm-healthSticky" hidden>
  <div class="pm-healthInner"></div>
</div>
```

### Rendering Logic (`renderProjectHealthSticky(activeTab, selectedProjectKey)`)

```js
// Called whenever the tab changes or the project filter changes.
// activeTab must be "tasks" and selectedProjectKey must be non-empty for the bar to show.
// Reads from state.tasksAll — no additional fetch needed.
```

---

## 12) Add Menu, View Inbox, and Tour Button (v10/v12)

A team-member–only action row at the top of the dashboard (gated by LEAF group 12).

### Add Menu

A popover menu button that opens a dropdown with five creation options in v12:

| Menu Item        | Action key      | Opens modal for                                                       |
| ---------------- | --------------- | --------------------------------------------------------------------- |
| + Project        | `project`       | New Project form                                                      |
| + Task           | `task`          | New Task form                                                         |
| + Recurring Task | `recurringTask` | New Task form pre-populated with `isRecurring = Yes` (indicator 45) |
| + Objective      | `objective`     | New OKR (Objective) form                                              |
| + Key Result     | `keyResult`     | New Key Result form                                                   |

The `+ Recurring Task` item uses class `pm-menuItemTip` and a `data-tooltip` attribute to show a hover/focus-visible tooltip explaining the feature. It pre-populates indicator 45 via `START_RECURRING_TASK_URL` and forces the "Yes" radio via a post-load iframe callback (see Section 27).

Each action calls `openModal(title, url)` (or `openModal(title, url, callback)` for the recurring task) with the appropriate URL constant.

### Keyboard Behavior (`wireAddButtons`)

- **Arrow Down / Enter / Space** on the menu button opens the popover and focuses the first item.
- **Arrow Up** opens and focuses the last item.
- **Arrow Down / Arrow Up** in the open menu cycle through items (wraps).
- **Home / End** jump to first/last item.
- **Enter / Space** activates the focused item.
- **Tab** closes the menu without activating.
- **Escape** closes and returns focus to the menu button.
- Clicking outside the menu closes it.

### View Inbox Button and Live Badge (v12)

The View Inbox button is now wrapped in `.pm-inboxWrap`. A badge (`#pmInboxBadge`) overlays the button's top-right corner showing the count of actionable inbox items:

- Badge is `hidden` when count = 0; shown with red background when count > 0.
- `aria-label` is set to `"{n} inbox item(s)"` when visible, `"No inbox items"` when hidden.
- `aria-live="polite"` on the badge announces count changes to screen readers.
- Count is fetched by `fetchAndRenderInboxCount()` on every page load (see Section 27).

### Tour Button (v12)

A circular ghost button (`#pmTourBtn`, class `pm-helpBtn`) displays a `tour` Material Icon. Clicking it calls `startTour()` to replay the interactive tour at any time. Includes a `data-tooltip` that appears below on hover/focus-visible. See Section 25 for full tour documentation.

### HTML Structure

```html
<!--{if $empMembership['groupID'][12]}-->
<div class="pm-actionsRow pm-actionsRowSpaced">
  <div class="pm-addMenu">
    <button
      type="button"
      class="pm-primaryBtn pm-addBtn"
      id="pmAddMenuBtn"
      aria-haspopup="menu"
      aria-expanded="false"
      aria-controls="pmAddMenuList"
    >
      Add
    </button>
    <div
      class="pm-addMenuPopover"
      id="pmAddMenuList"
      role="menu"
      aria-label="Add menu"
      aria-orientation="vertical"
      hidden
    >
      <button type="button" class="pm-menuItem" role="menuitem" data-action="project">+ Project</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="task">+ Task</button>
      <button
        type="button"
        class="pm-menuItem pm-menuItemTip"
        role="menuitem"
        data-action="recurringTask"
        data-tooltip="One-time setup per task. Once created, the dashboard auto-generates a fresh copy each time that task is completed."
      >+ Recurring Task</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="objective">+ Objective</button>
      <button type="button" class="pm-menuItem" role="menuitem" data-action="keyResult">+ Key Result</button>
    </div>
  </div>
  <div class="pm-inboxWrap">
    <button type="button" class="pm-primaryBtn pm-inboxBtn" id="pmViewInboxBtn">View Inbox</button>
    <span class="pm-inboxBadge" id="pmInboxBadge" hidden aria-label="inbox items" aria-live="polite">0</span>
  </div>
  <button
    type="button"
    class="pm-primaryBtn pm-helpBtn"
    id="pmTourBtn"
    aria-label="First time here? Launch a quick interactive tutorial"
    data-tooltip="First time here? Launch a quick interactive tutorial"
  >
    <span class="material-icons" aria-hidden="true">tour</span>
  </button>
</div>
<!--{/if}-->
```

### URL Constants (replace with your own LEAF instance paths)

```js
var START_PROJECT_URL =
  "report.php?a=LEAF_Start_Request&id=form_55445&title=Project";
var START_TASK_URL = "report.php?a=LEAF_Start_Request&id=form_9b302&title=Task";
var START_RECURRING_TASK_URL =
  START_TASK_URL + "&i_" + encodeURIComponent(RECURRING_INDICATOR_ID) + "=Yes";
var START_OKR_URL = "report.php?a=LEAF_Start_Request&id=form_a2b55&title=OKR";
var START_KEY_RESULT_URL =
  "report.php?a=LEAF_Start_Request&id=form_6530b&title=Key+Result";
```

---

## 13) Jump-to-Top Button (v10)

A fixed-position circular button in the bottom-right corner that scrolls the page to the top.

### Behavior (`wireJumpToTop`)

- Visible only when the page is scrollable (scroll height > viewport + 80px) AND the user has scrolled down > 120px.
- Toggled via `.is-visible` class; when hidden, `pointer-events: none` and `opacity: 0`.
- Click triggers `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- Visibility updates on `scroll` (passive) and `resize` (debounced at 120ms).
- `aria-hidden` and `tabindex` are kept in sync with visibility.

### HTML

```html
<button
  class="pm-jumpTop"
  id="pmJumpTopBtn"
  aria-label="Back to top"
  aria-hidden="true"
  tabindex="-1"
>
  ↑
</button>
```

---

## 14) Projects View — Fiscal Year Filter (v10)

The Projects tab includes a Fiscal Year multi-select filter.

### Logic

- `populateProjectFiscalYearDropdown(projects)` — populates the select with unique, sorted `projectFiscalYear` values from all projects.
- `buildProjectFilterState()` reads the selection as `filters.fiscalYear`.
- `projectMatchesFilters(project, filters)` applies an exact-match check on `project.projectFiscalYear` when `fiscalYear` is set.
- The signature function `buildProjectsSignature` includes `fiscalYear` so the cache invalidates correctly on filter changes.
- Project search (`matchesQuery`) includes `projectFiscalYear` in the haystack so users can search by FY directly.

### % Completion Column (v10.1)

The Projects table includes a sortable **% Complete** column as the last column.

**Helper function**: `getProjectCompletionPct(projectKey)` filters `state.tasksAll` by project key, counts tasks whose status contains "completed" (case-insensitive), and returns `Math.round((completed / total) * 100)`, or 0 if there are no tasks.

**Styling**: Uses color classes:

- `pm-completeGreen` (green) when % = 100
- `pm-completeMid` (amber, `#b26a00`) when % ≥ 50 and < 100
- No color class when % < 50

**Visual**: Each cell renders a small inline progress bar (`pm-compPctBar`, max-width 60px, height 6px, blue fill) alongside the numeric label (`pm-compPctLabel`).

---

## 15) Analytics View (v10)

### Analytics Charts

All charts are rendered via Chart.js and support Year/Quarter filtering. The following charts are present:

| Chart Title                             | Canvas ID                    | Data Source                                        |
| --------------------------------------- | ---------------------------- | -------------------------------------------------- |
| Due date buckets                        | `pmChartDueBuckets`          | Tasks (due date)                                   |
| Completed tasks by quarter              | `pmChartCompletedByQuarter`  | Tasks (completion date)                            |
| Completed tasks by category             | `pmChartCompletedByCategory` | Tasks (category)                                   |
| Tasks by priority                       | `pmChartTasksByPriority`     | Tasks                                              |
| Tasks by Status                         | `pmChartTasksByStatus`       | Tasks                                              |
| Tasks per Project Key                   | `pmChartTasksByProject`      | Tasks                                              |
| Tickets imported by month               | `pmChartTicketsImported`     | Tasks (support ticket)                             |
| Projects by Project Type                | `pmChartProjectsByType`      | Projects (type field)                              |
| Schedule Variance (Days Late/Early)     | `pmChartScheduleVariance`    | Completed tasks (actualCompletion vs due date)     |

### Analytics Tables

Two tabular summaries appear above the charts:

1. **Project health rollup** (`#pmProjectHealthTable`) — per-project-key: Total Tasks, Completed, % Complete, Overdue. Overdue count is red when > 0; completion is green at 100%. Tables are horizontally scrollable in v12 with a mobile min-width of 600px.
2. **Overdue tasks** (`#pmOverdueTasksTable`) — sorted by due date ascending. Columns: Project Key (linked), Task ID (linked), Title, Assigned To, Due Date, Status. Horizontally scrollable in v12 with a mobile min-width of 600px.

Both tables support "Show all / Show less" toggle when row count exceeds 20.

### OKR Table Responsive Scrolling (v12)

`#pmOkrsTableWrap` is now `overflow-x: auto` with `max-width: 100%`. At ≤768px breakpoint, `.pm-table` inside the wrapper gets `min-width: 700px`.

---

## 16) CSRF Token Resolution (v10)

Status writes (drag-and-drop, Other Status modal, feedback submission) require a valid CSRF token. The token is resolved via a multi-strategy cascade:

1. Read from `#pmEnv` `data-csrf` / `data-csrf-alt` / `data-csrf2` attributes (injected by Smarty template at page load).
2. If not found, check `<meta name="csrf-token">` in the page `<head>`.
3. If not found, check hidden `<input name="CSRFToken|csrf_token|csrfToken">` elements.
4. If not found, check `window.CSRFToken`, `window.csrfToken`, `window.csrf_token`.
5. If not found, check cookies named `CSRFToken`, `csrf_token`, or `XSRF-TOKEN`.
6. If still not found, fetch the new-project form HTML via `fetchCSRFTokenFromIframe`, which loads the URL in a hidden iframe and extracts the token from the iframe's DOM, meta tags, JS globals, or raw HTML using `extractCSRFTokenFromHTML`.

Resolved tokens are cached in `state.csrfToken` / `state.csrfField` via `cacheCSRF`. Subsequent calls to `ensureCSRFToken` return the cached value.

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

- Filters are multi-select controls (one or more values, or "All").
- Filter logic: AND across filters; each filter matches exact value. Empty selection = "All".
- **Projects filters**: Fiscal Year, search.
- **Tasks filters**: Project, Status, Assigned To, Category, Priority, Actual Completion Date (date range: from/to), Dev-Only toggle.
- **Filter state persistence**: persisted to `localStorage` under key `pm_filter_state_v12` (bumped from v11 in v12).

The Actual Completion Date filter uses two `<input type="date">` controls (`pmActualCompletionFrom` and `pmActualCompletionTo`). If a from-date is set, tasks with an actualCompletion date before it are excluded. If a to-date is set, tasks with an actualCompletion date after it are excluded. Tasks with no actualCompletion date are excluded when either bound is active.

- Search is debounced (≈275ms) and applied across multiple fields.
- Analytics filters (Year/Quarter) constrain chart windows for tasks and projects.
- OKR Fiscal Year filter constrains the project dataset used for OKR roll-ups and OKR tables.

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
- UI wiring order: `wireTabs`, `wireTaskViewToggle`, `wireDevOnlyToggle`, `wireAnalyticsViewToggle`, `wireOkrTableViewToggle`, `wireSortingDelegation`, `wireLoadMore`, `wireProjectsLoadMore`, `loadFilterState`, `initFilterControls`, `wireClearFilters`, `wireOkrFilters`, `wireOkrRollupToggle`, `wireRecordModalLinks`, `wireSupportMessageListener`, `wireModalControls`, `wireOtherStatusModal`, `wireAddButtons`, `fetchAndRenderInboxCount`, `wireRecurringFieldHider`, `wireAnalyticsSharedFilters`, `wireJumpToTop`, `wireFeedbackWidget`, `initTour`.
- Data loads (parallel Promise.all):
  - Projects query (Project form indicators: 2, 3, 4, 5, 6, 38, 29, 32, 37, 23, 24, 25, 26, 33)
  - Tasks query (Task form indicators: 8, 9, 10, 44, 14, 16, 17, 11, 12, 13, 18, 30, 39, 45, 47, 48)
  - Key Results query (Key Result form indicators: 35, 36)
- After fetch:
  - Normalize and store `state.projectsAll`, `state.tasksAll`, `state.keyResultsAll`.
  - Build project key → record ID/title maps for linking and labels.
  - Populate filter options (including Projects FY dropdown).
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
- v11: Full accessibility audit pass (keyboard focus rings, heading hierarchy, ARIA roles and labels, WCAG AA contrast, sr-only switch pattern, decorative content suppression); double-encoding bug fix for LEAF pre-encoded API values; Kanban completed-column auto-reload removed; Kanban error feedback via aria-live region instead of alert(); Kanban column config memoized; debounced resize listener; deprecated CSS removed; native `hidden` attribute adopted for hidden panels; all localStorage keys version-stamped to v11; indicator 48 (Continued as Task #) added for server-side recurring dedup; OKR index keyboard activation; font preconnect hint added; z-index scale documented.
- v12: Interactive onboarding tour (`initTour`) with spotlight, keyboard navigation, and localStorage persistence; feedback submission widget (`wireFeedbackWidget`) backed by LEAF form (indicator 50, form `1c5b6`, step 13); live inbox badge count (`fetchAndRenderInboxCount`) across all sitemap portal URLs; `+ Recurring Task` Add Menu item with indicator 45 pre-population and iframe field-hiding; dashboard `<h1>` title and `.pm-header` layout; responsive horizontal scrolling for analytics and OKR tables with mobile min-widths; Project Key column de-emphasized in task table; `pm_filter_state_v12` storage key; z-index 1300 for feedback modal.

---

## 23) Recurring Task Auto-Copy System (v10+)

Tasks marked with `isRecurring = Yes` (indicator 45) are automatically copied when resolved.

### How It Works

1. On each data load, `checkAndCopyResolvedRecurringTasks()` queries for tasks with `stepID = resolved` AND `indicator 45 = Yes`.
2. For each such task, if it has not already been copied (checked via the `RECURRING_COPIED_KEY` localStorage set and an in-memory lock `recurringInProgress`), `copyRecurringTask(sourceRecordID)` is called.
3. The copy process:
   - Reads all task fields from the source record via query API.
   - Creates a new task record via `/api/form/new` POST, copying all indicator fields except status (reset to "Not Started") and otherSubType (cleared).
   - Writes the source record ID to indicator 46 on the new copy for traceability.
   - Writes the new copy's record ID to indicator 48 (`recurringCopied`) on the source task for server-side deduplication.
   - Re-copies the `assignedTo` field via the LEAF orgchart API sequence (search → import → write empUID).
   - Submits the new record into the workflow via `/api/form/{id}/submit`.
4. Deduplication (two layers):
   - **localStorage** (`pm_recurring_copied_v11`): persists copied record IDs across page refreshes within the same browser.
   - **Server-side** (indicator 48): written back to the source task after a successful copy. Survives localStorage clears, private browsing, new devices, and deleted copies. Requires indicator 48 to be created in LEAF Form Editor (type = text, label = "Continued as Task #", read-only) before it takes effect.

### Relevant Indicators

- `indicatorID 45` (`RECURRING_INDICATOR_ID`) — Is Recurring flag (Yes/No).
- `indicatorID 46` — Copied from Task # (source record ID, written on the copy).
- `indicatorID 48` — Continued as Task # (new copy's record ID, written on the source task).

### Creating a Recurring Task (v12)

In v12, team members can create a recurring task directly from the Add Menu:

1. Click **Add → + Recurring Task**.
2. The Task form opens pre-populated with `isRecurring = Yes` via `START_RECURRING_TASK_URL`. The `isRecurring` field is hidden from the form UI by `wireRecurringFieldHider` (see Section 27).
3. Fill in the task details and submit. The task is now flagged as recurring and will be auto-copied on completion.

---

## 22) Troubleshooting and Common Gotchas

- **CSRF failures on status save**: If drag-and-drop or Other Status modal POSTs fail, check that `#pmEnv` is present and its `data-csrf` attribute is populated by the template engine. The iframe fallback requires the `START_PROJECT_URL` to be accessible from the user's session.
- **Project key normalization**: Keys containing non-breaking spaces (NBSP, `\u00A0`) must be normalized before comparison. Use `normalizeProjectKey`. Mismatches here cause tasks to fall into "Other contributing items."
- **Gantt shows no bars**: Tasks without both start and due dates are excluded from the bar chart. Check that indicator 12 (Start Date) and indicator 13 (Due Date) are populated.
- **Pagination resets unexpectedly**: Pagination resets to page 1 whenever the data signature changes. This is intentional. If it resets on every load, check that localStorage is accessible.
- **Project Health Sticky not showing**: The bar requires (a) the Tasks tab to be active and (b) a project key to be selected in the Project filter.
- **"Other contributing items" bucket unexpectedly populated**: Tasks appear here when their project key (indicator 8) does not match any project in the FY-filtered project map.
- **Completed Date column always blank**: The Actual Completion Date (indicator 47) is only auto-stamped when a task's status is changed to "Completed" through the dashboard's `updateTaskStatus()` function. Tasks completed via direct LEAF form edits will not have this field populated.
- **Schedule Variance chart shows no data**: The chart requires completed tasks that have both a `due` date (indicator 13) and an `actualCompletion` date (indicator 47).
- **% Complete column shows 0 for all projects**: Computed client-side from `state.tasksAll`. Check that project keys on tasks (indicator 8) match project record keys (indicator 2) after normalization.
- **Recurring tasks being copied multiple times**: Check `localStorage.getItem('pm_recurring_copied_v11')` in the browser console. Indicator 48 provides a second deduplication layer; if localStorage is cleared but indicator 48 is populated, the copy will not be re-triggered.
- **Field values showing `&amp;` or other HTML entities**: This was a double-encoding bug fixed in v11. Confirm you are running v11+ JS and not a cached v10 file.
- **Stale filter state after upgrade from v11**: The filter state key changed to `pm_filter_state_v12`. Old `pm_filter_state_v11` keys are inert. Clear with `localStorage.removeItem('pm_filter_state_v11')` or `localStorage.clear()`.
- **Tour auto-starts every page load**: The tour is suppressed after first completion by `pm_tour_seen_v1` in localStorage. If it keeps re-appearing, check that localStorage is writable. Clear the key manually with `localStorage.removeItem('pm_tour_seen_v1')` to force a replay.
- **Feedback widget submission fails**: The widget requires a valid CSRF token and network access to `/platform/projects/api/form/new`. Check console errors. The status message will display "Submission failed. Please try again." on error.
- **Inbox badge not updating**: `fetchAndRenderInboxCount()` runs once on page load. It reads portal URLs from `api/site/settings/sitemap_json`. If the sitemap request fails, it falls back to the current origin. If the badge always shows 0, check the browser console for network errors on the sitemap or form query requests.
- **`+ Recurring Task` opens a blank or non-recurring form**: Ensure `START_RECURRING_TASK_URL` is correctly constructed from `START_TASK_URL`. If the iframe injection fails (radio button not found after 20 attempts), a warning is logged to the console. The LEAF form must have indicator 45 as a Yes/No radio for the injection to work.

---

## 24) Accessibility Architecture (v11)

v11 completed a comprehensive accessibility audit pass. The following summarizes the design decisions and implementation patterns established and carried forward in v12.

### Keyboard Focus Rings

The v10 CSS contained `.pm-input:focus { outline: none; box-shadow: none; }` which silently suppressed focus outlines on all input elements. This rule was removed in v11. Focus styles are now governed by the existing `.pm-input:focus-visible` rule, which preserves the ring only during keyboard navigation.

### Heading Hierarchy

- **Page title**: `<h1 class="pm-title">` added in v12, wrapping "LEAF Project Dashboard" in the `.pm-header` block.
- **Tab panel headings**: `<h2 class="pm-subtitle">` for Projects, Tasks, and Analytics sections (v12).
- **Analytics tab**: All chart and table title elements are `<h3 class="pm-chartTitle">`.
- **Modals**: `#pmModalTitle` and `#pmOtherModalTitle` are `<h2>` elements.
- **Feedback modal title** (`#pmFeedbackModalTitle`) is an `<h2>` (v12).

### ARIA on Interactive Components

#### Multi-select Filters (`createMultiSelect`)

Toggle `id` is set to `container.id + "Toggle"`. Toggle `aria-haspopup` is `"listbox"`. Per-filter search `aria-label` uses a `labelMap` to produce human-readable names (e.g., `"Search Project options"`).

#### OKR Index Items

OKR index items (`.pm-okrIndexItem`) are rendered with `role="button"` and `tabindex="0"`. A `keydown` handler activates the item on Enter or Space.

#### Recurring Task Banner (`showRecurringBanner`)

The banner element receives `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` before its text content is set.

#### Inbox Badge

The `aria-label` on `#pmInboxBadge` is set dynamically: `"{n} inbox item(s)"` when visible, `"No inbox items"` when hidden.

### Toggle Switch (Dev Mode) — `.pm-switchInput`

The visually-hidden checkbox backing the Dev Mode toggle uses the standard sr-only pattern: `position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0);` etc.

### Decorative Content Suppression

CSS `content` properties use the `/ ""` alternative text syntax to suppress decorative characters from screen readers:

```css
.pm-addBtn::after { content: "▾" / ""; }
.pm-multiSelectToggle::after { content: "▾" / ""; }
[data-action="recurringTask"]::before { content: "↺ " / ""; }
```

### Tour Overlay ARIA Scope

`role="dialog"`, `aria-modal="true"`, and `aria-labelledby="pmTourTitle"` are correctly scoped to the inner `#pmTourTooltip` element only, not the full-screen backdrop `#pmTourOverlay`. Focus is trapped within the tooltip via `trapFocus` while the tour is active.

### Z-Index Documentation

```
/* Z-INDEX SCALE
 * 1000  — popovers, add menu
 * 1200  — floating table overlays, jump-to-top
 * 1300  — feedback modal          ← new in v12
 * 9999  — banners (recurring, transfer debug)
 * 10000 — tour overlay backdrop
 * 10001 — tour spotlight
 * 10002 — tour tooltip, help tooltip
 */
```

---

## 25) Interactive Onboarding Tour (v12)

A step-by-step guided tour that introduces new users to the dashboard's key features.

### Behavior

- **Auto-start**: On the first page load (no `pm_tour_seen_v1` key in localStorage), the tour starts automatically after a 1.2-second delay.
- **Replay**: The `#pmTourBtn` (tour icon) in the actions row replays the tour on demand at any time.
- **Completion**: When the user clicks "Finish ✓" on the last step, or clicks "Skip tour", `pm_tour_seen_v1 = '1'` is written to localStorage and the tour does not auto-start again.

### Tour Steps

| Step | Title | Target element |
| ---- | ----- | -------------- |
| 0 | Welcome to the LEAF Project Dashboard | None (centered) |
| 1 | Add Menu | `#pmAddMenuBtn` |
| 2 | View Inbox | `#pmViewInboxBtn` |
| 3 | Projects Tab | `[data-tab="projects"]` |
| 4 | Tasks Tab | `[data-tab="tasks"]` |
| 5 | Other Views: Kanban & Gantt | `.pm-viewRow` |
| 6 | Analytics Tab | `[data-tab="analytics"]` |
| 7 | Filter Bar | `.pm-filterRow` |
| 8 | You're all set! | None (centered) |

Steps with no target render a centered tooltip with no spotlight. Steps with a target render a spotlight cutout highlighting the target element.

### Keyboard Navigation

| Key | Action |
| --- | ------ |
| **→ Arrow Right** | Advance to next step |
| **← Arrow Left** | Go back one step |
| **Escape** | End tour |
| **Tab / Shift+Tab** | Cycle focus within the tooltip (trapped) |

### HTML Structure

```html
<div id="pmTourOverlay" class="pm-tourOverlay" hidden>
  <div id="pmTourSpotlight" class="pm-tourSpotlight"></div>
  <div id="pmTourTooltip" class="pm-tourTooltip" role="dialog"
    aria-modal="true" aria-labelledby="pmTourTitle">
    <div id="pmTourStepLabel" class="pm-tourStepLabel" aria-live="polite"></div>
    <div id="pmTourTitle" class="pm-tourTitle"></div>
    <div id="pmTourBody" class="pm-tourBody"></div>
    <div class="pm-tourFooter">
      <button type="button" class="pm-tourSkip" id="pmTourSkip">Skip tour</button>
      <div class="pm-tourNav">
        <button type="button" class="pm-tourBack" id="pmTourBack">← Back</button>
        <button type="button" class="pm-tourNext" id="pmTourNext">Next →</button>
      </div>
    </div>
  </div>
</div>
```

### Spotlight Mechanism

The spotlight is a `position: fixed` element with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` creating a cutout effect. Its `top`, `left`, `width`, and `height` are set to match the bounding rect of the target element (plus 8px padding on each side). Transitions are CSS-animated for smooth movement between steps.

### Tooltip Positioning Logic

`positionTooltip(rect)` places the tooltip below the target if space allows, above it if not, or to the right if neither fits. The tooltip is clamped to a 16px margin from all viewport edges.

### CSS Summary

```css
.pm-tourOverlay   /* fixed inset:0 backdrop; pointer-events:none when hidden */
.pm-tourSpotlight /* fixed element, box-shadow cutout, transitions position */
.pm-tourTooltip   /* fixed white card, 300px wide, z-index 10002 */
.pm-tourStepLabel /* step counter, accent color, uppercase small caps */
.pm-tourTitle     /* step heading, 15px/800 */
.pm-tourBody      /* step description, 13px */
.pm-tourFooter    /* space-between row: skip left, nav right */
.pm-tourBack      /* ghost button */
.pm-tourNext      /* accent-filled button; "Finish ✓" on last step */
.pm-tourSkip      /* borderless muted text button */
.pm-tourWelcome   /* centered override for steps with no spotlight */
```

### Reproducing in Another Site

1. Add the tour HTML structure above to your page (outside all tabs).
2. Add a `#pmTourBtn` in your header with `aria-label` and `data-tooltip`.
3. Define your `steps` array with `{ title, body, target }` objects. Use `target: null` for centered steps.
4. Implement `initTour()` with `startTour`, `endTour`, `showStep`, and `trapFocus` as shown.
5. Add the `pm-tour*` CSS classes.
6. Store `pm_tour_seen_v1` in localStorage on completion to prevent auto-re-trigger.

---

## 26) Feedback Widget (v12)

A fixed button in the bottom-left corner that allows team members to submit freeform feedback directly to a LEAF form without leaving the dashboard.

### Behavior

- A fixed `#pmFeedbackBtn` button (bottom-left, z-index 1300) shows a `add_reaction` Material Icon.
- Clicking opens `#pmFeedbackModal` (a `role="dialog"`) and focuses the textarea.
- Clicking outside the modal (or pressing Escape) closes it and clears the textarea.
- On submit, the widget:
  1. Creates a new LEAF record via `POST /platform/projects/api/form/new` (form `numform_1c5b6`).
  2. Writes the feedback text to `indicatorID 50` on the new record.
  3. Submits the record to workflow `stepID 13`.
  4. Shows "Thank you for your feedback!" in the status span and auto-closes after 2 seconds.
- All three API calls use the CSRF token cascade from Section 16.

### HTML Structure

```html
<!-- Trigger button -->
<button
  type="button"
  class="pm-feedbackBtn"
  id="pmFeedbackBtn"
  aria-label="Submit feedback"
  aria-haspopup="dialog"
  data-tooltip="Submit your feedback"
>
  <span class="material-icons" aria-hidden="true">add_reaction</span>
</button>

<!-- Dialog -->
<div
  id="pmFeedbackModal"
  class="pm-feedbackModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="pmFeedbackModalTitle"
  hidden
>
  <div class="pm-feedbackInner">
    <div class="pm-feedbackHeader">
      <h2 class="pm-feedbackTitle" id="pmFeedbackModalTitle">
        Submit your feedback for the LEAF Project Dashboard
      </h2>
      <button type="button" class="pm-feedbackClose" id="pmFeedbackClose" aria-label="Close feedback">✕</button>
    </div>
    <textarea id="pmFeedbackText" class="pm-feedbackTextarea"
      placeholder="Share your thoughts..." rows="5" aria-label="Your feedback"></textarea>
    <div class="pm-feedbackFooter">
      <span class="pm-feedbackStatus" id="pmFeedbackStatus"
        role="status" aria-live="polite" aria-atomic="true"></span>
      <button type="button" class="pm-primaryBtn" id="pmFeedbackSubmit">Submit</button>
    </div>
  </div>
</div>
```

### Required LEAF Form Setup

- A LEAF form with ID `1c5b6` must exist with:
  - `indicatorID 50` — text field for feedback content.
  - Workflow step `13` as the submission step.
- The form does not need to be publicly accessible; submissions are made via the API.

### CSS

```css
.pm-feedbackBtn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 1200;    /* elevated to 1300 by z-index scale comment */
}
.pm-feedbackModal {
  position: fixed;
  bottom: 80px;
  left: 24px;
  z-index: 1300;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  width: 340px;
}
```

---

## 27) Recurring Task Add Menu Integration (v12)

The `+ Recurring Task` menu item provides a one-click shortcut to create a task pre-configured as recurring, without requiring the user to manually check the `isRecurring` field.

### URL Pre-Population

`START_RECURRING_TASK_URL` is constructed by appending `&i_{RECURRING_INDICATOR_ID}=Yes` to `START_TASK_URL`. This causes LEAF to pre-check indicator 45 = "Yes" when the form loads.

### Field Hiding (Post-Load Callback)

Because the `isRecurring` field should be invisible to users (it is a dashboard-managed field), the Recurring Task action passes a post-load callback to `openModal`:

```js
openModal("New Recurring Task", START_RECURRING_TASK_URL, function(frame) {
  // Polls the iframe DOM up to 20 times (× 250ms) for the radio button
  // Checks the "Yes" radio for indicator 45
  // Hides the field wrapper from the user
});
```

The callback polls using `setTimeout` + a retry counter (max 20 attempts × 250ms = 5 seconds). If the radio is not found after all attempts, a console warning is emitted but no error is shown to the user. The `iCheck` API is used if available in the iframe's jQuery environment.

### `wireRecurringFieldHider()`

A separate `MutationObserver` runs on `document.body` for the lifetime of the page. It hides `.sublabel.blockIndicator_{RECURRING_INDICATOR_ID}` and `.response.blockIndicator_{RECURRING_INDICATOR_ID}` whenever LEAF re-renders the form inside an iframe. This prevents the field from reappearing after LEAF's own rendering cycles.

### Inbox Count Fetching (`fetchAndRenderInboxCount`)

Runs once on `main()` initialization. It:

1. Fetches `api/site/settings/sitemap_json` to discover all portal base URLs from the sitemap's `buttons[].target` array.
2. Falls back to the current page's origin if the sitemap parse fails.
3. Queries `{portalUrl}/api/form/query` in parallel across all portals for records where `stepID = actionable` and `deleted = 0`, requesting up to 500 results filtered to `recordID` only.
4. Sums the result counts across all portals.
5. Updates `#pmInboxBadge`: shows the count (or "99+" if over 99), sets `aria-label`, and toggles `hidden`.

### Add Menu Tooltip (`.pm-menuItemTip`)

The `+ Recurring Task` item includes a CSS-only tooltip rendered via `::after` using `content: attr(data-tooltip)`. It appears to the right of the menu item on hover or focus-visible, at z-index 10001. The tooltip text explains the recurring task feature in plain language.
