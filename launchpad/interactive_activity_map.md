# VHA LEAF Activity Map — Technical Build Document

## Overview

The VHA LEAF Activity Map is a single-file, client-side HTML application that visualizes Veterans Health Administration (VHA) LEAF (Lean Enterprise Automation Framework) adoption and utilization data across VA VISN regions nationally. It provides interactive drill-down from the national level to individual facility stations, supports snapshot-based trend tracking, and generates exportable reports.

---

## Architecture

### Runtime Environment
- **Single-file HTML** — no build step, no framework, no bundler
- **Pure vanilla JavaScript (ES2020+)** — async/await, destructuring, arrow functions, template literals
- **External dependencies loaded via `<script>` tags:**
  - `visnFacilityHelper.js` — VA facility directory (hosted on `leaf.va.gov`)
  - `lz-string.min.js` — LZ-String compression library for telemetry decompression
- **Data source:** `leaf.va.gov/launchpad/files/leaf_national_telemetry.txt` — LZ-String base64-compressed JSON blob

### Layout Model
The UI is composed of four fixed layers:

| Layer | ID | Description |
|---|---|---|
| Brand bar | `#brand` | Fixed top nav, 46px tall |
| Toolbar | `#tb` | Search + chips, 56px, below brand |
| Body split | `#body` | Flex row: map (`#mw`) + detail panel (`#panel`) |
| Modals | `#rptOverlay`, `#trendOverlay`, `#ucOverlay` | Fixed full-screen overlays |

---

## Data Pipeline

### Boot Sequence
```
fetch(telemetry.txt)
  → JSON.parse → LZString.decompressFromBase64 → raw row array
  → buildData(fd)
      → buildDirectory()       // loads VAFacilityHelper, filters facilities
      → buildStableAdoption()  // computes 18-month adoption sets
      → aggregate(startDate)   // computes windowed stats
          → computeNonAdopters()   // station groups, adoption flags
          → computeDepthMetrics()  // peer median, VISN posture
          → renderLanding()        // paints national overview panel
```

### Data Structures

**`rawRows`** — flat array of telemetry records, each with:
- `site` — station code (e.g. `"523"`)
- `visn` — VISN label (e.g. `"VISN 10"`)
- `numRecords` — integer request count
- `submitted` — `Date` object
- `launchpadID` — unique portal identifier

**`stationGroups`** — derived array; each entry groups child sites under a parent station code + state key:
```js
{ key, parent, code, state, name, class, city, visn,
  children[], childCount, adopted, req, leafSites }
```

**`visnAdoption`** — per-VISN rollup:
```js
{ total, adopted, nonAdopted, lowActivity, totalReq, adoptedReq }
```

**`visnDepth`** — per-VISN utilization posture:
```js
{ rps, pctOfMedian, posture }
// posture ∈ ['above-median','near-median','sleeping','low-depth','no-data']
```

---

## Key Computed Metrics

### Adoption
A station group is considered **"on LEAF"** if any child site in its group has telemetry in the full 18-month window. Determined by `telemetryGroups` (a `Set` of `parentCode|state` keys).

### Peer Median (req/station)
The median of per-VISN `adoptedReq / adopted` values across all VISNs. Used as the national benchmark for utilization depth comparisons.

### Low-Activity Threshold
The 25th percentile of total requests across all adopted station groups, with a floor of 10. Recomputed on every time window change.

### Sleeping Giants
Adopted station groups that:
1. Fall at or below the low-activity threshold, **and**
2. Contain at least one "large" facility class (VA Medical Center, Vet Center, Domiciliary, etc.)

### Volume Opportunity
For each sleeping giant: `max(0, nationalMedianRps − group.req)`. Summed nationally and per-VISN.

---

## Time Window Filtering

The time window selector (`#windowSelect`) supports 4 options: 3, 6, 12, and 18 months. 

**What changes with the window:**
- Request volumes (`stationData`, `visnData`, `stateData`)
- Low-activity threshold and rankings
- Sleeping giant identification
- Peer median calculation

**What does NOT change:**
- Adoption status — always reflects the full 18-month file

Window changes trigger `applyWindowChange()` → `aggregate()` → `computeNonAdopters()` → re-render.

---

## Map Rendering

The SVG VISN map is fetched at runtime from `leaf.va.gov/launchpad/files/VISN%20Map.svg`. Path elements are identified by ID patterns:

- `VISN_\d+_States` / `VISN_\d+_State` — clickable region paths (`.zp` class)
- `VISN_\d+_Circle` — label circle elements (non-interactive, `aria-hidden`)

### Shading Modes (`shadeMode`)
| Value | Mode | Color Scale |
|---|---|---|
| `0` | None | Original SVG fill |
| `1` | Adoption rate | Red → Amber → Teal (0%–100%) |
| `2` | Utilization depth | Red → Amber → Violet (ranked relative) |

Color interpolation uses linear RGB blending between three stop points.

---

## Panel Rendering

The detail panel (`#panel`) renders three exclusive views:

| View | Element | Triggered by |
|---|---|---|
| Loading placeholder | `#pe` | Initial boot |
| National landing | `#landing` | Brand click / deselect |
| Detail view | `#pc` | VISN / state / facility click |

Rendering functions: `renderLanding()`, `renderVISN(vk)`, `renderState(abbr, fromVK)`, `renderFacility(code, fromVK, fromState)`

All detail views include breadcrumb navigation preserving the traversal path (National → VISN → State → Facility).

---

## Report Modal

Opened via `openReport(mode, presetVisn)`. Supports five report modes:

| Mode | Source Data | Key Sort |
|---|---|---|
| `sleeping` | `sleepingGiants` | Volume ascending |
| `low` | `lowActivityGroups` | Volume ascending |
| `gap` | `nonAdopters` | By VISN / state |
| `adopted` | Adopted `stationGroups` | State / name |
| `belowMedian` | `visnDepth` entries | Req/station ascending |

### Table Features
- Sortable columns (click header, toggles asc/desc)
- VISN grouping row when sorted by VISN
- Expandable child-site rows (inline sub-table)
- Filter dropdowns (VISN, state, facility type) + text search
- Export to CSV or clipboard copy

### Ranked Tab (`sleeping`, `low` only)
Visual bar chart list ranked by volume with tier labels (Silent / Very Low / Low / Moderate).

---

## Snapshot / Trends Module (`SNAP`)

An IIFE (`SNAP`) that manages point-in-time snapshots stored to the VA `map_data` platform API.

### Storage Schema
Each snapshot is a LEAF platform record with three indicators:

| Indicator ID | Field | Content |
|---|---|---|
| `F_MAIN` (2) | Main payload | LZ-String compressed JSON: national stats, per-VISN depth |
| `F_GIANTS` (3) | Giants list | LZ-String compressed JSON: sleeping giant records |
| `F_META` (4) | Metadata | Plain string: `date | label` |

### Snapshot Payload
```js
{
  date, label,
  nat: { groups, adopted, non, giants, thr, medianRps,
         visnsBelowMedian, requests },
  perVisn: { [visnNum]: { a, t, rps, pct } }
}
```

Snapshots always use the **full 18-month window** regardless of current UI filter selection.

### Diff Engine (`SNAP.diff(A, B)`)
Compares two snapshots and returns:
- `resolved` — sleeping giants present in A, absent in B (improved)
- `newGiants` — sleeping giants absent in A, present in B (regressed)
- `crossedAbove` — VISNs that moved from below to at/above peer median
- `crossedBelow` — VISNs that moved from at/above to below peer median

### Trend Chart
An inline SVG dual-axis line chart rendered from snapshot history, plotting sleeping giant count (left axis, violet) and peer median req/station (right axis, blue) over time.

---

## Use Case Module

Fetches active form categories from adopted LEAF sites in two phases:

**Phase 1 — Directory lookup:**
Queries LEAF launchpad API for records at workflow step 64 (active sites), collecting site root paths and slugs. Uses `form/query` with batch size of 500.

**Phase 2 — Form enumeration:**
For each discovered site path, fetches `api/formStack/categoryList/all` with concurrency of 5 parallel workers. Collects visible, non-disabled, active-workflow form categories.

Results are normalized (lowercased, suffix-stripped, stemmed), deduplicated, and grouped into predefined categories (Clinic Requests, Travel, Training, Equipment, etc.).

Cache is stored to the `map_data` platform (indicator ID 6 on `form_db2c5` form) as HTML-entity-encoded JSON, loaded on boot, and refreshable by admins.

---

## Search

A client-side fuzzy search index (`searchIdx`) is built after the facility directory loads. Indexed types: VISNs, states, and individual facilities. Scoring:

| Match type | Score |
|---|---|
| Exact term match | +10 |
| Term starts with query | +5 |
| Term contains query | +2 |

Results are grouped by type (VISNs → States → Facilities), capped at 3/4/6 respectively, and rendered in an ARIA `listbox` with keyboard navigation (arrow keys, Enter, Escape).

---

## Accessibility

- Skip link (`#panel` target)
- All interactive map paths: `role="button"`, `tabindex="0"`, `aria-label` with live data
- ARIA live regions: search results count (`#sr-live`), hint text (`#hint`), chip stats
- Modal focus trapping (`trapFocus` / `releaseTrap`) on all three overlays
- Sortable table headers with `aria-sort` attributes
- Report rows: `tabindex="0"` with keyboard Enter/Space handlers
- Collapsible sections: `aria-expanded` toggled on trigger elements

---

## Formatting Utilities

```js
fmt(n)   // Intl.NumberFormat en-US (e.g. 1,234)
fmtK(n)  // Compact: 1.2K / 3.4M
```

Color utility `colorForPct(pct)` and `barColor(pct)` map percentage values to the red → amber → green / threshold-based palette used throughout bars and stat values.

---

## External API Endpoints

| URL | Purpose |
|---|---|
| `leaf.va.gov/launchpad/files/leaf_national_telemetry.txt` | Compressed telemetry data |
| `leaf.va.gov/launchpad/files/VISN%20Map.svg` | VISN SVG map |
| `leaf.va.gov/launchpad/files/visnFacilityHelper.js` | Facility directory |
| `leaf.va.gov/launchpad/api/form/query` | Snapshot history & UC directory |
| `leaf.va.gov/platform/map_data/` | Snapshot storage (map_data platform) |
| `leaf.va.gov/{site}/api/formStack/categoryList/all` | Per-site form categories |
