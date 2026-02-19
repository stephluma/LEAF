# UI Audit — Foundations

---

## Part 1 — Technology Surface Map

### 1.1 Overview of Rendering Technologies

LEAF uses three distinct UI rendering layers that coexist in the same deployed application:

| Layer                                           | Technology                         | Primary Entry                                           |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| Page shell & server-driven views                | PHP + Smarty 3 templates           | `LEAF_Request_Portal/index.php`, `LEAF_Nexus/index.php` |
| Legacy interactive UI                           | jQuery + jQuery UI                 | `libs/js/jquery/`                                       |
| Modern admin tools (Form Editor, Site Designer) | Vue 3 (Options API) + Vue Router 4 | `docker/vue-app/src/`                                   |

---

### 1.2 PHP + Smarty — Server-Rendered HTML

**Directory context:** `LEAF_Request_Portal/` and `LEAF_Nexus/`

**How it works:**
PHP controller files (`index.php`, `report.php`, `ajaxIndex.php`) instantiate a `Smarty` object, assign variables, and call `$main->display('main.tpl')` or `$t->fetch(...)`. Smarty renders `.tpl` files into HTML and sends the full document to the browser.

Template partials are structured as a layout + slot system:

- **Layout shell:** `main.tpl` — full `<html>` document, injects CSS via `@import`, loads jQuery globally
- **Body slot:** `view_*.tpl` files fetched by the PHP controller and assigned to `{$body}`
- **Partials:** `menu.tpl`, `login.tpl`, `menu_links.tpl`, `menu_help.tpl`
- **Dialog partials:** `site_elements/generic_dialog.tpl`, `site_elements/generic_xhrDialog.tpl`
- **Override system:** `templates/custom_override/` — site-specific `.tpl` overrides checked before defaults via `customTemplate()` in `index.php`

**Representative files:**

- `LEAF_Request_Portal/index.php` — PHP controller, all route branching, Smarty instantiation
- `LEAF_Request_Portal/templates/main.tpl` — primary layout shell; CSS imports, jQuery script loads
- `LEAF_Request_Portal/templates/form.tpl` — form rendering view
- `LEAF_Nexus/templates/main.tpl` — Nexus layout shell; conditionally loads jQuery UI via `{if $useDojo}`
- `LEAF_Nexus/templates/view_employee.tpl` — representative server-rendered directory view

---

### 1.3 jQuery + jQuery UI — Legacy Interactive Layer

**Directory context:** `libs/js/jquery/`, `LEAF_Request_Portal/js/`, `LEAF_Nexus/js/`

**How it works:**
Scripts are loaded as `<script>` tags in `main.tpl`. The PHP controller appends per-page scripts via `$main->assign('javascripts', [...])`. jQuery UI dialogs (`ui-dialog`), Chosen (select enhancement), Trumbowyg (rich text), and iCheck (custom checkboxes) are all loaded globally when `$useUI == true`.

**Representative files:**

- `libs/js/jquery/jquery.min.js` — jQuery core, served from shared libs
- `libs/js/jquery/jquery-ui.custom.min.js` — jQuery UI widgets (dialog, sortable, etc.)
- `libs/js/jquery/chosen/chosen.jquery.min.js` — select dropdown enhancement
- `libs/js/jquery/trumbowyg/trumbowyg.min.js` — rich text editor
- `LEAF_Request_Portal/js/dialogController.js` — LEAF wrapper for jQuery UI dialogs

---

### 1.4 Vue 3 — Modern Admin Applications

**Directory context:** `docker/vue-app/src/`

**How it works:**
Two standalone Vue 3 apps are built by Webpack (`docker/vue-app/webpack.config.js`) and output to `/app/vue-dest/`. They are embedded in Smarty-rendered pages as script includes. Each app mounts to a specific `<div id="...">` injected by the PHP/Smarty layer.

Vue components are written as **render-function / `defineComponent` objects in `.js` files** (not `.vue` SFCs). Vue Router 4 is used for in-app navigation.

**Two apps:**

| App           | Mount point           | Entry                                     | Output path                    |
| ------------- | --------------------- | ----------------------------------------- | ------------------------------ |
| Form Editor   | `#vue-formeditor-app` | `src/form_editor/LEAF_FormEditor_main.js` | `/app/vue-dest/form_editor/`   |
| Site Designer | `#site-designer-app`  | `src/site_designer/LEAF_Designer_main.js` | `/app/vue-dest/site_designer/` |

**Representative files:**

- `docker/vue-app/src/form_editor/LEAF_FormEditor_main.js` — `createApp()` + `app.mount('#vue-formeditor-app')`
- `docker/vue-app/src/form_editor/LEAF_FormEditor_App_vue.js` — root app component
- `docker/vue-app/src/form_editor/components/dialog_content/IndicatorEditingDialog.js` — representative dialog component
- `docker/vue-app/src/site_designer/LEAF_Designer_main.js` — Site Designer entry point
- `docker/vue-app/src/common/components/LeafFormDialog.js` — shared dialog component used across both apps

**Shared Vue libs:**

- `libs/js/vue3/vue.global.prod.js` — Vue 3 runtime (also bundled via Webpack)

---

### 1.5 Build System

- **Bundler:** Webpack 5 (`docker/vue-app/webpack.config.js`)
- **CSS:** Sass/SCSS compiled via `sass-loader` + `mini-css-extract-plugin`
- **Three Webpack entry configs:** `formEditorConfig`, `siteDesignerConfig`, `adminSassConfig` (the global SCSS bundle)
- **Icons:** Font Awesome 6 Free (npm package `@fortawesome/fontawesome-free`)

---

## Part 2 — Styling System Documentation

### 2.1 Global CSS/SCSS Entry Points

| File                                                     | Role                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `docker/vue-app/src/sass/styles.scss`                    | Root SCSS entry; `@use`s `leaf`, `leaf-colors`, `leaf-nav`                       |
| `docker/vue-app/src/sass/leaf.scss`                      | Primary global stylesheet — resets, layout, USWDS-aligned components, typography |
| `docker/vue-app/src/sass/leaf-nav.scss`                  | Navigation component styles                                                      |
| `docker/vue-app/src/sass/leaf-colors.scss`               | USWDS color utility classes (`.bg-*`, `.text-*`)                                 |
| `docker/vue-app/src/common/LEAF_Vue_Dialog__Common.scss` | Vue app shared SCSS — SCSS variables, mixins, dialog modal, button system        |
| `docker/vue-app/src/form_editor/LEAF_FormEditor.scss`    | Form Editor app-scoped SCSS; imports `LEAF_Vue_Dialog__Common.scss`              |
| `docker/vue-app/src/site_designer/LEAF_Designer.scss`    | Site Designer app-scoped SCSS                                                    |
| `LEAF_Request_Portal/css/style.css`                      | Legacy Request Portal stylesheet (plain CSS, Verdana-based)                      |
| `LEAF_Nexus/css/style.css`                               | Legacy Nexus stylesheet (plain CSS, Verdana-based)                               |

Compiled output from Webpack:

- `libs/css/leaf.css` — compiled global admin stylesheet, served to admin pages

---

### 2.2 Framework Usage

**USWDS (U.S. Web Design System) — partial adoption, custom implementation**
LEAF does not import USWDS as an npm package. Instead it replicates USWDS naming conventions and a subset of the design language manually:

- Class names follow USWDS patterns: `.usa-button`, `.usa-table`, `.usa-sidenav`, `.usa-label`, `.usa-input`, `.usa-form`, `.usa-banner`, `.grid-container`, `.grid-row`
- Color palette is the USWDS color palette (documented in `leaf-colors.scss` with comment `/* USWDS COLORS */`)
- Public Sans and Source Sans Pro fonts are bundled locally from `/common/assets/` (same fonts USWDS uses)
- Evidence: `docker/vue-app/src/sass/leaf.scss:201` — section comment `/* USWDS RELATED STYLES */`; `docker/vue-app/src/sass/leaf-colors.scss:1` — comment `/* USWDS COLORS */`

**jQuery UI — dialog, sortable**
Used in the legacy layer. Overridden in `leaf.scss` under `/* JQUERY UI OVERRIDES */` section (line 406).

**No Bootstrap** — no evidence of Bootstrap import or class usage in any scanned file.

---

### 2.3 Top 15 Repeated Hex Color Values

Collected from: `leaf.scss`, `leaf-nav.scss`, `leaf-colors.scss`, `LEAF_Vue_Dialog__Common.scss`, `LEAF_Request_Portal/css/style.css`, `LEAF_Nexus/css/style.css`.

| Rank | Hex       | Approx. appearance count | Notes                                              |
| ---- | --------- | ------------------------ | -------------------------------------------------- |
| 1    | `#e8f2ff` | 23+                      | Light blue; dialog background (`$lt_cyan` in SCSS) |
| 2    | `#8e8e8e` | 23                       | Medium gray; found in legacy CSS                   |
| 3    | `#2372b0` | 21                       | Mid blue; found in legacy CSS                      |
| 4    | `#e0e0e0` | 7                        | Light gray; backgrounds                            |
| 5    | `#f9e6df` | 6                        | Light salmon; error state backgrounds              |
| 6    | `#f04e0b` | 6                        | Orange; hover link color in legacy CSS             |
| 7    | `#1b1b1b` | 6                        | Near-black; text, table borders                    |
| 8    | `#005ea2` | 6                        | USWDS primary blue (`$base_navy`)                  |
| 9    | `#ffe8e8` | 5                        | Light red; error highlight                         |
| 10   | `#5a79a5` | 5                        | Muted blue; Nexus header border                    |
| 11   | `#565c65` | 5                        | Dark gray; secondary text, footer links            |
| 12   | `#ee9a9a` | 4                        | Light red; error-related                           |
| 13   | `#e3e3e3` | 4                        | Light gray; borders                                |
| 14   | `#d83933` | 4                        | Red; `.usa-button--secondary`, error text          |
| 15   | `#252f3e` | 4                        | Charcoal; site header background (`$charcoal`)     |

Additional key colors defined as SCSS variables but may not rank by raw count:

- `#dfe1e2` — `$usa-gray`; HR lines, table headers, sidenav borders
- `#dcdee0` — body background
- `#162e51` — `$BG_DarkNavy`
- `#2491ff` — `$LEAF_CSS_outline`; focus ring blue
- `#ffbe2e` — `$USWDS_warning`; warning border
- `#b50909` — `$USWDS_errorDark`; error border

---

### 2.4 Spacing Scale Patterns

No formal spacing token system exists. Spacing is ad-hoc rem-based. Observed recurring values:

**Padding/margin units found in `leaf.scss`:**

- `0.25rem` — quarter-rem, used for `margin-top`, `padding-bottom`
- `0.5rem` — half-rem, used for padding, gap
- `0.6rem` — used for margins in nav and content containers
- `0.75rem` — used for button padding (`.usa-button`), dialog padding
- `1.0rem` — base unit, used across margins, padding, gaps
- `1.25rem` — used for table margin (`margin: 1.25rem 0`)
- `1.5rem` — used for label margin-top (`.usa-label`)
- `2.0rem` — used for section spacing

A set of named utility classes encodes the spacing scale:

- `.leaf-marginTop-qtrRem` → `0.25rem`
- `.leaf-marginTop-halfRem` / `.leaf-marginBot-halfRem` → `0.5rem`
- `.leaf-marginTop-1rem` / `.leaf-marginBot-1rem` → `1.0rem`
- `.leaf-marginTop-2rem` → `2.0rem`
- `.leaf-padAll1rem` → `1rem`

Evidence: `docker/vue-app/src/sass/leaf.scss:720–733`

---

### 2.5 Typography Scale

**Font stacks in use:**

| Stack                                                                   | Where defined                                                       | Where applied                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `"Source Sans Pro Web", "Helvetica Neue", Helvetica, Arial, sans-serif` | `leaf.scss:64`                                                      | `html` base font; also `.usa-table caption`, `.usa-label` |
| `'PublicSans-Bold', sans-serif`                                         | `leaf.scss:77`                                                      | `h1`–`h6`, `.usa-button`, labels, `.leaf-bold`            |
| `'PublicSans-Regular', sans-serif`                                      | `leaf.scss:202`                                                     | `.usa-sidenav`, `.leaf-center-content`, nav items, footer |
| `'PublicSans-Medium', sans-serif`                                       | `leaf.scss:84`                                                      | `h3.navhead`, `.lf-alert`, site title description         |
| `'PublicSans-Light', sans-serif`                                        | `leaf.scss:565`                                                     | `.leaf-sitemap-card p`                                    |
| `'PublicSans-Thin', sans-serif`                                         | `leaf.scss:638`                                                     | `.leaf-footer`                                            |
| `verdana, sans-serif`                                                   | `LEAF_Request_Portal/css/style.css:3`, `LEAF_Nexus/css/style.css:4` | Legacy portal body text; spans, buttons                   |

Both Public Sans and Source Sans Pro are locally bundled as woff/woff2 files under `docker/vue-app/src/common/assets/`. Public Sans is available in 9 weights (Thin → Black, with italic variants). Source Sans Pro is available in 7 weights.

**Font sizes found in `leaf.scss`:**

| Size      | Context                                                   |
| --------- | --------------------------------------------------------- |
| `0.7rem`  | `.leaf-footer`, `.leaf-font0-7rem` utility                |
| `0.75rem` | `.usa-banner p` (PHI warning)                             |
| `0.8rem`  | `.leaf-admin-btndesc`, nav font-size (mobile)             |
| `0.84rem` | `.leaf-sitemap-card p`                                    |
| `0.9rem`  | `.usa-sidenav`, `.usa-table`, `.leaf-font0-9rem`, labels  |
| `1.0rem`  | `.leaf-site-title`, navhead, `.leaf-font1rem`             |
| `1.06rem` | `.usa-button`, `.usa-input`, `.usa-label`                 |
| `1.2rem`  | `h3.navhead`, `.leaf-site-title`, `.leaf-sitemap-card h3` |
| `1.25rem` | Dialog title (large screen)                               |

**Font sizes in legacy CSS (`style.css` — both portals):**
Base `font-size: 12px`; sizes present: `10px`, `12px`, `14px`, `16px`, `20px`, `24px`. All pixel-based.

---

### 2.6 Presence or Absence of Tokens

**CSS custom properties (`var(--*)`):** Absent. No `:root {}` custom property declarations exist in any scanned file. No `var(--...)` usage was found.

**SCSS variables:** Present in the Vue/admin layer only. Defined in two files:

`docker/vue-app/src/common/LEAF_Vue_Dialog__Common.scss` (lines 3–18):

```scss
$BG_DarkNavy: #162e51;
$base_navy: #005ea2;
$LtNavy: #1476bd;
$LEAF_CSS_outline: #2491ff;
$charcoal: #252f3e;
$dk-gray: #4a5778;
$BG_LightGray: #f3f3f3;
$BG_Pearl: #f2f2f6;
$manila: #feffd1;
$USWDS_LtGray: #c9c9c9;
$USWDS_Cyan: #00bde3;
$USWDS_warning: #ffbe2e;
$USWDS_errorDark: #b50909;
$lt_cyan: #e8f2ff;
$BG_VividOrange: #ff6800;
$attention: #a00;
```

`docker/vue-app/src/sass/leaf.scss` (lines 3–7):

```scss
$usa-gray: #dfe1e2;
$btn-green: #008a17;
$base_navy: #005ea2;
```

`docker/vue-app/src/sass/leaf-nav.scss` (lines 1–5):

```scss
$nav_base_bgc: #252f3e;
$nav_link_bgc: #f0f0ec;
$nav_level_1_bgc: #274863;
$nav_level_2_bgc: #1d5689;
$nav_level_3_bgc: #2070b3;
```

The legacy `LEAF_Request_Portal/css/style.css` and `LEAF_Nexus/css/style.css` use only hardcoded hex values — no variables of any kind.

---

### 2.7 Border Radius Patterns

Values observed across `leaf.scss` and `LEAF_Vue_Dialog__Common.scss`:

| Value  | Usage context                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `2px`  | Custom checkbox (`span.leaf_check`), drop preview outlines, checkbox `::after`                                          |
| `3px`  | Vue dialog container, buttons (Vue layer), nav toggle button, sidenav `::after` active indicator                        |
| `4px`  | `.usa-button`, `.sidenav`, `.leaf-code-container`, `.leaf-admin-button`, site map cards, jQuery UI sortable placeholder |
| `5px`  | `.leaf-sitemap-card`                                                                                                    |
| `50px` | Loading spinner image container                                                                                         |
| `50%`  | Radio button custom style (`input[type="radio"] ~ span.leaf_check`)                                                     |

Dominant value is **`4px`** for interactive components; **`3px`** in the Vue app layer.

---

### 2.8 Shadow Patterns

Values observed in `leaf.scss`:

| Shadow value                           | Usage context                       |
| -------------------------------------- | ----------------------------------- |
| `0px 4px 6px rgba(0,0,0,0.2)`          | Site header (`#header.site-header`) |
| `0px 1px 3px rgba(0,0,0,0.2)`          | `.sidenav`, `.sidenav-right`        |
| `2px 2px 2px rgba(0,0,20,0.2)`         | `.leaf-admin-button`                |
| `2px 2px 4px rgba(0,0,20,0.4)`         | `.leaf-admin-button:hover`          |
| `0px 2px 3px #a7a9aa`                  | `.leaf-sitemap-card`                |
| `0px 12px 9px #949191`                 | `.leaf-sitemap-card:hover`          |
| `0 2px 6px #8e8e8e`                    | `.leaf-code-container`              |
| `inset 0 0 0 2px rgba(255,255,255,.7)` | `.site-button-outline-secondary`    |

Values observed in `LEAF_Vue_Dialog__Common.scss`:

| Shadow value                             | Usage context                                   |
| ---------------------------------------- | ----------------------------------------------- |
| `0 0 5px 1px rgba(0,0,25,0.25)`          | `#leaf_dialog_content` modal container          |
| `2px 2px 4px 1px rgba(0,0,25,0.25)`      | Drag-drop custom display card                   |
| `2px 2px 4px 1px rgba(0,0,25,0.3) inset` | Drag-drop item being dragged, drop zone preview |
| `1px 1px 2px 1px rgba(0,0,20,0.4)`       | Form Editor top menu nav bar                    |

Pattern: shadows use `rgba(0,0,0/20/25,0.2–0.4)` opacity range consistently. Inset shadows are used exclusively for focus-ring and drag-drop affordances.

## PART 3 — Component Inventory (Current State)

### 3.1 Buttons

#### Button System Overview

The codebase has **three coexisting button systems** used in different contexts:

1. **`.buttonNorm`** — Legacy/original button class (most widespread)
2. **`.usa-button`** (USWDS) — Newer pattern, primarily in admin templates and shared dialogs
3. **`.options` / `.tools`** — Contextual toolbar button classes (Nexus and Request Portal)

There is also a **`.link`** pseudo-button class used for text-styled clickable elements.

---

#### 3.1.1 `.buttonNorm` (Legacy Button)

**CSS Definitions (duplicated across 3 stylesheets):**

- `LEAF_Request_Portal/css/style.css:1291`
- `LEAF_Request_Portal/admin/css/style.css:734`
- `LEAF_Nexus/css/style.css:1081`

**Styles (consistent across all three):**

```css
.buttonNorm {
  background-color: #e8f2ff;
  padding: 4px;
  border: 1px solid black;
  cursor: pointer;
}
.buttonNorm:hover,
.buttonNormSelected,
.buttonNorm:focus {
  background-color: #2372b0;
  color: white;
}
button.buttonNorm {
  background-color: #e8f2ff;
  border: 1px solid black;
  cursor: pointer;
  /* padding/margin vary slightly between stylesheets */
}
```

**Typical HTML structure:**

```html
<button type="button" class="buttonNorm" onclick="handler()">
  <img src="dynicons/?img=icon-name.svg&w=16" alt="" /> Label Text
</button>
```

**File paths where `.buttonNorm` appears (representative):**

- `LEAF_Request_Portal/templates/submitForm.tpl:3` — Submit button
- `LEAF_Request_Portal/templates/form.tpl:10,23,24` — Next/Previous navigation
- `LEAF_Request_Portal/templates/subindicators.tpl:69` — Grid "Add row" button
- `LEAF_Request_Portal/templates/reports/LEAF_mass_action.tpl:85,89,91` — Search/action buttons
- `LEAF_Request_Portal/admin/templates/mod_workflow.tpl:7,15,20,24,29,34,38,43` — Workflow admin buttons
- `LEAF_Request_Portal/js/form.js:30,33` — JS-generated Cancel/Save buttons
- `LEAF_Request_Portal/js/workflow.js:167,177` — Error retry buttons
- `LEAF_Request_Portal/js/formGrid.js:935` — Excel export button
- `docker/vue-app/src/form_editor/components/FormBrowser.js:66` — Vue component (as `<a>` tag)
- `docker/vue-app/src/site_designer/components/CustomSearch.js:288,403` — Vue search buttons

**Key characteristics:**

- Uses inline `onclick` handlers (not event listeners)
- Frequently paired with `<img>` icons from `dynicons/` SVG service
- Icon sizing set inline (`w=16`, `w=22`, `w=32` — varies per usage)
- Additional inline styles are common (font-weight, font-size, white-space overrides)
- The class is applied to both `<button>` and `<a>` elements

---

#### 3.1.2 `.usa-button` (USWDS Button)

**CSS Definition:**

- `libs/css/leaf.css` (minified, shared/global stylesheet)

**Styles:**

```css
.usa-button {
  cursor: pointer;
  padding: 0.75rem;
  width: auto;
  min-width: 6rem;
  font-family: "PublicSans-Bold", sans-serif;
  font-size: 1.06rem;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  text-align: center;
  line-height: 0.9;
  color: #fff;
  background-color: #005ea2;
  border-radius: 4px;
  background-clip: padding-box;
  border: 2px solid transparent;
}
```

**Variants available:**

- `.usa-button--secondary` — `background-color: #d83933` (red/destructive)
- `.usa-button--base` — `background-color: #71767a` (neutral gray)
- `.usa-button--outline` — transparent background, `#005ea2` border inset
- `.usa-button--inverse` — (used in loading spinner)

**LEAF-specific size modifiers (from `libs/css/leaf.css`):**

- `.leaf-btn-small` — `padding: .5rem`
- `.leaf-btn-med` — `padding: .7rem; font-size: .9rem`
- `.leaf-btn-green` — `background-color: #008a17`

**Typical HTML structure:**

```html
<button type="button" class="usa-button leaf-btn-med">Save</button>
<button type="button" class="usa-button usa-button--outline leaf-btn-med">
  Cancel
</button>
<button type="button" class="usa-button usa-button--secondary leaf-btn-small">
  Delete Group
</button>
```

**File paths where `.usa-button` appears (representative):**

- `LEAF_Request_Portal/admin/templates/site_elements/generic_xhrDialog.tpl:15,20` — Dialog Save/Cancel
- `LEAF_Request_Portal/admin/templates/site_elements/generic_confirm_xhrDialog.tpl:15,19` — Yes/No dialog
- `LEAF_Request_Portal/admin/templates/site_elements/generic_simple_xhrDialog.tpl` — Simple dialog
- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:38,41,44` — Group management buttons
- `LEAF_Request_Portal/admin/templates/mod_workflow.tpl:546` — Create Event button (JS-generated)
- `LEAF_Request_Portal/admin/templates/mod_system.tpl` — System settings
- `LEAF_Request_Portal/admin/templates/mod_templates.tpl` — Template management
- `libs/smarty/loading_spinner.tpl:4` — Cancel loading button (with `--inverse`)

**Key characteristics:**

- Primarily found in **admin** templates and **newer shared dialog** templates
- Does NOT use `dynicons/` icon images — text-only labels
- Frequently combined with LEAF sizing modifiers (`leaf-btn-small`, `leaf-btn-med`)
- Still uses inline `onclick` handlers in most cases
- Some buttons in JS-generated HTML still carry inline styles alongside USWDS classes (e.g., `mod_groups.tpl:528-529`)

---

#### 3.1.3 `.options` / `.tools` (Toolbar Buttons)

**CSS Definitions:**

- `button.options` — `LEAF_Nexus/css/style.css:954`
- `button.tools` — `LEAF_Request_Portal/css/style.css:1003`

**Styles (nearly identical):**

```css
button.options,
button.tools {
  background-color: #e8f2ff;
  padding: 2px;
  margin: 0px;
  padding-right: 6px;
  border-top: 1px solid black;
}
button.options:hover,
button.tools:hover {
  background-color: #2372b0;
  color: white;
}
```

**File paths:**

- `LEAF_Nexus/templates/view_employee.tpl:4,6,8,9,11,12` — Employee action toolbar (`.options`)
- `LEAF_Request_Portal/templates/form.tpl:34` — Cancel Request (`.tools`)

**Key characteristics:**

- Same visual language as `.buttonNorm` (identical colors: `#e8f2ff` / `#2372b0`)
- Always contain `<img>` icons from `dynicons/`
- Used as toolbar action bars

---

#### 3.1.4 `.link` (Text-Styled Button)

**CSS Definition:**

- `LEAF_Request_Portal/css/style.css:395`

**Styles:**

```css
.link {
  text-decoration: underline;
  cursor: pointer;
  color: #445f87;
}
.link:hover {
  color: #f04e0b;
}
```

**File paths:**

- `LEAF_Request_Portal/templates/subindicators.tpl:152` — "formatting options" text link
- `LEAF_Request_Portal/templates/subindicators.tpl:807` — File delete action
- `LEAF_Nexus/templates/subindicators.tpl:184` — File delete action

**Key characteristics:**

- Applied to both `<button>` and `<span>` elements
- Looks like a hyperlink, not a button
- No background, no border

---

#### 3.1.5 `.submit` (Login Button)

**File path:**

- `LEAF_Request_Portal/templates/login.tpl:4`

**Structure:**

```html
<input name="login" type="submit" value="Login" class="submit" />
```

- One-off class used only on login page
- Uses `<input type="submit">` rather than `<button>`

---

#### Button Inconsistencies Observed

| Aspect           | `.buttonNorm` (legacy)         | `.usa-button` (USWDS)   |
| ---------------- | ------------------------------ | ----------------------- |
| Background color | `#e8f2ff` (light blue)         | `#005ea2` (USWDS blue)  |
| Hover color      | `#2372b0`                      | `#000` border           |
| Border           | `1px solid black`              | `2px solid transparent` |
| Border radius    | none (square)                  | `4px`                   |
| Font             | inherits page default          | `PublicSans-Bold`       |
| Icons            | `<img>` from `dynicons/`       | Text-only (no icons)    |
| Padding          | `2px-4px`                      | `.5rem-.75rem`          |
| Location         | Public-facing + admin (legacy) | Admin templates (newer) |

**Mixed usage within single files:**

- `LEAF_Request_Portal/admin/templates/mod_workflow.tpl` uses **both** `.buttonNorm` (lines 7-43, 1071, 1176, 1180) and `.usa-button` (line 546)

**`.buttonNorm` is defined 3 times** with slight variations:

- Portal public CSS: `padding: 4px`, `white-space: nowrap`, `font-size: 12px` on `button.buttonNorm`
- Portal admin CSS: `padding: 4px`, no `white-space` specified on base, `font-size: 12px` on `button.buttonNorm`
- Nexus CSS: `padding: 4px`, `text-align: left` (unique to Nexus), no `font-size` on `button.buttonNorm`

---

### 3.2 Form Inputs

#### Form Input System Overview

The codebase has **two coexisting form input systems:**

1. **Unstyled / inline-styled inputs** — The vast majority of form inputs across public-facing templates
2. **`.usa-input` / `.usa-select` / `.usa-textarea`** (USWDS) — Used in only 4 template files

---

#### 3.2.1 Unstyled / Inline-Styled Inputs (Legacy — Dominant Pattern)

**Typical HTML structures:**

Text input (inline-styled):

```html
<input
  type="text"
  id="<!--{$indicator.indicatorID}-->"
  name="<!--{$indicator.indicatorID}-->"
  value="<!--{$indicator.value}-->"
  style="width: 50%; font-size: 1.3em; font-family: monospace"
/>
```

Textarea (inline-styled):

```html
<textarea
  id="<!--{$indicator.indicatorID}-->"
  style="width: 97%; padding: 8px; font-size: 1.3em; font-family: monospace"
  rows="10"
>
<!--{$indicator.value}--></textarea
>
```

Select dropdown (inline-styled):

```html
<select
  id="<!--{$indicator.indicatorID}-->"
  name="<!--{$indicator.indicatorID}-->"
  style="width: 50%"
></select>
```

Date input (with background icon):

```html
<input
  type="text"
  title="date format MM/DD/YYYY"
  style="background: url(dynicons/?img=office-calendar.svg&w=16);
              background-repeat: no-repeat;
              background-position: 4px center;
              padding-left: 24px;
              font-size: 1.3em;
              font-family: monospace"
/>
```

Currency input:

```html
$<input
  type="text"
  id="<!--{$indicator.indicatorID}-->"
  style="font-size: 1.3em; font-family: monospace"
/>
(Amount in USD)
```

**File paths (representative):**

- `LEAF_Request_Portal/templates/subindicators.tpl:151,204,277,350,398,424,474,480,541,547` — All form field types
- `LEAF_Request_Portal/templates/initial_form.tpl:93,100,115,125` — Request creation form
- `LEAF_Request_Portal/templates/form.tpl:19` — Hidden submit
- `LEAF_Request_Portal/templates/login.tpl:4` — Login input
- `LEAF_Request_Portal/templates/import_from_webHR.tpl` — Import form
- `LEAF_Nexus/templates/subindicators.tpl` — Nexus form fields (parallel implementation)

**Key characteristics:**

- **No CSS classes** on most inputs — styling is 100% inline
- Repeated inline patterns: `font-size: 1.3em; font-family: monospace` appears on most text inputs
- Width set inline and **varies**: `50%`, `90%`, `97%`, or unset
- No consistent spacing/padding pattern
- `<select>` elements have no custom styling class
- Date fields use `dynicons/` calendar SVG as background image via inline style
- IDs are dynamically generated from Smarty template variables

---

#### 3.2.2 Custom Checkbox/Radio (`.leaf_check`)

**CSS Definition:**

- `LEAF_Request_Portal/css/style.css:54-112`

**Structure:**

```html
<input
  type="checkbox"
  class="icheck<!--{$id}--> leaf_check"
  id="<!--{$id}-->_<!--{$idx}-->"
  name="<!--{$id}-->"
  value="<!--{$option}-->"
/>
```

**Styles:**

```css
input[class*="icheck"][class*="leaf_check"],
input[class*="ischecked"][class*="leaf_check"] {
  opacity: 0; /* native checkbox hidden */
  margin-right: 0.2em;
  cursor: pointer;
  width: 20px;
}
span.leaf_check {
  /* custom visual replacement */
  position: absolute;
  top: 50%;
  transform: translate(0, -50%);
}
input:checked ~ span.leaf_check {
  background-color: #47e;
  border: 1px solid #47e;
}
```

**File paths:**

- `LEAF_Request_Portal/templates/subindicators.tpl:606,610,614,643,647,651` — Checkbox groups
- `LEAF_Request_Portal/templates/initial_form.tpl:138` — Category checkboxes (uses `ischecked leaf_check`)

**Key characteristics:**

- Hides native checkbox, replaces with custom `<span>` styled element
- Two class patterns exist: `icheck` + `leaf_check` and `ischecked` + `leaf_check`
- Custom check color: `#47e` (blue)
- Radio buttons get `border-radius: 50%` via `input[type="radio"] ~ span.leaf_check`

---

#### 3.2.3 USWDS Form Inputs (`.usa-input`, `.usa-select`, `.usa-textarea`)

**CSS Definition:**

- `libs/css/leaf.css` (minified)

**Styles:**

```css
.usa-input,
.usa-select,
.usa-textarea {
  display: block;
  color: #1b1b1b;
  margin-top: 0.25rem;
  padding: 0.5rem;
  width: 100%;
  height: 2.5rem;
  border: 1px solid #565c65;
  font-size: 1.06rem;
}
.usa-textarea {
  height: 10rem;
}
form.usa-form .usa-select {
  appearance: none;
  /* custom dropdown arrow via base64 SVG */
}
```

**File paths (ONLY 4 files use USWDS input classes):**

- `LEAF_Request_Portal/admin/templates/mod_system.tpl:16,19,22,29,49,59,64` — System settings form
- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:57,1126` — Group search and name input
- `LEAF_Request_Portal/templates/reports/orgChart_import.tpl` — Org chart import
- `LEAF_Nexus/admin/templates/orgChart_import.tpl` — Nexus org chart import

**Key characteristics:**

- Wrapped in `<form class="usa-form">` container (in `mod_system.tpl`)
- Full-width block display
- Consistent padding and font size
- Extremely limited adoption — **the vast majority of forms do not use these classes**

---

#### 3.2.4 Search Input (`.leaf-user-search-input`)

**File path:**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:57`

**Structure:**

```html
<input
  id="userGroupSearch"
  class="leaf-user-search-input"
  type="text"
  onkeyup="searchGroups();"
  disabled
/>
```

- A one-off LEAF-namespaced input class for search fields in admin

---

#### Form Input Inconsistencies Observed

| Aspect         | Legacy (inline)              | USWDS (`.usa-input`)  |
| -------------- | ---------------------------- | --------------------- |
| Styling method | Inline `style=""` attributes | CSS class             |
| Font size      | `1.3em` (monospace)          | `1.06rem`             |
| Font family    | `monospace`                  | inherits (sans-serif) |
| Width          | varies (`50%`, `90%`, `97%`) | `100%`                |
| Border         | browser default              | `1px solid #565c65`   |
| Padding        | `8px` (textarea) or default  | `.5rem`               |
| Files using    | ~14+ template files          | 4 template files      |

**Key finding:** The form rendering engine (`subindicators.tpl`) applies **all styling inline** per field type. There is no shared input class. Each field type (text, textarea, select, date, currency, checkbox, radio) has its own inline style block hardcoded in the template. This means any visual change to form inputs requires editing the template for each field type individually.

---

### 3.3 Alerts

#### Alert System Overview

There is **no unified alert/notification component**. The codebase uses multiple ad-hoc patterns for communicating status, errors, and warnings to users:

1. **`.alert`** — A global CSS class for server-rendered status banners
2. **`.leaf-no-results`** — A LEAF-namespaced error banner (1 usage)
3. **Inline validation errors** — `<span>` elements with inline `color: #c00` styles
4. **JS-generated error blocks** — Fully inline-styled `<div>` elements built in JavaScript
5. **`#status` containers** — Generic `<div>` elements populated dynamically via JS

---

#### 3.3.1 `.alert` (Server-Rendered Status Banner)

**CSS Definitions (duplicated across 2 stylesheets):**

- `LEAF_Request_Portal/css/style.css:412`
- `LEAF_Nexus/css/style.css:380`

**NOT defined in:**

- `LEAF_Request_Portal/admin/css/style.css` (no `.alert` rule)
- `libs/css/leaf.css` (no `.alert` rule)

**Styles (identical in both):**

```css
.alert {
  font-weight: bold;
  font-size: 16px;
  background-color: #9d0000;
  border: 2px solid black;
  padding: 4px;
}
.alert > span {
  color: white;
}
.alert a:link,
.alert a:visited {
  color: #bddcfb;
}
```

**Usage pattern — always a single-purpose status/warning banner:**

Status message (most common):

```html
{if $status != ''}
<div class="alert"><span>{$status}</span></div>
{/if}
```

PHI/PII warning (header inline):

```html
<div class="alert" style="display: inline">
  <span>Do not enter PHI/PII.</span>
</div>
```

Noscript fallback:

```html
<noscript>
  <div class="alert"><span>Javascript must be enabled...</span></div>
</noscript>
```

**File paths (representative):**

- `LEAF_Request_Portal/templates/main.tpl:103,117` — PHI warning + status banner
- `LEAF_Request_Portal/templates/main_iframe.tpl:47` — Status banner (iframe layout)
- `LEAF_Request_Portal/templates/menu.tpl:85` — Noscript warning
- `LEAF_Request_Portal/templates/login.tpl:3` — Login status (uses `<font class="alert">`)
- `LEAF_Request_Portal/admin/templates/login.tpl:3` — Login status (uses `<span class="alert">`)
- `LEAF_Request_Portal/admin/templates/main_iframe.tpl:41` — Status banner
- `LEAF_Nexus/templates/main.tpl:97` — Nexus status banner
- `LEAF_Nexus/templates/main_iframe.tpl:39` — Nexus iframe status
- `LEAF_Nexus/templates/login.tpl:3` — Nexus login status (uses `<font class="alert">`)
- `LEAF_Nexus/admin/templates/login.tpl:3` — Nexus admin login status (uses `<font class="alert">`)
- `LEAF_Nexus/admin/templates/main_iframe.tpl:38` — Nexus admin status
- `LEAF_Nexus/admin/templates/main.tpl:87` — Nexus admin status

**Key characteristics:**

- Single style: dark red background (`#9d0000`) with white text — **error-only**, no info/success/warning variants
- No close/dismiss button
- No icon
- Applied to 3 different HTML elements: `<div>`, `<span>`, and `<font>` (deprecated)
- The `<font class="alert">` usage appears in 3 login templates — uses a deprecated HTML element

---

#### 3.3.2 `.leaf-no-results` with `usa-alert` Classes (USWDS-Style Alert)

**CSS Definition:**

- `libs/css/leaf.css` (minified)

**Styles:**

```css
.leaf-no-results {
  display: none;
  height: auto;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f4e3db;
  border-left: 6px solid #d54309;
}
.leaf-no-results i {
  margin-right: 0.5rem;
  font-size: 1.72rem;
  vertical-align: sub;
}
.leaf-no-results p {
  margin: 0;
}
```

**Note:** The markup uses `usa-alert usa-alert--error usa-alert--slim` classes, but **no `usa-alert` CSS rules exist** anywhere in the codebase. The visual styling comes entirely from `.leaf-no-results`.

**File path (only 1 usage found):**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:60`

**Structure:**

```html
<div
  id="noResultsMsg"
  class="leaf-no-results usa-alert usa-alert--error usa-alert--slim"
  role="alert"
>
  <p>
    <i class="fas fa-exclamation-circle" alt=""></i>No matching groups or users
    found.
  </p>
</div>
```

**Key characteristics:**

- Uses Font Awesome icon (`fas fa-exclamation-circle`) — unlike all other alert patterns
- Uses USWDS classes that have no corresponding CSS (non-functional class names)
- Has `role="alert"` for accessibility
- Hidden by default (`display: none`), shown via JS
- Visual style: salmon background (`#f4e3db`) with orange-red left border (`#d54309`)

---

#### 3.3.3 Inline Validation Errors (Form Field Level)

**No CSS class** — all styling is inline.

**Common pattern:**

```html
<span
  id="<!--{$indicator.indicatorID}-->_error"
  style="color: #c00; display: none"
>
  Error message text
</span>
```

**Error messages documented:**

- `"Data must be numeric"` — numeric field validation (`subindicators.tpl:425`)
- `"Please use MM/DD/YYYY date format."` — date field validation (`subindicators.tpl:482`)
- `"Value must be a valid currency"` — currency field validation (`subindicators.tpl:548`)
- `"Invalid Group"` — group selector validation (`subindicators.tpl:892`)

**Show/hide mechanism:** jQuery `.show('fade')` / `.hide('fade')` with scroll-to-error behavior:

```javascript
$("html, body").animate({
  scrollTop: $("#indicatorID_error").offset().top - 50,
});
$("#indicatorID_error").show("fade");
```

**File paths:**

- `LEAF_Request_Portal/templates/subindicators.tpl:425,482,548,892` — Field validation errors
- `LEAF_Request_Portal/templates/file_form_error.tpl:2` — File upload error (`<span style="color:#c00;">`)

**Key characteristics:**

- No CSS class — purely inline `color: #c00` (dark red)
- Hidden by default (`display: none`)
- ID pattern: `{indicatorID}_error`
- Text-only, no background, no border, no icon
- Also used with `status_error` class in `subindicators.tpl:763-786` — but this class has **no CSS definition** anywhere

---

#### 3.3.4 JS-Generated Error Blocks (Workflow Errors)

**No CSS class** — fully inline-styled HTML strings built in JavaScript.

**Pattern (from `workflow.js`):**

```javascript
'<div style="border: 2px solid black; text-align: center; font-size: 24px;
             font-weight: bold; background: white; padding: 16px; width: 95%">
  <img src="dynicons/?img=dialog-error.svg&w=48" style="vertical-align: middle" alt="" />
  ' + errors + '
  <br /><span style="font-size: 14px; font-weight: normal">
    After resolving the errors,
    <button id="workflowbtn_tryagain" class="buttonNorm">click here to try again</button>.
  </span>
</div>'
```

**File paths:**

- `LEAF_Request_Portal/js/workflow.js:163-167` — Form validation error block
- `LEAF_Request_Portal/js/workflow.js:175-177` — Session expired error block

**Key characteristics:**

- White background with black border (opposite of `.alert` which is dark red)
- Uses `dynicons/?img=dialog-error.svg` icon at 48px
- Contains action button (`buttonNorm`) for retry
- All styling via inline `style=""` attributes
- Font size: 24px heading + 14px body text

---

#### 3.3.5 `#status` Containers (Dynamic Status Messages)

**No shared class or structure** — generic `<div id="status">` elements with varying inline styles.

**Variations found:**

Import status (black background):

```html
<div
  id="status"
  style="background-color: black; color: white; font-weight: bold; font-size: 140%"
></div>
```

(`LEAF_Request_Portal/templates/reports/LEAF_import_data.tpl:41`)

Inbox status (red text):

```html
<div
  id="status"
  style="text-align: center; color: red; font-weight: bold"
></div>
```

(`LEAF_Request_Portal/templates/reports/LEAF_Inbox.tpl:1117`)

Unstyled:

```html
<div id="status"></div>
```

(`LEAF_Request_Portal/templates/reports/example.tpl:98`)

Paragraph:

```html
<p id="status"></p>
```

(`LEAF_Nexus/admin/templates/orgChart_import.tpl:672`)

**Key characteristics:**

- Same `id="status"` used across different templates with completely different inline styles
- Populated dynamically via `$('#status').html(...)` or `document.querySelector('#status').innerText = ...`
- No consistent visual treatment

---

#### 3.3.6 Inline Warning Banners (One-Off Patterns)

**Parallel processing review banner:**

```html
<div
  id="pp_banner"
  style="background-color: #b74141; padding: 8px; margin: 0px;
     color: white; text-shadow: black 0.1em 0.1em 0.2em; font-weight: bold;
     text-align: center; font-size: 120%"
>
  Please review your request before submitting
</div>
```

(`LEAF_Request_Portal/templates/submitForm_parallel_processing.tpl:48`)

**Required field markers:**

```html
<span style="color: #c00">*Required</span>
```

(`LEAF_Request_Portal/admin/templates/mod_workflow.tpl:1217,1225`)

**Workflow admin error message:**

```html
<div id="actionText_error_message" class="error_message"></div>
```

CSS: `LEAF_Request_Portal/admin/css/mod_workflow.css:152`

```css
.error_message {
  font-weight: bolder;
  color: #b50909;
}
```

(`LEAF_Request_Portal/admin/templates/mod_workflow.tpl:1219`)

---

#### 3.3.7 Status Indicators in `view_status.tpl` (Dependency Checklist)

**Fully inline-styled, color-coded status spans:**

Success (green):

```html
<span style="padding: 4px; margin: 4px; color: green; font-weight: bold">
  <img src="dynicons/?img=dialog-apply.svg&w=16" alt="checked" /> Description
</span>
```

Pending (gray):

```html
<span style="padding: 4px; margin: 4px; color: gray">
  [ ? ] Description (Pending)
</span>
```

Failed/Not met (red):

```html
<span style="padding: 4px; margin: 4px; color: red">
  <img src="dynicons/?img=process-stop.svg&w=16" alt="not checked" />
  Description
</span>
```

**File path:**

- `LEAF_Request_Portal/templates/view_status.tpl:50,52,54`

---

#### Alert Inconsistencies Observed

| Aspect         | `.alert`             | `.leaf-no-results`             | Inline validation | JS error blocks   | `#status`      |
| -------------- | -------------------- | ------------------------------ | ----------------- | ----------------- | -------------- |
| Styling method | CSS class            | CSS class + dead USWDS classes | Inline `style`    | Inline `style`    | Inline `style` |
| Background     | `#9d0000` (dark red) | `#f4e3db` (salmon)             | none              | white             | varies         |
| Text color     | white                | inherits                       | `#c00`            | black             | varies         |
| Border         | `2px solid black`    | `6px left solid #d54309`       | none              | `2px solid black` | none           |
| Icon           | none                 | Font Awesome                   | none              | `dynicons/` SVG   | none           |
| Dismiss        | none                 | none                           | auto-hides on fix | retry button      | none           |
| Accessibility  | none                 | `role="alert"`                 | none              | none              | none           |
| Files using    | ~12 templates        | 1 template                     | 5+ templates      | 1 JS file         | 4+ templates   |

**Red color values used for errors across the codebase:**

- `#9d0000` — `.alert` class background
- `#c00` / `#c00000` — inline validation text, required markers
- `#B50909` — `.error_message` class (workflow admin)
- `#d54309` — `.leaf-no-results` border
- `#b74141` — parallel processing banner background
- `red` (CSS keyword) — `#status` text, `view_status.tpl` failed items, remove buttons
- `#d83933` — `.usa-button--secondary` (destructive action, not alert)

**Key findings:**

- **No info, success, or warning alert variants exist** — `.alert` is error-only
- **The `<font>` HTML element** (deprecated since HTML 4.01) is used in 3 login templates with `class="alert"`
- **`usa-alert` CSS classes are used in markup** (`mod_groups.tpl:60`) but have **no CSS definitions** — the styling is provided by `.leaf-no-results` instead
- **`status_error`** class is toggled in JS (`subindicators.tpl:763-786`) but has **no CSS definition** anywhere
- **No accessibility attributes** on the dominant `.alert` pattern — only `.leaf-no-results` has `role="alert"`

---

### 3.4 Tables

#### Table System Overview

The codebase has **five distinct table patterns**, each with its own CSS class and visual treatment:

1. **`table.leaf_grid`** — Primary search results / data grid (JS-generated via `formGrid.js`)
2. **`table.table`** — Generic data table (grid inputs, workflow admin tables)
3. **`table.agenda`** — History/log table (simple two-column layout)
4. **`table.usa-table`** (USWDS) — Admin history/disabled fields tables (2 usages)
5. **`.table-bordered`** — Admin groups table (1 usage, module-specific CSS)

Plus unstyled/inline-styled tables used for layout purposes.

---

#### 3.4.1 Evidence Summary

**`table.leaf_grid`:**

- `LEAF_Request_Portal/js/formGrid.js:45-49` — JS structure generation
- `LEAF_Request_Portal/css/style.css:686-728` — CSS definition (Portal public)
- `LEAF_Request_Portal/admin/css/style.css:229-271` — CSS definition (Portal admin, identical)
- `LEAF_Nexus/css/style.css:635-643` — CSS definition (Nexus, different)

**`table.table`:**

- `LEAF_Request_Portal/templates/subindicators.tpl:60-67` — Grid input table
- `LEAF_Request_Portal/admin/templates/mod_workflow.tpl:163,1160` — Event/action list tables
- `LEAF_Request_Portal/templates/view_reports.tpl:246` — JS-generated report table
- `LEAF_Request_Portal/css/style.css:602-627` — CSS definition

**`table.agenda`:**

- `LEAF_Request_Portal/templates/view_status.tpl:9` — Request history
- `LEAF_Request_Portal/templates/view_about.tpl:10` — System info
- `LEAF_Request_Portal/templates/ajaxIndicatorLog.tpl:3` — Field modification log
- `LEAF_Request_Portal/templates/print_form.tpl:331` — JS-generated history dialog
- `LEAF_Nexus/templates/view_history.tpl:13` — Nexus history

**`table.usa-table`:**

- `LEAF_Request_Portal/admin/templates/view_history.tpl:34` — Admin history table
- `LEAF_Request_Portal/admin/templates/view_disabled_fields.tpl:7` — Disabled fields recovery

**`.table-bordered`:**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:519,520` — JS-generated member tables
- `LEAF_Request_Portal/admin/css/mod_groups.css:118-160` — CSS definition

---

#### 3.4.2 Extracted Measured Values

##### `table.leaf_grid` (Search Results Grid)

**Portal public + admin CSS (identical):**

| Property                         | Value                                               |
| -------------------------------- | --------------------------------------------------- |
| `border-collapse`                | `separate`                                          |
| `border-spacing`                 | `0`                                                 |
| `margin`                         | `2px`                                               |
| **Header (`th`)**                |                                                     |
| `font-weight`                    | `normal`                                            |
| `padding`                        | `4px 2px 4px 2px`                                   |
| `font-size`                      | `12px`                                              |
| `background-color`               | `rgb(209, 223, 255)` (light blue)                   |
| `border-top`                     | `1px solid black`                                   |
| **Header hover/focus**           |                                                     |
| `background-color`               | `#79a2ff` (brighter blue)                           |
| **Body (`tbody`)**               |                                                     |
| `background-color`               | `white`                                             |
| **Body cells (`td`)**            |                                                     |
| `padding`                        | `8px`                                               |
| **All cells (th, td, tfoot td)** |                                                     |
| `border-bottom`                  | `1px solid black`                                   |
| `border-right`                   | `1px solid black`                                   |
| `transition`                     | `filter 0.25s`                                      |
| **First column**                 |                                                     |
| `border-left`                    | `1px solid black`                                   |
| **Loading state**                |                                                     |
| `background`                     | `linear-gradient(90deg, #ffffff, #dbdbdb, #ffffff)` |
| `animation`                      | `leaf_grid-loading 30s linear infinite`             |
| **Row hover**                    | Not explicitly defined in code                      |
| **Row striping**                 | Not explicitly defined in code                      |
| **Border radius**                | Not explicitly defined in code                      |
| **Shadow**                       | Not explicitly defined in code                      |
| **Font family**                  | Not explicitly defined in code (inherits)           |
| **Line height**                  | Not explicitly defined in code                      |

**Nexus `table.leaf_grid` (DIFFERENT):**

| Property                | Value                                  |
| ----------------------- | -------------------------------------- |
| `border`                | `1px solid black`                      |
| `border-collapse`       | `collapse`                             |
| `margin`                | `2px`                                  |
| Body `background-color` | `white`                                |
| Header styling          | Not explicitly defined (no `th` rules) |
| Cell padding            | Not explicitly defined                 |

**Wrapper:** `<thead>` has inline `style="position: sticky; top: 0px"` for sticky header.

**Scrollbar wrapper:** `div.tableinput` provides horizontal scroll for grid inputs:

```css
div.tableinput {
  overflow-x: scroll;
}
div.tableinput::-webkit-scrollbar:horizontal {
  height: 11px;
}
div.tableinput::-webkit-scrollbar-thumb {
  border-radius: 8px;
  border: 2px solid white;
  background-color: rgba(0, 0, 0, 0.5);
}
```

(`LEAF_Request_Portal/css/style.css:454-470`)

**Sorting:** Headers are clickable (`cursor: pointer` set via JS), with a `<span>` for sort direction indicator. Sort state toggled in JS — no CSS class for sorted state.

---

##### `table.table` (Generic Data Table)

**Portal public CSS:**

| Property             | Value                                   |
| -------------------- | --------------------------------------- |
| `border`             | `1px solid black`                       |
| `border-collapse`    | `collapse`                              |
| `margin`             | `2px`                                   |
| `color`              | `black`                                 |
| **Header (`thead`)** |                                         |
| `background-color`   | `#e0e0e0` (light gray)                  |
| `text-align`         | `center`                                |
| **Body (`tbody`)**   |                                         |
| `background-color`   | `white`                                 |
| **Cells (`td`)**     |                                         |
| `padding`            | `6px`                                   |
| `border`             | `1px solid black`                       |
| `font-size`          | `11px`                                  |
| `font-family`        | `verdana`                               |
| **Row hover**        | Not explicitly defined on base `.table` |
| **Row striping**     | Not explicitly defined                  |

**Admin CSS (slight difference):**

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| Same as public except: |                                                  |
| `td font-size`         | `14px` (vs `11px` in public)                     |
| `td font-family`       | Not specified (inherits, vs `verdana` in public) |

**Related row-level classes:**

`.table_editable` (hover on editable rows):

```css
.table_editable:hover {
  background-color: #2372b0; /* Portal public + admin */
  color: white;
}
```

Nexus has different hover: `background-color: #fffdcc` (light yellow).

`.table_priority` (priority column hover):

```css
.table_priority:hover {
  background-color: #d6edff;
}
.table_priority img {
  visibility: hidden;
  padding: 4px;
}
.table_priority:hover img {
  visibility: visible;
}
```

`.table_sortable`:

```css
.table_sortable {
  color: gold;
  cursor: pointer;
}
```

`.table_important`:

```css
.table_important {
  font-size: 150%;
  font-weight: bold;
}
```

---

##### `table.agenda` (History/Log Table)

**CSS Definition:**

- `LEAF_Request_Portal/css/style.css:681-764`
- `LEAF_Nexus/css/style.css:621-633`

| Property                  | Value                                    |
| ------------------------- | ---------------------------------------- |
| `border`                  | `1px solid black`                        |
| `border-collapse`         | `collapse`                               |
| **Cells (`th` and `td`)** |                                          |
| `padding`                 | `8px 4px 8px 4px`                        |
| `border`                  | `1px solid black`                        |
| **Links**                 |                                          |
| `font-weight`             | `bold`                                   |
| **Header background**     | Not explicitly defined (browser default) |
| **Row hover**             | Not explicitly defined                   |
| **Row striping**          | Not explicitly defined                   |
| **Font size**             | Not explicitly defined (inherits)        |
| **Font family**           | Not explicitly defined (inherits)        |

**Typical structure:**

```html
<table class="agenda">
  <thead>
    <tr>
      <th>Date/Author</th>
      <th>Data</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>...</td>
      <td>...</td>
    </tr>
  </tbody>
</table>
```

---

##### `table.usa-table` (USWDS Table)

**CSS Definition:**

- `libs/css/leaf.css` (minified)

| Property                  | Value                  |
| ------------------------- | ---------------------- |
| `font-size`               | `.9rem`                |
| `line-height`             | `1.5`                  |
| `border-collapse`         | `collapse`             |
| `border-spacing`          | `0`                    |
| `color`                   | `#1b1b1b`              |
| `margin`                  | `1.25rem 0`            |
| **Cells (`th` and `td`)** |                        |
| `background-color`        | `#fff`                 |
| `border`                  | `1px solid #1b1b1b`    |
| `font-weight`             | `400` (normal)         |
| `padding`                 | `.5em 1em`             |
| **Header (`th`)**         |                        |
| `font-weight`             | `bold`                 |
| `background-color`        | `#dfe1e2` (USWDS gray) |
| **Borderless variant**    |                        |
| `border`                  | `0`                    |
| `border-bottom`           | `1px solid #1b1b1b`    |
| `background-color`        | `transparent`          |
| **Row hover**             | Not explicitly defined |
| **Row striping**          | Not explicitly defined |

**Usage with LEAF utility classes:**

```html
<table
  class="usa-table usa-table--borderless leaf-width100pct"
  style="width: 760px"
></table>
```

(`LEAF_Request_Portal/admin/templates/view_history.tpl:34`)

```html
<table class="usa-table leaf-whitespace-normal"></table>
```

(`LEAF_Request_Portal/admin/templates/view_disabled_fields.tpl:7`)
Note: `leaf-whitespace-normal` has **no CSS definition** in `libs/css/leaf.css`.

---

##### `.table-bordered` (Groups Module Table)

**CSS Definition:**

- `LEAF_Request_Portal/admin/css/mod_groups.css:118-160`

| Property                  | Value                          |
| ------------------------- | ------------------------------ |
| `border-collapse`         | `collapse`                     |
| `font-size`               | `0.9em`                        |
| `font-family`             | `sans-serif`                   |
| `min-width`               | `700px`                        |
| `box-shadow`              | `0 0 20px rgba(0, 0, 0, 0.15)` |
| **Header (`thead tr`)**   |                                |
| `background-color`        | `#005ea2` (USWDS blue)         |
| `color`                   | `#ffffff`                      |
| `text-align`              | `left`                         |
| **Cells (`th` and `td`)** |                                |
| `padding`                 | `7px 10px`                     |
| **Body rows**             |                                |
| `border-bottom`           | `1px solid #dddddd`            |
| **Alternate rows (even)** |                                |
| `background-color`        | `#f3f3f3`                      |
| **Row hover**             |                                |
| `background-color`        | `#adebff`                      |
| **Last row**              |                                |
| `border-bottom`           | `2px solid #dddddd`            |
| **Active row**            |                                |
| `font-weight`             | `bold`                         |
| `color`                   | `#009879`                      |

This is the **most feature-complete** table style in the codebase — it's the only one with row striping, row hover, shadow, and an active row state.

---

##### Unstyled/Layout Tables

**`initial_form.tpl:90`** — Uses `<table>` for form layout (not data):

```html
<table
  id="step1_questions"
  style="width: 100%; margin: 0; padding: 1rem 0.5rem"
>
  <tr>
    <td>Contact Info</td>
    <td><input ... /></td>
  </tr>
</table>
```

**`view_reports.tpl:219`** — Unstyled JS-generated table:

```html
<table style="min-width: 300px"></table>
```

---

#### 3.4.3 Figma Build Specification

##### COMPONENT: `leaf_grid` (Search Results Grid)

**FRAME:**

- Layout direction: Column (rows stacked vertically)
- Outer margin: `2px`
- Table width: Fluid (fills container)
- Border-collapse: `separate` with `spacing: 0` (creates individual cell borders)

**HEADER ROW:**

- Background color: `rgb(209, 223, 255)` / approximately `#d1dfff`
- Text style: Font weight `normal`, font size `12px`, inherited font family
- Cell padding: `4px` top/bottom, `2px` left/right
- Border: top `1px solid black`, right `1px solid black`, bottom `1px solid black`
- First cell: additional left `1px solid black`
- Cursor: `pointer` (set via JS for sortable columns)

**BODY ROW:**

- Background color: `white`
- Alternate row color: Not explicitly defined in code
- Text style: Inherited font size, inherited font family
- Cell padding: `8px` all sides
- Border: right `1px solid black`, bottom `1px solid black`
- First cell: additional left `1px solid black`

**INTERACTION STATES:**

- Header hover: `background-color: #79a2ff`
- Header focus: `background-color: #79a2ff`
- Row hover: Not explicitly defined in code
- Selected row: Not explicitly defined in code
- Loading state: Shimmer gradient `linear-gradient(90deg, #fff, #dbdbdb, #fff)` animated over 30s
- Sorted column indicator: `<span>` element (content set via JS), no CSS class for sort direction

---

##### COMPONENT: `table` (Generic Data Table)

**FRAME:**

- Layout direction: Column
- Outer border: `1px solid black`
- Border-collapse: `collapse`
- Margin: `2px`
- Table width: Not explicitly defined (content-driven)

**HEADER ROW:**

- Background color: `#e0e0e0` (light gray)
- Text alignment: `center`
- Text style: Inherited weight, font
- Cell padding: `6px` (via `td` rule — no separate `th` padding)
- Border: `1px solid black`

**BODY ROW (Portal public):**

- Background color: `white`
- Text style: Font size `11px`, font family `verdana`
- Cell padding: `6px`
- Border: `1px solid black`

**BODY ROW (Portal admin — differs):**

- Text style: Font size `14px`, inherited font family (no `verdana`)

**INTERACTION STATES:**

- Hover (`.table_editable`): background `#2372b0`, text `white`
- Hover (`.table_priority`): background `#d6edff`
- Selected row: Not explicitly defined in code
- Static only for base `.table` rows

---

##### COMPONENT: `agenda` (History/Log Table)

**FRAME:**

- Layout direction: Column
- Outer border: `1px solid black`
- Border-collapse: `collapse`
- Table width: Not explicitly defined (content-driven)

**HEADER ROW:**

- Background color: Not explicitly defined in code (browser default)
- Text style: Not explicitly defined in code
- Cell padding: `8px` top/bottom, `4px` left/right
- Border: `1px solid black`

**BODY ROW:**

- Background color: Not explicitly defined in code (inherits)
- Cell padding: `8px` top/bottom, `4px` left/right
- Border: `1px solid black`
- Links: `font-weight: bold`

**INTERACTION STATES:**

- Static only — no hover, focus, or selected states defined

---

##### COMPONENT: `usa-table` (USWDS Table)

**FRAME:**

- Layout direction: Column
- Border-collapse: `collapse`
- Margin: `1.25rem 0`
- Table width: `100%` when `leaf-width100pct` utility applied

**HEADER ROW:**

- Background color: `#dfe1e2` (USWDS gray)
- Text style: `font-weight: bold`, font size `.9rem`, line height `1.5`
- Cell padding: `.5em 1em`
- Border: `1px solid #1b1b1b`
- Borderless variant: `border: 0`, `border-bottom: 1px solid #1b1b1b`, transparent background

**BODY ROW:**

- Background color: `#fff`
- Text style: `font-weight: 400`, font size `.9rem`
- Cell padding: `.5em 1em`
- Border: `1px solid #1b1b1b`
- Borderless variant: `border: 0`, `border-bottom: 1px solid #1b1b1b`, transparent background

**INTERACTION STATES:**

- Static only — no hover, focus, or selected states defined

---

##### COMPONENT: `table-bordered` (Groups Module Table)

**FRAME:**

- Layout direction: Column
- Border-collapse: `collapse`
- Min-width: `700px`
- Font size: `0.9em`
- Font family: `sans-serif`
- Shadow: `0 0 20px rgba(0, 0, 0, 0.15)`

**HEADER ROW:**

- Background color: `#005ea2` (USWDS blue)
- Text color: `#ffffff`
- Text alignment: `left`
- Cell padding: `7px 10px`

**BODY ROW:**

- Background color: Not explicitly defined (inherits)
- Alternate row (even): `background-color: #f3f3f3`
- Cell padding: `7px 10px`
- Border-bottom: `1px solid #dddddd`
- Last row: `border-bottom: 2px solid #dddddd`

**INTERACTION STATES:**

- Hover: `background-color: #adebff`
- Active row (`.active-row`): `font-weight: bold`, `color: #009879`
- Focus: Not explicitly defined in code
- Disabled: Not explicitly defined in code

---

#### 3.4.4 Table Inconsistencies Observed

**Header background colors across table types:**

| Table Type        | Header Background                             |
| ----------------- | --------------------------------------------- |
| `leaf_grid`       | `rgb(209, 223, 255)` / `#d1dfff` (light blue) |
| `.table`          | `#e0e0e0` (light gray)                        |
| `.agenda`         | Not defined (browser default)                 |
| `.usa-table`      | `#dfe1e2` (USWDS gray)                        |
| `.table-bordered` | `#005ea2` (USWDS blue, white text)            |

**Cell padding across table types:**

| Table Type              | Cell Padding |
| ----------------------- | ------------ |
| `leaf_grid th`          | `4px 2px`    |
| `leaf_grid td`          | `8px`        |
| `.table td`             | `6px`        |
| `.agenda th/td`         | `8px 4px`    |
| `.usa-table th/td`      | `.5em 1em`   |
| `.table-bordered th/td` | `7px 10px`   |

**Border approaches:**

| Table Type        | Border Strategy                                                   |
| ----------------- | ----------------------------------------------------------------- |
| `leaf_grid`       | `border-collapse: separate; border-spacing: 0` + per-cell borders |
| `.table`          | `border-collapse: collapse` + `1px solid black` on table + cells  |
| `.agenda`         | `border-collapse: collapse` + `1px solid black` on table          |
| `.usa-table`      | `border-collapse: collapse` + `1px solid #1b1b1b`                 |
| `.table-bordered` | `border-collapse: collapse` + `1px solid #dddddd` bottom only     |

**Font sizes (`.table` class only):**

- Portal public: `11px`, font family `verdana`
- Portal admin: `14px`, no font family (inherits)
- Same class name, different visual output

**Nexus vs Portal `leaf_grid` divergence:**

- Portal: `border-collapse: separate`, `border-spacing: 0`, full `th` styling (background, padding, font-size, hover state)
- Nexus: `border-collapse: collapse`, `1px solid black` outer border, **no `th` styling at all**

**Hover behavior inconsistency:**

- Only `.table-bordered` (1 file) has row hover
- `.table_editable` hover is applied per-row via class — Portal uses `#2372b0` (blue), Nexus uses `#fffdcc` (yellow)
- `leaf_grid` has no row hover, only header hover
- `.agenda` and `.usa-table` have no hover states at all

**Row striping:**

- Only `.table-bordered` has it (`nth-of-type(even)`: `#f3f3f3`)
- No other table type has alternating row colors

**Structural inconsistency in `mod_workflow.tpl`:**

- JS-generated tables use `class="table" border="1"` — the HTML `border` attribute is deprecated

**Dead utility class:**

- `leaf-whitespace-normal` is used in `view_disabled_fields.tpl:7` but has no CSS definition

**Layout tables:**

- `initial_form.tpl:90` uses `<table>` for form layout (not tabular data) — all styling inline

---

### 3.5 Cards / Containers

#### Card/Container System Overview

The codebase has **six distinct card/container patterns**:

1. **`.menuButton` / `.menuButtonSmall`** — Legacy homepage dashboard cards (float-based layout)
2. **`.leaf-admin-button`** — Modern admin menu cards (inline-block, LEAF-namespaced)
3. **`.leaf-sitemap-card`** — Sitemap page cards (flex-based layout)
4. **`a.custom_menu_card`** — Site Designer Vue component cards
5. **`.sidenav`** — Admin sidebar container panel
6. **`.entry_info` / `.entry_warning` / `.entry_error`** — Inline notification/callout containers

Plus **inline-styled section containers** used for form steps and content panels.

---

#### 3.5.1 Evidence Summary

**`.menuButton` / `.menuButtonSmall`:**

- `LEAF_Request_Portal/templates/view_homepage.tpl:9,18,26,35,43` — Homepage cards (`.menuButtonSmall`)
- `LEAF_Nexus/admin/templates/view_admin.tpl:4,12,20,28` — Nexus admin cards (`.menuButton`)
- `LEAF_Request_Portal/templates/menu_links.tpl:3` — Header dropdown cards
- `LEAF_Request_Portal/css/style.css:810-881` — CSS definition
- `LEAF_Nexus/css/style.css:681-750` — CSS definition (identical)

**`.leaf-admin-button`:**

- `LEAF_Request_Portal/admin/templates/view_admin_menu.tpl:5,14,20,38,46,54` — Admin panel cards
- `libs/css/leaf.css` — CSS definition (minified)

**`.leaf-sitemap-card`:**

- `LEAF_Request_Portal/templates/sitemap.tpl:16` — Sitemap page cards
- `libs/css/leaf.css` — CSS definition (minified)

**`a.custom_menu_card`:**

- `app/libs/js/vue-dest/site_designer/LEAF_Designer.css` — Vue component CSS (minified)

**`.sidenav`:**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:27,36` — Admin sidebar panels
- `LEAF_Request_Portal/admin/templates/mod_system.tpl` — System settings sidebar
- `libs/css/leaf.css` — CSS definition (minified)

**`.entry_info` / `.entry_warning` / `.entry_error`:**

- `LEAF_Request_Portal/templates/initial_form.tpl:147` — Info callout
- `LEAF_Request_Portal/css/style.css:730-741` — CSS (info only in public)
- `LEAF_Request_Portal/admin/css/style.css:813-827` — CSS (all three variants)
- `docker/vue-app/src/form_editor/components/dialog_content/IndicatorEditingDialog.js:774,815,855` — Vue info/warning

---

#### 3.5.2 Extracted Measured Values

##### `.menuButton` (Large Dashboard Card)

| Property          | Value                                                                |
| ----------------- | -------------------------------------------------------------------- |
| `float`           | `left`                                                               |
| `width`           | `350px`                                                              |
| `height`          | `70px`                                                               |
| `cursor`          | `pointer`                                                            |
| `margin`          | `14px`                                                               |
| `box-shadow`      | `0 2px 6px #8e8e8e`                                                  |
| `transition`      | `box-shadow 0.3s ease`                                               |
| **Hover / Focus** |                                                                      |
| `box-shadow`      | `0 4px 6px 2px #8e8e8e`                                              |
| `outline-style`   | `dotted`                                                             |
| **Background**    | Set inline per card (e.g., `#cb9ed7`, `#ffefa5`, `#c6ffbe`, `black`) |
| **Border**        | Not explicitly defined in code                                       |
| **Border radius** | Not explicitly defined in code                                       |
| **Padding**       | Not explicitly defined in code                                       |

**Child elements:**

`.menuIcon`:

- `float: left`, `width: 96px`, `height: 96px`, `padding-right: 4px`

`.menuText`:

- `font-size: 20px`, `font-weight: bold`, `line-height: 160%`

`.menuDesc`:

- `font-size: 14px`

**Typical structure:**

```html
<a href="..." role="button">
  <span class="menuButton" style="background-color: #cb9ed7">
    <img class="menuIcon" src="dynicons/?img=icon.svg&w=96" alt="" />
    <span class="menuText">Title</span><br />
    <span class="menuDesc">Description text</span>
  </span>
</a>
```

---

##### `.menuButtonSmall` (Small Dashboard Card)

| Property          | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| `float`           | `left`                                                                          |
| `width`           | `280px`                                                                         |
| `height`          | `56px`                                                                          |
| `cursor`          | `pointer`                                                                       |
| `margin`          | `12px`                                                                          |
| `padding`         | `2px`                                                                           |
| `box-shadow`      | `0 2px 6px #8e8e8e`                                                             |
| `transition`      | `box-shadow 0.3s ease`                                                          |
| **Hover / Focus** |                                                                                 |
| `box-shadow`      | `0 4px 6px 2px #8e8e8e`                                                         |
| `outline-style`   | `dotted`                                                                        |
| **Background**    | Set inline per card (e.g., `#2372b0`, `#c9c9c9`, `#b6ef6d`, `#7eb2b3`, `black`) |
| **Border**        | Not explicitly defined in code                                                  |
| **Border radius** | Not explicitly defined in code                                                  |

**Child elements:**

`.menuIconSmall`:

- `float: left`, `width: 76px`, `height: 76px`, `padding-right: 4px`

`.menuTextSmall`:

- `font-size: 16px`, `font-weight: bold`, `line-height: 160%`

`.menuDescSmall`:

- `font-size: 12px`

**Typical structure:**

```html
<a href="..." role="button">
  <span class="menuButtonSmall" style="background-color: #2372b0; color: white">
    <img class="menuIconSmall" src="dynicons/?img=icon.svg&w=76" alt="" />
    <span class="menuTextSmall" style="color: white">Title</span><br />
    <span class="menuDescSmall" style="color: white">Description</span>
  </span>
</a>
```

Note: Text color overrides applied inline per card when background is dark.

---

##### `.leaf-admin-button` (Admin Menu Card)

| Property                                  | Value                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `display`                                 | `inline-block`                                                                           |
| `width`                                   | `19.4rem`                                                                                |
| `height`                                  | `3.4rem`                                                                                 |
| `cursor`                                  | `pointer`                                                                                |
| `margin`                                  | `.6rem .6rem`                                                                            |
| `box-shadow`                              | `2px 2px 2px rgba(0, 0, 20, 0.2)`                                                        |
| `border-radius`                           | `4px`                                                                                    |
| `padding`                                 | `.5rem .5rem .4rem .1rem`                                                                |
| `text-decoration`                         | `none`                                                                                   |
| `transition`                              | `box-shadow .4s ease, background-color 1.4s ease`                                        |
| `color`                                   | `#3d4551`                                                                                |
| **Border**                                | `2px solid transparent` (implicit from hover rule)                                       |
| **Background**                            | Set via utility classes (e.g., `.bg-blue-cool-10`: `#dae9ee`, `.bg-yellow-5`: `#faf3d1`) |
| **Hover / Focus / Active**                |                                                                                          |
| `box-shadow`                              | `2px 2px 4px rgba(0, 0, 20, 0.4)`                                                        |
| Blue variant hover (`.lf-trans-blue`)     | `background-color: #cfe8ff`                                                              |
| Yellow variant hover (`.lf-trans-yellow`) | `background-color: #f2e5a4`                                                              |

**Child elements:**

`.leaf-admin-btnicon`:

- `font-size: 1.7rem`, `float: left`, `margin: .3rem .4rem`
- Icon color via utility class (e.g., `.text-blue-cool-50`: `#3a7d95`)

`.leaf-admin-btntitle`:

- `font-size: 1rem`, `line-height: 1.4rem`, `font-family: "PublicSans-Bold", sans-serif`
- `display: block`, `margin-left: 2.9rem`

`.leaf-admin-btndesc`:

- `font-size: .8rem`, `display: block`, `margin-left: 2.9rem`

**Typical structure:**

```html
<a
  href="?a=mod_groups"
  role="button"
  class="leaf-admin-button bg-yellow-5 lf-trans-yellow"
>
  <i class="leaf-admin-btnicon fas fa-users text-yellow-40" title="..."></i>
  <span class="leaf-admin-btntitle">User Access Groups</span>
  <span class="leaf-admin-btndesc">Modify users and groups</span>
</a>
```

---

##### `.leaf-sitemap-card` (Sitemap Card)

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| `flex`             | `0 1 30%`                                    |
| `min-width`        | `20rem`                                      |
| `max-width`        | `23rem`                                      |
| `margin`           | `.5rem 1rem .5rem 0`                         |
| `padding`          | `1.3rem`                                     |
| `box-shadow`       | `0px 2px 3px #a7a9aa`                        |
| `border`           | `1px solid #ccc`                             |
| `height`           | `5.8rem`                                     |
| `background-color` | `#fff` (default, overridden inline per card) |
| `border-radius`    | `5px`                                        |
| `transition`       | `box-shadow .4s ease`                        |
| `white-space`      | `wrap`                                       |
| **Hover / Focus**  |                                              |
| `box-shadow`       | `0px 12px 9px #949191`                       |

**Container:** `.leaf-sitemap-flex-container`:

- `display: flex`, `flex-wrap: wrap`, `justify-content: center`, `align-items: flex-start`
- Child width: `33%` with `box-sizing: border-box`

**Child elements:**

`h3`:

- `margin: 0 0 .5rem 0`, `font-size: 1.2rem`

**Typical structure:**

```html
<div class="leaf-sitemap-flex-container">
  <div
    class="leaf-sitemap-card"
    onclick="..."
    style="cursor:pointer; background-color: {color}; color: {fontColor};"
  >
    <img
      style="float:left; margin-right:1rem; height:48px; width:48px;"
      src="..."
    />
    <h3 style="color: {fontColor};">Title</h3>
    <p>Description</p>
  </div>
</div>
```

---

##### `a.custom_menu_card` (Site Designer Vue Card)

| Property                   | Value                         |
| -------------------------- | ----------------------------- |
| `display`                  | `flex`                        |
| `align-items`              | `center`                      |
| `width`                    | `300px`                       |
| `min-height`               | `55px`                        |
| `padding`                  | `6px 8px`                     |
| `text-decoration`          | `none`                        |
| `border`                   | `2px solid transparent`       |
| `box-shadow`               | `0 0 6px rgba(0, 0, 25, 0.3)` |
| `transition`               | `all .35s ease`               |
| **Hover / Focus / Active** |                               |
| `border`                   | `2px solid #fff !important`   |
| `box-shadow`               | `0 0 8px rgba(0, 0, 25, 0.6)` |
| `z-index`                  | `10`                          |

**Child elements:**

`.icon_choice`:

- `cursor: auto`, `margin-right: .5rem`, `width: 50px`, `height: 50px`

`.card_text`:

- `font-family: Verdana, sans-serif`, `display: flex`, `flex-direction: column`
- `justify-content: center`, `width: 100%`, `min-height: 55px`

**File path:**

- `app/libs/js/vue-dest/site_designer/LEAF_Designer.css` (minified)
- Scoped to `#site-designer-app` and `#leaf_dialog_content`

---

##### `.sidenav` (Admin Sidebar Panel)

| Property           | Value                                  |
| ------------------ | -------------------------------------- |
| `padding`          | `1rem`                                 |
| `background-color` | `#fff`                                 |
| `border-radius`    | `4px`                                  |
| `box-shadow`       | `0px 1px 3px rgba(0, 0, 0, 0.2)`       |
| `max-width`        | `16.5rem`                              |
| `align-self`       | `flex-start`                           |
| **Empty state**    | `background: none`, `box-shadow: none` |
| **Hidden state**   | `background: none`, `box-shadow: none` |

**Header (`.navhead`):**

- `font-family: "PublicSans-Medium", sans-serif`
- `font-weight: normal`, `margin: 0 0 1rem 0`, `font-size: 1.2rem`

**Typical structure:**

```html
<aside class="sidenav">
  <h3 class="navhead">Access categories</h3>
  <ul class="usa-sidenav">
    <li class="usa-sidenav__item">
      <a href="..." class="usa-current">Link</a>
    </li>
  </ul>
</aside>
```

---

##### `.entry_info` / `.entry_warning` / `.entry_error` (Callout Containers)

**CSS Definitions:**

- `LEAF_Request_Portal/css/style.css:730-741` — Public (info only + shared base)
- `LEAF_Request_Portal/admin/css/style.css:813-827` — Admin (all three variants)
- `LEAF_Request_Portal/admin/css/mod_workflow.css:145-151` — Workflow-scoped error variant

**Shared base:**

| Property      | Value          |
| ------------- | -------------- |
| `padding`     | `0.75rem 1rem` |
| `display`     | `flex`         |
| `align-items` | `center`       |
| `gap`         | `0.5rem`       |

**Variants — left border color:**

| Variant          | Border Left                 | Background (via utility class) |
| ---------------- | --------------------------- | ------------------------------ |
| `.entry_info`    | `4px solid #00bde3` (cyan)  | `.bg-blue-5v`: `#e8f5ff`       |
| `.entry_warning` | `4px solid #ffbe2e` (amber) | `.bg-yellow-5`: `#faf3d1`      |
| `.entry_error`   | `4px solid #B50909` (red)   | Not specified in base CSS      |

**Typical structure:**

```html
<span class="entry_info bg-blue-5v" tabindex="0">
  <span>Informational message text</span>
</span>
```

Note: Public CSS only defines `.entry_info`. The `.entry_warning` and `.entry_error` variants are only available in admin CSS.

---

##### Inline-Styled Section Containers (Form Steps)

**Pattern from `initial_form.tpl`:**

```html
<section style="margin-right: 1rem;">
  <h3
    style="background-color: black; color: white; margin: 0; padding: 0.3rem 0.5rem; font-size: 22px;"
  >
    Step 1 - General Information
  </h3>
  <table style="width: 100%; margin: 0; padding: 1rem 0.5rem">
    ...
  </table>
</section>
```

| Property             | Value           |
| -------------------- | --------------- |
| Section margin-right | `1rem`          |
| Header background    | `black`         |
| Header text color    | `white`         |
| Header padding       | `0.3rem 0.5rem` |
| Header font-size     | `22px`          |
| Header margin        | `0`             |
| Content padding      | `1rem 0.5rem`   |

**File paths:**

- `LEAF_Request_Portal/templates/initial_form.tpl:88-89,130-131` — Step 1 and Step 2 sections
- No CSS class — 100% inline styling

---

#### 3.5.3 Figma Build Specification

##### COMPONENT: `menuButtonSmall` (Homepage Card)

**FRAME:**

- Layout direction: Row (icon left, text right via float)
- Padding: `2px`
- Width: `280px` fixed
- Height: `56px` fixed
- Margin: `12px`

**CONTAINER STYLE:**

- Fill color: Set per card via inline style (no default)
- Border: Not explicitly defined in code
- Border radius: Not explicitly defined in code
- Shadow: `0 2px 6px #8e8e8e`

**ICON AREA (`menuIconSmall`):**

- Float: left
- Size: `76px x 76px`
- Padding-right: `4px`
- Source: `dynicons/` SVG service

**TEXT AREA:**

- Title (`.menuTextSmall`): `font-size: 16px`, `font-weight: bold`, `line-height: 160%`
- Description (`.menuDescSmall`): `font-size: 12px`
- Color: Inherited or overridden inline per card

**STATES:**

- Hover: `box-shadow: 0 4px 6px 2px #8e8e8e`
- Focus: `box-shadow: 0 4px 6px 2px #8e8e8e`, `outline-style: dotted`
- Disabled: Not explicitly defined in code

---

##### COMPONENT: `menuButton` (Nexus Admin Card)

**FRAME:**

- Layout direction: Row (icon left, text right via float)
- Padding: Not explicitly defined in code
- Width: `350px` fixed
- Height: `70px` fixed
- Margin: `14px`

**CONTAINER STYLE:**

- Fill color: Set per card via inline style (no default)
- Border: Not explicitly defined in code
- Border radius: Not explicitly defined in code
- Shadow: `0 2px 6px #8e8e8e`

**ICON AREA (`menuIcon`):**

- Float: left
- Size: `96px x 96px`
- Padding-right: `4px`

**TEXT AREA:**

- Title (`.menuText`): `font-size: 20px`, `font-weight: bold`, `line-height: 160%`
- Description (`.menuDesc`): `font-size: 14px`

**STATES:**

- Hover: `box-shadow: 0 4px 6px 2px #8e8e8e`, `outline-style: dotted`
- Focus: Same as hover

---

##### COMPONENT: `leaf-admin-button` (Admin Panel Card)

**FRAME:**

- Layout direction: Row (icon float-left, text block right)
- Padding: `.5rem .5rem .4rem .1rem`
- Width: `19.4rem` fixed
- Height: `3.4rem` fixed
- Margin: `.6rem .6rem`

**CONTAINER STYLE:**

- Fill color: Via utility class (`.bg-blue-cool-10`: `#dae9ee` or `.bg-yellow-5`: `#faf3d1`)
- Border: Not explicitly defined in code (transparent base)
- Border radius: `4px`
- Shadow: `2px 2px 2px rgba(0, 0, 20, 0.2)`

**ICON AREA (`.leaf-admin-btnicon`):**

- Font Awesome icon
- Font size: `1.7rem`
- Float: left
- Margin: `.3rem .4rem`
- Color via utility class

**TEXT AREA:**

- Title (`.leaf-admin-btntitle`): `font-size: 1rem`, `line-height: 1.4rem`, `font-family: "PublicSans-Bold"`, `margin-left: 2.9rem`
- Description (`.leaf-admin-btndesc`): `font-size: .8rem`, `margin-left: 2.9rem`
- Text color: `#3d4551`

**STATES:**

- Hover (blue): `box-shadow: 2px 2px 4px rgba(0,0,20,0.4)`, `background-color: #cfe8ff`
- Hover (yellow): `box-shadow: 2px 2px 4px rgba(0,0,20,0.4)`, `background-color: #f2e5a4`
- Focus / Active: Same as hover

---

##### COMPONENT: `leaf-sitemap-card` (Sitemap Card)

**FRAME:**

- Layout direction: Column (title above description)
- Padding: `1.3rem`
- Width: flex `0 1 30%`, min `20rem`, max `23rem`
- Height: `5.8rem` fixed
- Margin: `.5rem 1rem .5rem 0`

**CONTAINER STYLE:**

- Fill color: `#fff` default, overridden inline per card
- Border: `1px solid #ccc`
- Border radius: `5px`
- Shadow: `0px 2px 3px #a7a9aa`

**TEXT AREA:**

- Title (`h3`): `font-size: 1.2rem`, `margin: 0 0 .5rem 0`
- Body (`p`): Not explicitly defined in code

**STATES:**

- Hover: `box-shadow: 0px 12px 9px #949191`
- Focus: Same as hover

---

##### COMPONENT: `sidenav` (Admin Sidebar Panel)

**FRAME:**

- Layout direction: Column
- Padding: `1rem`
- Width: max `16.5rem`
- Margin: Not explicitly defined (inherited from layout container)

**CONTAINER STYLE:**

- Fill color: `#fff`
- Border: Not explicitly defined in code
- Border radius: `4px`
- Shadow: `0px 1px 3px rgba(0, 0, 0, 0.2)`

**HEADER (`.navhead`):**

- Font family: `"PublicSans-Medium", sans-serif`
- Font size: `1.2rem`
- Font weight: `normal`
- Margin: `0 0 1rem 0`

**BODY:**

- Contains `usa-sidenav` list or button stack
- Text style: Not explicitly defined in code

**STATES:**

- Static only — no hover/focus states on container
- Empty state: transparent background, no shadow

---

##### COMPONENT: `entry_info` / `entry_warning` / `entry_error` (Callout)

**FRAME:**

- Layout direction: Row (`display: flex`, `align-items: center`)
- Padding: `0.75rem 1rem`
- Gap: `0.5rem`
- Width: Not explicitly defined in code (fills container)

**CONTAINER STYLE:**

- Fill color: Via utility class (info: `#e8f5ff`, warning: `#faf3d1`, error: not specified)
- Border left: `4px solid` (info: `#00bde3`, warning: `#ffbe2e`, error: `#B50909`)
- Border radius: Not explicitly defined in code
- Shadow: Not explicitly defined in code

**TEXT STYLE:**

- Not explicitly defined in code (inherits)

**STATES:**

- Static only — no hover, focus, or active states

---

#### 3.5.4 Observed Inconsistencies

**Shadow values across card types:**

| Card Type                          | Default Shadow                 | Hover Shadow                   |
| ---------------------------------- | ------------------------------ | ------------------------------ |
| `.menuButton` / `.menuButtonSmall` | `0 2px 6px #8e8e8e`            | `0 4px 6px 2px #8e8e8e`        |
| `.leaf-admin-button`               | `2px 2px 2px rgba(0,0,20,0.2)` | `2px 2px 4px rgba(0,0,20,0.4)` |
| `.leaf-sitemap-card`               | `0px 2px 3px #a7a9aa`          | `0px 12px 9px #949191`         |
| `a.custom_menu_card`               | `0 0 6px rgba(0,0,25,0.3)`     | `0 0 8px rgba(0,0,25,0.6)`     |
| `.sidenav`                         | `0px 1px 3px rgba(0,0,0,0.2)`  | N/A (static)                   |

Five different shadow patterns across five card implementations.

**Border radius values:**

| Card Type                          | Border Radius                |
| ---------------------------------- | ---------------------------- |
| `.menuButton` / `.menuButtonSmall` | Not defined (square corners) |
| `.leaf-admin-button`               | `4px`                        |
| `.leaf-sitemap-card`               | `5px`                        |
| `a.custom_menu_card`               | Not defined (square corners) |
| `.sidenav`                         | `4px`                        |

**Layout approaches:**

| Card Type            | Layout Method  | Width Strategy                       |
| -------------------- | -------------- | ------------------------------------ |
| `.menuButton`        | `float: left`  | Fixed `350px`                        |
| `.menuButtonSmall`   | `float: left`  | Fixed `280px`                        |
| `.leaf-admin-button` | `inline-block` | Fixed `19.4rem`                      |
| `.leaf-sitemap-card` | `flex` child   | `flex: 0 1 30%`, min/max constrained |
| `a.custom_menu_card` | `flex`         | Fixed `300px`                        |

Three different layout strategies: float, inline-block, and flex.

**Icon systems across cards:**

| Card Type            | Icon Source                 | Icon Size            |
| -------------------- | --------------------------- | -------------------- |
| `.menuButton`        | `dynicons/` SVG via `<img>` | `96px x 96px`        |
| `.menuButtonSmall`   | `dynicons/` SVG via `<img>` | `76px x 76px`        |
| `.leaf-admin-button` | Font Awesome via `<i>`      | `1.7rem` font        |
| `.leaf-sitemap-card` | Dynamic URL via `<img>`     | `48px x 48px` inline |
| `a.custom_menu_card` | `.icon_choice` class        | `50px x 50px`        |

**Font families across cards:**

| Card Type                          | Title Font                      | Desc Font              |
| ---------------------------------- | ------------------------------- | ---------------------- |
| `.menuButton` / `.menuButtonSmall` | Inherited (no explicit font)    | Inherited              |
| `.leaf-admin-button`               | `"PublicSans-Bold", sans-serif` | Inherited              |
| `.leaf-sitemap-card`               | Not explicitly defined          | Not explicitly defined |
| `a.custom_menu_card`               | `Verdana, sans-serif`           | `Verdana, sans-serif`  |

**Background color assignment:**

- `.menuButton` / `.menuButtonSmall`: All colors set via **inline `style`** per card — no default background
- `.leaf-admin-button`: Colors set via **utility classes** (`.bg-blue-cool-10`, `.bg-yellow-5`)
- `.leaf-sitemap-card`: Default `#fff`, overridden via **inline `style`** from data
- `.sidenav`: `#fff` from CSS

**Semantic element mismatch:**

- `.menuButton` / `.menuButtonSmall` use `<span>` as the card container inside `<a>` — semantically a `<div>` or no wrapper would be more appropriate
- `.leaf-admin-button` correctly uses `<a>` as the card element
- `.leaf-sitemap-card` uses `<div>` with inline `onclick` instead of `<a>`

**`.entry_info` availability gap:**

- Public CSS defines only `.entry_info` (no warning/error)
- Admin CSS defines all three variants
- Vue components use `.entry_warning` and `.entry_info` — requires admin CSS to be loaded

---

### 3.6 Modals

#### Modal System Overview

The codebase has **two coexisting modal systems**, both built on jQuery UI `.dialog()`:

1. **Legacy inline-styled dialogs** — Public Portal and Nexus (3 dialog types, fully inline-styled)
2. **Modern class-based dialogs** — Admin Portal and Nexus Admin (3 dialog types, CSS class-based)

All dialogs share the same underlying mechanism: a hidden `<div>` is mounted into the page, then jQuery UI `.dialog()` wraps it in a generated overlay/titlebar structure. The content is loaded dynamically via XHR into a content container.

---

#### 3.6.1 Evidence Summary

**Legacy inline-styled dialogs (public-facing):**

- `LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl` — Edit dialog (`#xhrDialog`)
- `LEAF_Request_Portal/templates/site_elements/generic_confirm_xhrDialog.tpl` — Confirm dialog (`#confirm_xhrDialog`)
- `LEAF_Request_Portal/templates/site_elements/generic_OkDialog.tpl` — OK-only dialog (`#ok_xhrDialog`)
- `LEAF_Nexus/templates/site_elements/generic_xhrDialog.tpl` — Nexus edit dialog (identical structure)
- `LEAF_Nexus/templates/site_elements/generic_confirm_xhrDialog.tpl` — Nexus confirm dialog (identical)
- `LEAF_Nexus/templates/site_elements/generic_OkDialog.tpl` — Nexus OK dialog (identical)

**Modern class-based dialogs (admin):**

- `LEAF_Request_Portal/admin/templates/site_elements/generic_xhrDialog.tpl` — Admin edit dialog
- `LEAF_Request_Portal/admin/templates/site_elements/generic_confirm_xhrDialog.tpl` — Admin confirm dialog
- `LEAF_Request_Portal/admin/templates/site_elements/generic_simple_xhrDialog.tpl` — Admin simple dialog
- `LEAF_Nexus/admin/templates/site_elements/generic_xhrDialog.tpl` — Nexus admin edit dialog
- `LEAF_Nexus/admin/templates/site_elements/generic_confirm_xhrDialog.tpl` — Nexus admin confirm dialog

**Dialog controller:**

- `LEAF_Request_Portal/js/dialogController.js:29` — jQuery UI `.dialog()` initialization

**CSS:**

- `libs/css/leaf.css:9` — `.ui-dialog`, `.leaf-dialog-loader`, `.leaf-dialog-content`, `.leaf-buttonBar` (minified)
- `LEAF_Request_Portal/admin/css/mod_templates_reports.css:1–15` — Modal-specific overrides for templates reports

---

#### 3.6.2 Extracted Measured Values

##### Legacy `#xhrDialog` (Edit Dialog — Public Portal + Nexus)

**Container (`#xhrDialog`):**

```html
<div
  id="xhrDialog"
  style="visibility: hidden; display: none;
         background-color: white;
         border-style: none solid solid;
         border-width: 0 1px 1px;
         border-color: #e0e0e0;
         padding: 4px"
></div>
```

| Property         | Value                                    |
| ---------------- | ---------------------------------------- |
| Background color | `white`                                  |
| Border           | `none solid solid` / `0 1px 1px #e0e0e0` |
| Padding          | `4px`                                    |
| Initial state    | `visibility: hidden; display: none`      |
| Border radius    | Not explicitly defined in code           |
| Shadow           | Not explicitly defined in code           |

**Content area (`#xhr`):**

| Property     | Value   |
| ------------ | ------- |
| `min-width`  | `540px` |
| `min-height` | `420px` |
| `padding`    | `8px`   |
| `overflow`   | `auto`  |
| `font-size`  | `12px`  |

**Load indicator (`#loadIndicator`):**

| Property           | Value              |
| ------------------ | ------------------ |
| `visibility`       | `hidden` (default) |
| `z-index`          | `9000`             |
| `position`         | `absolute`         |
| `text-align`       | `center`           |
| `font-size`        | `24px`             |
| `font-weight`      | `bold`             |
| `background-color` | `#f2f5f7`          |
| `padding`          | `16px`             |
| `height`           | `400px`            |
| `width`            | `526px`            |

**Buttons:**

- `#button_cancelchange`: `.buttonNorm`, `position: absolute; left: 10px`, icon `process-stop.svg` at `w=16`
- `#button_save`: `.buttonNorm`, `position: absolute; right: 10px`, icon `media-floppy.svg` at `w=16`
- Both start `disabled`
- Divider: `<div style="border-bottom: 2px solid black; line-height: 30px">`

**Nexus variant:** Identical structure; slight difference — container has only `style="visibility: hidden; display: none"` (no background/border inline on the div).

---

##### Legacy `#confirm_xhrDialog` (Confirm Dialog — Public Portal + Nexus)

**Container:**

```html
<div
  id="confirm_xhrDialog"
  style="background-color: #feffd1; border: 1px solid black;
         visibility: hidden; display: none"
></div>
```

| Property         | Value                               |
| ---------------- | ----------------------------------- |
| Background color | `#feffd1` (light yellow)            |
| Border           | `1px solid black`                   |
| Initial state    | `visibility: hidden; display: none` |

**Content area (`#confirm_xhr`):**

| Property     | Value   |
| ------------ | ------- |
| `font-size`  | `130%`  |
| `width`      | `400px` |
| `min-height` | `120px` |
| `padding`    | `16px`  |
| `overflow`   | `auto`  |

**Load indicator (`#confirm_loadIndicator`):**

| Property      | Value      |
| ------------- | ---------- |
| `position`    | `absolute` |
| `text-align`  | `center`   |
| `font-size`   | `24px`     |
| `font-weight` | `bold`     |
| `background`  | `white`    |
| `padding`     | `16px`     |
| `height`      | `100px`    |
| `width`       | `360px`    |

**Buttons (legacy):**

- `#confirm_button_cancelchange` ("No"): `.buttonNorm`, `position: absolute; left: 10px; font-size: 140%`, icon `edit-undo.svg` at `w=32`
- `#confirm_button_save` ("Yes"): `.buttonNorm`, `text-align: right; padding-right: 6px`, icon `dialog-apply.svg` at `w=32`
- Both start `disabled`

---

##### Legacy `#ok_xhrDialog` (OK Dialog — Public Portal + Nexus)

**Container:**

```html
<div
  id="ok_xhrDialog"
  style="background-color: #feffd1; border: 1px solid black;
         visibility: hidden; display: none"
></div>
```

| Property         | Value                    |
| ---------------- | ------------------------ |
| Background color | `#feffd1` (light yellow) |
| Border           | `1px solid black`        |

**Content area (`#ok_xhr`):**

| Property    | Value   |
| ----------- | ------- |
| `font-size` | `130%`  |
| `width`     | `400px` |
| `height`    | `120px` |
| `padding`   | `16px`  |
| `overflow`  | `auto`  |

**Button:**

- `#confirm_button_ok` ("Ok"): `.buttonNorm`, icon `dialog-apply.svg` at `w=32`, `text-align: right; padding-right: 6px`

---

##### Modern Admin `#xhrDialog` (`.leaf-dialog-container`)

**Container:**

```html
<div id="xhrDialog" class="leaf-dialog-container"></div>
```

- No CSS definition found for `.leaf-dialog-container` itself in any stylesheet — the class has no explicit rules.
- Visual framing is provided entirely by the jQuery UI `.ui-dialog` wrapper injected at runtime.

**Content area (`.leaf-dialog-content`):**

| Property     | Value (from `libs/css/leaf.css`, at `min-width: 1025px`) |
| ------------ | -------------------------------------------------------- |
| `min-height` | `300px`                                                  |
| `max-width`  | `54rem`                                                  |
| `min-width`  | `27rem`                                                  |
| `aria-live`  | `polite` (attribute, not CSS)                            |

**Load indicator (`.leaf-dialog-loader`):**

| Property     | Value    |
| ------------ | -------- |
| `text-align` | `center` |

**Button bar (`.leaf-buttonBar`):**

| Property     | Value          |
| ------------ | -------------- |
| `text-align` | `center`       |
| `margin`     | `1.5rem 0 0 0` |

**Button layout:**

- Save button: `.usa-button .leaf-btn-med` wrapped in `.leaf-float-left`
- Cancel button: `.usa-button .usa-button--outline .leaf-btn-med` wrapped in `.leaf-float-right`
- Both start `disabled`

**Simple dialog variant (`#simplexhrDialog`):**

- Same structure as admin `#xhrDialog`
- Save and Cancel buttons initially `display: none` (revealed via JS as needed)

---

##### jQuery UI Dialog Wrapper

The `dialogController.js` wraps all dialogs with jQuery UI:

```javascript
$("#" + this.containerID).dialog({
  autoOpen: false,
  modal: true,
  height: "auto",
  width: "auto",
  resizable: false,
  minWidth: minWidth, // derived from content div's CSS min-width
});
```

**CSS applied to generated `.ui-dialog` wrapper (from `libs/css/leaf.css`):**

| Selector                         | Property      | Value                           |
| -------------------------------- | ------------- | ------------------------------- |
| `.ui-dialog .ui-dialog-title`    | `margin`      | `0`                             |
| `.ui-dialog .ui-dialog-title`    | `font-family` | `"PublicSans-Bold", sans-serif` |
| `.ui-dialog .ui-dialog-titlebar` | `padding`     | `.4em .75em`                    |
| `.ui-dialog .ui-dialog-content`  | `padding`     | `.75em`                         |
| `.ui-dialog .ui-dialog-content`  | `min-width`   | `325px`                         |
| `.ui-dialog .ui-dialog-content`  | `min-height`  | `280px`                         |

**At `min-width: 1025px`:**

| Selector                        | Property    | Value     |
| ------------------------------- | ----------- | --------- |
| `.ui-dialog .ui-dialog-content` | `min-width` | `500px`   |
| `.ui-dialog .ui-dialog-title`   | `font-size` | `1.25rem` |

**From `LEAF_Request_Portal/css/style.css:1356`:**

```css
.ui-dialog,
.ui-dialog-content {
  box-sizing: content-box;
}
```

**Template report modal override (`mod_templates_reports.css:1`):**

```css
.ui-dialog .ui-dialog-content {
  box-sizing: border-box;
}
#genericDialogxhr {
  display: flex;
  flex-direction: column;
}
#genericDialogxhr .leaf-buttonBar {
  margin-top: auto;
}
#genericDialogxhr .leaf-buttonBar button {
  margin: 0;
}
```

---

#### 3.6.3 Figma Build Specification

##### COMPONENT: `xhrDialog` — Legacy Edit Dialog (Public/Nexus)

**FRAME:**

- Layout direction: Column
- Width: Fixed `540px` (from `#xhr` min-width)
- Height: Fixed `420px` (from `#xhr` min-height)
- Padding: `4px` outer container, `8px` content area

**CONTAINER STYLE:**

- Fill color: `white`
- Border: `0 1px 1px #e0e0e0` (left/top open, right/bottom closed)
- Border radius: Not explicitly defined in code
- Shadow: Not explicitly defined in code (jQuery UI provides chrome)

**LOAD STATE:**

- Full-bleed absolute overlay: `540px × 400px`, background `#f2f5f7`, centered spinner GIF
- `z-index: 9000`

**BUTTON BAR:**

- Save (right): `.buttonNorm`, absolutely positioned `right: 10px`
- Cancel (left): `.buttonNorm`, absolutely positioned `left: 10px`
- Divider: `border-bottom: 2px solid black`
- Icons: `dynicons/` SVGs at 16px

**TEXT STYLE:**

- Content area: `font-size: 12px`, inherited font family

**STATES:**

- Loading: load indicator visible, buttons disabled
- Loaded: load indicator hidden, buttons enabled
- Title: Set dynamically via `dialogController.setTitle()`

---

##### COMPONENT: `confirm_xhrDialog` — Legacy Confirm Dialog (Public/Nexus)

**FRAME:**

- Layout direction: Column
- Width: Fixed `400px`
- Min-height: `120px`
- Padding: `16px` content

**CONTAINER STYLE:**

- Fill color: `#feffd1` (light yellow)
- Border: `1px solid black`
- Border radius: Not explicitly defined in code
- Shadow: Not explicitly defined in code

**BUTTON BAR:**

- Yes (right): `.buttonNorm`, icon `dialog-apply.svg` at 32px, `font-size: 140%` wrapper
- No (left): `.buttonNorm`, icon `edit-undo.svg` at 32px, absolutely positioned `left: 10px`

**STATES:**

- Loading: load indicator visible, buttons disabled
- Loaded: buttons enabled
- Button label ("Yes"): customizable via `#confirm_saveBtnText` span

---

##### COMPONENT: Admin `xhrDialog` (`.leaf-dialog-container`)

**FRAME (viewport ≥ 1025px):**

- Layout direction: Column
- Content area min-width: `27rem`
- Content area max-width: `54rem`
- Content area min-height: `300px`
- Button bar margin-top: `1.5rem`

**CONTAINER STYLE:**

- Fill: None explicitly (jQuery UI `ui-dialog` provides background)
- Border radius: Not explicitly defined in code
- Shadow: Not explicitly defined in code (jQuery UI provides chrome)

**LOAD STATE:**

- `.leaf-dialog-loader`: `text-align: center`, spinner GIF + "Loading..." text

**BUTTON BAR (`.leaf-buttonBar`):**

- Save (left): `.usa-button .leaf-btn-med` — solid blue (`#005ea2`), padding `.7rem`, font `"PublicSans-Bold"` `.9rem`
- Cancel (right): `.usa-button--outline .leaf-btn-med` — transparent, `#005ea2` inset border
- Layout: float-based (`.leaf-float-left` / `.leaf-float-right`)

**jQuery UI Title Bar:**

- Font family: `"PublicSans-Bold", sans-serif`
- Font size: `1.25rem` (at ≥1025px)
- Padding: `.4em .75em`

**STATES:**

- Loading: `.leaf-dialog-loader` visible, buttons disabled
- Loaded: `.leaf-dialog-loader` hidden, buttons enabled
- `aria-live="polite"` on content area

---

#### 3.6.4 Observed Inconsistencies

**Two completely different visual treatments for the same dialog function:**

| Aspect             | Legacy (public)                      | Modern (admin)                  |
| ------------------ | ------------------------------------ | ------------------------------- |
| Container class    | None (inline style)                  | `.leaf-dialog-container`        |
| Background color   | `white` (edit) / `#feffd1` (confirm) | Not defined — jQuery UI default |
| Border             | `0 1px 1px #e0e0e0` or `1px black`   | Not defined                     |
| Content min-width  | `540px` (inline)                     | `27rem` via CSS class           |
| Content min-height | `420px` (inline)                     | `300px` via CSS class           |
| Content font-size  | `12px` (inline)                      | Not explicitly defined in code  |
| Buttons            | `.buttonNorm` + `dynicons/` icons    | `.usa-button` text-only         |
| Button layout      | `position: absolute` (inline)        | `float` via utility classes     |
| Button bar divider | `border-bottom: 2px solid black`     | None                            |
| Loader style       | Absolute overlay (fixed px size)     | `text-align: center` only       |
| Loader content     | Spinner GIF only                     | "Loading..." text + spinner GIF |
| Accessibility      | None                                 | `aria-live="polite"` on content |

**Confirm dialog background colors (legacy vs modern):**

- Legacy public confirm: `#feffd1` (light yellow)
- Legacy public edit: `white`
- Modern admin: not explicitly defined (inherits jQuery UI default `white`)

**`.leaf-dialog-container` has no CSS rules** — the class name is used in markup but defines no visual properties. All containment/chrome comes from jQuery UI's injected `.ui-dialog` wrapper.

**`#ok_xhrDialog` exists only in public templates** — there is no modern admin equivalent. The admin `generic_simple_xhrDialog.tpl` serves a similar but different function (its buttons are hidden by default and shown on demand).

**`box-sizing` conflict:**

- `LEAF_Request_Portal/css/style.css:1356`: `.ui-dialog, .ui-dialog-content { box-sizing: content-box }`
- `LEAF_Request_Portal/admin/css/mod_templates_reports.css:2`: `.ui-dialog .ui-dialog-content { box-sizing: border-box }` — overrides on templates reports page only

**Nexus edit dialog** (`LEAF_Nexus/templates/site_elements/generic_xhrDialog.tpl`) omits the background/border inline styles on the outer `#xhrDialog` container that the Portal version has — the container div is bare (`visibility: hidden; display: none` only). Both are otherwise structurally identical.

---

### 3.7 Navigation

#### Navigation System Overview

The codebase has **five distinct navigation patterns**:

1. **`#headerMenuNav` (Public header nav)** — Portal public and Nexus public; horizontal row of `.buttonNorm` links/buttons inside a legacy gradient-image header
2. **`#nav` (Admin header nav)** — Admin Portal and Nexus Admin; 3-level dropdown menu inside USWDS dark header, with mobile hamburger
3. **`.usa-sidenav` (Side navigation)** — Admin content area only; vertical link list with active indicator
4. **Breadcrumb (`.leaf-crumb-link` / `.leaf-crumb-caret`)** — Inline within `<h2>` headings; no container element
5. **`.leaf-progress-bar` (Step indicator)** — Multi-step process pages; horizontal chevron-shaped step list

---

#### 3.7.1 Evidence Summary

**`#headerMenuNav` (Public header nav):**

- `LEAF_Request_Portal/templates/menu.tpl:1` — Portal public menu structure
- `LEAF_Nexus/templates/menu.tpl:1` — Nexus public menu structure (identical pattern)
- `LEAF_Request_Portal/css/style.css:250` — CSS definition
- `LEAF_Nexus/css/style.css:138` — CSS definition (nearly identical)
- `LEAF_Request_Portal/templates/menu_links.tpl:1` — Dropdown content (Links)
- `LEAF_Request_Portal/templates/main.tpl:111` — Container: `<span id="headerMenu">`

**`#nav` (Admin header nav):**

- `LEAF_Request_Portal/admin/templates/menu.tpl:1` — Admin menu structure (3 levels)
- `LEAF_Request_Portal/admin/templates/main.tpl:108` — Container: `<nav aria-label="main menu" id="nav">`
- `libs/css/leaf.css:9` — CSS definition (minified), includes mobile + desktop rules

**`.usa-sidenav`:**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:27` — Usage in admin content area
- `LEAF_Request_Portal/admin/templates/mod_system.tpl` — System settings sidebar
- `libs/css/leaf.css:9` — CSS definition (minified)

**Breadcrumb:**

- `LEAF_Request_Portal/admin/templates/mod_groups.tpl:53` — `<h2>` with `.leaf-crumb-link` links
- `LEAF_Request_Portal/admin/templates/view_form_library.tpl:202` — `<h2 id="page_breadcrumbs">` with scoped flex CSS
- `LEAF_Request_Portal/templates/reports/LEAF_sitemaps_template.tpl:370` — Inline breadcrumb in report page
- `libs/css/leaf.css:9` — `.leaf-crumb-link`, `.leaf-crumb-caret` definitions

**`.leaf-progress-bar`:**

- `LEAF_Request_Portal/templates/reports/orgChart_import.tpl:47` — Step indicator markup
- `LEAF_Nexus/admin/templates/orgChart_import.tpl:561` — Identical usage in Nexus
- `libs/css/leaf.css:9` — CSS definition (minified)

---

#### 3.7.2 Extracted Measured Values

---

##### `#header` + `#headerMenuNav` (Public Portal Header Nav)

**Header container (`#header`) — Portal public and Nexus (identical):**

| Property           | Value                           |
| ------------------ | ------------------------------- |
| `font-family`      | `Verdana, sans-serif`           |
| `font-weight`      | `bold`                          |
| `background-image` | `url("../images/gradient.png")` |
| `background-size`  | `100% 100%`                     |
| `width`            | `100%`                          |
| `height`           | `80px`                          |
| `border-bottom`    | `2px solid #5a79a5`             |
| `margin-bottom`    | `4px`                           |
| Positioning        | Static (default)                |
| Shadow             | Not explicitly defined in code  |

**Nav position container (`span#headerMenu`):**

| Property      | Portal value | Nexus value |
| ------------- | ------------ | ----------- |
| `position`    | `relative`   | `relative`  |
| `top`         | `53px`       | `55px`      |
| `float`       | `right`      | `right`     |
| `font-size`   | `12px`       | `12px`      |
| `font-weight` | `normal`     | `normal`    |
| `text-align`  | not set      | `right`     |

**`#headerMenuNav` (nav element):**

| Property    | Value  |
| ----------- | ------ |
| `font-size` | `12px` |

**`#headerMenuNav > ul` (item list):**

| Property          | Value             |
| ----------------- | ----------------- |
| `position`        | `relative`        |
| `margin`          | `0`               |
| `padding`         | `0`               |
| `list-style-type` | `none`            |
| `display`         | `flex`            |
| `flex-wrap`       | `wrap`            |
| `gap`             | `0.25rem 0.75rem` |

**`#headerMenu > nav > ul > li` (list items):**

| Property     | Value        |
| ------------ | ------------ |
| `box-sizing` | `border-box` |
| `height`     | `24px`       |
| `margin`     | `0`          |

**Nav item links/buttons (`#headerMenuNav > ul > li > button`, `> li > a`):**

| Property          | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| `box-sizing`      | `border-box`                                                              |
| `width`           | `100%`                                                                    |
| `height`          | `100%`                                                                    |
| `margin`          | `0`                                                                       |
| `padding`         | `0.25rem`                                                                 |
| `display`         | `flex`                                                                    |
| `gap`             | `2px`                                                                     |
| `align-items`     | `center`                                                                  |
| `text-decoration` | `none`                                                                    |
| `color`           | `black`                                                                   |
| CSS class also    | `.buttonNorm` (adds `background-color: #e8f2ff; border: 1px solid black`) |

**Hover / Focus / Active:**

| Property                              | Value     |
| ------------------------------------- | --------- |
| `color`                               | `white`   |
| Background (from `.buttonNorm:hover`) | `#2372b0` |

**Icon usage:**

- `<img src="dynicons/?img=go-home.svg&w=16" alt="" />` — Home icon at 16px
- `<img src="dynicons/?img=help-browser.svg&w=16" alt="" style="vertical-align: sub" />` — Help icon at 16px
- `<img src="dynicons/?img=applications-system.svg&w=16" alt="" />` — Admin icon at 16px

**Dropdown panel (`#headerMenu_links`, `#headerMenu_help`):**

| Property           | Portal value                      | Nexus value                       |
| ------------------ | --------------------------------- | --------------------------------- |
| `display`          | `none` (default)                  | `none` (default)                  |
| `position`         | `absolute`                        | `absolute`                        |
| `background-color` | `white`                           | `white`                           |
| `box-shadow`       | `0 2px 6px rgba(0,0,25,0.2)`      | `0 2px 60px #8e8e8e`              |
| `padding`          | `0.5em 0.75em`                    | `16px`                            |
| `border`           | `1px solid black`                 | `1px solid black`                 |
| `right`            | `0px`                             | `0px`                             |
| `z-index`          | `100`                             | `100`                             |
| `width`            | `max-content`                     | `inline-size: max-content`        |
| `text-align`       | Not defined                       | `left`                            |
| Show trigger       | `hover` + JS toggle (click/focus) | `hover` + JS toggle (click/focus) |

**Dropdown show state (`.controlled-element.is-shown`):**

| Property   | Value                    |
| ---------- | ------------------------ |
| `position` | `absolute`               |
| `top`      | `calc(100% - 2px)`       |
| `display`  | `block`                  |
| `z-index`  | `10` (set inline via JS) |

**Dropdown focus state on card child:**

```css
#headerMenu_links a:focus > .menuButtonSmall,
#headerMenu_help a:focus > .menuButtonSmall {
  outline-style: dotted;
  box-shadow: 0 4px 6px 2px #8e8e8e;
}
```

**Responsive behavior (public portal, `@media max-width: 520px`):**

| Property                      | Default    | `max-width: 520px`          |
| ----------------------------- | ---------- | --------------------------- |
| `#header` height              | `80px`     | `120px`                     |
| `span#headerMenu` top         | `53px`     | `93px` (repositioned lower) |
| `span#headerMenu` position    | `relative` | `absolute`                  |
| `span#headerMenu` right       | not set    | `4px`                       |
| `#headerMenu > a` margin-left | `8px`      | `2px`                       |

Note: No hamburger menu on public portal. Nav items remain visible at all breakpoints; header simply grows taller.

---

##### `#nav` (Admin Portal Header Nav)

**Header container (`#header.site-header`):**

| Property           | Value                        |
| ------------------ | ---------------------------- |
| `background-color` | `#252f3e` (dark navy)        |
| `padding`          | `0 .5em`                     |
| `height`           | `4.5rem`                     |
| `box-shadow`       | `0px 4px 6px rgba(0,0,0,.2)` |
| `color`            | `#fff`                       |
| Positioning        | Static                       |

**`#nav` structure:**

- Container: `<nav aria-label="main menu" id="nav">` inside `.leaf-header-right`
- List: `<ul id="leaf_admin_menu">`
- Level 1 items: `<li>` with class `leaf-mob-menu`, optionally `lev2` or `lev3`
- Level 2 submenus: `<ul>` children of `li.lev2`
- Level 3 submenus: `<ul>` children of `li.lev3`
- Hamburger toggle: `<div id="toggleMenu">` with `<a>` + `<span class="leaf-menu">MENU</span>` + `<i class="fas fa-times">`

**Base resets (`#nav ul, #nav li`):**

```css
margin: 0;
padding: 0;
border: 0;
list-style: none;
box-sizing: border-box;
padding-inline-start: 0;
```

**Level 1 items (`#nav > ul > li`):**

| Property      | Value                              |
| ------------- | ---------------------------------- |
| `text-align`  | `left`                             |
| `font-family` | `"PublicSans-Regular", sans-serif` |

**All nav links (`#nav ul li a`):**

| Property          | Value         |
| ----------------- | ------------- |
| `text-decoration` | `none`        |
| `display`         | `block`       |
| `padding`         | `.4rem .7rem` |
| `color`           | `#f0f0ec`     |

**Desktop nav (min-width: 961px):**

| Element                          | Property           | Value               |
| -------------------------------- | ------------------ | ------------------- |
| `#nav li`                        | `position`         | `relative`          |
| `#nav li`                        | `margin-right`     | `.9rem`             |
| `#nav > ul > li`                 | `float`            | `left`              |
| `#nav > ul > li`                 | `font-size`        | `.8rem`             |
| `#nav > ul > li`                 | `margin-left`      | `.2rem`             |
| `#nav > ul > li > a`             | `background-color` | `#252f3e`           |
| `#nav > ul > li > a:hover/focus` | `background-color` | `#274863`           |
| `#nav > ul > li > a:hover/focus` | `font-family`      | `"PublicSans-Bold"` |
| `#toggleMenu` (desktop)          | `display`          | `none`              |

**Level 2 dropdown (`#nav > ul > li > ul`):**

| Property           | Value                         |
| ------------------ | ----------------------------- |
| `background-color` | `#274863`                     |
| `left`             | `-4rem`                       |
| `width`            | `12rem`                       |
| `font-size`        | `.8rem`                       |
| `box-shadow`       | `-2px 4px 4px rgba(0,0,0,.2)` |
| `position`         | `absolute`                    |

User nav menu variant (`.leaf-usernavmenu`): `left: -8rem`

Level 2 items:

| Property  | Value   |
| --------- | ------- |
| `padding` | `.2rem` |
| `width`   | `12rem` |

Level 2 item hover:

| Property           | Value               |
| ------------------ | ------------------- |
| `background-color` | `#2378c3`           |
| `font-family`      | `"PublicSans-Bold"` |

**Level 3 dropdown (`#nav > ul > li > ul > li > ul`):**

| Property           | Value                         |
| ------------------ | ----------------------------- |
| `top`              | `0`                           |
| `left`             | `-12rem`                      |
| `width`            | `12rem`                       |
| `font-family`      | `"PublicSans-Regular"`        |
| `z-index`          | `9999`                        |
| `box-shadow`       | `-2px 2px 4px rgba(0,0,0,.2)` |
| `background-color` | `#2378c3`                     |

Level 3 link hover:

| Property           | Value               |
| ------------------ | ------------------- |
| `background-color` | `#2378c3`           |
| `font-family`      | `"PublicSans-Bold"` |

Level 3 link:

| Property          | Value     |
| ----------------- | --------- |
| `color`           | `#f0f0ec` |
| `padding`         | `.3rem`   |
| `margin-left`     | `.1rem`   |
| `text-decoration` | `none`    |

**Mobile nav (max-width: 60rem):**

| Element                               | Property           | Value                     |
| ------------------------------------- | ------------------ | ------------------------- |
| `#nav ul`                             | `position`         | `relative; z-index: 9999` |
| `#nav > ul > li.leaf-mob-menu`        | `width`            | `12.8rem`                 |
| `#nav > ul > li.leaf-mob-menu`        | `padding`          | `.2rem 0`                 |
| `#nav > ul > li.leaf-mob-menu`        | `margin-left`      | `-10rem`                  |
| `#nav > ul > li:not(#toggleMenu)`     | `background-color` | `#274863`                 |
| `#nav > ul > li:not(#toggleMenu)`     | `font-size`        | `.8rem`                   |
| `#nav > ul > li:not(#toggleMenu)`     | `padding`          | `.3rem 0`                 |
| `#nav > ul > li:not(#toggleMenu) > a` | `color`            | `#f0f0ec`                 |
| `#nav > ul > li:not(#toggleMenu) > a` | `margin`           | `.2rem .5rem`             |
| `#nav > ul > li:nth-child(2)`         | `margin-top`       | `1.2rem`                  |
| Level 2 submenu (mobile)              | `background-color` | `#1d5689`                 |
| Level 3 submenu (mobile)              | `background-color` | `#2378c3`                 |

**Hamburger button (`.leaf-menu button`):**

| Property           | Value               |
| ------------------ | ------------------- |
| `cursor`           | `pointer`           |
| `color`            | `#fff`              |
| `background-color` | `#252f3e`           |
| `font-size`        | `.5rem`             |
| `font-family`      | `"PublicSans-Bold"` |
| `border`           | `2px outset #fff`   |
| `border-radius`    | `3px`               |
| `width`            | `38px`              |
| `height`           | `24px`              |
| `padding`          | `.2rem`             |
| `text-align`       | `center`            |

**`#toggleMenu` open state (`.js-open`):**

- `#nav #toggleMenu.js-open .fa-times`: `display: block; color: #fff; font-size: 1.25rem`
- `#nav #toggleMenu.js-open .leaf-menu`: `display: none`
- `#nav #toggleMenu.js-open a`: `display: block; text-decoration: none; margin-bottom: .8rem`

**Icon system (admin nav):**

- Level 2 parent links: `<i class="fas fa-angle-down leaf-nav-icon">` (appended via JS)
- Level 3 parent links: `<i class="fas fa-angle-left leaf-nav-icon">` + `<i class="fas fa-angle-down leaf-nav-icon">` (both appended via JS)
- `.leaf-nav-icon`: `float: right; margin: .2rem .3rem .2rem 0; color: #00bde3`
- `.leaf-nav-icon-space`: `float: left; margin: 0` (spacer for items without icons)

**Responsive breakpoints:**

- Mobile: `max-width: 60rem` (960px)
- Desktop: `min-width: 961px`

---

##### `.usa-sidenav` (Admin Side Navigation)

**Container (`.sidenav`):** Already documented in §3.5.5 — `padding: 1rem; background: #fff; border-radius: 4px; box-shadow: 0px 1px 3px rgba(0,0,0,.2); max-width: 16.5rem`

**Nav list (`ul.usa-sidenav`):**

| Property          | Value                  |
| ----------------- | ---------------------- |
| `margin`          | `0`                    |
| `padding-left`    | `0`                    |
| `line-height`     | `1.3`                  |
| `border-bottom`   | `1px solid #dfe1e2`    |
| `list-style-type` | `none`                 |
| `font-family`     | `"PublicSans-Regular"` |
| `font-size`       | `1rem`                 |

**List items (`li.usa-sidenav__item`):**

| Property     | Value               |
| ------------ | ------------------- |
| `border-top` | `1px solid #dfe1e2` |
| `width`      | `14.5rem`           |

**Links (`li.usa-sidenav__item a:not(.usa-button)`):**

| Property          | Value      |
| ----------------- | ---------- |
| `display`         | `block`    |
| `padding`         | `.5em 1em` |
| `text-decoration` | `none`     |
| Default color     | `#565c65`  |

**Hover / Focus / Active:**

| Property           | Value                |
| ------------------ | -------------------- |
| `color`            | `#005ea2 !important` |
| `background-color` | `#f0f0f0`            |

**Active state (`.usa-current`):**

| Property         | Value                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `position`       | `relative`                                                                                                        |
| `color`          | `#005ea2`                                                                                                         |
| `font-weight`    | `700`                                                                                                             |
| `::after` pseudo | `position: absolute; bottom: 4px; top: 4px; left: 4px; width: 4px; border-radius: 4px; background-color: #005ea2` |

The `::after` pseudo-element creates a **4px vertical blue bar** on the left edge of the active item.

---

##### Breadcrumb (`.leaf-crumb-link` / `.leaf-crumb-caret`)

**CSS definitions (from `libs/css/leaf.css`):**

`.leaf-crumb-link`:

| Property      | Value                                        |
| ------------- | -------------------------------------------- |
| `font-weight` | `normal`                                     |
| `color`       | `#005ea2`                                    |
| `font-family` | `"PublicSans-Medium", sans-serif !important` |

`.leaf-crumb-caret`:

| Property    | Value             |
| ----------- | ----------------- |
| `font-size` | `1.1rem`          |
| `margin`    | `0 .4rem 0 .5rem` |
| `color`     | `#0c60a0`         |

**Icon:** Font Awesome `fas fa-caret-right` rendered via `<i class="fas fa-caret-right leaf-crumb-caret">`

**Container:** No dedicated container class. Two patterns found:

Pattern 1 — inline in `<h2>` (no container CSS):

```html
<h2>
  <a href="../admin" class="leaf-crumb-link">Admin</a>
  <i class="fas fa-caret-right leaf-crumb-caret"></i>
  User access
</h2>
```

(`LEAF_Request_Portal/admin/templates/mod_groups.tpl:53`)

Pattern 2 — `<h2>` with scoped inline flex CSS (`#page_breadcrumbs`):

```html
<style>
  #page_breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.125rem;
  }
</style>
<h2 id="page_breadcrumbs">
  <a href="../admin" class="leaf-crumb-link" title="to Admin Home">Admin</a>
  <i class="fas fa-caret-right leaf-crumb-caret"></i>
  LEAF Library
</h2>
```

(`LEAF_Request_Portal/admin/templates/view_form_library.tpl:9,202`)

**Current page:** Rendered as plain text (no class, no `aria-current`).

**Link states:** Inherits global `a:link` color `#445` (within `form.usa-form` context) — in page context inherits `#004b76`.

---

##### `.leaf-progress-bar` (Step Indicator)

**CSS definition (from `libs/css/leaf.css`):**

**Container (`ul.leaf-progress-bar`):**

| Property               | Value  |
| ---------------------- | ------ |
| `list-style-type`      | `none` |
| `margin`               | `0`    |
| `padding-inline-start` | `0`    |

**Steps (`ul.leaf-progress-bar li`):**

| Property       | Value      |
| -------------- | ---------- |
| `float`        | `left`     |
| `width`        | `10rem`    |
| `height`       | `3rem`     |
| `margin-right` | `1.6rem`   |
| `position`     | `relative` |

**Step label (`li h6`):**

| Property    | Value           |
| ----------- | --------------- |
| `font-size` | `.9rem`         |
| `margin`    | `1rem 0 0 2rem` |

**Chevron arrows (CSS triangles via `span.left` and `span.right`):**

```css
li span.right,
li span.left {
  width: 0;
  height: 0;
  position: absolute;
  display: block;
  top: 0;
}
span.right {
  right: -1.5rem;
}
span.left {
  left: 0;
}
```

Each state sets `border-top/bottom/left` to produce a colored triangle shape.

**Step states:**

| State         | Class       | Background color                                    | Arrow border-left color |
| ------------- | ----------- | --------------------------------------------------- | ----------------------- |
| Current step  | `.current`  | `#d9e8f6`                                           | `#d9e8f6`               |
| Next step     | `.next`     | `#dfe1e2`                                           | `#dfe1e2`               |
| Complete step | `.complete` | `#b8d293`                                           | `#b8d293`               |
| Left spacer   | all         | `border-left: 1.5rem solid #fff` (cuts left corner) |

**HTML structure:**

```html
<ul class="leaf-progress-bar">
  <li class="current" id="step1">
    <h6 role="presentation">Select File</h6>
    <span class="left"></span>
    <span class="right"></span>
  </li>
  <li class="next" id="step2">
    <h6 role="presentation">Org Chart Preview</h6>
    <span class="left"></span>
    <span class="right"></span>
  </li>
  <li class="next" id="step3">
    <h6 role="presentation">Import Complete</h6>
    <span class="left"></span>
    <span class="right"></span>
  </li>
</ul>
```

**File paths:**

- `LEAF_Request_Portal/templates/reports/orgChart_import.tpl:47`
- `LEAF_Nexus/admin/templates/orgChart_import.tpl:561`

---

#### 3.7.3 Figma Build Specification

##### COMPONENT: `headerMenuNav` (Public Portal / Nexus Header Nav)

**CONTAINER FRAME:**

- Layout direction: Row (flex)
- Background: Inherited from `#header` — gradient image (`gradient.png`), `80px` tall, `border-bottom: 2px solid #5a79a5`
- Nav positioned at: `top: 53px` (Portal) / `top: 55px` (Nexus), floated right
- Height: `24px` per list item
- Width behavior: Fluid (fills available space on right side of header)
- Shadow: Not explicitly defined in code

**NAV ITEM:**

- Padding: `0.25rem` all sides
- Text style: `font-size: 12px`, `color: black`, flex row with `gap: 2px`, `align-items: center`
- Border: `1px solid black` (from `.buttonNorm`)
- Background: `#e8f2ff` (from `.buttonNorm`)
- Icon: `dynicons/` SVG at 16px (left of label)
- Label: text string + `▼` character for dropdown triggers

**STATES:**

- Default: `background-color: #e8f2ff`, `color: black`
- Hover: `background-color: #2372b0`, `color: white`
- Focus: `background-color: #2372b0`, `color: white`
- Active: `background-color: #2372b0`, `color: white`

**DROPDOWN PANEL:**

- Trigger: `hover` on container `<li>`, or `click`/keyboard toggle
- Position: `absolute`, `top: calc(100% - 2px)`, `right: 0`
- Background: `white`
- Border: `1px solid black`
- Shadow: `0 2px 6px rgba(0,0,25,0.2)` (Portal) / `0 2px 60px #8e8e8e` (Nexus — different)
- Padding: `0.5em 0.75em` (Portal) / `16px` (Nexus)
- `z-index`: `100`
- Contents: `.menuButtonSmall` cards

**RESPONSIVE VARIANT (≤520px):**

- Header grows to `120px`
- Nav repositioned to `top: 93px`, `position: absolute`, `right: 4px`
- No hamburger — items remain visible but repositioned

---

##### COMPONENT: `#nav` (Admin Portal Header Nav)

**CONTAINER FRAME:**

- Layout direction: Row (desktop float-left), Column stacked (mobile)
- Background: `#252f3e` (dark navy, from `#header.site-header`)
- Height: `4.5rem`
- Width behavior: `100%`
- Shadow: `0px 4px 6px rgba(0,0,0,.2)` (header level)

**NAV ITEM (Desktop, Level 1):**

- Padding: `.4rem .7rem`
- Font size: `.8rem`
- Font family: `"PublicSans-Regular"` (default), `"PublicSans-Bold"` (hover/active)
- Text color: `#f0f0ec`
- Background: `#252f3e`
- Float: `left`
- Margin-left: `.2rem`, Margin-right: `.9rem`

**STATES:**

- Default: `background-color: #252f3e`, `color: #f0f0ec`
- Hover / Focus / Active (`.js-openSubMenu`): `background-color: #274863`

**DROPDOWN LEVEL 2:**

- Background: `#274863`
- Width: `12rem`
- Shadow: `-2px 4px 4px rgba(0,0,0,.2)`
- Position: `absolute`, `left: -4rem`
- Item hover: `background-color: #2378c3`

**DROPDOWN LEVEL 3:**

- Background: `#2378c3`
- Width: `12rem`
- Shadow: `-2px 2px 4px rgba(0,0,0,.2)`
- Position: `absolute`, `top: 0`, `left: -12rem`
- Item hover: `background-color: #2378c3`

**RESPONSIVE VARIANT (≤960px):**

- Hamburger button shown: `38×24px`, `background: #252f3e`, `border: 2px outset #fff`, `border-radius: 3px`
- Label: "MENU" text in `PublicSans-Bold` at `.5rem`
- Open state: "MENU" hidden, `fa-times` (×) icon shown at `1.25rem`
- Menu items stack vertically at `background-color: #274863`, `padding: .3rem 0`
- Level 2 submenu: `background: #1d5689`
- Level 3 submenu: `background: #2378c3`
- Breakpoint: `max-width: 60rem` (960px) / `min-width: 961px`

---

##### COMPONENT: `.usa-sidenav` (Admin Side Nav)

**CONTAINER FRAME:**

- Layout direction: Column (list-based)
- Background: None (container `.sidenav` is `#fff`)
- Width: `14.5rem` per item
- Shadow: None on list (on `.sidenav` container: `0px 1px 3px rgba(0,0,0,.2)`)

**NAV ITEM:**

- Padding: `.5em 1em`
- Font family: `"PublicSans-Regular"`
- Font size: `1rem`
- Text color (default): `#565c65`
- Border-top: `1px solid #dfe1e2`
- Border-bottom: `1px solid #dfe1e2` (on container)

**STATES:**

- Default: `color: #565c65`
- Hover / Focus / Active: `color: #005ea2`, `background-color: #f0f0f0`
- Active (`.usa-current`): `color: #005ea2`, `font-weight: 700`, `::after` left bar `4px wide`, `background-color: #005ea2`

---

##### COMPONENT: Breadcrumb (`leaf-crumb-link` / `leaf-crumb-caret`)

**FRAME:**

- Layout direction: Row (inline flow in `<h2>`, or `display: flex` via scoped `#page_breadcrumbs` style)
- Background: Not explicitly defined in code (inherits page)
- Separator: Font Awesome `fa-caret-right` icon

**LINK STYLE (`.leaf-crumb-link`):**

- Font family: `"PublicSans-Medium" !important`
- Font weight: `normal`
- Color: `#005ea2`

**SEPARATOR (`.leaf-crumb-caret`):**

- Font size: `1.1rem`
- Color: `#0c60a0`
- Margin: `0 .4rem 0 .5rem`

**CURRENT PAGE:**

- Rendered as plain text inside `<h2>`; no class, no `aria-current`

**STATES:**

- Link hover: Not explicitly defined in code (inherits `body a:hover { color: #f04e0b }`)
- Focus: Not explicitly defined in code
- Active/current: Static only

---

##### COMPONENT: `.leaf-progress-bar` (Step Indicator)

**FRAME:**

- Layout direction: Row (float-left)
- Background: Not explicitly defined in code (inherits page)

**STEP ITEM:**

- Width: `10rem`
- Height: `3rem`
- Margin-right: `1.6rem`
- Label (`h6`): `font-size: .9rem`, `margin: 1rem 0 0 2rem`
- Chevron arrows: CSS triangles via `border` tricks on `span.left`/`span.right`

**STEP STATES:**

| State       | Background color        | Meaning        |
| ----------- | ----------------------- | -------------- |
| `.current`  | `#d9e8f6` (light blue)  | Active step    |
| `.next`     | `#dfe1e2` (light gray)  | Future step    |
| `.complete` | `#b8d293` (light green) | Completed step |

**STATES:**

- Static only — no hover, click, or focus behavior defined in CSS

---

#### 3.7.4 Observed Inconsistencies

**Two completely separate header nav systems:**

| Aspect            | Public portal (`#headerMenuNav`)     | Admin portal (`#nav`)           |
| ----------------- | ------------------------------------ | ------------------------------- |
| Header background | Gradient image + `#5a79a5` border    | `#252f3e` dark navy             |
| Header height     | `80px` (grows to `120px` ≤520px)     | `4.5rem`                        |
| Nav position      | Float right inside `span#headerMenu` | Inside `.leaf-header-right` div |
| Item style        | `.buttonNorm` (border, light bg)     | No border, dark background      |
| Font family       | Verdana (inherited)                  | `PublicSans-Regular`            |
| Font size         | `12px`                               | `.8rem`                         |
| Icon source       | `dynicons/` SVG via `<img>`          | Font Awesome via `<i>`          |
| Dropdown behavior | JS toggle + hover                    | JS toggle + hover + mouseover   |
| Responsive        | No hamburger (repositions)           | Hamburger at ≤960px             |
| Depth             | 1 level (flat + panel)               | 3 levels                        |

**Dropdown shadow discrepancy (Portal vs Nexus public nav):**

- Portal: `box-shadow: 0 2px 6px rgba(0,0,25,0.2)` (subtle)
- Nexus: `box-shadow: 0 2px 60px #8e8e8e` — blur radius is 60px vs 6px, and uses named color instead of rgba

**Dropdown padding discrepancy:**

- Portal: `padding: 0.5em 0.75em`
- Nexus: `padding: 16px`

**`span#headerMenu` top offset differs by 2px:**

- Portal: `top: 53px`
- Nexus: `top: 55px`

**Nexus-only:** `text-align: right` on `span#headerMenu` — Portal does not have this.

**Breadcrumb has no shared container class:**

- `mod_groups.tpl` uses a plain `<h2>` — no flex layout
- `view_form_library.tpl` uses `#page_breadcrumbs` with scoped `<style>` block for flex layout
- Neither uses a reusable class — each instance is structurally different

**Breadcrumb current page has no active indicator:**

- No `aria-current="page"` attribute
- No visual differentiation class on current page text

**Progress bar is float-based:**

- Uses `float: left` on `<li>` elements
- No flexbox or grid — chevron shapes are CSS border triangles
- No active state on step labels — only background color changes

**`#nav` `z-index` values:**

- Desktop: `#nav ul`: `z-index: 9999`
- Mobile: same `z-index: 9999`
- Dropdown level 3: `z-index: 9999`
- These high z-index values are scattered without a systematic stacking strategy

---

### 3.8 Headers / Footers

#### Header / Footer System Overview

The codebase has **three header variants** and **two footer variants**, distributed across four application contexts:

| Application context                           | Header type         | Footer type      |
| --------------------------------------------- | ------------------- | ---------------- |
| Portal public (`main.tpl`)                    | Legacy gradient     | Legacy `#footer` |
| Nexus public (`main.tpl`)                     | Legacy gradient     | Legacy `#footer` |
| **Nexus admin** (`admin/main.tpl`)            | **Legacy gradient** | Legacy `#footer` |
| **Portal admin** (`admin/main.tpl`)           | **USWDS dark**      | `.leaf-footer`   |
| Portal public iframe (`main_iframe.tpl`)      | **None**            | **None**         |
| Portal admin iframe (`admin/main_iframe.tpl`) | **None**            | **None**         |

The Portal admin is the only context with a modern USWDS-based header. The Nexus admin still uses the legacy gradient header system identical to the public-facing pages.

---

#### 3.8.1 Evidence Summary

**Legacy gradient header:**

- `LEAF_Request_Portal/templates/main.tpl:92–112` — Portal public header markup
- `LEAF_Nexus/templates/main.tpl:77–93` — Nexus public header (identical structure)
- `LEAF_Nexus/admin/templates/main.tpl:67–83` — Nexus admin header (same legacy structure)
- `LEAF_Request_Portal/css/style.css:168–237` — CSS definition
- `LEAF_Nexus/css/style.css:52–120` — Nexus CSS definition (nearly identical)

**USWDS dark header:**

- `LEAF_Request_Portal/admin/templates/main.tpl:89–111` — Portal admin header markup
- `libs/css/leaf.css:9` — CSS definition (minified): `#header.site-header`, `.usa-navbar`, `.leaf-site-title`, `.leaf-header-description`

**Legacy footer (`#footer`):**

- `LEAF_Nexus/templates/main.tpl:104–106` — `<footer id="footer">` structure
- `LEAF_Nexus/admin/templates/main.tpl:94–96` — same markup
- `LEAF_Request_Portal/css/style.css:179–195` — CSS definition
- `LEAF_Nexus/css/style.css:62–77` — CSS definition (identical)

**Admin footer (`.leaf-footer`):**

- `LEAF_Request_Portal/admin/templates/main.tpl:122–124` — `<footer class="usa-footer leaf-footer noprint">`
- `libs/css/leaf.css:9` — CSS definition (minified)

**Iframe layout (no header, no footer):**

- `LEAF_Request_Portal/templates/main_iframe.tpl:43–55` — body-only wrapper
- `LEAF_Request_Portal/admin/templates/main_iframe.tpl:37–49` — admin body-only wrapper

---

#### 3.8.2 Extracted Measured Values

---

##### Legacy Gradient Header (`#header`) — Portal Public, Nexus Public, Nexus Admin

**Container (`#header`):**

| Property           | Portal public CSS               | Nexus CSS                       |
| ------------------ | ------------------------------- | ------------------------------- |
| `font-family`      | `Verdana, sans-serif`           | `Verdana, sans-serif`           |
| `font-weight`      | `bold`                          | `bold`                          |
| `background-image` | `url("../images/gradient.png")` | `url('../images/gradient.png')` |
| `background-size`  | `100% 100%`                     | Not explicitly defined in code  |
| `width`            | `100%`                          | `100%`                          |
| `height`           | `80px`                          | `80px`                          |
| `border-bottom`    | `2px solid #5a79a5`             | `2px solid #5A79A5`             |
| `margin-bottom`    | `4px`                           | `4px`                           |
| Positioning        | Static                          | Static                          |
| Shadow             | Not explicitly defined in code  | Not explicitly defined in code  |
| Padding            | Not explicitly defined in code  | Not explicitly defined in code  |

**Logo / Wordmark area:**

- Structure: `<a href="./" style="cursor:pointer">` wrapping VA seal image + title spans
- Portal public: `<img src="images/VA_icon_small.png" style="width: 80px" alt="VA seal, U.S. Department of Veterans Affairs" />` (inline width)
- Nexus public + Nexus admin: `{$logo}` Smarty variable (no width attribute, content varies)
- All instances: logo image is the link target for navigating to homepage

**`span#headerLabel` (city/site name):**

| Property    | Portal public CSS | Nexus CSS  |
| ----------- | ----------------- | ---------- |
| `position`  | `absolute`        | `absolute` |
| `color`     | `#17008a`         | `#17008a`  |
| `left`      | `90px`            | `90px`     |
| `top`       | `44px`            | `44px`     |
| `font-size` | `16px`            | `16px`     |

**`#headerDescription` (site title — `<h1>`):**

| Property    | Portal public CSS | Nexus CSS  |
| ----------- | ----------------- | ---------- |
| `margin`    | `0`               | `0`        |
| `position`  | `absolute`        | `absolute` |
| `font-size` | `24px`            | `24px`     |
| `color`     | `black`           | `black`    |
| `left`      | `90px`            | `90px`     |
| `top`       | `16px`            | `16px`     |

Note: `#headerDescription` is an `<h1>` element styled to sit at `top: 16px` within the 80px header band.

**`span#headerHelp` (login / user info, upper right):**

| Property      | Portal CSS | Nexus CSS  |
| ------------- | ---------- | ---------- |
| `position`    | `absolute` | `absolute` |
| `top`         | `8px`      | `8px`      |
| `right`       | `10px`     | `10px`     |
| `font-size`   | `12px`     | `12px`     |
| `font-weight` | `normal`   | `normal`   |

**`span#headerLogin` (secondary auth, upper right):**

| Property      | Portal CSS | Nexus CSS  |
| ------------- | ---------- | ---------- |
| `position`    | `absolute` | `absolute` |
| `top`         | `24px`     | `24px`     |
| `right`       | `10px`     | `10px`     |
| `font-size`   | `12px`     | `12px`     |
| `font-weight` | `normal`   | `normal`   |
| `text-align`  | `right`    | `right`    |

**`span#headerTab` (emergency / tab label, lower right):**

| Property           | Portal CSS | Nexus CSS   |
| ------------------ | ---------- | ----------- |
| `position`         | `relative` | `relative`  |
| `top`              | `49px`     | `49px`      |
| `height`           | `32px`     | `32px`      |
| `float`            | `right`    | `right`     |
| `color`            | `white`    | `white`     |
| `font-size`        | `20px`     | `20px`      |
| `font-weight`      | `bold`     | `bold`      |
| `text-align`       | `right`    | `right`     |
| `background-color` | `#5a79a5`  | `#5a79a5`   |
| `padding-right`    | `0.25em`   | Not defined |

**`span#headerTabImg` (decorative tab image):**

| Property      | Portal CSS | Nexus CSS  |
| ------------- | ---------- | ---------- |
| `position`    | `relative` | `relative` |
| `top`         | `49px`     | `49px`     |
| `height`      | `32px`     | `32px`     |
| `float`       | `right`    | `right`    |
| `color`       | `white`    | `white`    |
| `font-size`   | `14px`     | `14px`     |
| `font-weight` | `bold`     | `bold`     |
| `text-align`  | `right`    | `right`    |

Contains: `<img src="images/tab.png" alt="" />` — decorative PNG. CSS background-image is commented out in both stylesheets; `background-color: #5a79a5` on `span#headerTab` provides the blue tab appearance.

**Responsive (legacy gradient header, `max-width: 520px`):**

| Property                       | Default    | Portal public `≤520px` | Portal admin `≤520px` (`#header:not(.usa-header)`) |
| ------------------------------ | ---------- | ---------------------- | -------------------------------------------------- |
| `#header` height               | `80px`     | `120px`                | `120px`                                            |
| `#headerDescription` font-size | `24px`     | `16px`                 | `16px`                                             |
| `span#headerLabel` top         | `44px`     | `30px`                 | `30px`                                             |
| `span#headerLabel` font-size   | `16px`     | `12px`                 | `12px`                                             |
| `span#headerMenu` position     | `relative` | `absolute`             | `absolute`                                         |
| `span#headerMenu` top          | `53px`     | `93px`                 | `95px` (2px different)                             |
| `span#headerMenu` right        | not set    | `4px`                  | `4px`                                              |

**PHI/PII warning (public portal, inline in header):**

```html
<div class="alert" style="display: inline">
  <span>Do not enter PHI/PII.</span>
</div>
```

(`LEAF_Request_Portal/templates/main.tpl:103–105`)

Inline `display: inline` overrides the `.alert` block default. Appears only when `$leafSecure == 0`.

---

##### USWDS Dark Header (`#header.site-header`) — Portal Admin Only

**Container (`#header.site-header`):**

| Property           | Value                          |
| ------------------ | ------------------------------ |
| `background-color` | `#252f3e`                      |
| `padding`          | `0 .5em`                       |
| `height`           | `4.5rem`                       |
| `box-shadow`       | `0px 4px 6px rgba(0,0,0,.2)`   |
| `color`            | `#fff`                         |
| `width`            | `100%` (implied)               |
| Positioning        | Static                         |
| `border-bottom`    | Not explicitly defined in code |

**Inner `.usa-navbar`:**

`width: 100%; height: 100%; display: flex`

**PHI banner (rendered above header, Portal admin only):**

```html
<section
  class="usa-banner bg-orange-topbanner"
  aria-label="Official government website"
>
  <header class="usa-banner__header">
    <p class="usa-banner__header-text text-white lf-alert">
      &nbsp;Do not enter PHI/PII
    </p>
  </header>
</section>
```

| Property (`.bg-orange-topbanner`) | Value     |
| --------------------------------- | --------- |
| `background-color`                | `#d04000` |

| Property (`.usa-banner__header-text`) | Value    |
| ------------------------------------- | -------- |
| `margin`                              | `0`      |
| `padding`                             | `.25em`  |
| `font-size`                           | `.75rem` |
| `letter-spacing`                      | `.02rem` |

| Property (`.lf-alert`) | Value                 |
| ---------------------- | --------------------- |
| `padding`              | `.25em`               |
| `background-color`     | `#d00d2d`             |
| `color`                | `#f6f6f2`             |
| `font-family`          | `"PublicSans-Medium"` |

**Logo area (`.leaf-logo`):**

| Property       | Value    |
| -------------- | -------- |
| `display`      | `flex`   |
| `align-items`  | `center` |
| `width`        | `56px`   |
| `height`       | `100%`   |
| `margin-right` | `.5rem`  |

Logo image: `width: 56px; height: 56px`

**Site title (`.leaf-site-title` / `span#headerLabel`):**

| Property      | Value                           |
| ------------- | ------------------------------- |
| `position`    | `absolute`                      |
| `left`        | `62px`                          |
| `top`         | `17%`                           |
| `font-size`   | `1.2rem`                        |
| `font-family` | `"PublicSans-Bold", sans-serif` |
| `white-space` | `nowrap`                        |

**Site description (`.leaf-header-description` / `span#headerDescription`):**

| Property      | Value                              |
| ------------- | ---------------------------------- |
| `position`    | `absolute`                         |
| `left`        | `62px`                             |
| `top`         | `calc(17% + 1.2rem + 5px)`         |
| `font-size`   | `1rem`                             |
| `font-family` | `"PublicSans-Regular", sans-serif` |
| `white-space` | `nowrap`                           |

**Utility bar (welcome / sign out — fully inline-styled):**

```html
<div style="position:absolute;right:0;top:0;padding:0 0.75rem;font-size:14px;">
  Welcome, <b>{$display_name}</b>! |
  <a href="../?a=logout" style="color:#00bde3">Sign out</a>
</div>
```

| Property            | Value (inline)     |
| ------------------- | ------------------ |
| `position`          | `absolute`         |
| `right`             | `0`                |
| `top`               | `0`                |
| `padding`           | `0 0.75rem`        |
| `font-size`         | `14px`             |
| Sign-out link color | `#00bde3` (inline) |

---

##### Iframe Layout — No Header / No Footer

Both `main_iframe.tpl` (public) and `admin/main_iframe.tpl` (admin):

```html
<body>
  <div id="body">
    <div id="content">
      <div id="bodyarea">{$body}</div>
    </div>
  </div>
</body>
```

- No `<header>` element
- No `<footer>` element
- No skip link
- No status banner
- Body container is `<div id="body">` (not `<main>`)
- Used for embedding content within jQuery UI dialog frames

---

##### Legacy Footer (`#footer`) — Portal Public, Nexus Public, Nexus Admin

**Container (`#footer`):**

| Property     | Value (Portal + Nexus — identical)          |
| ------------ | ------------------------------------------- |
| `float`      | `right`                                     |
| `clear`      | `both`                                      |
| `text-align` | `right`                                     |
| `padding`    | `4px`                                       |
| `font-size`  | `10px`                                      |
| Background   | Not explicitly defined in code              |
| Border       | Not explicitly defined in code              |
| Width        | Not explicitly defined (shrinks to content) |

**Content:**

```html
<footer id="footer" {if $hideFooter == true} style="visibility: hidden; display: none"{/if}>
  <br /><br />
  <a id="versionID" href="?a=about">
    {$smarty.const.PRODUCT_NAME}<br />
    Version {$smarty.const.VERSION_NUMBER} r{$revision}
  </a>
</footer>
```

Two `<br />` elements provide vertical spacing. Footer can be hidden via inline `style`.

**Link styles:**

| State   | Color     | Text decoration |
| ------- | --------- | --------------- |
| Default | `#565c65` | `none`          |
| Hover   | `#f04e0b` | Not defined     |

---

##### Admin Footer (`.leaf-footer`) — Portal Admin Only

**Container (`.leaf-footer`):**

| Property      | Value                           |
| ------------- | ------------------------------- |
| `font-size`   | `.7rem`                         |
| `font-family` | `"PublicSans-Thin", sans-serif` |
| `padding`     | `0rem .6rem`                    |
| `border-top`  | `1px solid #a9aeb1`             |
| `width`       | `calc(100% - 5rem)`             |
| `margin`      | `1rem auto 0 auto`              |
| `text-align`  | `right`                         |
| `clear`       | `both`                          |

**Content:**

```html
<footer class="usa-footer leaf-footer noprint" id="footer"
  {if $hideFooter == true} style="visibility: hidden; display: none"{/if}>
  <a id="versionID" href="../?a=about">
    {$smarty.const.PRODUCT_NAME}<br />
    Version {$smarty.const.VERSION_NUMBER} r{$revision}
  </a>
</footer>
```

No `<br /><br />` spacer; uses CSS margin instead.

**Link styles:**

| State   | Color     | Text decoration |
| ------- | --------- | --------------- |
| Default | `#565c65` | `none`          |
| Hover   | Not set   | `underline`     |

---

#### 3.8.3 Figma Build Specification

##### COMPONENT: Legacy Gradient Header

**HEADER FRAME:**

- Layout direction: Absolute overlay (all children use `position: absolute` or `float`)
- Background: `gradient.png` image (`background-size: 100% 100%`)
- Height: `80px` fixed (grows to `120px` at ≤520px)
- Width: `100%`
- Padding: Not explicitly defined in code
- Shadow: Not explicitly defined in code
- Border-bottom: `2px solid #5a79a5`
- Margin-bottom: `4px`

**LOGO:**

- `images/VA_icon_small.png`, width `80px` (inline, Portal public)
- Wrapped in `<a href="./">` for homepage navigation
- Position: implied top-left

**SITE TITLE (`#headerLabel`):**

- Font size: `16px`; color: `#17008a`; position `absolute left:90px top:44px`

**SITE DESCRIPTION (`#headerDescription` — `<h1>`):**

- Font size: `24px`; color: `black`; position `absolute left:90px top:16px`; margin `0`

**UTILITY LINKS (`span#headerHelp`, `span#headerLogin`):**

- Font size: `12px`; font weight: `normal`; position `absolute top:8–24px right:10px`

**TAB LABEL (`span#headerTab`):**

- Font size: `20px`; color: `white`; background `#5a79a5`; position `relative top:49px`; float right

**STATES:**

- Default: static layout within 80px band
- Hover: Not explicitly defined on header container
- Responsive (≤520px): height → `120px`, `#headerDescription` → `16px`, nav repositions to `top: 93px`

---

##### COMPONENT: USWDS Dark Header (Portal Admin)

**HEADER FRAME:**

- Layout direction: Row (flex via `.usa-navbar`)
- Background: `#252f3e`
- Height: `4.5rem`
- Padding: `0 .5em`
- Width: `100%`
- Shadow: `0px 4px 6px rgba(0,0,0,.2)`
- Border-bottom: Not explicitly defined in code

**LOGO:**

- `56px × 56px`; `display: flex; align-items: center; margin-right: .5rem`

**SITE TITLE (`.leaf-site-title`):**

- Font family: `"PublicSans-Bold"`; size `1.2rem`; color `white` (inherited); position `absolute left:62px top:17%`

**SITE DESCRIPTION (`.leaf-header-description`):**

- Font family: `"PublicSans-Regular"`; size `1rem`; color `white`; position `absolute left:62px top:calc(17% + 1.2rem + 5px)`

**UTILITY LINKS (inline-styled):**

- Font size: `14px`; position `absolute right:0 top:0`; padding `0 0.75rem`
- Sign-out color: `#00bde3`

**STATES:**

- Default: static
- Hover: Not explicitly defined on header container
- Responsive (≤30rem): No height change defined; `usa-button` goes full-width

---

##### COMPONENT: Legacy Footer (`#footer`)

**FOOTER FRAME:**

- Layout direction: Float-right (collapses to content width)
- Background: Not explicitly defined in code
- Border: Not explicitly defined in code
- Padding: `4px`
- Width: Content-driven
- Text alignment: `right`
- Font size: `10px`

**VERSION LINK:**

- Default color: `#565c65`; text-decoration `none`
- Hover color: `#f04e0b`

**STATES:**

- Hidden: `visibility: hidden; display: none` (inline, Smarty-conditional)

---

##### COMPONENT: Admin Footer (`.leaf-footer`)

**FOOTER FRAME:**

- Layout direction: Single line, text-right
- Background: Not explicitly defined in code
- Border-top: `1px solid #a9aeb1`
- Padding: `0 .6rem`
- Width: `calc(100% - 5rem)`
- Margin: `1rem auto 0 auto` (centered)
- Font family: `"PublicSans-Thin"`
- Font size: `.7rem`

**VERSION LINK:**

- Default color: `#565c65`; text-decoration `none`
- Hover: `text-decoration: underline`

**STATES:**

- Print: hidden via `.noprint` (defined in `printer.css`)
- Hidden: `visibility: hidden; display: none` (inline, Smarty-conditional)

---

#### 3.8.4 Observed Inconsistencies

**Nexus admin uses legacy gradient header while Portal admin uses USWDS dark header:**

| Aspect          | Portal admin                                          | Nexus admin                                       |
| --------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Header element  | `<header id="header" class="usa-header site-header">` | `<header id="header">` (no class)                 |
| Background      | `#252f3e` (dark navy)                                 | `gradient.png` image                              |
| Height          | `4.5rem`                                              | `80px`                                            |
| Shadow          | `0px 4px 6px rgba(0,0,0,.2)`                          | Not defined                                       |
| Site title font | `"PublicSans-Bold"` at `1.2rem`                       | Verdana inherited at `24px`                       |
| City label font | `"PublicSans-Bold"` at `1.2rem`                       | Verdana at `16px`                                 |
| Navigation      | USWDS dark `#nav` (designed for dark header)          | USWDS dark `#nav` rendered against gradient image |
| Utility links   | Welcome + sign-out (inline-styled `div`)              | `span#headerHelp` absolutely positioned           |
| Footer          | `.leaf-footer` (modern)                               | `#footer` (legacy)                                |

The Nexus admin loads the modern dark-styled `#nav` into `span#headerMenu` of the legacy gradient header — the menu is visually designed for a dark background but renders against the gradient image.

**`#headerDescription` element type differs by context:**

- Legacy header: `<h1 id="headerDescription">` — semantic heading element
- Admin USWDS header: `<span id="headerDescription" class="leaf-header-description">` — non-semantic span

**Logo navigation differs between admin and public:**

- Legacy (public/Nexus): `<a href="./" style="cursor:pointer">` — standard href link
- Admin (Portal): `<a tabindex="0" onclick="window.location='./'">` — onclick with no href; requires `tabindex` to be keyboard-accessible

**PHI/PII warning implemented three different ways:**

| Context       | Implementation                                                  | Background color |
| ------------- | --------------------------------------------------------------- | ---------------- |
| Portal public | `<div class="alert" style="display: inline">` inside header     | `#9d0000` red    |
| Portal admin  | `<section class="usa-banner bg-orange-topbanner">` above header | `#d04000` orange |
| Nexus public  | Not present in header                                           | N/A              |
| Nexus admin   | Not present in header                                           | N/A              |

**`span#headerMenu` top offset diverges by 2px at ≤520px:**

- Portal public: `top: 93px`
- Portal admin override: `top: 95px` (via `#header:not(.usa-header)` selector in `admin/css/style.css`)

**Legacy footer uses `<br /><br />` for spacing** — two line breaks provide vertical separation above version link. Admin footer uses `margin: 1rem auto 0 auto` instead.

**`usa-footer` class on admin footer has no CSS** — `class="usa-footer leaf-footer noprint"` — `.usa-footer` rules do not exist in `libs/css/leaf.css`. Visual styling comes entirely from `.leaf-footer`.

**Legacy `#footer` has no top border and no `.noprint` class** — blends into page with no separator; prints with page content. Admin `.leaf-footer` has `border-top: 1px solid #a9aeb1` and `.noprint` suppression.

**`tab.png` referenced in HTML but background-image CSS is commented out:**

Both Portal and Nexus CSS files comment out:

```css
/* background-image: url(../images/tab.gif); background-repeat: no-repeat; */
```

The `tab.png` in markup and `.gif` reference in CSS are mismatched file types. `background-color: #5a79a5` on `span#headerTab` is the active styling.

---

## PART 4 — Asset Inventory

**Scope:** All image, SVG, icon, logo, and font files shipped with the LEAF repository. No redesign recommendations. Documentary record only.

**Evidence files examined:** `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`, `libs/dynicons/svg/` (243 files), `libs/img/`, `libs/css/fonts/`, `libs/css/assets/`, `libs/js/jquery/css/dcvamc/images/`, `docker/vue-app/src/common/assets/`, `libs/dynicons/svg/LEAF-logo.svg`, `libs/dynicons/svg/LEAF-thumbprint.svg`, `libs/dynicons/svg/dialog-apply.svg`

---

### 4.1 Asset Directory Map

```
LEAF/
├── LEAF_Request_Portal/
│   └── images/                          # Portal-specific raster images (12 files)
│       ├── gradient.png                 # Public header background (full-width gradient strip)
│       ├── gradient_admin.png           # Admin header background variant
│       ├── VA_icon_small.png            # VA logo mark (small)
│       ├── aboutlogo.png                # About dialog logo
│       ├── largespinner.gif             # Loading spinner (animated GIF, used in dialogs)
│       ├── tab.png                      # Tab UI element (referenced in HTML; CSS rule commented out)
│       ├── blank.gif                    # 1×1 transparent spacer GIF
│       ├── box.gif                      # Checkbox/UI element GIF
│       ├── collapsed.png                # Tree/section collapsed indicator
│       ├── expanded.png                 # Tree/section expanded indicator
│       ├── indicator.gif                # Generic UI indicator (animated)
│       └── restore_down.png             # Window restore icon
│
├── LEAF_Nexus/
│   └── images/                          # Nexus-specific raster images (15 files)
│       ├── [all 12 Portal files above]
│       ├── aboutlogo_small.png          # Smaller About logo variant
│       ├── checkbox-yes.png             # Custom checkbox checked state
│       └── checkbox-no.png              # Custom checkbox unchecked state
│
├── libs/
│   ├── dynicons/
│   │   └── svg/                         # Server-side SVG icon library (243 files)
│   │       ├── LEAF-logo.svg            # LEAF wordmark (custom, Adobe Illustrator)
│   │       ├── LEAF-thumbprint.svg      # LEAF thumbprint mark (custom)
│   │       ├── aiga_departingflights_inv.svg  # AIGA public symbol
│   │       ├── aiga_hotelinformation_inv.svg  # AIGA public symbol
│   │       └── [239 GNOME icon theme SVGs]    # Inkscape-created, named by function
│   │
│   ├── img/                             # Shared utility images (4 items)
│   │   ├── arrow-both.svg               # Bidirectional arrow (sort indicator)
│   │   ├── loading_spinner.gif          # Loading spinner (animated GIF)
│   │   └── usa-icons/
│   │       └── unfold_more.svg          # USWDS unfold/expand icon
│   │
│   ├── css/
│   │   ├── fonts/                       # Fonts for PHP/Smarty templates
│   │   │   ├── fontawesome/
│   │   │   │   ├── fa-solid-900.ttf
│   │   │   │   ├── fa-solid-900.woff
│   │   │   │   └── fa-solid-900.woff2   # Solid weight only (3 files)
│   │   │   ├── public-sans/
│   │   │   │   ├── PublicSans-Thin.{woff,woff2}
│   │   │   │   ├── PublicSans-Light.{woff,woff2}
│   │   │   │   ├── PublicSans-Regular.{woff,woff2}
│   │   │   │   ├── PublicSans-Medium.{woff,woff2}
│   │   │   │   └── PublicSans-Bold.{woff,woff2}   # 5 weights × 2 formats = 10 files
│   │   │   └── source-sans-pro/
│   │   │       ├── sourcesanspro-regular-webfont.{woff,woff2}
│   │   │       └── sourcesanspro-bold-webfont.{woff,woff2}  # 2 weights × 2 formats = 4 files
│   │   └── assets/
│   │       └── loading_spinner.083c03ba8b4973b81e64.gif  # Content-hashed spinner (Vue build output)
│   │
│   └── js/
│       └── jquery/css/dcvamc/images/    # jQuery UI theme sprites (6 files)
│           ├── ui-icons_444444_256x240.png
│           ├── ui-icons_555555_256x240.png
│           ├── ui-icons_777620_256x240.png
│           ├── ui-icons_777777_256x240.png
│           ├── ui-icons_cc0000_256x240.png
│           └── ui-icons_ffffff_256x240.png
│
└── docker/
    └── vue-app/src/common/assets/       # Vue application fonts and shared assets
        ├── fontawesome/                  # Font Awesome 6 — all weights (15 files)
        │   ├── fa-brands-400.{eot,svg,ttf,woff,woff2}
        │   ├── fa-regular-400.{eot,svg,ttf,woff,woff2}
        │   └── fa-solid-900.{eot,svg,ttf,woff,woff2}
        ├── public-sans/                  # Public Sans — full weight range with italics (36 files)
        │   ├── PublicSans-Thin through PublicSans-Black (9 upright weights)
        │   ├── PublicSans-ThinItalic through PublicSans-BlackItalic (9 italic weights)
        │   └── Each as .woff + .woff2 = 36 files
        ├── source-sans-pro/              # Source Sans Pro — expanded set (24 files)
        │   ├── sourcesanspro-extralight through sourcesanspro-black (6 upright weights)
        │   ├── sourcesanspro-extralightitalic through sourcesanspro-blackitalic (6 italic weights)
        │   └── Each as .woff + .woff2 = 24 files
        ├── loading_spinner.gif           # Loading spinner (duplicate of libs/img/)
        └── unfold_more.svg              # USWDS icon (duplicate of libs/img/usa-icons/)
```

---

### 4.2 Image Inventory Summary

**Portal-only images (`LEAF_Request_Portal/images/` — 12 files):**

| File                 | Format         | Type       | Usage                                                                                |
| -------------------- | -------------- | ---------- | ------------------------------------------------------------------------------------ |
| `gradient.png`       | PNG            | Decorative | Public header `#header` background-image                                             |
| `gradient_admin.png` | PNG            | Decorative | Admin header background variant                                                      |
| `VA_icon_small.png`  | PNG            | Logo/Brand | VA logo mark in header                                                               |
| `aboutlogo.png`      | PNG            | Logo/Brand | About dialog / splash screen                                                         |
| `largespinner.gif`   | GIF (animated) | Functional | Loading indicator in `#loadIndicator` divs inside dialogs                            |
| `tab.png`            | PNG            | UI chrome  | Referenced in `span#headerTab` HTML; CSS rule is commented out — not visually active |
| `blank.gif`          | GIF            | Spacer     | 1×1 transparent pixel; layout spacer                                                 |
| `box.gif`            | GIF            | UI chrome  | Checkbox/tree UI element                                                             |
| `collapsed.png`      | PNG            | UI state   | Tree/collapsible section collapsed indicator                                         |
| `expanded.png`       | PNG            | UI state   | Tree/collapsible section expanded indicator                                          |
| `indicator.gif`      | GIF (animated) | Functional | Generic activity indicator                                                           |
| `restore_down.png`   | PNG            | UI chrome  | Window/panel restore icon                                                            |

**Nexus-only additions (`LEAF_Nexus/images/` — 3 additional files):**

| File                  | Format | Type       | Usage                                                 |
| --------------------- | ------ | ---------- | ----------------------------------------------------- |
| `aboutlogo_small.png` | PNG    | Logo/Brand | Smaller About logo variant for Nexus                  |
| `checkbox-yes.png`    | PNG    | UI state   | Custom checkbox checked state (org chart / data grid) |
| `checkbox-no.png`     | PNG    | UI state   | Custom checkbox unchecked state                       |

**Shared utility images (`libs/img/` — 4 items):**

| File                        | Format         | Type       | Usage                                               |
| --------------------------- | -------------- | ---------- | --------------------------------------------------- |
| `arrow-both.svg`            | SVG            | UI chrome  | Bidirectional sort indicator arrow                  |
| `loading_spinner.gif`       | GIF (animated) | Functional | Loading indicator (shared across contexts)          |
| `usa-icons/unfold_more.svg` | SVG            | UI chrome  | USWDS unfold/expand icon (used in select dropdowns) |

**Vue build output (`libs/css/assets/` — 1 file):**

| File                                       | Format         | Type       | Usage                                                                     |
| ------------------------------------------ | -------------- | ---------- | ------------------------------------------------------------------------- |
| `loading_spinner.083c03ba8b4973b81e64.gif` | GIF (animated) | Functional | Content-hashed version of loading spinner; referenced in compiled Vue CSS |

**Observation:** `loading_spinner.gif` exists in three locations (`LEAF_Request_Portal/images/`, `libs/img/`, `docker/vue-app/src/common/assets/`) and as a hashed copy in `libs/css/assets/`. No shared source; each is an independent file.

---

### 4.3 SVG & Icon System Documentation

#### 4.3a dynicons — Server-Side SVG Service

**Location:** `libs/dynicons/svg/` (243 SVG files)

**Delivery mechanism:** A PHP script at `dynicons/` URL path accepts query parameters and streams SVG files from the `libs/dynicons/svg/` directory. Resizing is performed server-side by embedding the requested width into the SVG `width`/`height` attributes at request time. Usage in templates:

```html
<!-- Pattern: dynicons/?img={filename.svg}&w={pixel-width} -->
<img src="dynicons/?img=dialog-apply.svg&amp;w=32" alt="" />
<img src="dynicons/?img=media-floppy.svg&amp;w=16" alt="" />
<img src="dynicons/?img=process-stop.svg&amp;w=16" alt="" />
```

Common requested widths observed: `16`, `20`, `22`, `24`, `32`

**Icon origin breakdown:**

| Source                            | Count (approx.) | Characteristics                                                                                           |
| --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| GNOME icon theme (Tango / Jimmac) | ~239            | Inkscape-created; named by function (e.g., `document-save.svg`, `edit-delete.svg`); CC BY-SA 2.0 licensed |
| LEAF custom                       | 2               | `LEAF-logo.svg` (wordmark), `LEAF-thumbprint.svg` (brand mark); Adobe Illustrator export                  |
| AIGA public symbols               | 2               | `aiga_departingflights_inv.svg`, `aiga_hotelinformation_inv.svg`; public domain pictograms                |

**Color model:** All SVG fills are hard-coded. No CSS-controlled fills. Colors embedded via:

- `fill` attributes on `<path>` elements (e.g., `fill="url(#linearGradient1455)"`)
- Inline `<linearGradient>` and `<radialGradient>` definitions inside `<defs>`
- Inline `<style>` blocks with hard-coded hex values (LEAF-logo.svg: `.st0{fill:#7BC143;} .st1{fill:#0071BD;}`)

**Implications:** SVG fills cannot be overridden with CSS `color` or `fill` inheritance. Icons cannot be recolored for dark mode, theme changes, or accessibility adjustments without modifying the SVG source files.

**Native dimensions:** Most GNOME icons define `width="48px" height="48px"` in the root `<svg>` element. Resizing is handled server-side by the `dynicons/` PHP service — the browser receives a modified SVG at the requested pixel width.

**LEAF-logo.svg specifics:**

- Source: Adobe Illustrator 21.1.0 export
- Dimensions: `width="1058px" height="280px"` `viewBox="0 0 1058 280"`
- Colors: `.st0{fill:#7BC143;}` (LEAF green), `.st1{fill:#0071BD;}` (VA blue)
- Structure: 4 named layers (`Layer_1` through `Layer_4`); wordmark letterforms in `Layer_1`; decorative leaf mark in `Layer_2`; `Layer_3` and `Layer_4` are empty

**dialog-apply.svg specifics (representative GNOME icon):**

- Source: Inkscape (Jimmac / GNOME icon team), CC BY-SA 2.0
- Dimensions: `width="48px" height="48px"`
- Colors: green checkmark via `linearGradient` (`#a7cc5c` to `#789e2d`); drop shadow via `radialGradient`; highlight via inline `opacity` on second `<path>`
- No CSS hooks; all color information embedded in gradient definitions

#### 4.3b jQuery UI Sprite Icons

**Location:** `libs/js/jquery/css/dcvamc/images/`

**Delivery mechanism:** CSS `background-position` offsets into a 256×240px PNG sprite sheet. Used by jQuery UI widgets (datepicker, dialog close button, accordion arrows, etc.).

**Files (6 color variants of the same sprite layout):**

| File                          | Hex color               | Probable use context              |
| ----------------------------- | ----------------------- | --------------------------------- |
| `ui-icons_444444_256x240.png` | `#444444` (dark gray)   | Default state icons               |
| `ui-icons_555555_256x240.png` | `#555555` (medium gray) | Secondary state                   |
| `ui-icons_777620_256x240.png` | `#777620` (olive)       | Custom/accent state               |
| `ui-icons_777777_256x240.png` | `#777777` (gray)        | Disabled or subdued state         |
| `ui-icons_cc0000_256x240.png` | `#cc0000` (red)         | Error or destructive action state |
| `ui-icons_ffffff_256x240.png` | `#ffffff` (white)       | Inverse/dark background state     |

The `dcvamc` directory name indicates this is a custom jQuery UI theme created for the DC VA Medical Center — a site-specific theme that has been carried forward into the LEAF system.

#### 4.3c USWDS Icons

**Location:** `libs/img/usa-icons/unfold_more.svg` and `docker/vue-app/src/common/assets/unfold_more.svg`

Only one USWDS icon is present in the repository. Its presence alongside partial USWDS adoption (`.usa-button`, `.usa-table`) indicates the USWDS icon system was not adopted wholesale — only individual icons were pulled in as needed.

---

### 4.4 Logo & Brand Assets

| Asset                     | File                                           | Dimensions   | Colors                          | Format source            |
| ------------------------- | ---------------------------------------------- | ------------ | ------------------------------- | ------------------------ |
| LEAF wordmark (full)      | `libs/dynicons/svg/LEAF-logo.svg`              | 1058×280px   | Green `#7BC143`, Blue `#0071BD` | Adobe Illustrator 21.1.0 |
| LEAF thumbprint mark      | `libs/dynicons/svg/LEAF-thumbprint.svg`        | Not verified | Not verified                    | Not verified             |
| VA icon (small)           | `LEAF_Request_Portal/images/VA_icon_small.png` | Not verified | VA blue                         | PNG raster               |
| About logo (Portal)       | `LEAF_Request_Portal/images/aboutlogo.png`     | Not verified | Not verified                    | PNG raster               |
| About logo (Nexus, small) | `LEAF_Nexus/images/aboutlogo_small.png`        | Not verified | Not verified                    | PNG raster               |
| VA icon (Nexus)           | `LEAF_Nexus/images/VA_icon_small.png`          | Not verified | VA blue                         | PNG raster (duplicate)   |

**Brand color observations from `LEAF-logo.svg`:**

- Green: `#7BC143` — used for "L", "E", "A" letterforms and the leaf mark
- Blue: `#0071BD` — used for "VA" letterforms

**Cross-reference with UI colors:** The admin USWDS dark header uses `background-color: #252f3e` (navy), not `#0071BD`. The green `#7BC143` does not appear in `libs/css/leaf.css` or any other CSS file examined. The brand colors are present only in the logo SVG, not propagated into the UI system.

**Logo usage in templates:**

```html
<!-- Portal public header -->
<a href="./" style="cursor:pointer">
  <img id="headerLabel" src="dynicons/?img=LEAF-logo.svg&w=108" alt="LEAF" />
</a>

<!-- Portal admin header -->
<a tabindex="0" onclick="window.location='./'">
  <img src="dynicons/?img=LEAF-logo.svg&w=108" alt="LEAF Home" />
</a>
```

Both contexts request the logo at `w=108` — 108px wide, scaled from the 1058px native width by the `dynicons/` service.

---

### 4.5 Font Inventory

#### Fonts available in PHP/Smarty template contexts (`libs/css/fonts/`)

**Font Awesome 6 (Solid weight only):**

| File                             | Format   | Weight      | Style  |
| -------------------------------- | -------- | ----------- | ------ |
| `fontawesome/fa-solid-900.ttf`   | TrueType | 900 (Solid) | Normal |
| `fontawesome/fa-solid-900.woff`  | WOFF     | 900 (Solid) | Normal |
| `fontawesome/fa-solid-900.woff2` | WOFF2    | 900 (Solid) | Normal |

Only the Solid weight is bundled. Regular and Brands weights are absent from the PHP template context. Font Awesome icons are appended to admin nav menu items via JavaScript (`fa fa-*` classes in `menu.tpl` JS).

**Public Sans:**

| Weight  | Files                                                 |
| ------- | ----------------------------------------------------- |
| Thin    | `PublicSans-Thin.woff`, `PublicSans-Thin.woff2`       |
| Light   | `PublicSans-Light.woff`, `PublicSans-Light.woff2`     |
| Regular | `PublicSans-Regular.woff`, `PublicSans-Regular.woff2` |
| Medium  | `PublicSans-Medium.woff`, `PublicSans-Medium.woff2`   |
| Bold    | `PublicSans-Bold.woff`, `PublicSans-Bold.woff2`       |

5 upright weights × 2 formats = 10 files. No italic variants in this context.

**Source Sans Pro:**

| Weight  | Files                                                                       |
| ------- | --------------------------------------------------------------------------- |
| Regular | `sourcesanspro-regular-webfont.woff`, `sourcesanspro-regular-webfont.woff2` |
| Bold    | `sourcesanspro-bold-webfont.woff`, `sourcesanspro-bold-webfont.woff2`       |

2 weights × 2 formats = 4 files. No italic or other weight variants in this context.

#### Fonts available in Vue application context (`docker/vue-app/src/common/assets/`)

**Font Awesome 6 (all weights):**

| Weight        | Formats                                   |
| ------------- | ----------------------------------------- |
| Solid (900)   | `.eot`, `.svg`, `.ttf`, `.woff`, `.woff2` |
| Regular (400) | `.eot`, `.svg`, `.ttf`, `.woff`, `.woff2` |
| Brands (400)  | `.eot`, `.svg`, `.ttf`, `.woff`, `.woff2` |

3 weights × 5 formats = 15 files. Includes legacy `.eot` and `.svg` formats (IE8/legacy browser support), not present in the PHP template font bundle.

**Public Sans (full weight range with italics):**

| Weights available                                                                                                         | Count |
| ------------------------------------------------------------------------------------------------------------------------- | ----- |
| Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black (upright)                                      | 9     |
| ThinItalic, ExtraLightItalic, LightItalic, Italic, MediumItalic, SemiBoldItalic, BoldItalic, ExtraBoldItalic, BlackItalic | 9     |
| Total files (× 2 formats each)                                                                                            | 36    |

Includes `SemiBold`, `ExtraBold`, `Black` and all italic variants — none of which are available in `libs/css/fonts/`.

**Source Sans Pro (expanded set):**

| Weights available                                                              | Count |
| ------------------------------------------------------------------------------ | ----- |
| ExtraLight, Light, Regular, SemiBold, Bold, Black (upright)                    | 6     |
| ExtraLightItalic, LightItalic, Italic, SemiBoldItalic, BoldItalic, BlackItalic | 6     |
| Total files (× 2 formats each)                                                 | 24    |

The PHP template context ships only `regular` and `bold` (2 weights). The Vue context ships 6 upright + 6 italic weights.

#### Font weight availability comparison

| Font            | PHP template weights                           | Vue app weights               |
| --------------- | ---------------------------------------------- | ----------------------------- |
| Font Awesome    | Solid only                                     | Solid + Regular + Brands      |
| Public Sans     | Thin, Light, Regular, Medium, Bold (no italic) | All 9 weights + all 9 italics |
| Source Sans Pro | Regular, Bold (no italic)                      | ExtraLight–Black + 6 italics  |

The Vue application has access to a significantly larger font set than the PHP template system.

#### Font stack in use (observed in CSS)

From `libs/css/leaf.css` and `LEAF_Request_Portal/admin/css/style.css`:

```css
/* Admin body default */
font-family: "PublicSans-Regular", "Source Sans Pro", sans-serif;

/* Admin headings / site title */
font-family: "PublicSans-Bold", "Source Sans Pro", sans-serif;

/* Legacy public/Nexus body */
font-family:
  Verdana, Geneva, Arial, Helvetica, sans-serif; /* system fonts, no web fonts */
```

Public-facing Portal and Nexus pages do not load Public Sans or Source Sans Pro — they fall back to system Verdana.

---

### 4.6 Observed Structural Patterns

**1. Duplicate files across locations with no shared source:**

| Asset                 | Locations                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `loading_spinner.gif` | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`, `libs/img/`, `docker/vue-app/src/common/assets/`, `libs/css/assets/` (hashed) |
| `unfold_more.svg`     | `libs/img/usa-icons/`, `docker/vue-app/src/common/assets/`                                                                         |
| `VA_icon_small.png`   | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                |
| `aboutlogo.png`       | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                |
| `gradient.png`        | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                |
| `gradient_admin.png`  | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                |

**2. Font sets are duplicated at different completeness levels:**

`libs/css/fonts/` (PHP template context) and `docker/vue-app/src/common/assets/` (Vue context) both contain Public Sans and Source Sans Pro, but at different weight coverage. No shared source directory — each context maintains its own copy. The Vue set is a superset of the PHP set.

**3. No unified icon system:**

Three parallel icon delivery mechanisms operate simultaneously with no shared infrastructure:

| System                  | Files                                              | Delivery                          | Color control                          |
| ----------------------- | -------------------------------------------------- | --------------------------------- | -------------------------------------- |
| `dynicons/` SVG service | 243 SVGs in `libs/dynicons/svg/`                   | PHP server-side, `<img>` tag      | Hard-coded fills; not CSS-controllable |
| jQuery UI sprites       | 6 PNG files in `libs/js/jquery/css/dcvamc/images/` | CSS `background-position`         | Color baked into PNG; 6 fixed variants |
| Font Awesome 6          | Font files in `libs/css/fonts/fontawesome/`        | CSS `content:` on pseudo-elements | CSS-controllable via `color`           |

**4. Content-hashed asset in `libs/css/assets/`:**

`loading_spinner.083c03ba8b4973b81e64.gif` is a Webpack/Vue CLI build output artifact checked into the repository. This pattern (committing compiled build output) is consistent with the observation that `libs/css/leaf.css` is also a compiled/minified file committed to source.

**5. `dynicons/` PHP service is the primary UI icon delivery mechanism:**

Analysis of template files shows `dynicons/?img=*.svg&w=*` is by far the most common icon usage pattern across all four application contexts (Portal public, Portal admin, Nexus public, Nexus admin). Font Awesome is used only in admin nav menu items (appended via JavaScript). jQuery UI sprites are used only for jQuery UI widget chrome (dialog close buttons, datepicker arrows).

**6. Legacy GIF-based UI chrome (non-animated):**

`blank.gif`, `box.gif`, `collapsed.png`, `expanded.png` are legacy technique assets (1990s–2000s web pattern). These are typically used in tree views and table layouts where CSS-only solutions are now standard. Their continued presence indicates legacy PHP template code that has not been modernized.

**7. Tab asset mismatch (dead reference):**

- `tab.png` exists in `LEAF_Request_Portal/images/` and `LEAF_Nexus/images/`
- The CSS rule `background-image: url(../images/tab.gif)` (wrong extension) is commented out in both `LEAF_Request_Portal/css/style.css` and `LEAF_Nexus/css/style.css`
- The HTML `<span id="headerTab">` is present in both public templates but the image is not rendered
- Represents a dead asset that was replaced by a `background-color` but never removed

---

### 4.7 Figma Asset Reconstruction Summary

This section describes what a designer would need to reconstruct the LEAF asset system in Figma.

**Color tokens to define:**

| Token name (suggested)  | Value                  | Source                                               |
| ----------------------- | ---------------------- | ---------------------------------------------------- |
| `leaf-green`            | `#7BC143`              | `LEAF-logo.svg` `.st0`                               |
| `va-blue`               | `#0071BD`              | `LEAF-logo.svg` `.st1`                               |
| `header-dark`           | `#252f3e`              | `libs/css/leaf.css` admin USWDS header               |
| `header-gradient-start` | Visual sample required | `gradient.png` — not a CSS value                     |
| `header-border`         | `#5a79a5`              | `LEAF_Request_Portal/css/style.css` `#header` border |

**Fonts to load in Figma:**

| Font                       | Weights needed for PHP templates   | Weights needed for Vue        |
| -------------------------- | ---------------------------------- | ----------------------------- |
| Public Sans                | Thin, Light, Regular, Medium, Bold | All weights including italics |
| Source Sans Pro            | Regular, Bold                      | All weights including italics |
| Font Awesome 6 (icon font) | Solid only                         | Solid + Regular + Brands      |
| Verdana                    | Regular, Bold                      | Not needed                    |

**Icons:** The `dynicons/` library (243 SVGs) would need to be imported as individual Figma components. Because fills are hard-coded, each icon would import with fixed colors — no automatic theming. Icons would need to be reorganized in Figma since the GNOME naming convention (`dialog-apply.svg`, `media-floppy.svg`) is functional, not categorical.

**Logo:** `LEAF-logo.svg` can be imported directly into Figma. The file is a clean Adobe Illustrator export with named layers. Expected Figma import behavior: paths are importable; layer names (`Layer_1`, `Layer_2`) will be preserved; no Figma-specific adjustments needed.

**Raster assets:** `gradient.png` (Portal header background) and `gradient_admin.png` cannot be recreated from code — only sampled values or the actual PNG would be used. All other raster assets (`largespinner.gif`, `collapsed.png`, `expanded.png`, etc.) are legacy UI chrome that may not warrant Figma component creation.

**Image sizes:** Most raster assets have no documented dimensions in the codebase (no `width`/`height` in CSS, and size is set by the image file itself). Dimensions would need to be measured from the actual files.

**jQuery UI sprites:** Not worth recreating as Figma components — these are system-level jQuery UI widget chrome, not application-level design elements.

**Asset organization gaps:**

- No design token file or CSS custom property system for brand colors
- No single source of truth for logo files — logo SVG lives inside the icon library directory (`dynicons/svg/`) not in a dedicated brand assets directory
- Font files are duplicated across two contexts with different weight coverage and no shared source
- Spinner GIF exists in five locations; no canonical source

---

## PART 5 — Inconsistency Report

**Scope:** Cross-system analysis synthesized from Parts 3 and 4. No redesign. No recommendations. Documentary record only.

**Source documentation:** All findings reference evidence paths established in Parts 3–4 of this audit.

---

### 5.1 Visual Drift Patterns

#### 5.1.1 Red / Error Color Drift

The same semantic role (error, warning, alert, required) is expressed with six distinct hex values across the codebase, plus two CSS named colors, with no shared definition:

| Value                    | Source                                                                                                               | Context                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `#9d0000`                | `LEAF_Request_Portal/css/style.css:412`, `LEAF_Nexus/css/style.css:380`                                              | `.alert` class background                                                    |
| `#c00` / `#cc0000`       | `LEAF_Request_Portal/templates/subindicators.tpl:425,482,548`, `LEAF_Request_Portal/templates/file_form_error.tpl:2` | Inline validation error text, required field markers                         |
| `#B50909`                | `LEAF_Request_Portal/admin/css/style.css:827`, `LEAF_Request_Portal/admin/css/mod_workflow.css:152`                  | `.entry_error` border, `.error_message` text                                 |
| `#b74141`                | `LEAF_Request_Portal/templates/submitForm_parallel_processing.tpl:48`                                                | One-off warning banner background (inline style)                             |
| `#d54309`                | `libs/css/leaf.css`                                                                                                  | `.leaf-no-results` left border                                               |
| `#d83933`                | `libs/css/leaf.css`                                                                                                  | `.usa-button--secondary` (destructive action button)                         |
| `red` (keyword)          | `LEAF_Request_Portal/templates/reports/LEAF_Inbox.tpl:1117`, `LEAF_Request_Portal/templates/view_status.tpl:54`      | `#status` div text color, failed status span                                 |
| `#b50909` (case variant) | `LEAF_Request_Portal/admin/css/style.css:827`                                                                        | `.entry_error` border (capitalized in comment references, lowercase in code) |

Eight distinct expressions of the "error/warning" color role with no shared definition.

#### 5.1.2 Blue / Interactive Color Drift

The interactive blue used for hover states, active backgrounds, links, and primary actions appears in multiple non-equivalent values with overlapping semantic roles:

| Value     | Source                                   | Context                                                                                 |
| --------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `#e8f2ff` | `LEAF_Request_Portal/css/style.css:1291` | `.buttonNorm` default background                                                        |
| `#2372b0` | `LEAF_Request_Portal/css/style.css:1292` | `.buttonNorm` hover/focus/selected background; `.table_editable` hover                  |
| `#005ea2` | `libs/css/leaf.css`                      | `.usa-button` default background; `.table-bordered` header; `.usa-sidenav` active/hover |
| `#252f3e` | `libs/css/leaf.css`                      | Admin USWDS header background                                                           |
| `#274863` | `libs/css/leaf.css`                      | `#nav` level 1 hover background; level 2 dropdown background                            |
| `#2378c3` | `libs/css/leaf.css`                      | `#nav` level 2 hover; level 3 background                                                |
| `#1d5689` | `libs/css/leaf.css`                      | `#nav` level 2 mobile background                                                        |
| `#17008a` | `LEAF_Request_Portal/css/style.css:200`  | `span#headerLabel` text color (legacy header)                                           |
| `#445f87` | `LEAF_Request_Portal/css/style.css:395`  | `.link` pseudo-button text color                                                        |
| `#004b76` | Inherited link color in admin context    | Global `a:link` in admin pages                                                          |
| `#00bde3` | `libs/css/leaf.css`                      | `.entry_info` border; `.leaf-nav-icon` color                                            |

Eleven distinct blue-spectrum values distributed across interactive, navigation, and feedback contexts.

#### 5.1.3 Shadow Value Drift

Five different `box-shadow` expressions across card/container components, with no shared definition:

| Component                          | Shadow (default)               | Shadow (hover)                 | Source                                                 |
| ---------------------------------- | ------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `.menuButton` / `.menuButtonSmall` | `0 2px 6px #8e8e8e`            | `0 4px 6px 2px #8e8e8e`        | `LEAF_Request_Portal/css/style.css:810`                |
| `.leaf-admin-button`               | `2px 2px 2px rgba(0,0,20,0.2)` | `2px 2px 4px rgba(0,0,20,0.4)` | `libs/css/leaf.css`                                    |
| `.leaf-sitemap-card`               | `0px 2px 3px #a7a9aa`          | `0px 12px 9px #949191`         | `libs/css/leaf.css`                                    |
| `a.custom_menu_card`               | `0 0 6px rgba(0,0,25,0.3)`     | `0 0 8px rgba(0,0,25,0.6)`     | `app/libs/js/vue-dest/site_designer/LEAF_Designer.css` |
| `.sidenav`                         | `0px 1px 3px rgba(0,0,0,0.2)`  | N/A (static)                   | `libs/css/leaf.css`                                    |
| Admin USWDS header                 | `0px 4px 6px rgba(0,0,0,.2)`   | N/A                            | `libs/css/leaf.css`                                    |
| `.table-bordered`                  | `0 0 20px rgba(0,0,0,0.15)`    | N/A                            | `LEAF_Request_Portal/admin/css/mod_groups.css:118`     |
| Nexus dropdown                     | `0 2px 60px #8e8e8e`           | N/A                            | `LEAF_Nexus/css/style.css`                             |
| Portal dropdown                    | `0 2px 6px rgba(0,0,25,0.2)`   | N/A                            | `LEAF_Request_Portal/css/style.css`                    |

The Portal and Nexus dropdown menus use the same visual element but `0 2px 6px rgba(0,0,25,0.2)` vs `0 2px 60px #8e8e8e` — a 10× difference in blur radius, using different color formats.

#### 5.1.4 Border Radius Drift

Border radius is present on some modern components and absent on legacy components with no consistent rule:

| Component                          | Border Radius | Source                                   |
| ---------------------------------- | ------------- | ---------------------------------------- |
| `.usa-button`                      | `4px`         | `libs/css/leaf.css`                      |
| `.leaf-admin-button`               | `4px`         | `libs/css/leaf.css`                      |
| `.sidenav`                         | `4px`         | `libs/css/leaf.css`                      |
| `.leaf-menu button` (hamburger)    | `3px`         | `libs/css/leaf.css`                      |
| `.leaf-sitemap-card`               | `5px`         | `libs/css/leaf.css`                      |
| `.tableinput` scrollbar thumb      | `8px`         | `LEAF_Request_Portal/css/style.css:1243` |
| `.usa-sidenav::after` (active bar) | `4px`         | `libs/css/leaf.css`                      |
| `.buttonNorm`                      | None (square) | `LEAF_Request_Portal/css/style.css:1291` |
| `.menuButton` / `.menuButtonSmall` | None (square) | `LEAF_Request_Portal/css/style.css:810`  |
| `a.custom_menu_card`               | None (square) | Vue CSS                                  |
| All table types                    | None          | Multiple files                           |
| All modal containers               | None          | Multiple files                           |

Border radius is present on USWDS-derived components (`4px`) and absent on all legacy components. The sitemap card (`5px`) differs from the USWDS standard by 1px.

#### 5.1.5 Typography Inconsistencies

**Font-size unit mixing:** The codebase uses `px`, `rem`, `em`, and `%` interchangeably across similar elements:

| Value             | Context                                                                | Source                                                                        |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `12px`            | `.buttonNorm`, `#headerMenuNav`, form input field content, table cells | `LEAF_Request_Portal/css/style.css:1291, 250`                                 |
| `1.06rem`         | `.usa-button` font size, `.usa-input` font size                        | `libs/css/leaf.css`                                                           |
| `1.3em`           | Form input inline style (`font-size: 1.3em; font-family: monospace`)   | `LEAF_Request_Portal/templates/subindicators.tpl:151`                         |
| `130%`            | Confirm dialog content font-size                                       | `LEAF_Request_Portal/templates/site_elements/generic_confirm_xhrDialog.tpl:5` |
| `font-size: 140%` | Confirm dialog button wrapper                                          | Same template, line 6                                                         |
| `11px`            | `table.table` body cells (Portal public)                               | `LEAF_Request_Portal/css/style.css:602`                                       |
| `14px`            | `table.table` body cells (Portal admin)                                | `LEAF_Request_Portal/admin/css/style.css`                                     |
| `font-size: 150%` | `.table_important` class                                               | `LEAF_Request_Portal/css/style.css`                                           |

**Font family inconsistency across parallel contexts:**

| Context                          | Font Family                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| Public portal + Nexus (body)     | `Verdana, Geneva, Arial, Helvetica, sans-serif` (system font stack) |
| Admin Portal (body)              | `"PublicSans-Regular", "Source Sans Pro", sans-serif`               |
| `table.table` td (Portal public) | `verdana` (hardcoded, lowercase)                                    |
| `table.table` td (Portal admin)  | Inherits (no explicit font family)                                  |
| `a.custom_menu_card` card text   | `Verdana, sans-serif` (Vue component)                               |
| `.entry_info` content            | Inherited                                                           |
| `.leaf-admin-button` title       | `"PublicSans-Bold", sans-serif`                                     |

Same class name (`table.table`) produces `verdana` font in the public context and inherits (Public Sans) in the admin context.

**Font weight inconsistency — `.usa-button` vs `.leaf-menu button`:**

- `.usa-button` sets `font-weight: 700` and `font-family: "PublicSans-Bold"` — both a weight number and a bold font file
- `.leaf-menu button` sets only `font-family: "PublicSans-Bold"` — no numeric weight
- `.leaf-admin-btntitle` sets `font-family: "PublicSans-Bold"` with no weight number

**Line height inconsistency:**

| Component                   | Line Height                              |
| --------------------------- | ---------------------------------------- |
| `.usa-button`               | `0.9` (tight, below 1)                   |
| `.usa-table td`             | `1.5`                                    |
| `.menuText` card title      | `160%`                                   |
| `.menuTextSmall` card title | `160%`                                   |
| `.usa-sidenav`              | `1.3`                                    |
| `.leaf-admin-btntitle`      | `1.4rem` (mixed unit — length not ratio) |
| `#nav` body text            | Not explicitly defined                   |
| `.alert`                    | Not explicitly defined                   |

#### 5.1.6 Inline Font Overrides

Inline `style` attributes override or duplicate font declarations throughout templates, preventing CSS-level control:

- `LEAF_Request_Portal/templates/subindicators.tpl:151` — `style="width: 50%; font-size: 1.3em; font-family: monospace"` on every text input
- `LEAF_Request_Portal/templates/subindicators.tpl:204` — `style="width: 97%; padding: 8px; font-size: 1.3em; font-family: monospace"` on textarea
- `LEAF_Request_Portal/templates/site_elements/generic_confirm_xhrDialog.tpl:6` — `style="font-size: 140%"` on confirm dialog wrapper div
- `LEAF_Request_Portal/templates/subindicators.tpl:553` — `style="font-size: 1.3em; font-family: monospace"` on currency input
- `LEAF_Request_Portal/templates/initial_form.tpl:88` — `style="background-color: black; color: white; margin: 0; padding: 0.3rem 0.5rem; font-size: 22px;"` on `<h3>` section headers
- `LEAF_Nexus/templates/view_employee.tpl` — Icon sizes set inline per button (`w=22`, `w=32` vary per instance)

#### 5.1.7 Hard-Coded Dimensions

Fixed pixel and rem dimensions are distributed throughout markup without shared constants:

| Dimension           | Component                         | Source                                                                         |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `540px` min-width   | Legacy dialog content `#xhr`      | `LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl:8` (inline) |
| `420px` min-height  | Same                              | Same                                                                           |
| `526px` width       | Legacy dialog load indicator      | Same template, line 7 (inline)                                                 |
| `400px` width       | Confirm dialog content area       | `generic_confirm_xhrDialog.tpl:5` (inline)                                     |
| `350px` width       | `.menuButton` card                | `LEAF_Request_Portal/css/style.css:811`                                        |
| `280px` width       | `.menuButtonSmall` card           | `LEAF_Request_Portal/css/style.css:854`                                        |
| `300px` width       | `a.custom_menu_card`              | Vue CSS                                                                        |
| `19.4rem` width     | `.leaf-admin-button`              | `libs/css/leaf.css`                                                            |
| `16.5rem` max-width | `.sidenav`                        | `libs/css/leaf.css`                                                            |
| `70px` height       | `.menuButton`                     | `LEAF_Request_Portal/css/style.css:812`                                        |
| `56px` height       | `.menuButtonSmall`                | `LEAF_Request_Portal/css/style.css:855`                                        |
| `80px` height       | Legacy `#header`                  | `LEAF_Request_Portal/css/style.css:171`                                        |
| `4.5rem` height     | Admin USWDS `#header.site-header` | `libs/css/leaf.css`                                                            |
| `700px` min-width   | `.table-bordered`                 | `LEAF_Request_Portal/admin/css/mod_groups.css:122`                             |

The dialog content dimensions (`540px`, `420px`, `526px`, `400px`) are set inline in HTML templates — not in CSS — so they cannot be changed without modifying the template files.

---

### 5.2 Structural Inconsistencies

#### 5.2.1 Multiple Implementations of the Same Pattern

**Buttons — 4 parallel systems:**

| System         | Class                 | Scope                    | File evidence                                                                                                                                  |
| -------------- | --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy button  | `.buttonNorm`         | Public + admin (legacy)  | `LEAF_Request_Portal/css/style.css:1291`, `LEAF_Request_Portal/admin/css/style.css:734`, `LEAF_Nexus/css/style.css:1081` — **defined 3 times** |
| USWDS button   | `.usa-button`         | Admin (newer)            | `libs/css/leaf.css`                                                                                                                            |
| Toolbar button | `.options` / `.tools` | Nexus views, Portal form | `LEAF_Nexus/css/style.css:954`, `LEAF_Request_Portal/css/style.css:1003`                                                                       |
| Text button    | `.link`               | Form templates           | `LEAF_Request_Portal/css/style.css:395`                                                                                                        |

Both `.buttonNorm` and `.usa-button` appear in a single file: `LEAF_Request_Portal/admin/templates/mod_workflow.tpl` uses `.buttonNorm` at lines 7–43, 1071, 1176, 1180 and `.usa-button` at line 546.

**Form inputs — 2 parallel systems:**

The dominant system has no class — all styling is inline per field type in `LEAF_Request_Portal/templates/subindicators.tpl`. The USWDS system (`.usa-input`, `.usa-select`, `.usa-textarea`) appears in only 4 files: `LEAF_Request_Portal/admin/templates/mod_system.tpl`, `LEAF_Request_Portal/admin/templates/mod_groups.tpl`, `LEAF_Request_Portal/templates/reports/orgChart_import.tpl`, `LEAF_Nexus/admin/templates/orgChart_import.tpl`.

**Alert/notification — 5 parallel systems:**

1. `.alert` class (12+ template files)
2. `.leaf-no-results` with non-functional USWDS classes (1 file: `mod_groups.tpl:60`)
3. Inline validation `<span style="color: #c00">` (5+ templates)
4. JS-generated inline-styled error blocks (`LEAF_Request_Portal/js/workflow.js:163–167`)
5. `<div id="status">` with ad-hoc inline styles (4+ templates)

**Modals — 2 parallel systems:**

Legacy inline-styled (`#xhrDialog`, `#confirm_xhrDialog`, `#ok_xhrDialog`) in public Portal + Nexus public. Modern class-based (`.leaf-dialog-container`, `.leaf-dialog-content`, `.leaf-buttonBar`) in admin Portal + admin Nexus. Same jQuery UI `.dialog()` mechanism underneath both. Both systems are active simultaneously — each dialog load calls `dialogController.js:29`.

**Tables — 5 parallel systems:**

`table.leaf_grid` (JS-generated, most common), `table.table` (generic data), `table.agenda` (history/log), `table.usa-table` (2 files only), `.table-bordered` (1 file, module CSS). The `table.leaf_grid` CSS is defined differently for Portal vs Nexus: Portal uses `border-collapse: separate` with full `th` styling; Nexus uses `border-collapse: collapse` with no `th` rules at all.

**Cards/containers — 6 parallel systems:**

`.menuButton`/`.menuButtonSmall` (float-based, 350px/280px fixed), `.leaf-admin-button` (inline-block, `19.4rem`), `.leaf-sitemap-card` (flex child, `30%`), `a.custom_menu_card` (flex, `300px`), `.sidenav` (panel container), `.entry_info`/`.entry_warning`/`.entry_error` (callout strips).

**Navigation — 2 parallel systems for the primary global nav:**

`#headerMenuNav` in public-facing Portal and Nexus (flat, `.buttonNorm`-styled items, `dynicons/` SVG icons, gradient header, no hamburger). `#nav` in admin Portal and admin Nexus (3-level dropdown, USWDS dark header, Font Awesome icons, hamburger at ≤960px). The Nexus admin loads the dark `#nav` into the legacy gradient header — the nav is visually designed for a dark background but renders against the gradient image (`LEAF_Nexus/admin/templates/main.tpl:67`).

#### 5.2.2 Mixed Layout Approaches

Three separate layout strategies coexist within the cards/container layer:

| Method                  | Components using it                                                                                              | File evidence                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `float: left`           | `.menuButton`, `.menuButtonSmall`, `.leaf-progress-bar li`, `#nav > ul > li` (desktop), `.leaf-admin-btnicon`    | `LEAF_Request_Portal/css/style.css:810`, `libs/css/leaf.css` |
| `display: inline-block` | `.leaf-admin-button`                                                                                             | `libs/css/leaf.css`                                          |
| `display: flex`         | `.leaf-sitemap-card`, `a.custom_menu_card`, `.entry_info`, `#headerMenuNav ul`, breadcrumb (`#page_breadcrumbs`) | `libs/css/leaf.css`, `LEAF_Request_Portal/css/style.css:250` |

Within `#nav`, the desktop layout uses `float: left` on `li` elements while the `.leaf-buttonBar` inside dialogs uses `float: left` / `float: right` on button wrappers. Both are float-based in an otherwise flex/inline-block admin design system.

The `.leaf-progress-bar` step indicator uses `float: left` on `<li>` elements with CSS border triangles for chevrons — a layout technique from before flexbox.

**Dialog button layout drift within the same `dialogController.js` context:**

- Legacy public dialogs: `position: absolute; left: 10px` and `position: absolute; right: 10px` for button placement — `LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl:4–5`
- Modern admin dialogs: `float: left` / `float: right` via `.leaf-float-left` / `.leaf-float-right` utility classes inside `.leaf-buttonBar` — `libs/css/leaf.css`

#### 5.2.3 Mixed CSS Frameworks / Utilities

The codebase has three co-present styling frameworks with overlapping intent:

| Framework                 | Where used                                                                     | Evidence                                                        |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Legacy custom CSS         | All public-facing templates, Nexus public + admin                              | `LEAF_Request_Portal/css/style.css`, `LEAF_Nexus/css/style.css` |
| USWDS (partial adoption)  | Portal admin only (some components), 4 templates for inputs                    | `libs/css/leaf.css`, `LEAF_Request_Portal/admin/templates/`     |
| LEAF-namespaced utilities | Admin context (`.leaf-btn-med`, `.leaf-float-left`, `.leaf-width100pct`, etc.) | `libs/css/leaf.css`                                             |

USWDS class names appear in markup without corresponding CSS definitions in at least three documented cases:

- `usa-alert`, `usa-alert--error`, `usa-alert--slim` — used in `LEAF_Request_Portal/admin/templates/mod_groups.tpl:60`; no CSS rules exist anywhere
- `leaf-whitespace-normal` — used in `LEAF_Request_Portal/admin/templates/view_disabled_fields.tpl:7`; no CSS definition in `libs/css/leaf.css`
- `status_error` — toggled in JS at `LEAF_Request_Portal/templates/subindicators.tpl:763–786`; no CSS definition anywhere

The class `.usa-footer` on the admin footer (`LEAF_Request_Portal/admin/templates/main.tpl:122`) has no CSS rules — all footer styling comes from `.leaf-footer` alone.

#### 5.2.4 Inline Styles vs Class-Based Styles

Inline styles are pervasive across both legacy and some modern templates:

**Legacy pattern — 100% inline (form inputs):**

Every field type in `LEAF_Request_Portal/templates/subindicators.tpl` uses a unique inline style block hardcoded per field type (text: `font-size: 1.3em; font-family: monospace`; textarea: same + `padding: 8px; width: 97%`; date: full background-image SVG inline; currency: same font override). No CSS class on any of these.

**Legacy pattern — inline dialog containers:**

`LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl:1` defines background, border, padding, visibility all inline on the dialog container div.

`LEAF_Request_Portal/templates/site_elements/generic_confirm_xhrDialog.tpl:1` defines background color (`#feffd1`), border, visibility inline.

**Mixed in same file:**

`LEAF_Request_Portal/admin/templates/view_history.tpl:34` uses `class="usa-table usa-table--borderless leaf-width100pct"` for most styling but also `style="width: 760px"` inline for the fixed width — mixing class-based and inline.

`LEAF_Request_Portal/templates/sitemap.tpl:16` uses `class="leaf-sitemap-card"` for the card frame but `style="cursor:pointer; background-color: {color}; color: {fontColor};"` inline for the per-card color values.

`LEAF_Request_Portal/templates/view_homepage.tpl:9` uses `class="menuButtonSmall"` for layout but `style="background-color: #2372b0; color: white"` inline for per-card theming.

**Button-level inline overrides:**

`LEAF_Request_Portal/admin/templates/mod_groups.tpl:528–529` — buttons carry both `.usa-button` class and inline `style=""` attributes simultaneously.

---

### 5.3 State Inconsistencies

#### 5.3.1 Hover Behavior

Hover states are inconsistently present, and the hover color varies by component even when the semantic intent is the same (interactive, clickable):

**Hover color for primary interactive elements (buttons and table rows):**

| Component                                          | Hover Background                     | Source                                                                   |
| -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `.buttonNorm` (Portal public, Portal admin, Nexus) | `#2372b0`                            | `LEAF_Request_Portal/css/style.css:1292`                                 |
| `.options` / `.tools`                              | `#2372b0`                            | `LEAF_Nexus/css/style.css:954`, `LEAF_Request_Portal/css/style.css:1003` |
| `.table_editable` (Portal + admin)                 | `#2372b0`                            | `LEAF_Request_Portal/css/style.css`                                      |
| `.table_editable` **(Nexus)**                      | `#fffdcc` (light yellow)             | `LEAF_Nexus/css/style.css` — different color for same class              |
| `#nav` level 1 (desktop)                           | `#274863`                            | `libs/css/leaf.css`                                                      |
| `#nav` level 2 item                                | `#2378c3`                            | `libs/css/leaf.css`                                                      |
| `.usa-button`                                      | `rgba(0,0,0,.2)` added border effect | `libs/css/leaf.css`                                                      |
| `.table-bordered` rows                             | `#adebff`                            | `LEAF_Request_Portal/admin/css/mod_groups.css:148`                       |
| `leaf_grid` header                                 | `#79a2ff`                            | `LEAF_Request_Portal/css/style.css`                                      |
| `leaf_grid` rows                                   | **Not defined**                      | —                                                                        |
| `.agenda` rows                                     | **Not defined**                      | —                                                                        |
| `.usa-table` rows                                  | **Not defined**                      | —                                                                        |

Same class name `.table_editable` produces `#2372b0` (blue) hover in Portal and `#fffdcc` (yellow) in Nexus.

Three of five table types have no row hover state at all.

#### 5.3.2 Focus State Absence or Inconsistency

Focus states across the codebase are largely identical to hover states using the same CSS selector group, rather than distinct focus treatment:

**Pattern where focus = hover (identical selectors):**

```css
/* buttonNorm — all three files */
.buttonNorm:hover,
.buttonNormSelected,
.buttonNorm:focus {
  background-color: #2372b0;
  color: white;
}
```

(`LEAF_Request_Portal/css/style.css:1292`, `LEAF_Request_Portal/admin/css/style.css:735`, `LEAF_Nexus/css/style.css:1082`)

**Components with no focus styles defined:**

- `table.leaf_grid` cells: no focus state
- `table.table` rows: no focus state
- `table.agenda` rows: no focus state
- `table.usa-table` rows: no focus state
- `.leaf-progress-bar` steps: no focus state
- Breadcrumb links (`.leaf-crumb-link`): inherits body `a:focus` but no explicit rule in `libs/css/leaf.css`
- `#status` containers: no focus state (dynamic, JS-populated)
- `.entry_info` / `.entry_warning` / `.entry_error`: no focus state defined; the `.entry_info` callout carries `tabindex="0"` in some templates without any focus CSS

**Dialog close button (jQuery UI generated):** The `.ui-dialog-titlebar-close` button gets jQuery UI's default focus outline, which may not meet the application's visual style. No override is documented in the audit.

**`.usa-sidenav` hover and focus use the same rule:**

```css
.usa-sidenav__item a:hover,
.usa-sidenav__item a:focus {
  color: #005ea2 !important;
  background-color: #f0f0f0;
}
```

(`libs/css/leaf.css`) — Focus is visually indistinguishable from hover.

#### 5.3.3 Disabled State Handling

Disabled state is handled via three different mechanisms with no shared visual convention:

**HTML `disabled` attribute — no visual CSS:**

Dialog buttons (`#button_save`, `#button_cancelchange`, `#confirm_button_save`, `#confirm_button_cancelchange`) start as `disabled` via HTML attribute in:

- `LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl:4–5`
- `LEAF_Request_Portal/templates/site_elements/generic_confirm_xhrDialog.tpl:6–7`

These rely on browser-native `disabled` rendering. No CSS rule targets `.buttonNorm:disabled` or `.usa-button:disabled` in any documented stylesheet.

**JavaScript-controlled `display: none`:**

Admin simple dialog buttons start hidden (`display: none`) and are revealed by JS: `LEAF_Request_Portal/admin/templates/site_elements/generic_simple_xhrDialog.tpl`. This is not a CSS `disabled` pattern — buttons are absent from the layout entirely until needed.

**Search input via HTML `disabled`:**

`LEAF_Request_Portal/admin/templates/mod_groups.tpl:57` — `<input id="userGroupSearch" class="leaf-user-search-input" disabled>`. No CSS targets `.leaf-user-search-input:disabled`.

**Loader overlay — pseudo-disable via z-index:**

The `#loadIndicator` div in the legacy dialog (`LEAF_Request_Portal/templates/site_elements/generic_xhrDialog.tpl:7`) uses `z-index: 9000` and `position: absolute` to visually cover the form content during loading, creating a de-facto disabled visual state without using the `disabled` attribute or CSS `pointer-events`.

#### 5.3.4 Active State Patterns

Active/selected states across navigation and buttons use three unrelated mechanisms:

| Component                    | Active mechanism                             | Value                                                   | Source                                             |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `.buttonNorm` selected       | `.buttonNormSelected` class (JS-added)       | `background-color: #2372b0; color: white`               | `LEAF_Request_Portal/css/style.css:1292`           |
| Admin `#nav` level 1         | `.js-openSubMenu` class (JS-added)           | `background-color: #274863`                             | `libs/css/leaf.css`                                |
| Admin `#nav` hamburger       | `.js-open` class (JS-added on `#toggleMenu`) | hides "MENU", shows `fa-times`                          | `libs/css/leaf.css`                                |
| `.usa-sidenav` current page  | `.usa-current` class (server-rendered)       | `color: #005ea2; font-weight: 700` + `::after` left bar | `libs/css/leaf.css`                                |
| `.table-bordered` active row | `.active-row` class (JS-added)               | `font-weight: bold; color: #009879`                     | `LEAF_Request_Portal/admin/css/mod_groups.css:156` |
| Public nav dropdown open     | `.is-shown` class on `.controlled-element`   | `display: block`                                        | `LEAF_Request_Portal/css/style.css`                |

No shared naming convention for active state classes. Class names observed: `buttonNormSelected`, `js-openSubMenu`, `js-open`, `usa-current`, `active-row`, `is-shown` — six distinct naming patterns across six contexts.

---

### 5.4 Asset Inconsistencies

#### 5.4.1 Multiple Icon Systems

Three unrelated icon delivery systems operate simultaneously with no shared infrastructure, no interchangeable usage, and no CSS unification:

| System                  | Files                                         | Delivery mechanism                                       | Color control                             | Used in                                                                                                   |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `dynicons/` PHP service | 243 SVGs in `libs/dynicons/svg/`              | `<img>` tag, PHP streams SVG at requested px width       | Hard-coded fills — not CSS-controllable   | All four contexts (public + admin, Portal + Nexus)                                                        |
| Font Awesome 6          | `libs/css/fonts/fontawesome/fa-solid-900.*`   | CSS `content:` on `<i class="fas fa-*">` pseudo-elements | CSS `color` property controls glyph color | Admin nav icons (`LEAF_Request_Portal/admin/templates/menu.tpl`), one alert pattern (`mod_groups.tpl:60`) |
| jQuery UI sprites       | 6 PNGs in `libs/js/jquery/css/dcvamc/images/` | CSS `background-image` + `background-position` offsets   | Color baked into PNG — 6 fixed variants   | jQuery UI widget chrome only (dialog close button, datepicker)                                            |

The dynicons library and Font Awesome library each contain icons for overlapping purposes (e.g., `dynicons/` has `dialog-apply.svg` for confirm actions; Font Awesome has `fa-check` for the same purpose).

#### 5.4.2 Mixed SVG Color Handling

SVG files in `libs/dynicons/svg/` use two incompatible color definition methods, neither of which is CSS-controllable:

**Method 1 — Gradient-based fills** (typical GNOME icon, e.g., `dialog-apply.svg`):
Colors embedded in `<linearGradient>` and `<radialGradient>` definitions inside `<defs>`. Fill values: `#a7cc5c` to `#789e2d` (green checkmark), `stroke: #42770c`. All in the SVG file source.

**Method 2 — Class-based fills with internal `<style>` block** (LEAF custom icons, e.g., `LEAF-logo.svg`):

```css
.st0 {
  fill: #7bc143;
}
.st1 {
  fill: #0071bd;
}
```

Defined inside a `<style>` tag within the SVG. Hard-coded hex values, not inheritable from external CSS.

In both cases, the `dynicons/` PHP service streams the SVG content as-is — no CSS manipulation occurs server-side. Because the icons are delivered as `<img>` elements (not inline SVG), external CSS `fill` or `color` rules have no effect on them.

Font Awesome icons (delivered as font glyphs) are fully CSS-color-controllable. jQuery UI sprite icons are not (color is rasterized into PNG).

#### 5.4.3 Duplicate Images with No Shared Source

| Asset                 | Locations                                                                                                                                                         | Count |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `loading_spinner.gif` | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`, `libs/img/`, `docker/vue-app/src/common/assets/`, `libs/css/assets/loading_spinner.083c03ba8b4973b81e64.gif` | 5     |
| `gradient.png`        | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                                               | 2     |
| `gradient_admin.png`  | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                                               | 2     |
| `VA_icon_small.png`   | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                                               | 2     |
| `aboutlogo.png`       | `LEAF_Request_Portal/images/`, `LEAF_Nexus/images/`                                                                                                               | 2     |
| `unfold_more.svg`     | `libs/img/usa-icons/`, `docker/vue-app/src/common/assets/`                                                                                                        | 2     |

The `loading_spinner.gif` exists in five discrete locations. The `libs/css/assets/` copy has a content-hashed filename (`083c03ba8b4973b81e64`), indicating it is a Webpack build artifact committed alongside source. These copies share no declared dependency relationship.

#### 5.4.4 Mixed Font Loading Approaches

Two separate font directories serve the same typefaces at different weight completeness levels, with no shared source:

| Font            | `libs/css/fonts/` (PHP template context)               | `docker/vue-app/src/common/assets/` (Vue context)               |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| Font Awesome    | Solid weight only (3 files: `.ttf`, `.woff`, `.woff2`) | Solid + Regular + Brands (15 files including `.eot` and `.svg`) |
| Public Sans     | 5 upright weights only (10 files: `.woff` + `.woff2`)  | 9 upright + 9 italic = 18 weights × 2 formats = 36 files        |
| Source Sans Pro | Regular + Bold only (4 files: `.woff` + `.woff2`)      | 6 upright + 6 italic = 12 weights × 2 formats = 24 files        |

The PHP template context ships an incomplete subset of both the Public Sans and Source Sans Pro weight ranges compared to the Vue context. The Vue context includes legacy formats (`.eot`, `.svg`) not present in the PHP context.

The LEAF logo SVG (`libs/dynicons/svg/LEAF-logo.svg`) embeds brand colors (`#7BC143`, `#0071BD`) that do not appear as CSS values anywhere in the stylesheet system. Brand colors exist only inside the SVG source file.

---

### 5.5 Current System Maturity Summary

This summary is descriptive only. It documents the observable state of the LEAF UI system as of this audit.

#### Centralization

**Very low centralization.** The codebase has no single source of truth for visual values. The closest approximation is `libs/css/leaf.css` — a minified, compiled stylesheet that serves as the shared admin CSS. However:

- `libs/css/leaf.css` is a compiled file committed to source, not a source file
- It covers only the admin contexts and has no effect on public-facing Portal or Nexus pages
- Public-facing Portal and Nexus each maintain their own parallel CSS files with overlapping but not identical rule sets
- Module-level CSS files (`mod_groups.css`, `mod_workflow.css`, `mod_templates_reports.css`) extend or override the shared admin CSS for individual admin modules
- Font files exist in two separate directories with different completeness levels
- Image assets are duplicated across Portal and Nexus without a shared source directory

The UI system operates across **at least six distinct CSS scopes**: Portal public, Portal admin, Portal admin modules (per-module), Nexus public, Nexus admin, and Vue application — each with partial overlap and no declared dependency graph.

#### Token Usage

**No design tokens exist anywhere in the codebase.** Specifically:

- No CSS custom properties (`--variable-name`) are in use in any examined stylesheet
- No SCSS variables are present (CSS is either vanilla or minified/compiled from an undocumented build step)
- No JSON, YAML, or JS token definition files were found in the audit
- Brand colors (`#7BC143`, `#0071BD`) are defined only inside the LEAF logo SVG and do not appear in any CSS file
- Interactive blue (`#2372b0`) is repeated verbatim in three separate CSS files without a shared definition
- Error red has six distinct hex values with no shared source

#### Degree of Duplication

**High duplication at every layer:**

- `.buttonNorm` defined 3 times (Portal public, Portal admin, Nexus) with minor per-file variations
- `table.table` defined twice (Portal public, Portal admin) with different `font-size` (11px vs 14px) and `font-family` values
- The `.alert` class defined twice (Portal public, Nexus public) — not present in admin CSS
- `gradient.png`, `VA_icon_small.png`, `aboutlogo.png`, `gradient_admin.png` duplicated between Portal and Nexus
- `loading_spinner.gif` in 5 locations
- Public Sans and Source Sans Pro font files exist in two locations at different completeness levels
- Dialog template files exist in 3–4 variants (public, admin, Nexus public, Nexus admin) with structural differences

#### Degree of Visual Variance

**High visual variance across contexts.** The four application contexts (Portal public, Nexus public, Portal admin, Nexus admin) have measurably different visual treatments for the same functional elements:

| Element                     | Variance observed                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                      | 3 different heights (`80px`, `4.5rem`, none), 2 different backgrounds (gradient image, `#252f3e`), different element positioning strategies (absolute vs flex) |
| Footer                      | 2 variants: `font-size: 10px` float-right vs `0.7rem` centered, with/without top border, with/without `.noprint`                                               |
| Table `th` background       | 5 distinct values: `#d1dfff`, `#e0e0e0`, browser default, `#dfe1e2`, `#005ea2`                                                                                 |
| Alert background            | 6+ distinct values for the error semantic role                                                                                                                 |
| Button background (default) | `#e8f2ff` (legacy), `#005ea2` (USWDS)                                                                                                                          |
| Card shadow                 | 5 distinct shadow expressions                                                                                                                                  |
| Card border radius          | 0px (square), 3px, 4px, 5px                                                                                                                                    |
| Body font family            | Verdana (public/Nexus), `PublicSans-Regular` (admin), Verdana (Vue card component)                                                                             |
| Icon delivery               | `<img>` + dynicons PHP service (public/admin), CSS font glyph (admin nav only), CSS sprite (jQuery UI chrome only)                                             |

The Portal admin is the most modernized context (USWDS dark header, `.usa-button`, class-based dialogs, Public Sans). The Nexus admin is the least modernized (legacy gradient header despite loading the dark `#nav` menu, legacy dialogs, Verdana).

#### Dead Code and Ghost References

The audit identified the following CSS classes used in markup with no corresponding CSS definition:

| Class name               | Usage location                                                              | Definition  |
| ------------------------ | --------------------------------------------------------------------------- | ----------- |
| `usa-alert`              | `LEAF_Request_Portal/admin/templates/mod_groups.tpl:60`                     | Not defined |
| `usa-alert--error`       | Same                                                                        | Not defined |
| `usa-alert--slim`        | Same                                                                        | Not defined |
| `usa-footer`             | `LEAF_Request_Portal/admin/templates/main.tpl:122`                          | Not defined |
| `leaf-whitespace-normal` | `LEAF_Request_Portal/admin/templates/view_disabled_fields.tpl:7`            | Not defined |
| `status_error`           | `LEAF_Request_Portal/templates/subindicators.tpl:763–786` (JS toggle)       | Not defined |
| `.leaf-dialog-container` | `LEAF_Request_Portal/admin/templates/site_elements/generic_xhrDialog.tpl:1` | Not defined |

Additionally, `tab.png` is referenced in header markup (`span#headerTabImg`) but the CSS background-image rule is commented out in both Portal and Nexus stylesheets, and the CSS references a `.gif` extension that doesn't match the `.png` file that exists.

The `<font class="alert">` element appears in 3 login templates (`LEAF_Request_Portal/templates/login.tpl:3`, `LEAF_Nexus/templates/login.tpl:3`, `LEAF_Nexus/admin/templates/login.tpl:3`) — the `<font>` element is deprecated since HTML 4.01 (1997).

#### Overall Maturity Assessment

Across the five measured dimensions, the LEAF UI system is at a low maturity level on every axis:

| Dimension                    | Observed level                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Centralization               | Very low — no single source of truth; at least 6 parallel CSS scopes with no declared dependency graph                                                          |
| Token usage                  | None — all visual values are literal strings duplicated verbatim across separate files                                                                          |
| Duplication                  | High — shared visual patterns defined independently 2–5 times with minor per-file variation                                                                     |
| Visual variance              | High — the same functional element renders measurably differently across all four application contexts                                                          |
| Dead code / ghost references | Present — 7 undefined CSS classes in active markup, at least one mismatched file extension reference, and deprecated HTML elements in all three login templates |

The two most centralized artifacts in the current system are `libs/css/leaf.css` (the compiled shared admin stylesheet) and the `dynicons/` PHP SVG service. Neither covers all four application contexts: `libs/css/leaf.css` has no effect on Portal public or Nexus public pages, and `dynicons/` is not used in the Vue application. Neither artifact has a maintained, human-readable source file present in the repository — `libs/css/leaf.css` is a compiled output, and `dynicons/` SVG files are static assets with no associated build or theming pipeline.

The absence of CSS custom properties or any token layer means no visual value can be changed globally by editing a single location. Every color correction, spacing adjustment, or typographic change must be applied manually and independently to each stylesheet that contains the value. The six distinct hex values observed for the error-red semantic role, and the three separate verbatim definitions of `.buttonNorm`, are direct consequences of this architecture.

The Portal admin context is the most internally consistent of the four contexts, having partially adopted USWDS class conventions, a compiled shared stylesheet, and Public Sans as its body typeface. The Nexus admin context is the least consistent — it loads the same `#nav` dark menu as Portal admin but retains a legacy gradient header, legacy dialog markup, and Verdana as its body typeface, resulting in a hybrid that shares structural elements from two different visual generations simultaneously.

**Iframe layouts use `<div id="body">` instead of `<main>`** — inconsistent with full-page layouts which use `<main id="body">`, and `<div id="body">` does not carry landmark semantics.
