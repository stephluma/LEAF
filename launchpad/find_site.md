# Find LEAF Site — Technical Build Document

## Overview

**Component:** `Find LEAF Site`
**Purpose:** Allows users to discover active LEAF sites across the VA network by searching via Station Number, VISN, or State. Results display site details and available forms in a split-panel UI.

---

## File Dependencies

| File | Role |
|---|---|
| `/platform/designs/files/smarty_styles.css` | Platform-level design tokens and base styles |
| `../libs/js/LEAF/intervalQueue.js` | Concurrent async job queue utility |
| `./files/visnFacilityHelper.js` | VA facility/VISN/state lookup helper |

> **Note:** `LeafFormQuery` is expected to be available globally via the LEAF platform environment.

---

## Architecture

The component is a self-contained IIFE (Immediately Invoked Function Expression) with three main layers:

1. **State Management** — module-scoped variables track loaded sites, failed sites, the active selection, and the current query string.
2. **Data Layer** — three parallel async data sources per site (activity check, settings, admin, forms).
3. **UI Layer** — a collapsible search panel, a progress bar, and a split list/detail panel; all driven by jQuery DOM manipulation.

---

## State Variables

| Variable | Type | Description |
|---|---|---|
| `siteData` | Object | Keyed by site URL; stores label, admin, forms, and load flags |
| `failedSites` | Array | URLs of sites that errored during the queue |
| `totalSites` | Number | Total sites dispatched to the queue |
| `activeSiteURL` | String / null | Currently selected site URL |
| `staticStates` | String | Cached HTML string for the state `<select>` default options |
| `currentQuery` | String | Human-readable summary of the last executed search |

---

## Core Functions

### Search & Query

#### `findSite()`
Reads the three filter inputs (Station Number, VISN, State) and builds a `LeafFormQuery` with the appropriate data terms, then calls `loadSites()` with the results.

**Query logic:**
- Station Number → matches field IDs `26` OR `376`
- VISN + State → matches field `2` (VISN label) AND field `37` (state)
- VISN only → matches field `2`
- State only → matches field `37`

All queries filter for `stepID = 64`, `deleted = 0`, and `data[36] = "No"`.

#### `buildQuerySummary()`
Returns a short human-readable string of the active search (e.g., `"Station 612"`, `"VISN 8 · Florida"`) used in the collapsed search toggle bar.

---

### Site Loading Pipeline

#### `loadSites(sites)`
Entry point for rendering results. Resets state, then feeds all site keys into an `intervalQueue` with a concurrency of `5`.

Each queue worker runs the following pipeline:

```
checkActive(siteURL)
  └── GET /api/telemetry/simple/requests?startTime=...&endTime=...
        (filters for at least 1 record in the last 30 days)
  └── if active:
        GET /api/system/settings       → site label/heading
        ├── GET /api/formStack/categoryList/all  → visible, enabled forms
        └── fetch /api/system/primaryadmin       → admin email
```

Both the forms and admin requests run in parallel via `Promise.all`.

#### `checkActive(siteURL)`
Queries the telemetry API for the past 30 days. Sites with zero records are silently skipped.

#### `finalizeResults()`
Runs after the queue completes. Sorts site rows alphabetically, updates the meta bar with the count of active sites, and collapses the search panel.

---

### UI Rendering

#### `insertRow(siteURL, label)`
Appends a `<button>` row to `#lf-sitelist` with a click handler bound to `selectSite()`.

#### `selectSite(siteURL)`
Updates the active row's visual state (`is-active`, `aria-pressed`) and triggers `renderDetail()`.

#### `renderDetail(siteURL)`
Builds and injects the detail panel HTML for the selected site. Handles three states for both admin and forms data: loading, loaded with data, loaded with no data.

#### `showPrompt()`
Renders the default empty-state message in the detail panel.

#### `setProgress(loaded, total)`
Updates the progress bar fill width and counters during queue execution.

#### `collapseSearch(summary)` / `expandSearch()`
Toggles the `is-collapsed` class on `#lf-searchPanel` and updates `aria-expanded` on the toggle button.

---

### Facility Dropdowns

#### `getVisnFacilities(facilityHelper, isState)`
Populates the `#lf-facility` dropdown (and conditionally `#lf-state`) based on the selected VISN or state. Filters to `VA Medical Center (VAMC)` class only.

If the **Show VISN Offices** checkbox is checked, additionally calls `getVisnData()` to pull non-standard facility codes from the LEAF query API and merges them into the facility list.

#### `getVisnData(state, visn, isState)`
Returns a Promise that resolves with raw LEAF query results for a given VISN/state context, used to supplement the `VAFacilityHelper` data with VISN office records.

---

## HTML Structure

```
.lp-scope.leaf-find
└── .lf-container
    ├── .lf-header               (title, subtitle, disclaimer)
    └── .lf-card
        ├── button#lf-searchToggle   (collapsible search bar)
        ├── #lf-searchPanel          (search form: VISN, State, Facility, Station Number)
        ├── #lf-noticeArea           (no results warning)
        ├── #lf-progressArea         (progress bar during queue)
        └── #lf-resultsArea
            ├── .lf-meta-bar         (result count + error notice)
            └── .lf-split
                ├── .lf-sitelist-wrap → #lf-sitelist   (left: site rows)
                └── .lf-detail-wrap  → #lf-detail      (right: site details + forms)
```

---

## Styling Notes

- All colors reference CSS custom properties (`var(--lp-*)`) defined in `smarty_styles.css`, enabling light/dark theme compatibility.
- The search panel collapse uses `max-height` + `opacity` CSS transitions for smooth animation.
- `@media (prefers-reduced-motion: reduce)` disables all transitions for accessibility.
- The split panel uses `calc(100vh - 280px)` with a `min-height: 380px` floor to fill available viewport height.

---

## Accessibility

| Feature | Implementation |
|---|---|
| Search toggle | `aria-expanded`, `aria-controls` |
| Site list | `role="listbox"`, `aria-orientation="vertical"` |
| Site rows | `aria-pressed`, `aria-label` per row |
| Detail panel | `role="region"`, `aria-live="polite"` |
| Admin/forms loading | `aria-live="polite"` on updating elements |
| Focus styles | `focus-visible` outlines on all interactive elements |
| Reduced motion | Transitions disabled via media query |

---

## Data Field ID Reference

| Field ID | Meaning |
|---|---|
| `2` | VISN label (e.g., `"VISN 8"`) |
| `3` | Site/facility name |
| `21` | Site name (path segment) |
| `22` | Root URL (path segment) |
| `26` | Primary station number |
| `36` | Decommissioned flag (`"No"` = active) |
| `37` | State |
| `376` | Alternate station number |
