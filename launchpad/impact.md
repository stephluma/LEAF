# Technical Build Documentation
## Our Impact — LEAF Launchpad (`our-impact.html`)

---

## Overview

A static marketing/impact page for the LEAF Launchpad platform, built as a single HTML file. It sits within the VA's internal platform at `/platform/designs/` and depends on two shared platform scripts and one shared stylesheet.

---

## File Structure & Dependencies

| Asset | Type | Purpose |
|---|---|---|
| `launchpad.css` | External CSS | Global design system — layout, typography, component base styles |
| `leaf_nav.js` | External JS | Injects the platform navigation into `#lp-nav-host` |
| `leaf_breadcrumb.js` | External JS | Renders breadcrumb trail using `window.LEAF_BREADCRUMB` config |
| Google Fonts | External CSS | Loads **Public Sans** (headings/UI) and **Source Sans 3** (body) |
| Material Symbols Outlined | External CSS | Icon font for all `<span class="material-symbols-outlined">` icons |

> **Note:** All platform asset paths (`/platform/designs/files/`) are marked with `TODO: verify path before production` comments and should be confirmed before deployment.

---

## Page Sections

### 1. Page Title
- Simple centered header block using `.section > .wrap > .sec-hd.ctr`.
- Contains an eyebrow label, `<h1>`, and subtitle (`sec-sub`).

### 2. Stats — *Platform at a Glance*
- Four KPI cards rendered in a **CSS Grid** (`.stats`).
- Responsive breakpoints: 4-col → 2-col at 900px → 1-col at 500px.
- Cards use `role="list"` / `role="listitem"` for semantic accessibility.
- Animated on scroll via **IntersectionObserver** (see JavaScript section).

### 3. What Makes LEAF Unique
- Feature cards in a 2-column grid (`.feats.feats-2`), collapsing to 1-col at 700px.
- Hover/transform animations explicitly disabled via `!important` overrides to suppress inherited behavior from `launchpad.css`.
- Each card is an `<article role="listitem">` with a Material Symbol icon, heading, and description.

### 4. Empowering All Users
- Two-column `.step` layout (image + content), using the shared step pattern from `launchpad.css`.
- Content side uses a `<dl>` definition list (`.user-types`) with `<dt>`/`<dd>` pairs for the low-code / no-code distinction.
- Image side uses `.step-img.contain` — sets `object-fit: contain` with a white background to prevent cropping of diagram assets.

### 5. Voice of the Customer
- Reversed `.step.rev` layout (image on right).
- Contains a primary CTA button linking to `voc-program.html`.
- Uses a placeholder image (`graphics-placeholder.jpg`) — **replace before launch**.

### 6. Brand Guide
- Standard `.step` layout (same as section 4).
- CTA links to `/platform/designs/report.php?a=brand_guide`.
- Uses placeholder image — **replace before launch**.

### 7. Awards
- Horizontal flexbox row (`.awards-row`) with `flex-wrap` for responsive reflow.
- Award images are rendered **grayscale by default** and transition to full color on `:hover` / `:focus` via CSS `filter`.
- Images are `tabindex="0"` to support keyboard focus + color reveal.
- Award images are **exempt** from the global right-click protection (see JS).

### 8. CTA Band
- Full-width band (`.cta-band`) using `--color-primary` background.
- Contains a "Watch a demo" button that triggers the demo modal.

---

## JavaScript Behaviors

### Image Protection
Prevents right-click context menu and drag-and-drop on all `<img>` elements, with a **whitelist exception** for `.award-img`.

```js
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG' && !e.target.classList.contains('award-img'))
    e.preventDefault();
});
```

### Jump-to-Top Button
- Fixed position button (`#lpJump`) shown/hidden based on scroll position (threshold: 120px).
- Toggles `.vis` class and manages `aria-hidden` + `tabindex` for accessibility.
- Smooth scrolls to top on click.

### Demo Modal (`#lpDemoModal`)
- Hidden by default via the `hidden` attribute.
- On open: injects the SharePoint Stream embed URL into `iframe[src]` and locks body scroll.
- On close: clears `iframe[src]` (stops video playback) and restores scroll.
- Closes on: close button click, backdrop click, or `Escape` key.
- **Focus trap:** `Tab` key within an open modal is intercepted and refocused on the close button.
- Returns focus to the triggering button (`#lpCtaDemoBtn`) on close.

### Stat Count-Up Animation
- Uses **IntersectionObserver** (threshold: 0.25) to trigger animation when cards enter the viewport.
- Each card is staggered by `index × 120ms`.
- Numbers animate from 0 to target over 1200ms using a **cubic ease-out** curve (`1 - (1 - t)³`).
- Handles three number formats: plain integers (formatted with `toLocaleString`), `M` suffix (millions), and `%` suffix.
- Fully respects **`prefers-reduced-motion`**: skips animation and immediately shows final values if the user has reduced motion enabled.

---

## Accessibility Notes

| Feature | Implementation |
|---|---|
| Skip link | `<a class="lp-skip" href="#lp-main">` at top of page |
| Landmark regions | `<main id="lp-main" tabindex="-1">` for skip-link target |
| Section headings | Each section has a unique `id` referenced via `aria-labelledby` |
| Decorative icons | All Material Symbol icons use `aria-hidden="true"` |
| Lists | Stat cards and feature cards use `role="list"` / `role="listitem"` |
| Award images | `tabindex="0"` enables keyboard-accessible color reveal |
| Modal | `role="dialog"`, `aria-modal="true"`, focus management, Escape key support |
| Screen reader title | `<p id="lpDemoTitle" class="sr-only">` provides modal label |

---

## Theming & CSS Variables

The page relies on CSS custom properties defined in `launchpad.css`. Local overrides are minimal:

| Variable | Fallback | Usage |
|---|---|---|
| `--color-primary` | `#005ea2` | Stat numbers, CTA band, button color |
| `--color-text` | `#1b1b1b` | Definition list terms |
| `--color-text-muted` | `#5c6670` | Stat labels, definition list descriptions |
| `--surface` | `#fff` | Stat card background |
| `--radius` | `8px` | Card and button border radius |
| `--shadow-card` | `0 2px 12px rgba(0,0,0,.08)` | Card elevation |

---

## Known TODOs / Pre-Launch Checklist

- [ ] Verify `/platform/designs/files/launchpad.css` path
- [ ] Verify `/platform/designs/files/leaf_nav.js` path
- [ ] Verify `/platform/designs/files/leaf_breadcrumb.js` path
- [ ] Replace `./files/graphics-placeholder.jpg` in VoC and Brand Guide sections
- [ ] Confirm SharePoint Stream embed URL is current and accessible
- [ ] Confirm all award image assets exist at `./files/`
- [ ] Confirm `./files/see-saw.png` asset exists and is sized correctly
