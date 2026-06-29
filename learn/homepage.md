# LEAF Learning Center — Technical Build Document

## Overview

The LEAF Learning Center is a single-page HTML landing page serving as the primary training hub for LEAF (VA.gov platform) users. It surfaces three training pathways, displays a user's personal training request history pulled from two backend portals, and provides a support escalation entry point.

---

## File Structure

This is a self-contained single-file page (`index.html` / Smarty template). No external JS or CSS files are authored for this page — all styles and logic are inline.

---

## Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| `smarty_styles.css` | `/platform/designs/files/` | Platform base styles |
| Source Sans 3 | Google Fonts | Primary typeface |
| Material Symbols Outlined | Google Fonts | Icon set |
| `LeafFormQuery` | Platform JS (implicit) | API query wrapper |
| `LeafFormGrid` | Platform JS (implicit) | Data grid renderer |
| jQuery (`$`) | Platform JS (implicit) | DOM manipulation (grid utility) |
| Smarty templating | Server-side | Injects `currentUserID` at render time |

---

## Layout & Components

### 1. Page Shell
- Full-width `body` with a centered `.td-wrap` container (`max-width: 1100px`).
- Skip-to-content link (`.skip-link`) for keyboard/screen reader accessibility.
- Logo pulled from `leaf.va.gov` CDN, context-menu and drag disabled.

### 2. Training Card Grid (`.td-grid`)
Three equal-width cards in a CSS Grid (`repeat(3, 1fr)`, `gap: 24px`), each linking to an external LEAF portal page.

| Card | Icon | Header Color | Destination |
|---|---|---|---|
| Live Training | `calendar_month` | Sky (`#d9e8f6`) | `service_requests_launchpad` — form `form_a3df9` |
| Self-Paced Training | `play_circle` | Blue (`#aacdec`) | `learn` portal — form `form_488a8` |
| Help Library | `menu_book` | Teal (`#5dc0d1`) | `help_library` search report |

All external links open in a new tab with `rel="noopener noreferrer"` and descriptive `aria-label` attributes.

### 3. Training Requests Panel (`.td-requests`)
An accordion section (`<button>` toggle + `aria-expanded` / `aria-controls`) that queries and renders the current user's training request history.

- Default state: **expanded** (`aria-expanded="true"`).
- Toggle animates the chevron icon via CSS `transform: rotate(180deg)`.
- Grid renders into `#grid` via `LeafFormGrid`.
- A "Show More Records" button surfaces when results exceed 10.

### 4. Support Banner (`.td-support`)
A left-bordered callout (`border-left: 4px solid #005ea2`) with a CTA linking to the LEAF support request form (`form_ba7de`). Wraps to a stacked layout on mobile.

---

## JavaScript Logic

### Constants & Configuration

```js
const portal_service_requests_launchpad = 'service_requests_launchpad';
const portal_learn = 'learn';
const currentUserID = "<!--{$userID|unescape|escape:'quotes'}-->";  // Smarty-resolved
const maxInitial = 10;
```

### Query Filters

Two independent filter objects are defined for `LeafFormQuery`:

- **`requestFilter_launchpad`** — filters by `userID`, `deleted = 0`, and `categoryID = form_a3df9` (Training Registration only).
- **`requestFilter_learn`** — filters by `userID` and `deleted = 0` (all record types in the learn portal).

Both joins include `status`, `categoryName`, and `initiatorName`.

### Data Flow (`runQuery`)

```
Promise.all([launchpad query, learn query])
  → Merge results into resultSetWithResolved{}
  → Tag each record with a namespaced ID: "{recordID}_{portalName}"
  → Sort combined array by date descending
  → Slice first 10 records → render initial view
  → Show "Show More" button if total > 10
```

### Grid Rendering (`renderResult`)

Uses `LeafFormGrid` with three custom column callbacks:

- **Date** — Converts Unix timestamp to human-readable format (`Mon DD` or `Mon DD YYYY` for past years). Highlights rows owned by the current user with `#feffd1`.
- **Title** — Constructs a linked record title. Falls back to `"Training Registration"` or `"Self-Paced Training"` if the title is the generic `"Record"`. Determines portal URL from the namespaced record ID. Handles emergency priority styling.
- **Status** — Resolves workflow state: Not Submitted → Pending Re-submission → Waiting for [Step] → final status. Appends `", Cancelled"` for deleted records.

### Pagination

- Initial render shows up to `maxInitial` (10) records.
- "Show More" click calls `renderResult(resultSetWithResolved)` with the full dataset and hides the button.

---

## Accessibility

- **Skip link** targets `#main-content` with `tabindex="-1"`.
- Card grid uses `role="list"` / `role="listitem"` for semantic structure.
- All icon `<span>` elements carry `aria-hidden="true"`.
- All external CTAs have descriptive `aria-label` values noting new-tab behavior.
- Toggle button uses `aria-expanded` + `aria-controls` pattern.
- `prefers-reduced-motion` media query disables button transitions.
- Focus indicators use `outline: 3px solid #005ea2` on `:focus-visible`.

---

## Responsive Behavior

| Breakpoint | Change |
|---|---|
| `≤ 780px` | Grid collapses to single column; support banner stacks vertically; logo reduces to 96px |

---

## Color Tokens

| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#005ea2` | CTA buttons, borders, focus rings |
| Dark Navy | `#0f172a` | Body text |
| Slate | `#475569` | Descriptive/secondary text |
| Sky | `#d9e8f6` | Live Training card header |
| Blue | `#aacdec` | Self-Paced card header |
| Teal | `#5dc0d1` | Help Library card header |
| Highlight Yellow | `#feffd1` | Current user row highlight in grid |

---

## Notes & Considerations

- `LeafFormQuery` and `LeafFormGrid` are platform-provided globals — they must be available in the page environment for the script to function.
- The `currentUserID` is injected server-side via Smarty. If the template engine is not active, the variable will render as a literal Smarty tag string and queries will return no results.
- jQuery is used minimally (two calls inside `renderResult`) for grid compatibility — not a general dependency of the page itself.
- Record IDs are namespaced (`{id}_{portal}`) to prevent collisions when merging results from two portals into a single map.
