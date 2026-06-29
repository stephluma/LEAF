# Technical Build Documentation
## LEAF Platform — Privacy Resources Page
`/platform/privacy/index.html`

---

## Overview

This page serves as the primary hub for VA Privacy Program resources within the LEAF platform. It documents recent platform enhancements, explains the LEAF Secure (LEAF-S) certification process, and surfaces links to external VA privacy tools. It is a standalone HTML page that relies on a shared stylesheet and makes two live API calls to populate dynamic content.

---

## File Structure

```
/platform/privacy/
├── index.html               # This file — all markup, styles, and scripts
└── api/
    └── form/
        └── query            # LEAF form query endpoint (relative, same origin)
```

**External dependencies:**

| Resource | Purpose |
|---|---|
| `fonts.googleapis.com` — Material Symbols Outlined | Icon font for external link icons |
| `fonts.googleapis.com` — Source Sans 3 | Body typeface |
| `/platform/designs/files/smarty_styles.css` | Shared LEAF design system stylesheet |

---

## Page Structure (HTML)

The page follows a single-column layout inside a `.wrap` container with three primary sections inside `<main>`:

```
<body.smarty.page-privacy>
 └── .wrap
      ├── .info-bar          # Reading time + "Important" tag
      └── <main#main-content>
           ├── .section
           │    ├── h1 — Page title
           │    ├── .lead — Intro paragraph
           │    ├── .section.recent-changes    # Dynamic API-driven section
           │    ├── .section[aria-labelledby=leaf-s-title]  # LEAF-S cards
           │    └── .section.section-lg        # VA Privacy Resource cards
           └── .callout       # Disclaimer note
```

**Back-to-top button** (`#backToTop`) is rendered outside `.wrap` and toggled by scroll position.

---

## Accessibility

- `<a class="skip-link" href="#main-content">` — keyboard skip navigation
- All `<section>` elements use `aria-labelledby` pointing to their heading IDs
- External links include `<span class="visually-hidden">(opens in a new tab)</span>`
- `<main>` has `tabindex="-1"` to receive programmatic focus on back-to-top
- Recent changes status uses `role="status"` and `aria-live="polite"` for screen reader announcements
- The scroll region (`.recent-changes-scroll`) is keyboard-focusable via `tabindex="0"`
- Back-to-top button manages `aria-hidden` and `tabindex` dynamically based on scroll position
- `<time>` elements include machine-readable `datetime` attributes (ISO 8601 format)

---

## JavaScript — Feature Breakdown

### 1. Recent Changes Feed

Populates the Recent Enhancements section by fetching live data from the LEAF form API.

**Flow:**

```
loadRecentChanges()
  ├── fetchPublishedRecordIDs()   # Filters to only "published" (stepID=20) records
  ├── fetch(buildRecentChangesQueryUrl())  # Pulls all non-deleted records with indicator data
  ├── Cross-references the two sets — only published records are shown
  ├── Maps records → normalized entry objects
  ├── Sorts descending by date
  └── renderRecentChanges()       # Writes DOM
```

**API Endpoints:**

| Endpoint | Purpose |
|---|---|
| `api/form/query` (relative) | Fetches record data including indicator values |
| `https://leaf.va.gov/platform/privacy/api/form/query/` | Fetches published record IDs (stepID = 20, not deleted) |

**Indicator IDs** (tied to a specific LEAF form — update if form changes):

| Field | Indicator ID |
|---|---|
| Release Date | `39` |
| Title | `40` |
| Summary | `41` |

**Key functions:**

`buildRecentChangesQueryUrl()` — Constructs the query JSON with `getData` for the three indicators, serialized and URL-encoded.

`getS1Value(record, indicatorId)` — Safely reads a value from the `s1` object using the key format `"id" + indicatorId`. Returns an empty string on missing/null values.

`parseDateValue(value)` — Defensive date parser that handles `Date` objects, Unix timestamps (seconds and milliseconds), numeric strings, and ISO strings. Returns `null` on failure.

`formatDisplayDate(date)` — Formats a `Date` to `"Jun 29, 2026"` style using `toLocaleDateString("en-US", …)`.

`renderMultilineText(container, text)` — Normalizes `<br>` tags and `\r\n` line endings, detects bullet (`- ` / `* `) or numbered (`1. `) list patterns, and builds either `<ul>`, `<ol>`, or plain `<p>` elements accordingly.

`buildListItem(entry)` — Constructs a single `<li>` with `<time>`, title `<p>`, and summary `<div>`.

`renderRecentChanges()` — Clears and rebuilds the list DOM. Respects the `RECENT_CHANGES_LIMIT` (5) for the collapsed state. Manages toggle button text and `aria-expanded`.

### 2. Show More / Show Fewer Toggle

The `#recentChangesToggle` button flips the `showAllChanges` boolean and calls `renderRecentChanges()`. The button is hidden entirely when the total record count is ≤ 5.

### 3. Back to Top

Listens on `window scroll`. Adds `.is-visible` class when `scrollY > 300`. On click, calls `window.scrollTo({ top: 0, behavior: 'instant' })` and moves focus to `#main-content`.

### 4. Estimated Reading Time

`updateReadingTime()` reads `innerText` from `#main-content`, splits on whitespace to count words, and calculates `Math.max(1, Math.round(wordCount / 200))` minutes. Called after `loadRecentChanges()` resolves so dynamic content is included in the count. Result is written to `#reading-time` in the info bar.

---

## Scoped CSS (Page-Level Styles)

All custom styles are scoped under `body.smarty.page-privacy` to prevent bleed into the shared stylesheet.

| Selector / Rule | Purpose |
|---|---|
| `.wrap` — `clamp(2rem, 8vw, 5rem)` padding | Fluid horizontal breathing room |
| `.subtitle` — `1.5rem`, increased top padding | Distinguishes h2 visually from h3 card titles |
| `.btn` / `.btn-ghost` — hover/active transitions | 0.12s ease on background, border, shadow, and `translateY(-1px)` lift |
| `#resources-title ~ .grid .card` — flex column | Stretches resource cards so action buttons align at the same bottom line |
| `.recent-changes-scroll` — `max-height: none` | Overrides any base stylesheet scroll container; the section expands naturally |
| `hr.divider` — 1px border-top | Thin separator inside the LEAF-S "How to get started" card |
| `.recent-change-date` — italic, muted, small | Visual hierarchy for timestamps in the changes list |
| `.btn:focus-visible` — 3px outline + ring | Enhanced keyboard focus indicator meeting WCAG contrast requirements |

---

## Data Flow Diagram

```
Page Load
   │
   ├─► fetchPublishedRecordIDs()
   │       └─ GET leaf.va.gov/.../api/form/query (stepID=20, deleted=0)
   │           └─ returns Set<recordID>
   │
   ├─► fetch(buildRecentChangesQueryUrl())
   │       └─ GET api/form/query (deleted=0, getData=[39,40,41])
   │           └─ returns record array with s1 indicator values
   │
   └─ Promise.all resolves
        ├─ filter by publishedIDs
        ├─ map → { dateObject, displayDate, title, summary, sortValue }
        ├─ filter nulls (missing required fields)
        ├─ sort descending by sortValue
        ├─ renderRecentChanges() → DOM
        └─ updateReadingTime() → #reading-time
```

---

## Configuration Constants

| Constant | Value | Description |
|---|---|---|
| `RECENT_CHANGES_LIMIT` | `5` | Max items shown before "Show all" toggle appears |
| `RECENT_CHANGE_INDICATORS.changeDate` | `39` | LEAF form indicator ID for release date |
| `RECENT_CHANGE_INDICATORS.title` | `40` | LEAF form indicator ID for change title |
| `RECENT_CHANGE_INDICATORS.summary` | `41` | LEAF form indicator ID for change summary |

> **Note:** If the LEAF privacy form is rebuilt or indicators are remapped, update the three indicator IDs above. No other changes are required.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Published records fetch fails | Falls back to showing all non-deleted records (logged via `console.warn`) |
| Main changes fetch fails | Displays "Unable to load recent changes at this time." in the status region |
| Record missing date, title, or summary | Entry is silently filtered out (`null` returned from `.map()`) |
| Unparseable date value | `parseDateValue` returns `null`; record is excluded |
