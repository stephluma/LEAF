# LEAF Form Library — Technical Build Document

**Page:** Form Library (Read-Only Preview)
**File:** `form_library.html`
**Platform:** LEAF Launchpad (`leaf.va.gov`)

---

## Overview

The Form Library is a read-only, filterable, searchable interface that surfaces published LEAF forms from the central form library API. It is embedded within the LEAF Launchpad shell and is intended for end users and site administrators to browse and preview forms before importing them into their own LEAF site.

---

## Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| `launchpad.css` | `/platform/designs/files/launchpad.css` | Design system tokens and base styles |
| `leaf_nav.js` | `/platform/designs/files/leaf_nav.js` | Platform navigation injection |
| `leaf_breadcrumb.js` | `/platform/designs/files/leaf_breadcrumb.js` | Breadcrumb rendering |
| `DOMPurify` | `https://leaf.va.gov/app/libs/js/dompurify/dompurify.min.js` | XSS sanitization |
| `LeafPreview.js` | `https://leaf.va.gov/platform/designs/js/LeafPreview.js` | In-dialog form preview renderer |
| `Public Sans` | Google Fonts | Headings, UI labels |
| `Source Sans 3` | Google Fonts | Body / filter button text |
| `Material Symbols Outlined` | Google Fonts | Icon font (filled variant forced via `font-variation-settings`) |

> **TODO:** Verify all local asset paths (`launchpad.css`, `leaf_nav.js`, `leaf_breadcrumb.js`) before production deployment.

---

## Page Structure

```
.lp#lp-root
├── Skip link
├── #lp-nav-host           ← Populated by leaf_nav.js
└── main#lp-main
    └── .lfl-page
        ├── .lfl-topbar    ← Title + "Contribute My Form" CTA
        ├── .lfl-info-note ← Read-only advisory banner
        ├── #lfl-progressArea ← Loading progress bar (hidden by default)
        └── .lfl-body
            ├── nav.lfl-sidebar   ← Business line filter buttons
            └── .lfl-content
                ├── #searchContainer  ← LeafFormSearch widget
                └── .lfl-grid-card
                    └── #forms        ← LeafFormGrid render target
```

---

## JavaScript Architecture

### Constants

```js
LF_BASE        // 'https://leaf.va.gov'
LF_LIBRARY_URL // LF_BASE + '/LEAF/library/'
LF_ICONS       // LF_BASE + '/app/libs/dynicons/svg/'
LF_PLATFORM    // LF_BASE + '/platform/'
```

### State Variables

| Variable | Type | Description |
|---|---|---|
| `query` | `LeafFormQuery` | Active query instance |
| `grid` | `LeafFormGrid` | Grid render instance |
| `preview` | `LeafPreview` | Form preview renderer |
| `data` | `Object` | Raw API response cache |
| `dialog_simple` | `dialogController` | jQuery UI dialog wrapper |
| `currentFilter` | `string` | Tracks active business line filter |

---

## Core Functions

### `main()`
Entry point called on `$(document).ready()`. Orchestrates dialog setup, filter population, query initialization, search widget init, and initial data load.

### `getBusLineOptions()`
Fetches indicator metadata from `api/form/indicator/list`, finds indicator ID `3` (Business Line), and returns a sorted, filtered list of options (excluding blank and "Other" entries).

### `addBusLineFilters(options)`
Dynamically builds sidebar filter `<button>` elements for each business line. Cycles through a predefined icon set. Normalizes "Clinic Profile…" variants to a consistent label. Attaches `applyFilter()` on click.

### `applyFilter(search, btnEl)`
Guards against redundant re-filters via `currentFilter`. Toggles `active` / `aria-pressed` state on sidebar buttons. Announces the active filter to screen readers via `#filterStatus` (assertive live region). Updates the query's `data term` for indicator `3` with a `LIKE *value*` match and re-executes.

### `buildGrid(res)`
Receives raw API response, sorts featured forms (indicator `53 = "Yes"`) to the top, then instantiates `LeafFormGrid` in read-only mode with five columns:

| Column | Source | Notes |
|---|---|---|
| Form | `title` | Bold; featured rows get `.lfl-featured-row` highlight |
| Description | Indicator `5` | Sortable |
| Author(s) | Indicators `9`, `10` | Concatenated |
| Workflow Example | Indicator `6` | Thumbnail image; click opens full-size dialog |
| Preview | — | Button; triggers `showPreview()` |

Post-render removes left/right `td` borders for a clean table appearance.

### `showPreview(recordID)`
Pulls form metadata from the grid, builds author string from indicators `9`/`10`/`11`, populates the dialog, and loads a `LeafPreview` instance targeting the `#preview` div.

### `buildDialog()`
Injects a hidden dialog DOM structure and returns a `dialogController` instance. The jQuery UI dialog is configured at 600px wide, capped at 75% viewport height.

---

## Data Query

### Initial Load

```js
query.importQuery({
  terms: [
    { id: 'categoryID',   operator: '=',  match: 'form_68aa4' },
    { id: 'dependencyID', indicatorID: '9', operator: '=', match: '1' },
    { id: 'deleted',      operator: '=',  match: 0 }
  ],
  getData: ['3','5','4','1','9','10','11','6','53']
});
```

### Search Override
On search, `query.clearTerms()` is called, the base query is re-imported, and an additional `LIKE *term*` data term is added against indicator `0` (title).

### Filter Override
Business line filtering appends a `LIKE *value*` data term against indicator `3` without clearing the base terms.

---

## Progress Bar

Shown during any query execution (`showProgress()`). Updated via `query.onProgress(loaded)`. Includes:
- `aria-live="polite"` container
- `role="progressbar"` with `aria-valuenow` updated dynamically
- Hides automatically once `buildGrid()` runs (`hideProgress()`)

---

## Accessibility

- Skip link to `#lp-main`
- Sidebar uses `<nav aria-label="Filter forms by business line">`
- Filter buttons use `aria-pressed` (true/false toggle)
- `#filterStatus` is an `aria-live="assertive"` region announcing active filter changes
- Progress bar has `aria-label`, `aria-valuemin/max/now`
- Workflow image thumbnails carry descriptive `alt` text
- Preview buttons carry `aria-label` with form title
- Info banner uses `role="note"`
- `prefers-reduced-motion` disables all CSS transitions

---

## Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| `> 768px` | Sidebar fixed at `220px`, sticky at `top: 80px` |
| `≤ 768px` | Sidebar becomes horizontal scrolling pill row; icons hidden; labels only |
| `≤ 500px` | Page padding reduced |

---

## Back-to-Top Button (`#lpJump`)

Appears after 120px scroll. Managed via a scroll/resize listener. Uses `window.scrollTo({ behavior: 'smooth' })`. Properly hidden from assistive technology when not visible (`aria-hidden`, `tabindex="-1"`).

---

## Breadcrumb

Set via `window.LEAF_BREADCRUMB` before `leaf_breadcrumb.js` loads:

```js
window.LEAF_BREADCRUMB = [
  { label: 'Solutions', href: '/platform/designs' },
  { label: 'Form Library' }
];
```

---

## Pre-Production Checklist

- [ ] Verify `/platform/designs/files/launchpad.css`
- [ ] Verify `/platform/designs/files/leaf_nav.js`
- [ ] Verify `/platform/designs/files/leaf_breadcrumb.js`
- [ ] Verify DOMPurify path on `leaf.va.gov`
- [ ] Verify `LeafPreview.js` path on `leaf.va.gov`
- [ ] Confirm `form_68aa4` category ID is correct for target environment
- [ ] Confirm indicator IDs (`3`, `5`, `6`, `9`, `10`, `11`, `53`) match target library schema
