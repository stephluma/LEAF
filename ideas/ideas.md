# LEAF Idea Portal — Technical Build Documentation

## Overview

The LEAF Idea Portal is a single-page web application built on top of the LEAF platform. It allows VA staff to submit improvement ideas, vote on existing submissions, and track idea status — all without leaving the LEAF environment. The portal is delivered as a static HTML file paired with a vanilla JavaScript module (`ideas_v2.js`) and styled via a combination of the platform's `launchpad.css` design system and scoped inline CSS.

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Shell HTML, layout, modals, and inline styles |
| `ideas_v2.js` | All application logic — data fetching, rendering, state, events |
| `launchpad.css` | Platform design system (external dependency) |
| `leaf_nav.js` | Platform navigation host (external dependency) |
| `leaf_breadcrumb.js` | Platform breadcrumb injection (external dependency) |

---

## LEAF Form Configuration

The portal reads and writes to two LEAF form types, identified by their `categoryID`.

### Forms

| Constant | Form ID | Purpose |
|---|---|---|
| `FORM_IDS.idea` | `form_ae642` | Idea submissions |
| `FORM_IDS.votes` | `form_57e89` | Vote records |

### Idea Form Indicators (fields)

| Field | Indicator ID |
|---|---|
| Title | 5 |
| Summary | 6 |
| Benefit | 7 |
| Category | 8 |
| Impact | 9 |
| Attachment | 10 |
| Status | 12 |
| Other Category | 13 |
| Date Submitted | 15 |

### Vote Form Indicators

| Field | Indicator ID |
|---|---|
| Idea (reference) | 2 |
| User (voter identity) | 3 |

---

## Architecture

### Data Flow

```
Page Load
  └─ resolveVoterEmail()          # orgchart API → userID fallback
  └─ fetchIdeasData()             # LeafFormQuery → all submitted ideas
  └─ fetchVotesData()             # LeafFormQuery → all votes, builds voteCounts + userVotes
  └─ buildIdeasViewModelList()    # normalize raw records into view models
  └─ renderAllIdeas()             # filter → sort → paginate → DOM
  └─ renderTop10Ideas()           # top 10 by votes → DOM
  └─ fetchUserSubmissions()       # filter by userID → renderMyIdeas()
```

### State Objects

| Object | Description |
|---|---|
| `ideas[]` | Normalized view-model array of all submitted ideas |
| `ideasRaw[]` | Raw API response objects |
| `ideasById{}` | Record ID → raw idea object map |
| `ideasVMById{}` | Record ID → view-model map |
| `voteCounts{}` | Record ID → total vote count |
| `userVotes{}` | Record ID → boolean (has current user voted) |
| `myIdeasCache[]` | View-model list of the current user's ideas |
| `state{}` | UI state: search query, category filter, pagination per panel |
| `sortState{}` | Per-table sort key and direction |

---

## API Communication

### Read (GET) — `leafFetchQuery()`

All data reads use the LEAF REST query endpoint:

```
GET ./api/form/query/?q={JSON}&x-filterData={fields}
```

The `x-filterData` parameter limits the response payload to specific top-level fields and `s1` (indicator data). This is used for both idea and vote fetches.

### Write (POST) — `apiPostJson()`

All writes use `application/x-www-form-urlencoded` POSTs with `credentials: "same-origin"` and a CSRF token included in every payload.

| Action | Endpoint |
|---|---|
| Create new idea / vote | `./api/?a=form/new` |
| Write indicator to existing record | `./api/form/{recordID}` |
| Submit record into workflow | `./api/form/{recordID}/submit` |
| Fetch current workflow step | `./api/formWorkflow/{recordID}/currentStep` |
| Apply workflow action | `./api/formWorkflow/{recordID}/apply` |
| Fetch indicator for detail view | `./ajaxIndex.php?a=getprintindicator` |

---

## Key Features

### Idea Submission (`NewIdea()`)

1. Builds a form payload including all idea indicator fields.
2. POSTs to `./api/?a=form/new` to create the record.
3. If submitting (not drafting): writes `date_submitted` (indicator 15) via a separate POST to the record, then calls `advanceWorkflow()` to move the record out of draft state.
4. Handles file uploads separately via `FormData` POST (fire-and-forget).
5. Draft saves skip workflow advancement and only refresh the My Ideas panel.

### Workflow Advancement (`advanceWorkflow()`)

The workflow advance is a three-step process to reliably move a new record into the active submission state:

1. POST to `./api/form/{recordID}/submit`
2. GET `./api/formWorkflow/{recordID}/currentStep` to retrieve `dependencyID` and `actionType`
3. POST to `./api/formWorkflow/{recordID}/apply` with those values

This approach is best-effort; failure is logged as a warning but does not surface an error to the user since the record has already been created.

### Voting (`IdeaVotes()`)

- Optimistic UI: vote button is immediately disabled and marked voted before the API call.
- On success: increments `voteCounts`, persists `userVotes` to `localStorage`, updates all affected DOM nodes, re-renders Top 10, and refreshes the stats strip.
- On failure: rolls back the optimistic state.
- Prevents double-votes in-session via `votingInProgress` flag and `userVotes` check. `localStorage` provides persistence across sessions.

### Voter Identity (`resolveVoterEmail()`)

Votes are recorded with a voter identifier. The portal first attempts to resolve a real email address from the LEAF orgchart API (`/platform/orgchart/api/employee/search`). If that fails, it falls back to the raw `userID` value from `window.leafIdeaPortal`. This ensures vote deduplication works whether records were stored pre- or post-email migration.

### Detail Modal (`openIdeaDetailModal()`)

- Renders a skeleton immediately with data available from the view model (title, status, vote count).
- Fetches each indicator field independently via `./ajaxIndex.php?a=getprintindicator` using `Promise.allSettled()` so a single field failure doesn't block the rest.
- Attachments are rendered as a thumbnail grid with pop-out viewer; non-image files render as download links.
- The "Category = Other" sub-question (indicator 13) is conditionally shown based on the resolved category value.

---

## UI Components

### Tabs

Three tab panels managed via ARIA `role="tablist"` / `role="tab"` / `role="tabpanel"`. Keyboard navigation supports arrow keys, Home, and End per the ARIA authoring practices.

| Tab | Panel ID | Content |
|---|---|---|
| All Ideas | `panel-all` | Searchable, filterable, sortable full list |
| Top 10 Ideas | `panel-top` | Top 10 by votes, sortable |
| My Ideas | `panel-my` | Current user's submissions including drafts |

### Category Sidebar

Built dynamically from the loaded idea data. Clicking a category sets `state.categoryFilter` and re-renders the All Ideas panel. Count badges reflect filtered totals.

### Modals

Three modals are used:

| Modal ID | Purpose |
|---|---|
| `addIdeaModal` | Idea submission form |
| `ipRecordModal` | Inline idea detail view |
| `ipVotedModal` | List of ideas the current user has voted for |

All modals implement focus trapping (`bindFocusTrap()`), background inert-ness (`setBackgroundHidden()`), and Escape key dismissal. Focus is returned to the triggering element on close.

### Pagination

Controlled per-panel via `state.pagination`. Default page size is 50. A "Show all" toggle is available when the list exceeds 50 records. Panels with fewer than 50 records skip pagination entirely.

---

## Security

- **CSRF**: Every mutating POST includes `CSRFToken` sourced from `window.leafIdeaPortal.csrfToken`, which is injected server-side via Smarty templating.
- **XSS**: All user-supplied and API-returned values are run through `escapeHtml()` before insertion into the DOM. Raw HTML from indicator endpoints is parsed via `extractCleanValue()` before display.
- **HTML comment injection**: `sanitizeLeafValue()` strips `<!--` and `-->` sequences from LEAF template output before use.
- **Credentials**: All fetch calls use `credentials: "same-origin"` to restrict cookie transmission to the same origin.

---

## Configuration

Runtime configuration is injected server-side into `window.leafIdeaPortal` via Smarty:

```javascript
window.leafIdeaPortal = {
  userID: '<!--{$userID|unescape|escape:"quotes"}-->',
  csrfToken: '<!--{$CSRFToken|unescape|escape:"quotes"}-->',
};
```

Fallback values for category and impact selects (`CATEGORY_FALLBACK`, `IMPACT_FALLBACK`) are used if the live indicator fetch fails.

---

## Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| Public Sans | Google Fonts | Heading / UI typeface |
| Source Sans 3 | Google Fonts | Body typeface |
| Material Symbols Outlined | Google Fonts | Icon set (filled variant) |
| launchpad.css | Platform (`/platform/designs/files/`) | Design tokens and base styles |
| leaf_nav.js | Platform (`/platform/designs/files/`) | Navigation host |
| leaf_breadcrumb.js | Platform (`/platform/designs/files/`) | Breadcrumb injection |

No third-party JavaScript libraries are used. The application is written in vanilla ES2020+ JavaScript.

---

---

## Record Detail View — `print_form` (Full Page)

`print_form` is the Smarty template that renders when a user navigates directly to a record via `index.php?a=printview&recordID={N}`. It is a full-page view and serves as the primary standalone record page for all users.

### Layout

The layout is conditionally two-column for group 226 members (the LEAF team). When the current user belongs to group 226, a flex row wraps both the public view and a right-hand admin toolbar (`#toolbar226`). All other users see the public view alone.

```
[group 226 only]
┌─────────────────────────────┬──────────────┐
│ #public-view (flex: 1)      │ #toolbar226  │
│                             │ (flex: 0 220px)│
└─────────────────────────────┴──────────────┘

[all other users]
┌─────────────────────────────┐
│ #public-view                │
└─────────────────────────────┘
```

### Public View (`#public-view`)

The public view renders the same card layout used in the portal's inline detail modal, but as a full standalone page. Fields are loaded identically via `ajaxIndex.php?a=getprintindicator` on DOM ready. It includes:

- Back navigation link to the portal index
- ID badge, status pill, and vote count pill (status resolved from indicator 12, vote count from a live vote query)
- Inline edit buttons on each field (conditionally rendered via Smarty based on `$canWrite` and `$submitted` state)
- Vote and Share action buttons (full vote/email resolution logic, same as `ideas_v2.js`)
- Toast notification for vote and share feedback
- Cancel Request button (shown to record owner or admin)

### Smarty Variables Used

| Variable | Purpose |
|---|---|
| `$recordID` | Current record ID (stripped and escaped) |
| `$userID` | Current user's identity |
| `$CSRFToken` | CSRF token for all POST operations |
| `$submitted` | Whether the record has been submitted (0 = draft) |
| `$is_admin` | Admin flag controlling elevated UI options |
| `$canWrite` | Write permission flag for edit button visibility |
| `$canRead` | Read permission flag displayed in security section |
| `$empMembership['groupID'][226]` | LEAF team group membership gate |
| `$bookmarked` | Bookmark status for toggle button |
| `$deleted` | Deleted state (shows restore banner if > 0) |
| `$stepID` | Current workflow step (controls comment panel visibility) |
| `$comments` | Array of comment/history objects |
| `$childforms` | Child form array for Internal Use sidebar navigation |
| `$allowCancel` | Whether the cancel workflow is permitted |
| `$childCategoryID` | Child form context for `openContent()` calls |

### Admin Toolbar (`#toolbar226`)

Visible only to group 226 members. Contains:

- **Transfer to LEAF Projects** — opens the `pmTransferModal` to route the record as a task or project in the LEAF Projects dashboard. Navigates via direct `window.location` to `https://leaf.va.gov/platform/projects/` with either `transferFromIdea` or `transferProjectFromIdea` query param.
- **Idea Tools** — Edit form (draft only), View History, Write Email (mailto), Print to PDF (`openContentForPrint()` + `printer`), Bookmark toggle, Copy Request, Cancel Request.
- **Internal Use** — Navigation buttons that call `openContent()` to load the main printview or child forms into `#formcontent`.
- **Votes panel** (admin only) — `toggleVotes()` fetches all vote records for the current idea and renders a paginated voter list (capped at 20, with a "Show all" toggle) into `#formcontent`.
- **Administrative Tools** (admin only) — Change Step, Change Service, Change Forms, Change Initiator. Each opens a LEAF dialog controller (`dialog`) with the appropriate form.
- **Security Permissions** — Read/write access badges with access log dialogs.

### Platform JS Dependencies (print_form only)

`print_form` initializes several platform JavaScript objects not present in the portal's main `index.html`:

| Object | Class | Purpose |
|---|---|---|
| `form` | `LeafForm` | Field editing dialogs |
| `workflow` | `LeafWorkflow` | Workflow step rendering in sidebar |
| `print` | `printer` | Print to PDF |
| `dialog` | `dialogController` | General-purpose modal dialogs |
| `dialog_message` | `dialogController` | History / access log dialogs |
| `dialog_ok` | `dialogController` | Confirmation OK dialogs |
| `dialog_confirm` | `dialogController` | Confirm/cancel dialogs |
| `portalAPI` | `LEAFRequestPortalAPI` | Portal API wrapper |

The `pvOpenEdit(indicatorID)` function bridges the custom public view UI to the platform's `LeafForm` dialog, using `setPostModifyCallback()` to refresh only the edited field after save.

### Record History

`viewHistory()` opens a full history dialog using `LeafFormGrid`. History is fetched paginated from `api/form/{recordID}/history` and supports three filter types: Action (workflow), Notes, and Email Delivery. Rows are sorted client-side with a custom comparator that groups events by minute before falling back to `sortOrder` and raw timestamp.

---

## Record Detail View — `print_form_iframe` (Embedded / Iframe Context)

`print_form_iframe` renders the same public view as `print_form` but is stripped of the platform toolbar and admin sidebar. It is used when a record is rendered inside an iframe (e.g., the portal's inline record modal before it was replaced with the direct-fetch approach). 

### Differences from `print_form`

| Concern | `print_form` | `print_form_iframe` |
|---|---|---|
| Admin toolbar (`#toolbar226`) | Present | Absent |
| Layout wrapper for two-column | Conditional flex row | None |
| `LeafWorkflow` init | Yes | No |
| `printer` / Print to PDF | Yes | No |
| `dialog_ok`, `portalAPI` | Yes | No |
| `#formcontent` loading | Calls `openContent()` for group 226 | Calls `openContent()` for group 226 |
| Transfer modal | Present | Present |
| Vote/Share actions | Absent (no action bar in iframe view) | Absent |
| Internal banner | Present (group 226 only) | Absent |
| Cancel button | Present (in meta row) | Present (in meta row) |

The iframe variant initializes a reduced set of platform objects — only `form`, `dialog`, `dialog_message`, and `dialog_confirm` — sufficient for edit dialogs but not full workflow or print operations.

### Transfer to LEAF Projects (iframe context)

`doTransferAs()` in `print_form_iframe` detects whether it is running inside an iframe and, if so, uses `window.parent.postMessage()` instead of direct `window.location` navigation, passing `{ type: 'pmTransferNavigate', url }` to the parent frame. This prevents navigation from breaking the parent page context.

### Category / Impact Pills

Unlike `print_form`, which resolves status from indicator 12 and displays it as a status pill, `print_form_iframe` displays **category** (indicator 8) and **impact** (indicator 9) as pills in the meta row. These are injected by the `onValue` callbacks in the field loader and are hidden until their respective indicator values resolve.

### Shared Indicator Loading Logic

Both templates use an identical `loadIndicator()` / `extractCleanValue()` / `renderAttachments()` pattern. The field map and callbacks are exposed on `window._pvFields` and `window._pvLoadIndicator` so that `pvOpenEdit()` can trigger a targeted field refresh after a save without reloading the full page.