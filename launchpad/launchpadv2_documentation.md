# LEAF Launchpad — Build Documentation

_Last updated: 2026-09-16_

## 1. Purpose

Architecture, shared components, page status, and standards for the LEAF Launchpad build.

**Style:** bullets/tables only, no prose paragraphs. Scannable over exhaustive — a dev should get the facts in a glance.

---

## 2. Architecture

Layers, bottom-up:

1. **`main.tpl`** (Smarty shell) — page skeleton. Loads `leaf_header.css`/`.js` in `<head>`, injects jQuery/UI libs per-page via `$useUI`/`$useLiteUI`, skip link, `#lp-login-slot`, `#qrcode-js`. Body renders into `#content > #bodyarea`.
   - 🚩 **TODO:** `launchpad.css` is linked from `view_homepage.tpl`'s body, not here → FOUC risk. Move to `main.tpl` `<head>` when header is next touched.
2. **`launchpad.css`** — design tokens (`--lp-*`/`--c-*`), reset, typography, reusable classes (`.hero`, `.btn-pri/-sec`, `.feats`, `.step`, `.scale`, `.nl`, `.lp-jump`, `.lp-inline-panel`), icon sizing, a11y utilities. Every `lp_*.html` links this.
3. **`leaf_header.js` + `leaf_header.css`** — shared nav/header/router. See §3.
4. **Page templates** — `view_homepage.tpl` (demo only) + `lp_*.html` (real builds).

---

## 3. Shared Components

### leaf_header (`leaf_header.js` + `.css`)

Self-mounting: one `<script src="./files/leaf_header.js" data-is-sysadmin data-csrf-token>` tag injects stylesheet, header, breadcrumb, jump-to-top, and (home page only) a router.

| Owns                | Detail                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav                 | Desktop dropdown + mobile accordion, data-driven from `NAV_SECTIONS` (About LEAF / Solutions / Resources / Knowledge Center)                                                                                                        |
| Internal nav        | Coaches / Team / Leadership / Admin / Users Online / Feedback — gated by `data-is-sysadmin`                                                                                                                                         |
| Router (home only)  | Hash SPA: fetch → strip chrome → splice into `#lpSwapHost`; `iframe: true` apps (e.g. Help Library) mount in an iframe instead                                                                                                      |
| Breadcrumb          | Auto-detected from URL vs. nav config — no per-page flag                                                                                                                                                                            |
| Modals              | Demo video, generic form (Request Support / Nominate a Spotlight), sysadmin feedback (3-call create/write/submit)                                                                                                                   |
| Announcement banner | Ships with placeholder `REPLACE_ME_*` values, safely no-ops. **Not planned for launch.** Built for two use cases: platform-wide urgent alerts and feature/launch promotion (driving traffic to new pages/programs as they go live). |
| Users Online badge  | Live count via SSE                                                                                                                                                                                                                  |
| Icons               | Inlined Material Symbols SVGs, `ICON_SVG` map                                                                                                                                                                                       |

**Deps:** native browser APIs only (`fetch`, `DOMParser`, `EventSource`, `ResizeObserver`); `DOMPurify` lazy-loaded from `leaf.va.gov` only if banner has content. Fonts self-hosted on `leaf.va.gov`.

**A11y:** skip link on every page; disclosure pattern (`aria-expanded`) for dropdowns; "(opens in new tab)" sr-only text on external links; modals/mobile panel trap + restore focus; SPA nav announced via `aria-live`; full `prefers-reduced-motion` support; contrast ratios documented inline in CSS.

### multigrid (`multigrid.js`)

Embeddable "My Requests" grid, queries multiple LEAF sites for the current user's records. Mounts via `data-mount` (inline) or `data-trigger` (modal).

**Deps:** `LeafFormQuery`/`LeafFormGrid` with a hand-rolled `fetch`+HTML fallback — no external deps either way.

**A11y:** standard tablist pattern, arrow-key nav; modal traps focus, closes on Escape.

**⚠ ASCII only** — file header warns against smart quotes/em dashes; deploy pipeline has corrupted non-ASCII bytes before.

### launchpad.css

Global tokens, reset, typography (`Source Sans 3` body / `Public Sans` headings), layout utilities, and every reusable page-building block (hero, buttons, steps, feature cards, scale cards, newsletter band, jump-to-top, inline iframe panel).

**Breakpoints:** 900px (hero/step → 1 col, feature/scale 3→2), 768px (newsletter → 1 col), 640px (feature/scale 2→1, newsletter stacks). `prefers-reduced-motion` disables all transitions globally.

---

## 4. Page-by-Page Status

Rows follow `leaf_header.js`'s `NAV_SECTIONS` order (not build order). Child items are indented under their parent.

| Nav Section         | Item                            | Page                         | Status                                                    |
| ------------------- | ------------------------------- | ---------------------------- | --------------------------------------------------------- |
| About LEAF          | Our Impact                      | `lp_impact.html`             | ✅ Built, shared header not wired up (§6)                 |
| About LEAF          | Watch a Demo                    | — (demo modal)               | action only, no page                                      |
| About LEAF          | Roadmap                         | `lp_roadmap`                 | 🚫 hidden in nav, testing only, will not ship 10/1/26     |
| Solutions           | Form Library                    | `lp_form_library.html`       | ✅ Built, revamp of existing code                         |
| Solutions           | Use Cases                       | `lp_use_case.html`           | 🚧 Coming soon                                            |
| Solutions           | Integrations                    | `lp_integrations`            | 🚫 hidden in nav, testing only, will not ship 10/1/26     |
| Resources           | Find a LEAF Site                | `lp_find_site.html`          | ✅ Built, revamp of existing code                         |
| Resources           | Voice of the Customer           | `lp_voc.html`                | ✅ Built, placeholder stats (§6)                          |
| Resources           | ↳ Community of Practice (child) | `lp_cop.html`                | ✅ Migrated from `leaf.va.gov/platform/cop`               |
| Resources           | Submit an Idea                  | — (external)                 | `leaf.va.gov/platform/ideas/`                             |
| Resources           | Privacy Resources               | `lp_privacy.html`            | ✅ Migrated from `leaf.va.gov/platform/privacy`           |
| Knowledge Center    | Help Library                    | — (external, iframe-mounted) | `leaf.va.gov/platform/help_library/report.php?a=homepage` |
| Knowledge Center    | Blog                            | `lp_blog.html`               | 🚫 hidden in nav, testing only, will not ship 10/1/26     |
| Knowledge Center    | Learn                           | `lp_learn.html`              | 🚧 Coming soon                                            |
| Knowledge Center    | FAQ                             | —                            | 🚫 hidden in nav, testing only, will not ship 10/1/26     |
| Internal (sysadmin) | Coaches                         | —                            | no dedicated page                                         |
| Internal (sysadmin) | Team                            | `lp_team.html`               | ✅ Built, standalone (not on shared header)               |
| Internal (sysadmin) | Leadership                      | `lp_leadership.html`         | ✅ Built, standalone (not on shared header)               |
| Internal (sysadmin) | Admin                           | `/launchpad/admin`           | not a Launchpad page                                      |
| Internal (sysadmin) | Users Online                    | — (badge)                    | no page                                                   |
| Internal (sysadmin) | Feedback modal ("M&M")          | — (modal)                    | no page                                                   |

**Not in nav**

- `lp_home.html` — demo only, not a build → see `view_homepage.tpl`

### lp_impact.html — About LEAF › Our Impact

Platform-adoption case: stat grid, low-code/no-code section, 3-tier enterprise scale, demo CTA.

- **Header:** include present but **commented out** — nav not wired up yet (unique to this page).
- **JS/CSS:** because header is disabled, page locally duplicates `.lp-modal` CSS + `initDemoModal()` + jump-to-top JS — remove once header is enabled. Stat count-up via `IntersectionObserver`, respects `prefers-reduced-motion`. Image drag/right-click protection.
- **Icons:** `play_circle`, `arrow_upward` — both reused.
- **A11y:** `role="list/listitem"`; count-up value present in markup; local modal traps/restores focus same as shared one; `<dl>` for user types.
- **Responsive:** standard `launchpad.css` breakpoints (900/640px).
- **Stats:** no placeholder comment in code → treated as real figures (confirmed with user).

### lp_form_library.html — Solutions › Form Library

Browse/filter/search LEAF form templates; preview workflow + form content; admin import.

- **Header:** via `#lp-nav-host`.
- **JS/CSS:** `DOMPurify` + `LeafPreview.js` (leaf.va.gov, shared w/ banner). `LeafFormQuery`/`LeafFormGrid`/`LeafFormSearch`/`dialogController` + jQuery UI dialog.
- **Icons:** `add_circle`, `info` new; `arrow_upward` reused. Filter buttons use **legacy `<img>` icons** (`leaf.va.gov/app/libs/dynicons/svg/`), not Material Symbols — see §6.
- **A11y:** `aria-pressed` toggle filters + `aria-live="assertive"` status; `role="progressbar"`; null-guarded async callbacks; descriptive `alt` on preview images.
- **Responsive:** filter sidebar → horizontal pill row <768px; card grid scrolls horizontally on narrow viewports.
- **Known workaround:** `LeafFormSearch` widget can stamp `"undefined"` into its input on unset default — patched client-side post-init.

### lp_use_case.html — Solutions › Use Cases

"Coming Soon" — Use Case Library. Purely informational, no CTA. Simplest page in the build.

- **Header:** via `#lp-nav-host`.
- **JS/CSS:** none beyond icon-sizing fixups.
- **Icons:** hero icon + shared badge glyph (same as `lp_learn.html`) — **names unconfirmed**.
- **A11y:** icons `aria-hidden`; plain heading hierarchy.
- **Responsive:** single column.
- **Note:** no jump-to-top button, unlike nearly every other page — confirm intentional before go-live.
- 🚩 **TODO:** documentation for this page is pending — Pete Nerantzinis to update once his build is complete.

### lp_find_site.html — Resources › Find a LEAF Site

Search LEAF sites by station #/VISN/state; two-pane list/detail with admin + form info.

- **Header:** via `main.tpl` (not re-declared — correct pattern).
- **JS/CSS:** inline. Loads `intervalQueue.js` (throttled concurrent checks, concurrency 2), `visnFacilityHelper.js`, `smarty_styles.css`. `LeafFormQuery` + per-site `fetch`/`$.ajax`.
- **Icons:** `search`, `expand_more`, `arrow_back`, `warning`, `info`, `list_alt`.
- **A11y:** custom `role="listbox"` w/ roving tabindex; disclosure search panel; mobile Back button w/ focus mgmt; `aria-live` for search/results.
- **Responsive:** stacks below 700px, mobile Back button reveals.

### lp_voc.html — Resources › Voice of the Customer

Voice of the Customer program explainer: capture→analyze→act→close-loop model, 5 channels, process/lifecycle steps, quotes, UX Program CTA.

- **Header:** via `#lp-nav-host` (from `main.tpl`).
- **JS/CSS:** static content; only script is the jump-to-top pattern (repeated per-page, see §6).
- **Icons:** large page-specific set, all already inlined.
- **A11y:** `role="img"`+`aria-label` on icon groups; `role="list/listitem"` throughout; stat numbers have word-spelled `aria-label`; quotes use semantic `<figure>`.
- **Responsive:** stat grid 4→2→1 (900/500px); channel grid 3→2→1; lifecycle row → stacked list <900px.
- 🚩 **TODO:** 4 "VoC at a Glance" stats are placeholder values — real metrics needed before ship (confirmed with user, kept open).

### lp_cop.html — Resources › Voice of the Customer › Community of Practice (child)

Community of Practice: live upcoming-session details, Teams join CTA, searchable/paginated past sessions.

- **Header:** via `main.tpl` (migrated page — inherits `smarty_styles.css`, hides legacy `#header`/`#footer`).
- **JS/CSS:** `LeafFormQuery` targeted at `leaf.va.gov/platform/CoP/` via `setRootURL()`. Debounced search (300ms), "Show More" pagination (5/page). "What" field is rich-text rendered via **unsanitized `innerHTML`** — confirmed accepted (internal trust boundary, different from `lp_form_library.html`'s external content).
- **Icons:** `calendar_month` new; `description`, `open_in_new`, `search`, `close` reused. Also inlines a Microsoft Teams brand mark (not a Material Symbol, kept as-is).
- **A11y:** hidden `<label>` on search; `aria-live` results; `role="list/listitem"`.
- **Responsive:** session cards stack <640px.

### lp_privacy.html — Resources › Privacy Resources

"Platform Enhancements to Strengthen Privacy": live changelog, LEAF-S explainer (3 cards), VA Privacy Resources (3 cards).

- **Header:** via `main.tpl` (migrated page, same `smarty_styles.css` pattern as `lp_cop.html`).
- **JS/CSS:** `LeafFormQuery` at `leaf.va.gov/platform/privacy/`. Changelog rendered via manual DOM construction (not `innerHTML`) — safer pattern than `lp_cop.html`, uses `<textarea>` entity-decode trick.
- **Icons:** `info` new; `lock`, `list_alt`, `edit_document`, `open_in_new`, `article`, `groups`, `arrow_upward` reused.
- **A11y:** `role="status"`/`aria-live` on changelog; `aria-expanded` show-all toggle; semantic `<ol>` w/ CSS counters for steps.
- **Responsive:** 3-card grids → 1 col at 900px.

### lp_learn.html — Knowledge Center › Learn

"Coming Soon" — Learning Center. Functional "Register for Live Training" CTA opens a **real** LEAF form in a modal (not a placeholder).

- **Header:** via `#lp-nav-host` (enabled, unlike `lp_impact.html`).
- **JS/CSS:** jump-to-top + training-registration modal (focus trap, lazy iframe load).
- **Icons:** hero (school-style), badge glyph, CTA checkmark-calendar glyph — **names unconfirmed**. Modal close icon uses a **different path** than the platform's standard `close` icon — check for drift.
- **A11y:** modal `role="dialog"`, traps/restores focus, closes on Escape/backdrop.
- **Responsive:** single column; modal `min(1000px, 95vw)`.
- Content explicitly marked in-code as pending approval — confirms "coming soon" is current, not stale.
- 🚩 **TODO:** documentation for this page is pending — Pete Nerantzinis to update once his build is complete.

### lp_team.html — Internal › Team

Internal "Team Hub": searchable/filterable link directory (8 submit forms, 15 view reports in 3 sub-groups) + Admin Inbox modal.

- **Header:** **none** — standalone doc, own `<head>`/fonts, sysadmin-gated (`{if $empMembership['groupID'][1]}`), dedicated "Access restricted" fallback.
- **JS/CSS:** inline, data-driven tile rendering; search + type filter + live result count. Admin Inbox modal same pattern as `lp_leadership.html`. Links include ServiceNow, SharePoint, Power BI (all external).
- **Icons:** name-labeled in-code (`ICON_SVG` comment) — confirmed: `search`, `close`, `edit_document`, `inbox`, `upload_file`, `expand_more`, `insights`, `bug_report`, `school`, `schedule`, `flag`, `build`, `trending_up`, `emoji_events`, `payments`, `analytics`, `ac_unit`, `support_agent`, `sensors`, `rate_review`, `monitor_heart`, `timer`, `medical_services`, `savings`, `menu_book`, `design_services` (+ reused `arrow_upward`, `lock`, `lightbulb`).
- **A11y:** disclosure sections w/ auto-expand-on-search-match; `aria-pressed` filters; `aria-live` result count/empty states.
- **Responsive:** tile grid 4→2→1 (900/560px).

### lp_leadership.html — Internal › Leadership

Internal "Leadership Hub": card grid to live ops tools + Power BI reports (modal iframe).

- **Header:** **none** — same standalone/sysadmin pattern as `lp_team.html`.
- **JS/CSS:** inline. Cards navigate directly or open a Power BI `reportEmbed` iframe modal (`app.powerbigov.us`, external). Modal measures fixed/sticky headers to offset below them.
- **Icons:** 6 card icons + modal close + gate lock are **unlabeled raw SVG paths — names unconfirmed** (see §6).
- **A11y:** `role="list/listitem"`; Power BI cards are real `<button>`s; modal is `role="dialog"`, traps/restores focus; iframe `src` cleared on close.
- **Responsive:** card grid 3→2→1 (900/600px); modal `min(1300px, 94vw)`.

---

## 5. Standards

- **Paths:** relative only, except cross-site LEAF references.
- **Dependencies:** LEAF domain = OK; everything else locally hosted. Exceptions tracked in §6.
- **Icons:** Material Symbols (Filled), inlined SVG. New usage → call out exact name for download.
- **A11y:** WCAG 2.1 AA + Section 508.
- **Responsive:** required on every page. Breakpoints per `launchpad.css` (§3).
- **Comments:** first-time-reader context only, kept short.

**Confirmed icon inventory:**
`search`, `expand_more`, `arrow_back`, `warning`, `info`, `list_alt`, `add_circle`, `arrow_upward`, `play_circle`, `close`, `bug_report`, `school`, `schedule`, `flag`, `build`, `trending_up`, `emoji_events`, `payments`, `analytics`, `ac_unit`, `support_agent`, `sensors`, `rate_review`, `monitor_heart`, `timer`, `medical_services`, `savings`, `menu_book`, `design_services`, `edit_document`, `inbox`, `upload_file`, `insights`, `lock`, `calendar_month`, `bar_chart`, `route`, `description`, `cases`, `cable`, `location_on`, `record_voice_over`, `lightbulb`, `privacy_tip`, `article`, `quiz`, `sync`, `groups`, `link_off`, `cloud_off`, `wrong_location`, `home`, `refresh`, `open_in_new`, `diversity_3`, `co_present`, `account_balance`, `support`, `add_comment`

**Non-Material icon:** `lp_cop.html` inlines a Microsoft Teams brand mark — intentional, not a UI icon.

**Unconfirmed names:** see §6.

---

## 6. Open Items

**Pending ownership**

- 🚩 **TODO:** `lp_use_case.html`, `lp_learn.html` — documentation pending; Pete Nerantzinis to update once his build is complete.

**Data placeholders**

- 🚩 **TODO:** `lp_voc.html` — 4 "VoC at a Glance" stats are placeholder values pending real metrics.

**Icon names to confirm before sourcing**

- 🚩 **TODO:** `lp_leadership.html` — 6 card icons, modal close, gate lock (raw SVG paths, unlabeled).
- 🚩 **TODO:** `lp_learn.html` — badge/tools glyph, CTA checkmark-calendar glyph.
- 🚩 **TODO:** `lp_use_case.html` — hero icon (shares `lp_learn.html`'s badge glyph).
- 🚩 **TODO:** `lp_learn.html`'s modal close icon path differs from the platform's standard `close` — confirm intentional vs. drift.

**Shared header migration (tracked, not urgent)**

- `lp_impact.html` — include present but commented out; local modal/jump-to-top duplicated as stand-in.
- `lp_leadership.html`, `lp_team.html` — fully standalone, no header at all.

**Accepted external-dependency exceptions (tracked, fix later)**

- `lp_form_library.html` — legacy `dynicons` filter icons instead of Material Symbols.
- `lp_leadership.html` — Power BI (`app.powerbigov.us`).
- `lp_team.html` — Power BI, ServiceNow (`yourit.va.gov`), SharePoint (`dvagov.sharepoint.com`).

**Minor cleanup**

- Icon-sizing SVG fixup (`font-size` doesn't affect inlined `<svg>`) repeats across pages — candidate for a shared utility class.
- 🚩 **TODO:** `lp_cop.html` comments reference nonexistent `lp_home_preprod.html`/`leaf_header_preprod.js` — stale, update comments.
- 🚩 **TODO:** `lp_use_case.html` has no jump-to-top button — confirm intentional.

**Resolved**

- Announcement banner `REPLACE_ME_*` — not planned for launch, no action needed. Built to cover both platform-wide alerts and feature/launch promotion — infra is ready if either use case comes up.
- `window.LEAF_BREADCRUMB` (6 pages) — dead code, `leaf_breadcrumb.js` doesn't exist, `leaf_header.js` auto-builds breadcrumb. Safe to remove.
- `lp_cop.html` unsanitized rich-text `innerHTML` — accepted (internal trust boundary).

---

## Appendix — External Builds

Pages hosted outside the Launchpad's own `lp_*.html` set, on other LEAF sites. Not part of §4's page inventory (different codebase, different deploy), documented here for reference since the Launchpad links to them.

### A1. Idea Portal — `leaf.va.gov/platform/ideas`

Public idea-submission/voting portal. Linked from Launchpad nav as Resources › Submit an Idea (§4).

**Architecture**

| Piece               | Detail                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files               | `ideas_v4.html` (markup + all CSS, inline `<style>`), `ideas_v4.js` (all behavior, ~4,000 lines), `print_form_ideas.tpl` (Smarty — single-idea detail/print view at `leaf.va.gov/platform/ideas/index.php?a=printview`) |
| Ideas form          | `form_ae642`, hosted at `leaf.va.gov/platform/ideas`                                                                                                                                                                    |
| Votes form          | `form_ce926` (referenced as `form_57e89`/`FORM_IDS.votes` in JS constants — confirm which is current before reuse), hosted separately at `leaf.va.gov/platform/votes`                                                   |
| Why votes are split | Deliberate: keeps vote record IDs from interleaving with/polluting idea record numbering. Vote and idea are two independent LEAF forms/record sequences.                                                                |
| Idea field map      | title=5, summary=6, benefit=7, category=8, impact=9, attachment=10, status=12, other_category=13, date_submitted=15, implemented=21, implemented_url=22, comment=20, imported_votes=23                                  |
| Vote field map      | idea=field 2 (`ideas_v4.js`) / field 7 (`print_form_ideas.tpl`'s inline JS) — **naming inconsistency between the two files, confirm before editing (§6)**; user=field 3/8 respectively                                  |
| Reads               | `LeafFormQuery`-style direct REST GET (`./api/form/query/?q=...`) — bypasses `LeafFormQuery` JS class entirely; comment in code notes the class's stepID handling "silently returns 0 on this site"                     |
| Writes              | Raw `fetch` POST to `./api/form/{id}`, `./api/?a=form/new`, `./api/form/{id}/submit`, `./api/form/{id}/cancel` (soft-delete route, used for un-voting)                                                                  |

**Idea lifecycle**

| Stage                    | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft                    | Idea record created (`api/?a=form/new`) with status (12) and date_submitted (15) both blanked via `writeDraftStatus()`. `isSubmittedIdea()` = has a date_submitted value.                                                                                                                                                                                                                                           |
| Submit                   | Writes today's date to 15, writes status=12 to "Submitted", then `POST .../submit` (workflow advance). No `/apply` call at submission — code comment explains an earlier version's `/apply` call was mis-firing whichever reviewer action came first in the response, auto-returning ideas to the requestor.                                                                                                        |
| Partial-failure recovery | If date write succeeds but workflow advance fails, recordID is tracked client-side in `workflowIncompleteRecordIds` (in-memory only, lost on refresh) → row shows "Retry Submit" action.                                                                                                                                                                                                                            |
| Sent-back detection      | LEAF's "Send back to requestor" workflow action only emails the requestor, never touches status/date_submitted. Detected instead via `currentStep` API: sendback always returns to stepID `-1` (same sentinel a never-submitted draft starts at). On detection, both fields are re-blanked (`repairSentBackRecord()`/`pvRepairSentBackRecord()`) — re-checks current values first so it never overwrites real data. |
| Status repair            | If a submitted idea has no canonical status (blank), `fetchUserSubmissions()` auto-writes "Submitted" via `writeSubmittedStatus()` so it isn't silently excluded from the public All Ideas list.                                                                                                                                                                                                                    |
| Background recheck       | My Ideas panel polls `isSentBackToRequestor` every 3 min while tab is visible (`SENDBACK_POLL_MS`), plus on `visibilitychange`.                                                                                                                                                                                                                                                                                     |

**Status canonicalization:** raw/legacy status text → `canonicalStatusKey()` → fixed key set (new/review/progress/completed/duplicate/discarded/draft/backlog/in_development/need_more_info/unlikely). `PUBLIC_VISIBLE_STATUS_KEYS` allowlist filters what's shown on the public All Ideas tab (drafts and "discarded" excluded). Badge color mapped separately via `STATUS_BADGE_CLASS_BY_KEY`, duplicated (by class-name convention, not shared code) in `print_form_ideas.tpl`'s `pvStatusClassFor()`.

**Voter identity:** resolved via `/platform/orgchart/api/employee/search?q=userName:{userID}` → falls back to raw `userID` if lookup fails or returns no real email. Same resolution logic duplicated in both `ideas_v4.js` and `print_form_ideas.tpl` (not shared).

**Pages/panels:** All Ideas (search, sort, paginate 50/page or show-all), Top 10 (by votes), My Ideas (own submissions incl. drafts), Voted Ideas modal, Add/Edit Idea modal (draft save or full submit), How It Works modal (first-visit auto-open via `localStorage`), idea detail modal (`openIdeaDetailModal`), LEAF-team comment modal, admin Votes panel (in `print_form_ideas.tpl`, group 12 toolbar only).

**JS/CSS**

- No external JS/CSS dependencies — everything inline in `ideas_v4.html`'s `<style>` / `ideas_v4.js`.
- `print_form_ideas.tpl` reuses `PV_ICON_SVG`, status-color logic, category-pill parsing, and voter-email resolution as hand-duplicated copies of `ideas_v4.js`'s equivalents (`ICON_SVG`, `STATUS_BADGE_CLASS_BY_KEY`, `parseCategoryValue`, `resolveVoterEmail`) — no shared module between the two files.
- Category/impact/status select options loaded live from `ajaxIndex.php?a=getindicator` at page load; hardcoded fallback lists (`CATEGORY_FALLBACK`, `IMPACT_FALLBACK`) used if that fetch fails.

**Icons (Material Symbols Filled, inlined SVG):** `thumb_up`, `thumb_down`, `share`, `send`, `check_circle`, `error`, `close`, `edit`, `open_in_new`, `sort`, `comment`, `close_small`, `search` — cross-reference against §5's confirmed inventory before re-downloading any of these.

**A11y**

- Focus trap + `inert` (not just ARIA) on background content behind every modal.
- Live header-offset measurement (`measureHeaderOffset`) for modal positioning — explicit code comment: mirrors `lp_team.html`'s pattern.
- Toast is manual-dismiss only, no auto-hide (WCAG 2.2.1/2.2.3) — same pattern ported into `print_form_ideas.tpl`'s `#pvToast`.
- Roving-tabindex tablist for All/Top 10/My Ideas tabs.
- `aria-live`/`aria-busy` status regions on all async panels.
- Category "+N" overflow badge is a real focusable/keyboard-reachable popover, not a title-only tooltip.
- Vote button has dual rest/hover states, both `aria-hidden`, with the button's own `aria-label` as sole accessible name (avoids exposing "Voted"/"Unvote" text twice to AT).

**Responsive:** full table above 1110px; card-stack below. Distinct tablet tier (601–1110px) groups Category/Status/Votes into one flexbox row within the `<tr>`. `prefers-reduced-motion` respected.

**PHI/PII:** explicit notice in the Add Idea modal ("Do not include PHI or PII") — no server-side enforcement, client-side notice only.

**Open TODOs**

- 🚩 **TODO:** `ideas_v4.html` has `<link rel="preconnect" href="https://fonts.googleapis.com">`/`fonts.gstatic.com` in `<head>`, but every `font-family` in the file references `"Source Sans Pro Web"` (LEAF's locally-hosted font) — no actual Google Fonts `<link>`/`@import` was found. **Confirmed dead code** — remove the preconnect tags; they don't load anything and could be misread as an active external dependency.
- 🚩 **TODO:** Vote field-ID naming inconsistency between `ideas_v4.js` (`VOTE_FIELDS.idea` = field 2/`VOTE_FIELDS.user` = field 3) and `print_form_ideas.tpl` (`PV_VOTE_IND_IDEA` = field 7/`PV_VOTE_IND_USER` = field 8) — both query the same `form_ce926` votes form, so this needs reconciling before either file is next edited, to confirm which field numbers are actually correct.
- 🚩 **TODO:** Status resolution, icon SVGs, voter-email resolution, and category-pill parsing are each hand-duplicated between `ideas_v4.js` and `print_form_ideas.tpl` rather than shared — any future fix to one needs to be mirrored in the other by hand.
- 🚩 **TODO:** `workflowIncompleteRecordIds` (tracks partial-submit failures for "Retry Submit") is in-memory only — lost on page refresh, so a user who reloads before retrying loses the recovery affordance until `needsSubmitAction()`'s other check (`!isSubmittedIdea`) catches it on next load.

### A2. Help Library — `leaf.va.gov/platform/help_library`

Searchable resource library (videos/tutorials/FAQs) with category browsing, "Start Here"/Featured curation, per-article detail page, and a "Was this helpful?" feedback widget. Iframe-mounted into the shared header's router (§3, §4) at `report.php?a=homepage`.

**Architecture**

| Piece              | Detail                                                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files              | `help_library.html` (markup shell only, no inline CSS/behavior — unlike the Idea Portal), `help_library.css`, `help_library.js` (all rendering/state, ~1,740 lines)                                                                                                                                |
| Resource form      | `form_08f4f`, `stepID: 15` (only records at that workflow step are queried — draft/in-review resources excluded)                                                                                                                                                                                   |
| Feedback form      | `form_faf54`, hosted separately at `leaf.va.gov/platform/votes` — same split rationale as the Idea Portal's vote form (§A1): keeps feedback record IDs out of the resource form's own numbering, and each click logs a new record rather than overwriting one, so repeat/changed votes all persist |
| Resource field map | desc=40, tutorial file=41, video URL=42, last updated=22, category=47, featured=48, embed (SharePoint iframe)=49, Start Here flag=50, learning objectives=53                                                                                                                                       |
| Feedback field map | article ID=3, yes/no=4, article name=5, user=2                                                                                                                                                                                                                                                     |
| Reads              | `LeafFormQuery` JS class (unlike the Idea Portal, which bypasses it) — `query.onProgress()` streams a running "N loaded" count into the loading state                                                                                                                                              |
| Writes             | Raw `fetch` POST to votes app's `./api/?a=form/new`, then `./api/form/{id}/submit` — feedback only; the resource content itself is read-only from this page                                                                                                                                        |

**Resource type + curation model**

| Concept               | Logic                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type inference        | No explicit type field — derived: has SharePoint embed or video URL → `video`; else has tutorial file → `tutorial`; else → `faq`. A resource can carry both video and tutorial (dual-format), shown via tabs on its detail page.                 |
| "New" flag            | `updDate > (today − 30 days)`, computed client-side each load, not stored.                                                                                                                                                                       |
| Category              | Multi-value, free-text field (`,`/newline-split). `HIDDEN_CATS` (`"Getting Started"`) stay filterable/searchable but never appear as a tab or homepage group — items still surface via Start Here or search.                                     |
| Start Here / Featured | Two independent boolean flags (indicators 50/48). Start Here renders as its own tab plus a homepage band; Featured renders as a homepage band only (suppressed for items also flagged Start Here, to avoid duplication).                         |
| Category grouping     | Homepage groups resources by category (multi-membership — a resource in 2 categories appears in both groups); a specific-category tab flattens to one list. Search or type-filter also flattens to one ranked list, bypassing grouping entirely. |
| Search ranking        | Client-side: +3 per word matched in title, +1 per word matched anywhere else in the record; zero-score results excluded, rest sorted by score.                                                                                                   |
| Show more/less        | Per-group expand state (`groupVisible`, keyed by group name or `__flat__`/`__starthere__`) — in-memory only, resets on any filter change.                                                                                                        |

**SharePoint embed handling (`parseEmbed`):** decodes HTML-entity-escaped iframe embed code, extracts `src`/`title`, then rewrites the embed's own query-string JSON flags: forces `"ust":false` (suppresses Stream's own UI chrome so it matches this page's modal styling) and adds `"ap":true` (autoplay on our own play-button click, falls back to muted autoplay if the browser blocks unmuted). A video with no parseable embed but a plain URL renders as an external "Opens on SharePoint" link instead of inline playback.

**Feedback widget:** per-article "Was this helpful?" — Yes/No, each click POSTs a new record to `form_faf54` then advances its workflow with a single `/submit` call. Code comment explicitly warns against adding a follow-up `/currentStep`+`/apply` call (as the Idea Portal's `advanceWorkflow()` does) — step 1 here has its own auto-firing action, and a second advance call would skip past it.

**Learning Objectives field:** rich-text (Trumbowyg), sanitized via `sanitizeRich()` before display — detects and un-serializes legacy PHP `serialize()` array data first (a leftover from a prior field-type migration), falls back to manual plain-text extraction into a bullet list when `DOMPurify` isn't loaded.

**JS/CSS**

- `DOMPurify` loaded from `{APP_JS_PATH}/dompurify/dompurify.min.js` (LEAF-hosted, resolved at runtime since this is a standalone page with no server-injected path constant) — `help_library.js` is chained to load only after that finishes, so sanitization is guaranteed available first.
- Icons are **not inlined** in the HTML/JS (unlike Idea Portal/Launchpad) — each is fetched individually at runtime via `fetch('./files/{name}.svg')` and cached in an `ICONS` map. 25 icon files needed (§ below).
- `getFirstName()` scrapes the hero greeting's first name out of LEAF's rendered header DOM (`#headerHelp span b` or a body-text regex fallback) rather than a server-injected value — explicit code comment flags this as fragile/silent-failure-prone if LEAF's shell markup changes.
- Article deep-linking: `#article-{id}` hash drives `open()`/`back()` via `hashchange`; a `?topic=` query param pre-fills search on load (sanitized via `.innerText` round-trip, not raw-inserted).
- Cross-frame nav sync: when iframe-embedded (`window.parent !== window`), posts `{type:"lp-help-library-nav", articleId}` to `window.parent` with the explicit origin `https://leaf.va.gov` (not `"*"`) so an embedding Launchpad page can reflect the open article in its own address bar.

**Icons (Material Symbols Filled, fetched individually, not inlined):** `close`, `search`, `grid_view`, `star`, `label`, `play_circle`, `menu_book`, `help`, `timeline`, `change_circle`, `folder`, `chevron_right`, `chevron_left`, `update`, `picture_as_pdf`, `search_off`, `schedule`, `sort_by_alpha`, `unfold_less`, `unfold_more`, `open_in_new`, `smart_display`, `lightbulb`, `thumb_up`, `thumb_down` — cross-reference against §5's confirmed inventory; several (`search`, `open_in_new`, `play_circle`, `menu_book`, `lightbulb`, `thumb_up`, `thumb_down`) are already confirmed there or in §A1.

**A11y**

- Skip link to `#hl-main-content`.
- Category strip and Watch/Read media tabs are both real `role="tablist"` patterns with roving tabindex + arrow/Home/End key nav.
- `aria-live="polite"` result-count region (`#srAnnounce`) announced on every filter/search change, with a 50ms clear-then-set to force re-announcement of identical text.
- Modal engine shared across Video/PDF/Consultation modals: focus trap, restore-on-close via `safeFocus()` (falls back to main content if the original trigger element was removed by a re-render while the modal was open).
- PDF/video embeds both carry a visible fallback link (auto-prompted after a delay: 6s for video, 5s for consultation iframe) in case the embed fails silently (browser can't render `<object>` inline, or the form blocks framing).
- Detail page focuses the breadcrumb "back" link on open, `#hl-main-content` on category-filtered return.

**Responsive:** sidebar + category filters collapse into a horizontal pill row below 700px; two-column list/group layouts and detail layout (main + sidebar) both go single-column; PDF modal goes full-bleed. `prefers-reduced-motion` disables card/row/button transitions and the loading-dots/pulse/badge animations.

**Open TODOs**

- 🚩 **TODO:** Code comment in `help_library.html` explicitly flags: confirm the correct Smarty variables for `userID`/`CSRFToken` (`window.helpLibConfig`) on this template before production — same injection pattern as `ideas_v4.html`'s `window.leafIdeaPortal`, but unverified here.
- 🚩 **TODO:** `getFirstName()`'s DOM-scraping approach for the hero greeting is fragile by the code's own admission — depends on LEAF header markup staying stable, fails silently (console-only) if it changes.
- ℹ️ Noted, no action needed: 25 icons fetched individually at runtime (one HTTP request each) rather than inlined — a performance/consistency difference from the rest of the Launchpad/Idea Portal, which inline all icon SVGs directly in JS. Confirmed intentional (lazy-load) — left as-is.

---

## 7. Changelog

_Logged once the build is finished — not tracked turn-by-turn during drafting._

---

**Not detailed (intentional):** `lp_blog.html` (testing only, won't ship).
