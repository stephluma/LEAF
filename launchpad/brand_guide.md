# LEAF Launchpad — Brand Guide Technical Build Documentation

## Overview

The Brand Guide is a single-page HTML document embedded within the LEAF Launchpad platform. It serves as the canonical reference for LEAF brand standards including mission/vision, visual identity, color palette, design system references, and downloadable templates.

---

## File Structure

```
/platform/designs/
├── files/
│   ├── launchpad.css          # Platform-wide stylesheet (external dependency)
│   ├── leaf_nav.js            # Platform navigation injector (external dependency)
│   ├── leaf_breadcrumb.js     # Breadcrumb renderer (external dependency)
│   ├── LEAF-logo-light.svg    # White monochrome logo
│   ├── LEAF-logo-dark.svg     # Black monochrome logo
│   └── LEAF_logo_transparent.png  # Full-color logo (transparent bg)
└── [brand-guide].html         # This file
```

> **TODO:** Verify all `/platform/designs/files/` paths before production deployment.

---

## External Dependencies

| Resource | Source | Purpose |
|---|---|---|
| `Public Sans` | Google Fonts | Headings, labels, buttons |
| `Source Sans 3` | Google Fonts | Body copy, descriptions |
| `Material Symbols Outlined` | Google Fonts | Iconography (filled variant via CSS) |
| `launchpad.css` | Platform CDN | Base tokens, layout utilities, LEAF design tokens |
| `leaf_nav.js` | Platform CDN | Injects global nav (`#lp-nav-host`) |
| `leaf_breadcrumb.js` | Platform CDN | Reads `window.LEAF_BREADCRUMB` and renders breadcrumb |

---

## Layout Architecture

The page uses a two-column flex layout composed of a sticky sidebar and a scrollable main content area.

```
.bg-layout (flex row)
├── .bg-sidebar          ← sticky, 220px, desktop only
│   └── .bg-nav          ← anchor links to page sections
└── .bg-main             ← flex: 1, holds all content sections
    ├── .bg-hero
    ├── section#foundation
    ├── section#visual-identity
    ├── section#design-systems
    └── section#templates
```

A CSS `::before` pseudo-element on `.bg-layout` renders the sidebar's background panel, allowing the sidebar to remain sticky while the background extends the full page height.

---

## CSS Design Tokens

The file inherits design tokens from `launchpad.css`. Key tokens used:

| Token | Usage |
|---|---|
| `--lp-accent` | Primary brand color (buttons, headings, active nav states) |
| `--c-muted` | Secondary text color |
| `--c-text` | Primary text color |
| `--c-blue10` | Light blue tint (borders, hover backgrounds) |
| `--c-blue20` | Slightly darker blue tint (button borders) |
| `--c-blue5` | Faint blue (jump button hover) |
| `--r-lg` | Border radius for cards and buttons |

### Icon Override

Material Symbols loads with `FILL:0` by default. A global rule forces filled icons across the page:

```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'opsz' 24, 'GRAD' 0 !important;
}
```

The `!important` flag is required to override both `launchpad.css` and any styles injected by `leaf_nav.js`.

### Platform Header/Footer Suppression

```css
#header, #footer { display: none !important; }
```

The brand guide manages its own full-page layout and suppresses the platform's default header and footer shell.

---

## Component Inventory

### Sidebar Navigation (Desktop)
- `position: sticky`, `top: 93px` — offsets below the platform nav bar height
- `max-height: calc(100vh - 93px)` with `overflow-y: auto` for long content
- Active link state (`.is-active`) managed by the scrollspy script

### Mobile Sidebar Toggle
- Replaces the sticky sidebar at `≤ 768px`
- `<button#bgSidebarToggle>` toggles `<div#bgSidebarDrawer>` via the `.is-open` class
- `aria-expanded` is updated on toggle for screen reader support

### Hero Banner (`.bg-hero`)
- Full-width, `--lp-accent` background
- Contains the white LEAF logo SVG and a brand tagline

### Foundation Cards (`.foundation-grid`)
- 3-column CSS Grid, collapses to 1 column on mobile
- Cards for Mission, Vision, and Core Values

### Logo Cards (`.logo-grid`)
- 3-column CSS Grid, collapses to 1 column on mobile
- Each card has a preview panel (light or `.dark` background) and a download button
- Download `href` values are currently placeholder `#` — requires asset path wiring

### Color Swatches (`.color-grid`)
- 5-column CSS Grid → 2 columns at `≤ 768px` → 1 column at `≤ 500px`
- Each swatch has a `.btn-copy` button with a `data-color` attribute used by the clipboard script

### Design System Cards & Template Cards (`.template-grid`)
- 2-column CSS Grid, collapses to 1 column on mobile
- Cards include an icon badge (`.template-card-icon`), heading, description, and a CTA button

### Jump-to-Top Button (`#bgJump`)
- `position: fixed`, bottom-right
- Hidden (`opacity: 0`, `pointer-events: none`) until scroll depth exceeds 120px
- Smooth scroll to top on click; `aria-hidden` and `tabindex` toggled dynamically

---

## JavaScript Modules

All scripts are inline IIFEs at the bottom of `<body>`. No external JS framework is used.

### 1. Breadcrumb Configuration
```js
window.LEAF_BREADCRUMB = [
  { label: 'About LEAF', href: '/platform/designs/report.php?a=impact' },
  { label: 'Brand Guide' }
];
```
Set before `leaf_breadcrumb.js` loads. The last item renders as the current page (no link).

### 2. Jump-to-Top
- Listens to `scroll` (passive) and `resize` events
- Toggles `.vis` class and `aria-hidden`/`tabindex` attributes based on `pageYOffset > 120`

### 3. Mobile Sidebar Toggle
- Toggles `.is-open` on `#bgSidebarDrawer`
- Syncs `aria-expanded` on the trigger button

### 4. Scrollspy
Tracks which section is in view and applies `.is-active` to the corresponding sidebar nav link.

- **Sections tracked:** `brand-hero`, `foundation`, `visual-identity`, `design-systems`, `templates`
- **Detection:** `getBoundingClientRect().top <= 120` — a section becomes active when its top edge crosses 120px from the viewport top
- **Bottom-of-page guard:** If `innerHeight + scrollY >= scrollHeight - 10`, the last section is forced active

### 5. Copy to Clipboard
- Attached to all `.btn-copy` elements via `data-color` attribute
- Uses the async `navigator.clipboard.writeText()` API
- On success: swaps icon/label to a "Copied" confirmation for 2 seconds, then resets
- On failure (API unavailable): silent fail — no user-facing error

---

## Accessibility

- Skip link: `<a class="lp-skip" href="#lp-main">Skip to main content</a>`
- `<main>` has `tabindex="-1"` to receive programmatic focus from the skip link
- All icon `<span>` elements use `aria-hidden="true"`
- Color swatches use `role="img"` with descriptive `aria-label` values
- All interactive elements have `:focus-visible` outlines using `--lp-accent`
- `aria-label` on copy buttons includes the specific hex value being copied
- Mobile nav uses `aria-controls` and `aria-expanded` on the toggle button
- `role="navigation"` and `aria-label` on the mobile drawer

---

## Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤ 768px` | Sidebar hidden; mobile toggle shown; all grids collapse to 1 column (except color → 2 col) |
| `≤ 500px` | Color grid collapses to 1 column |
| `prefers-reduced-motion` | CSS transitions disabled on toggle chevron and primary buttons |

---

## Known TODOs / Production Checklist

- [ ] Verify `/platform/designs/files/launchpad.css` path
- [ ] Verify `/platform/designs/files/leaf_nav.js` path
- [ ] Verify `/platform/designs/files/leaf_breadcrumb.js` path
- [ ] Wire logo download `href` attributes to actual asset URLs
- [ ] Wire template/flyer download `href` attributes to actual file URLs
- [ ] Confirm `top: 93px` sidebar offset matches the deployed platform nav height
- [ ] Test `navigator.clipboard` availability in the target browser/environment
