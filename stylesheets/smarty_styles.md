# `smarty_styles.css` — Technical Build Document

## Overview

`smarty_styles.css` is the universal stylesheet for the **Smarty** platform. It provides a shared design token foundation and scoped page-level overrides for three distinct page contexts: **Idea Portal**, **Launchpad**, and **Privacy**. The file is structured to coexist with host platform stylesheets (e.g. LEAF) without conflict.

---

## Architecture

### Scoping Strategy

The stylesheet uses two parallel scoping mechanisms to isolate styles:

| Scope | Selector Pattern | Used By |
|---|---|---|
| Body class + page modifier | `body.smarty.page-{name}` | Idea Portal, Privacy |
| Wrapper class | `.lp-scope` | Launchpad |

This dual approach reflects different integration contexts — pages that own the `<body>` tag versus pages embedded within a host template.

---

## Design Tokens

All design tokens are declared as CSS custom properties on `body.smarty`. They are re-declared identically inside `.lp-scope` to ensure availability in both scoping contexts.

### Token Groups

**Idea Portal (`ip-*`)**
```
--ip-bg, --ip-panel, --ip-border, --ip-text, --ip-muted
--ip-accent, --ip-accent-weak
--ip-shadow, --ip-radius
```

**Launchpad (`lp-*`)**
```
--lp-bg, --lp-panel, --lp-border, --lp-text, --lp-muted
--lp-accent, --lp-accent-strong, --lp-accent-weak
--lp-warning-bg, --lp-warning-border, --lp-warning-text
--lp-shadow, --lp-radius, --lp-safe-bottom
--lp-blue-soft, --lp-blue-mid, --lp-blue-deep
```

**Spacing**
```
--space-1: 4px   --space-2: 8px   --space-3: 12px
--space-4: 16px  --space-6: 32px
```

**Radius**
```
--radius-sm: 10px   --radius-md: 12px
```

**Semantic (shared)**
```
--bg, --surface, --surface-alt, --border
--text, --muted, --accent, --accent-strong
--focus, --danger
--shadow-sm, --shadow-md
```

---

## Page Sections

### 1. Shared / Universal

**Selector root:** `body.smarty`

Defines all tokens, a lightweight `box-sizing` reset, and the shared `.lp-credit-footer` component used across all Smarty pages.

---

### 2. Idea Portal (`page-ideaportal`)

**Selector root:** `body.smarty.page-ideaportal`

The most component-dense section. Key building blocks:

#### Layout
- `.ip-wrap` — max-width 1200px centered content container
- `.ip-header` — flex row, centered, wraps on mobile
- `.smarty-root` — full-height flex column shell

#### Navigation / Tabs
- `.ip-tabs` — pill-style tab bar with border and background
- `.ip-tab` — individual tab; active state uses bottom border `#005ea2` + box-shadow
- `.ip-tabsRow` — flex row distributing tabs and actions

#### Buttons (`ip-btn`)
- Base: border `#aacdec`, background `#d9e8f6`, `border-radius: 10px`
- Variants: `--primary`, `--ghost`, `--icon`
- States: hover darkens to `#aacdec`; active applies `translateY(1px)`; disabled grays out and suppresses hover

#### Table (`ip-table`)
- `border-collapse: collapse`, `min-width: 840px`, `table-layout: auto`
- Column widths are explicitly controlled via `nth-child` selectors:
  - Col 1 (ID): `width: 1%`, no-wrap; rendered as a dark pill badge (`background: #1f1f1f`)
  - Col 2 (Title): `width: 30%`, wraps with `overflow-wrap: break-word`
  - Col 3 (Category): `width: 1%`, no-wrap
  - Col 4 (Status): `min-width: 175px`, no-wrap
  - Col 5 (Votes): `width: 1%`, centered
  - Col 6 (Actions): fixed `160px`
- Sortable headers use `::after` pseudo-elements for `▲` / `▼` indicators

#### Status Badges (`ip-badge`)
```
--new        #e0f2fe / #075985
--review     #fef9c3 / #854d0e
--progress   #fef3c7 / #92400e
--done       #dcfce7 / #166534
--discarded  #f1f5f9 / #64748b (italic)
--draft      #fef9c3 / #854d0e
```

#### Modals
- `.ip-modal` — standard submit/form modal, `z-index: 1000`, semi-transparent overlay `rgba(15,23,42,0.55)`
- `.ip-recordModal` — full record viewer, `z-index: 1100`, `92vw × 90vh`, contains an `<iframe>` body

#### Search
- `.ip-searchWrap` — flex row, max 480px
- `.ip-searchInput` — focus ring `rgba(0,94,162,0.15)` with blue border

#### Utility
- `.ip-jumpTop` — fixed bottom-right scroll-to-top button, fades in via `.is-visible`
- `.ip-alert--fixed` — toast-style notification, centered top, `z-index: 2000`
- `.ip-srOnly` — visually hidden accessible label pattern

#### Responsive (≤ 780px)
- Header stacks vertically
- Tabs wrap and center
- Table scrolls horizontally via `display: block; overflow-x: auto`

---

### 3. Launchpad (`.lp-scope`)

**Selector root:** `.lp-scope`

A self-contained design system within the wrapper class. Mirrors Bootstrap-like utility conventions without requiring Bootstrap.

#### Grid / Layout Utilities
- `.container` — max 1200px, `padding: 0 20px`
- `.row` — flex with `gap: 24px`, wraps
- Column classes: `.col-12`, `.col`, `.col-md-6` (≥768px), `.col-lg` (≥992px)
- `.features-grid` — CSS Grid, 3 columns → 2 (≤900px) → 1 (≤640px)
- `.results-grid` — CSS Grid, 2 columns → 1 (≤700px)
- `.lp-resource-hub` — CSS Grid, fixed 3 columns

#### Spacing / Display Utilities
Bootstrap-compatible naming: `.pt-5`, `.p-3`, `.p-5`, `.mb-2`, `.mb-3`, `.my-5`, `.m-auto`, `.mx-auto`, `.text-center`, `.fw-bold`, `.is-hidden`

#### Buttons
- `.btn` — base with `transition` on transform, shadow, background, border
- `.btn-primary` — `#005ea2` fill, white text; hover → `#004a82`
- `.btn-lg` — larger padding/font
- `.btn-hero-primary` — green `#7fb135`, dark text; hover → `#538200` + white text
- `.btn-hero-outline` — transparent with gray border

#### Cards
- `.card` — 14px radius, shadow, border
- `.lp-card-head` variants: `--sky` (`#d9e8f6`), `--blue` (`#73b3e7`), `--teal` (`#5dc0d1`)

#### Hero / CTA Section
- `.lp-launchpad-cta` — full-width, gradient background `135deg #e8f0f9 → #f3f3f3 → #d6ead6`
- `.lp-launchpad-card` — centered card, max 720px, `2.5rem` padding
- `.cta-container` — accent-colored `#005ea2` block with white text

#### Video Modal
- `.lp-modal-overlay` — fixed, `rgba(0,0,0,0.75)`, `z-index: 2000`
- `.lp-modal-video` — 16:9 aspect ratio via `padding-bottom: 56.25%`
- Close button focus ring is white (`#ffffff`) — required because blue fails contrast on dark modal background

#### Resource Tiles
- `.lp-resource-tile` — flex column, centered icon + label, bordered accent style
- Hover: subtle `rgba(0,94,162,0.08)` fill, shadow lift

#### Site History Toggle
- `.lp-site-history-toggle` — full-width button with chevron icon
- Icon rotates 180° when `aria-expanded="true"` via `.lp-toggle-icon` transition

#### Accessibility
- `.skip-link` — off-screen by default (`translateY(-200%)`), visible on focus
- Focus ring standard: `outline: 3px solid var(--lp-accent)` with `!important` to override LEAF host styles
- `.lp-modal-close` uses white focus ring specifically noted for dark background contrast
- `@media (prefers-reduced-motion: reduce)` — disables all transitions and hover transforms across 14 component selectors

#### Scroll / Fixed UI
- `.lp-jumpTop` — fixed bottom-right, fades in via `.is-visible`, opacity transition `0.15s`
- `.lp-creditBadge` — fixed bottom-left, transparent background, fades in when scrolled

---

### 4. Privacy (`page-privacy`)

**Selector root:** `body.smarty.page-privacy`

A document-style page with a full reset layer and editorial layout components.

#### Reset Layer
Applied under `.smarty-root`: zeroes margins on all block elements (`h1–h6`, `p`, `ul`, `ol`, `dl`, `figure`, `blockquote`, `table`, `hr`); removes list padding; inherits font on form elements.

#### Layout
- `.wrap` — max 1400px, `margin: 32px auto`, token-based padding
- `.grid` — `auto-fit` columns, `minmax(280px, 1fr)`
- `.info-row` — `auto-fit` columns, `minmax(220px, 1fr)`, right-aligns `.info-item.right`; collapses to left-align on ≤640px

#### Cards
- `.card` — standard panel with `var(--shadow-sm)`
- `.card-header` — `#e7efff` background, inner border-radius
- `.card-row` — flex row with wrapping for text + action layout

#### Buttons
- `.btn` — accent fill `var(--accent)`, hover lifts with `translateY(-1px)` and shadow
- `.btn-ghost` — surface background, border, no fill

#### Editorial Components
- `.recent-changes-list` — borderless list, items separated by top borders
- `.info-callout` — subtle `surface-alt` aside panel
- `.callout` — more prominent aside with shadow
- `.checklist` — standard `<ul>` with left padding
- `.tag` — danger-colored (`var(--danger)`) label
- `.badge` — accent-colored inline label

#### Utility
- `.visually-hidden` — screen-reader-only pattern (clip + 1px)
- `.jump-top` — fixed scroll-to-top, same pattern as other pages
- `.skip-link` — same pattern as Launchpad, focus reveals via transform

---

## Accessibility Notes

| Feature | Implementation |
|---|---|
| Focus indicators | 2–3px solid outlines, `!important` where LEAF may override |
| Skip links | Off-screen → visible on focus via CSS transform |
| Reduced motion | `@media (prefers-reduced-motion)` disables transitions and transforms |
| Screen reader text | `.ip-srOnly` / `.visually-hidden` clip pattern |
| Disabled buttons | `cursor: not-allowed`, suppressed hover/active styles |
| Modal close contrast | White focus ring on dark overlay (documented inline) |
| WCAG contrast note | `#fa9441` on white fails AA (2.16:1); replaced with `#1b1b1b` (~8:1) |

---

## Font Stack

```
'Source Sans 3', 'Source Sans Pro', sans-serif
```

Used consistently across all three page contexts. Loaded externally (not embedded in this file).

---

## Icon System

Google **Material Symbols Outlined** is used throughout. Icon size and variation settings are declared on the Privacy page:

```css
font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 20;
font-size: 20px;
```

---

## z-index Stack

| Layer | Value | Element |
|---|---|---|
| Base modals | 1000 | `.ip-modal` |
| Record viewer | 1100 | `.ip-recordModal` |
| Jump-to-top / Credit badge | 1200 | `.ip-jumpTop`, `.lp-jumpTop`, `.lp-creditBadge` |
| Skip link | 1300 | `.skip-link` (lp-scope) |
| Toast alert | 2000 | `.ip-alert--fixed` |
| Video modal | 2000 | `.lp-modal-overlay` |
