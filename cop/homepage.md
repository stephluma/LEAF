# CoP Homepage — Technical Build Document

## Overview

The **Community of Practice (CoP) Homepage** is a scoped landing page built within the VA LEAF (Lean Electronic Application Framework) platform. It surfaces upcoming Open Office Hours session details, navigation resources, and a personalized feedback history for authenticated users.

---

## Dependencies

| Dependency | Version | Source |
|---|---|---|
| Bootstrap CSS & JS | 5.0.0-beta3 | cdn.jsdelivr.net |
| jQuery UI (custom) | — | `../libs/js/jquery/jquery-ui.custom.min.js` (local) |
| Google Fonts — Source Sans 3 | — | fonts.googleapis.com |
| Google Material Symbols Outlined | — | fonts.googleapis.com |
| Smarty styles | — | `/path/to/smarty_styles.css` (platform-level) |
| LEAF platform libraries | — | `LeafFormQuery`, `LeafFormSearch`, `LeafFormGrid` (platform globals) |

> **Note:** Bootstrap is loaded solely for the Offcanvas component. The platform's Smarty stylesheet (`smarty_styles.css`) handles base design tokens. Bootstrap's full CSS is also loaded but scoped by `.cop-page` class overrides to avoid conflicts.

---

## CSS Architecture

### Scoping Strategy

All custom styles are scoped under `.cop-page` to prevent bleed into the surrounding Smarty/platform shell. The page also uses `.lp-scope` for design token inheritance.

### CSS Custom Properties (Design Tokens)

| Variable | Fallback | Usage |
|---|---|---|
| `--lp-bg` | `#f3f3f3` | Page background |
| `--lp-text` | `#0f172a` | Body text |
| `--lp-accent` | `#005ea2` | VA blue — borders, headings, focus rings |
| `--lp-muted` | `#475569` | Secondary text (subtitles, offcanvas headings) |
| `--lp-radius` | `14px` | Card border radius |
| `--lp-shadow` | `0 10px 30px rgba(15,23,42,0.08)` | Card drop shadow |

### Key Component Classes

- **`.cop-hero`** — Centered header with the VA LEAF SVG logo and page title.
- **`.cop-card`** — Primary content card displaying session details and the Teams join button. Max-width 800px, centered.
- **`.cop-footer-actions`** — Responsive flex strip of four soft-blue navigation buttons below the card. Wraps to full-width on mobile (`max-width: 640px`).
- **`.cop-history-wrap`** — Container for the feedback history toggle and search table.
- **`.btn-soft`** — Soft blue button variant (`#d9e8f6` background) used for the four nav links.
- **`.btn-outline-va`** — Transparent/outlined VA-blue button for the "View Your Feedback History" toggle.
- **`.cop-skip-link`** — Visually hidden skip navigation link, revealed on `:focus` via `translateY` transition. Respects `prefers-reduced-motion`.
- **`.status-not-submitted`** — Red (`#b50909`) WCAG AA-compliant status label.

### Responsive Behavior

- Footer buttons collapse to `flex: 1 1 100%` (full width, stacked) below `640px`.
- Card action buttons go full-width on mobile.
- Hero logo scales with `max-width: 100%`.

---

## HTML Structure

```
.cop-page
├── .cop-skip-link              (accessibility skip nav)
├── <header>.cop-hero           (logo + page title)
└── <main>#main-content
    ├── .cop-card               (session details card)
    │   ├── #upcoming_details   (dynamic When/What content)
    │   └── .cop-card-actions   (Teams join button)
    ├── <nav>.cop-footer-actions (4 soft-blue nav buttons)
    ├── #content_welcome        (feedback history toggle button)
    ├── #results_user_requests  (hidden feedback grid panel)
    │   └── #searchContainer    (LeafFormSearch mount point)
    └── #offcanvas_help         (Bootstrap offcanvas — resources panel)
```

---

## JavaScript

### 1. Session Details Loader (`main` — DOMContentLoaded)

Fetches the upcoming session's **When** and **What** content from a LEAF form record and injects it into the card.

**Key details:**
- Uses `LeafFormQuery` to query category `form_605bd`, filtering out deleted records.
- Retrieves indicator IDs `16` (When) and `17` (What).
- Sorts by `recordID` and takes the first result (`data[4]`).
- Strips consecutive `<br>` tags from the "What" field before rendering.
- `CSRFToken` is injected via Smarty template variable at page load.

```js
const idWhen = "16";
const idWhat = "17";
```

---

### 2. Feedback History (`runQuery` + `renderResult`)

Loads and displays the authenticated user's submitted feedback records using LEAF platform search/grid components.

#### Query Setup (`runQuery`)

- Filters by `userID` (Smarty-injected: `<!--{$userID}-->`).
- Uses `LeafFormSearch` mounted to `#searchContainer`.
- Batch loads 50 records at a time (`batchSize = 50`).
- Supports incremental loading via a "Get More Results" button.
- An `AbortController` allows the user to stop an in-progress extended search.

#### Extended Query Logic

On the first run, if no records owned by the current user are found in the initial result set, a second query is automatically dispatched (`extendedQueryState = 1`) to ensure the user's own records are always surfaced.

#### Search Behavior (`setSearchFunc`)

Handles three input modes:

| Input Type | Behavior |
|---|---|
| Empty / blank | Queries `title LIKE *` (all records) |
| Numeric | Queries by exact `recordID` |
| Valid JSON | Parses as advanced search terms |
| Plain text | Queries `title LIKE *text*` |

Cancelled records (`deleted > 0`) are excluded by default unless the search explicitly targets `stepID = deleted`.

#### Grid Rendering (`renderResult`)

Uses `LeafFormGrid` (read-only) with three columns:

- **Date** — Formatted as `Mon DD` (year appended if different from current year). User's own rows are highlighted `#feffd1`.
- **Title** — Links to `index.php?a=printview&recordID=`. Emergency priority records (`priority == -10`) display a red label.
- **Status** — Derives display text from `stepID`, `submitted`, `lastStatus`, and `deleted` fields. Covers states: Not Submitted, Pending Re-submission, waiting on a step, or a resolved last status.

#### Admin vs. Non-Admin Filtering (Smarty-gated)

```smarty
<!--{if !$is_admin}-->
  // non-admins only see their own unsubmitted records + all submitted records
<!--{else}-->
  // admins see all records
<!--{/if}-->
```

---

### 3. Toggle (`toggleRequestDisplay`)

Simple jQuery show/hide for `#results_user_requests`. Updates `aria-expanded` and button label text on each toggle.

---

## Accessibility

- **Skip link** — Keyboard-accessible, revealed on focus, targets `#main-content` (with `tabindex="-1"`).
- **ARIA landmarks** — `<header role="banner">`, `<main>`, `<nav aria-label="...">`, `<section aria-label="...">`.
- **ARIA attributes** — `aria-labelledby` on the card, `aria-expanded` on the history toggle, `aria-label` on all icon-only or ambiguous links/buttons, `aria-hidden="true"` on decorative SVG icons and the `<hr>`.
- **Focus management** — All interactive elements have a `3px solid #005ea2` focus ring via `:focus-visible` (4.5:1+ contrast). Bootstrap offcanvas traps focus correctly.
- **Color contrast** — Status red `#b50909` on white = 5.9:1 (WCAG AA). VA blue `#005ea2` on white = 4.5:1+.
- **Reduced motion** — `prefers-reduced-motion: reduce` disables the skip-link slide transition.

---

## Platform Integration Notes

- **Smarty template variables** injected at render time: `$CSRFToken`, `$userID`, `$app_js_path`, `$orgchartPath`, `$is_admin`.
- `LeafFormQuery`, `LeafFormSearch`, and `LeafFormGrid` are global classes provided by the LEAF platform — no import needed.
- The page is embedded inside the platform shell (not a standalone HTML document), so no `<html>`, `<head>`, or `<body>` tags are present.
- The logo asset is served from `https://leaf.va.gov/platform/CoP/files/`.
