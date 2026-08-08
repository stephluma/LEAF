// Tracks record IDs already attempted for the one-time status repair
// (see fetchUserSubmissions()), regardless of success or failure, so a
// record whose repair write fails (network error, permissions, etc.)
// can't trigger a retry loop every time this function re-runs within the
// same page session — the repair path re-fetches data after writing,
// which itself re-invokes this same function, so this guard is required
// to guarantee termination.
const statusRepairAttempted = new Set();// Uploads a file for the given record and returns a definitive
// success/failure result rather than fire-and-forget. Previously this
// upload was kicked off with only a .catch() that logged to console —
// nothing checked res.ok or the response body, and the overall
// "submitted/saved successfully" toast fired immediately regardless of
// this upload's outcome. That is the root cause of the reported bug: an
// unsupported file type (or any other upload failure) would silently do
// nothing server-side while the user still saw a generic success
// message with no indication the attachment didn't attach.
async function uploadIdeaAttachment(recordID, files) {
  const fd = new FormData();
  fd.append("CSRFToken", csrfToken);
  files.forEach((f) => fd.append("10", f));
  try {
    const res = await fetch(`./api/?a=form/${recordID}`, {
      method: "POST",
      credentials: "same-origin",
      body: fd,
    });
    const text = await res.text();
    return { success: res.ok, responseText: text };
  } catch (err) {
    console.warn("[IdeaUpload] Network error during upload:", err);
    return { success: false, responseText: "" };
  }
}const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;
const RECORD_VIEW_URL =
  `${window.location.origin}/platform/ideas/index.php?a=printview&recordID=`;

// Accepted attachment types — sourced from LEAF's own backend allow-list
// (System.php's $mimeTypeMap / CommonConfig.php's fileManagerWhitelist),
// not just the form's "Upload Images" label. Matching the server's real
// allow-list here matters in both directions: too narrow and this client
// check would falsely reject files LEAF would actually accept; too wide
// and a "validated" file could still be rejected server-side with no
// warning shown up front. Checked against both MIME type and file
// extension — file.type can come back empty or inconsistent across
// OS/browser combinations (this is especially true for bmp and tif),
// so the extension is a necessary fallback, not a redundant check.
const ACCEPTED_ATTACHMENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/bmp",
  "image/x-ms-bmp",
  "image/gif",
  "image/tiff",
  "image/svg+xml",
]);
const ACCEPTED_ATTACHMENT_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "gif",
  "tif",
  "tiff",
  "svg",
]);
const ACCEPTED_ATTACHMENT_LABEL = "PNG, JPG, JPEG, BMP, GIF, TIF, or SVG";

function isAcceptedAttachmentFile(file) {
  if (!file) return false;
  if (file.type && ACCEPTED_ATTACHMENT_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  const name = file.name || "";
  const ext = name.includes(".")
    ? name.split(".").pop().toLowerCase()
    : "";
  return ACCEPTED_ATTACHMENT_EXTENSIONS.has(ext);
}

const FORM_IDS = {
  idea: "form_ae642",
  votes: "form_57e89",
};

const FORM_KEYS = {
  idea: FORM_IDS.idea.replace("form_", ""),
  votes: FORM_IDS.votes.replace("form_", ""),
};

const IDEA_FIELDS = {
  title: 5,
  summary: 6,
  benefit: 7,
  category: 8,
  impact: 9,
  attachment: 10,
  status: 12,
  other_category: 13,
  date_submitted: 15,
  imported_votes: 23,
  implemented: 21,
  implemented_url: 22,
};

const VOTE_FIELDS = {
  idea: 2,
  user: 3,
};

const IDEA_INDICATORS = {
  title: `id${IDEA_FIELDS.title}`,
  summary: `id${IDEA_FIELDS.summary}`,
  benefit: `id${IDEA_FIELDS.benefit}`,
  category: `id${IDEA_FIELDS.category}`,
  impact: `id${IDEA_FIELDS.impact}`,
  attachment: `id${IDEA_FIELDS.attachment}`,
  status: `id${IDEA_FIELDS.status}`,
  other_category: `id${IDEA_FIELDS.other_category}`,
  imported_votes: `id${IDEA_FIELDS.imported_votes}`,
  implemented: `id${IDEA_FIELDS.implemented}`,
  implemented_url: `id${IDEA_FIELDS.implemented_url}`,
};

const VOTE_INDICATORS = {
  idea: `id${VOTE_FIELDS.idea}`,
  user: `id${VOTE_FIELDS.user}`,
};

// Fields to retrieve for idea records
const IDEA_GETDATA = [
  String(IDEA_FIELDS.category),
  String(IDEA_FIELDS.title),
  String(IDEA_FIELDS.status),
  String(IDEA_FIELDS.imported_votes),
  String(IDEA_FIELDS.date_submitted),
];

// Fields to retrieve for vote records
const VOTE_GETDATA = [String(VOTE_FIELDS.idea), String(VOTE_FIELDS.user)];

// x-filterData values — keep s1 so indicator data is preserved,
// drop unused top-level metadata for bandwidth savings
const IDEA_FILTER_DATA = "recordID,title,created_date,userID,s1";
const VOTE_FILTER_DATA = "recordID,s1";

const CATEGORY_FALLBACK = [
  "Email Template",
  "Forms",
  "Inbox",
  "Nexus",
  "Print to PDF",
  "Report Builder",
  "Support",
  "Training",
  "User Access Groups",
  "User Interface",
  "Workflow",
];

const IMPACT_FALLBACK = [
  "Impacts National",
  "Impacts Regional",
  "Impacts Local Facility",
  "Impact is one or more, but not all users",
];

const PUBLIC_VISIBLE_STATUS_KEYS = new Set([
  "new",
  "review",
  "progress",
  "completed",
  "already_exists",
  "duplicate",
]);

// (ICON_FILL removed — was the font-variation-settings string applied to
// Material Symbols glyphs; no longer needed now that vote/share icons
// are inline SVGs using fill="currentColor", styled via .ip-icon in
// idea.html rather than font-variation-settings.)

let ideas = [];
let ideasRaw = [];
let ideasById = {};
let ideasVMById = {};
let ideaOwnerMap = {};
let voteCounts = {};
// Known valid category labels (populated from the live indicator-8 select,
// or CATEGORY_FALLBACK). Used to split multi-select values that come back
// concatenated with no delimiter (e.g. legacy-imported records).
let categoryOptionsList = [];

const portalConfig = window.leafIdeaPortal || {};

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

function sanitizeLeafValue(value) {
  return String(value || "")
    .replace(/<!--|-->/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline SVG icon markup — replaces the old Material Symbols icon-font
// glyphs (<span class="material-symbols-outlined">name</span>) used for
// the vote (thumb_up) and share icons, the two icon names that only ever
// appear in this file's dynamically-generated row/detail-modal markup
// rather than in idea.html's static markup. Each SVG uses
// fill="currentColor" so it responds to every existing dynamic-color CSS
// rule (hover, voted, own, unavailable, disabled states) exactly the way
// the font glyphs did — no CSS color-rule changes were needed elsewhere,
// only sizing (font-size -> width/height, see .ip-icon in idea.html).
// Centralized here as the single source of truth for these two icons'
// markup, rather than duplicating the raw <svg> in every render site.
const ICON_SVG = {
  thumb_up:
    '<path d="M720-120H320v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h218q32 0 56 24t24 56v80q0 7-1.5 15t-4.5 15L794-168q-9 20-30 34t-44 14ZM240-640v520H80v-520h160Z"/>',
  share:
    '<path d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>',
  // "send" is used by the Submit/Retry Submit button rendered by
  // buildIdeaRow() and buildDetailSkeleton() — a THIRD icon (beyond
  // thumb_up/share) that also needed conversion in this file's
  // dynamically-generated markup, missed in the first pass because that
  // pass only searched for thumb_up/share specifically. "send" was
  // already converted separately in idea.html's STATIC markup (the Save/
  // Submit Idea modal buttons), but this dynamic row/detail-modal usage
  // is a distinct code path that still referenced the now-removed
  // ICON_FILL constant, causing a ReferenceError on every row render.
  send: '<path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z"/>',
  // check_circle/error/close — used exclusively by showToast()'s
  // dynamically-injected toast banner markup. These three were never
  // part of the original 14-icon list, the thumb_up/share pair, or the
  // "send" fix — they were missed entirely across every prior pass in
  // this conversion, since showToast() wasn't checked for icon-font
  // usage until this gap was noticed directly in the deployed UI.
  check_circle:
    '<path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>',
  error:
    '<path d="M508.5-291.5Q520-303 520-320t-11.5-28.5Q497-360 480-360t-28.5 11.5Q440-337 440-320t11.5 28.5Q463-280 480-280t28.5-11.5ZM440-440h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>',
  close: '<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>',
};

function iconSvg(name, opts = {}) {
  const inner = ICON_SVG[name];
  if (!inner) return "";
  const hidden = opts.ariaHidden === false ? "" : ' aria-hidden="true"';
  const extraClass = opts.extraClass ? ` ${opts.extraClass}` : "";
  const style = opts.style ? ` style="${opts.style}"` : "";
  // BUGFIX: this template previously had no fill attribute at all on the
  // generated <svg> tag. The individual path strings in ICON_SVG were
  // extracted from the user's uploaded files by stripping the outer
  // <svg fill="currentColor"> wrapper down to just the inner <path>
  // markup — but fill="currentColor" was never re-added to THIS new
  // wrapper <svg>. SVG's actual default fill (per spec, when no fill is
  // set anywhere) is black, not "inherit color from CSS" — so every icon
  // rendered via this helper was silently rendering as solid black
  // regardless of any .ip-icon { color: ... } CSS rule, since those
  // rules only affect currentColor, which was never actually wired up.
  // This affected every icon, not just the ones visibly reported.
  return `<svg class="ip-icon${extraClass}" viewBox="0 -960 960 960" fill="currentColor" focusable="false"${hidden}${style}>${inner}</svg>`;
}

function truncateTitle(title, max = 100) {
  if (!title) return "";
  return title.length <= max ? title : `${title.substring(0, max).trimEnd()}…`;
}

/* ─────────────────────────────────────────────────────────────
   Multi-select category parsing
   Handles both delimited values (comma/semicolon/newline — the
   normal case for values entered through the app) and legacy
   imported values that come back as selected labels concatenated
   with no delimiter at all, by greedily matching against the
   known category option list (longest labels first).
───────────────────────────────────────────────────────────── */

function parseCategoryValue(raw) {
  const str = String(raw || "").trim();
  if (!str) return [];

  // Normal case — an explicit delimiter is present.
  if (/[,;\n]/.test(str)) {
    return str
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // No delimiter — try to greedily split using known category labels.
  const known = (categoryOptionsList || [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => b.length - a.length);

  if (known.length) {
    const out = [];
    let remaining = str;
    let guard = 0;
    while (remaining.length && guard < 50) {
      guard++;
      const match = known.find((label) =>
        remaining.toLowerCase().startsWith(label.toLowerCase()),
      );
      if (!match) break;
      out.push(match);
      remaining = remaining.slice(match.length);
    }
    // Only trust the greedy split if it consumed the whole string —
    // otherwise fall back to treating it as a single value below.
    if (out.length && !remaining.trim()) return out;
  }

  return [str];
}

function renderCategoryPills(categories) {
  const list = Array.isArray(categories) ? categories : [categories];
  const clean = list.map((c) => String(c || "").trim()).filter(Boolean);
  if (!clean.length) return "";
  return `<span class="ip-cat-pills">${clean
    .map((c) => `<span class="ip-cat-pill">${escapeHtml(c)}</span>`)
    .join("")}</span>`;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ─────────────────────────────────────────────────────────────
   API helpers (POST only — reads use LeafFormQuery)
───────────────────────────────────────────────────────────── */

async function apiPostJson(url, data) {
  const body = new URLSearchParams();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.append(String(key), String(value));
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: body.toString(),
    credentials: "same-origin",
  });

  if (!response.ok)
    throw new Error(`Request failed with status ${response.status}`);

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ─────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────── */

const userID = sanitizeLeafValue(portalConfig.userID);
const csrfToken = sanitizeLeafValue(portalConfig.csrfToken);

let userVotes = (() => {
  try {
    return JSON.parse(localStorage.getItem("leafIdeaVotes") || "{}");
  } catch {
    return {};
  }
})();

// Maps ideaID -> the current user's own vote record's recordID (the vote
// FORM record's own recordID, distinct from the idea it points at).
// Populated from fetchVotesData() (server-confirmed) and immediately on a
// fresh IdeaVotes() call. Required to target a specific vote record for
// un-voting. CONFIRMED WORKING as of the field shape `recordID` (numeric,
// coerced to string) returned by this LEAF instance's form/query endpoint.
let myVoteRecordIdByIdea = {};

let votingInProgress = false;
let ideaSubmitInProgress = false;
let implementedCount = 0;
let myIdeasCache = [];
let lastFocusedElement = null;
let lastRecordFocusedElement = null;
let resolvedVoterEmail = "";

// Tracks whether the Add/Edit Idea modal is currently in "edit an existing
// draft" mode vs. "create new idea" mode. When set, NewIdea() updates this
// record in place instead of creating a new one via form/new.
let editingDraftRecordID = null;
// Filename of a draft's existing attachment, shown in the edit form so
// users don't think re-opening a draft silently dropped their upload.
let editingDraftAttachmentLabel = "";

const state = {
  search: "",
  categoryFilter: "all",
  // Tracks which tab is currently visible so shared UI that has to act
  // differently per-tab (currently just the category sidebar's counts
  // and click-to-filter target) knows which dataset to use. Re-added in
  // scoped form after the broader "personal stats strip" version of this
  // was reverted — this only drives the category sidebar now, nothing
  // else. Defaults to "all" to match the default active tab in markup.
  activeTab: "all",
  pagination: {
    all: { page: 1, showAll: false },
    my: { page: 1, showAll: false },
  },
};

const sortState = {
  tblIdeas: { key: "", dir: "asc" },
  tblTopIdeas: { key: "", dir: "desc" },
  tblMyIdeas: { key: "", dir: "asc" },
};

const ui = {
  results: null,
  topResults: null,
  myResults: null,
  searchInput: null,
  searchBtn: null,
  status: { all: null, my: null },
  pagination: { all: null, my: null },
  pageInfo: { all: null, my: null },
  pageHint: { all: null, my: null },
  panels: { all: null, my: null },
};

/* ─────────────────────────────────────────────────────────────
   DOM cache
───────────────────────────────────────────────────────────── */

function cacheElements() {
  ui.results = document.getElementById("results");
  ui.topResults = document.getElementById("topResults");
  ui.myResults = document.getElementById("myResults");
  ui.searchInput = document.getElementById("searchInput");
  ui.searchBtn = document.getElementById("searchBtn");
  ui.status.all = document.getElementById("allStatus");
  ui.status.my = document.getElementById("myStatus");
  ui.pagination.all = document.getElementById("allPagination");
  ui.pagination.my = document.getElementById("myPagination");
  ui.pageInfo.all = document.getElementById("allPageInfo");
  ui.pageInfo.my = document.getElementById("myPageInfo");
  ui.pageHint.all = document.getElementById("allPageHint");
  ui.pageHint.my = document.getElementById("myPageHint");
  ui.panels.all = document.getElementById("panel-all");
  ui.panels.my = document.getElementById("panel-my");
}

/* ─────────────────────────────────────────────────────────────
   Toast → sticky top banner
   Manual-dismiss only (no auto-hide timer) per WCAG 2.2.1/2.2.3.
   CONFIRMED: top banner position + forced white text now display
   correctly.
───────────────────────────────────────────────────────────── */

function showToast(msg, isError = false) {
  const toast = document.getElementById("ipToast");
  if (!toast) return;
  const iconName = isError ? "error" : "check_circle";
  toast.innerHTML = `<span class="ip-toast__icon" aria-hidden="true">${iconSvg(iconName)}</span>
    <span class="ip-toast__msg">${escapeHtml(msg || "")}</span>
    <button type="button" class="ip-toast__close" aria-label="Dismiss notification">
      ${iconSvg("close")}
    </button>`;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  toast
    .querySelector(".ip-toast__close")
    ?.addEventListener("click", hideToast, { once: true });
}

function hideToast() {
  const toast = document.getElementById("ipToast");
  if (!toast) return;
  toast.classList.remove("is-visible");
}

function copyFallback(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      showToast("Idea link copied to clipboard.");
    } else {
      showToast("Could not copy — please copy the URL manually.", true);
    }
  } catch (err) {
    console.warn("[Share] copyFallback failed:", err);
    showToast("Could not copy — please copy the URL manually.", true);
  }
}

/* ─────────────────────────────────────────────────────────────
   Stats strip
───────────────────────────────────────────────────────────── */

function renderStatsStrip(totalIdeas, implemented, totalVotes) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val.toLocaleString();
  };
  set("statTotalIdeas", totalIdeas);
  set("statImplemented", implemented);
  set("statTotalVotes", totalVotes);
}

/* ─────────────────────────────────────────────────────────────
   Category sidebar
───────────────────────────────────────────────────────────── */

function buildCategorySidebar(ideaList) {
  const catList = document.getElementById("catList");
  if (!catList) return;

  const counts = {};
  let total = 0;
  (ideaList || []).forEach((idea) => {
    const cats = (
      idea.categories && idea.categories.length
        ? idea.categories
        : [(idea.category || "").trim() || "Uncategorized"]
    ).filter(Boolean);
    cats.forEach((cat) => {
      counts[cat] = (counts[cat] || 0) + 1;
    });
    total++;
  });

  const allCountEl = document.getElementById("ip-cat-count-all");
  if (allCountEl) allCountEl.textContent = total;

  // Preserve which category is currently selected across a rebuild (e.g.
  // switching tabs shouldn't silently reset an active category filter
  // back to "All Categories").
  const previouslyActiveCat = state.categoryFilter || "all";

  // Remove previously injected items
  catList.querySelectorAll("li[data-cat]").forEach((li) => {
    if (!li.querySelector("[data-cat='all']")) catList.removeChild(li);
  });

  Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .forEach((cat) => {
      const li = document.createElement("li");
      li.setAttribute("data-cat", cat);
      li.innerHTML = `
      <button class="ip-catItem${cat === previouslyActiveCat ? " is-active" : ""}" data-cat="${escapeHtml(cat)}" type="button">
        <span>${escapeHtml(cat)}</span>
        <span class="ip-catCount">${counts[cat]}</span>
      </button>`;
      catList.appendChild(li);
    });

  // Keep "All Categories" highlighted correctly too, since the rebuild
  // above regenerates every button including the static "all" one's
  // sibling state.
  const allBtn = catList.querySelector('[data-cat="all"]');
  if (allBtn) {
    allBtn.classList.toggle("is-active", previouslyActiveCat === "all");
  }

  if (!catList.dataset.boundClick) {
    catList.dataset.boundClick = "true";
    catList.addEventListener("click", (e) => {
      const btn = e.target.closest(".ip-catItem");
      if (!btn) return;
      const cat = btn.getAttribute("data-cat") || "all";
      state.categoryFilter = cat;
      state.pagination.all.page = 1;
      state.pagination.my.page = 1;
      catList
        .querySelectorAll(".ip-catItem")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      // Re-render whichever list is actually the active tab. Top 10 is
      // intentionally excluded — it's a fixed top-10-by-votes ranking
      // across all categories, not a filterable list, so category clicks
      // while on that tab fall back to re-rendering All Ideas' data
      // (which is what the sidebar counts also reflect while on Top 10 —
      // see refreshCategorySidebarForActiveTab()).
      if (state.activeTab === "my") {
        renderMyIdeas();
      } else {
        renderAllIdeas();
      }
    });
  }
}

// Rebuilds the category sidebar using whichever dataset matches the
// currently active tab, so both the displayed counts AND the
// click-to-filter behavior are scoped consistently to what's actually on
// screen. On Top 10 specifically, the sidebar is made visually inert
// instead of falling back to All Ideas' counts — Top 10 is a fixed
// top-10-by-votes ranking across all categories, not a filterable list,
// so a category click there has never actually changed what's shown;
// showing live-looking counts and clickable buttons for a control that
// doesn't apply was more confusing than showing nothing.
function refreshCategorySidebarForActiveTab() {
  const catList = document.getElementById("catList");
  const note = document.getElementById("ipCatSidebarNote");
  if (state.activeTab === "top") {
    if (catList) {
      catList.classList.add("is-inert");
      catList.setAttribute("aria-disabled", "true");
    }
    if (note) note.hidden = false;
    return;
  }
  if (catList) {
    catList.classList.remove("is-inert");
    catList.removeAttribute("aria-disabled");
  }
  if (note) note.hidden = true;

  if (state.activeTab === "my") {
    buildCategorySidebar(myIdeasCache);
  } else {
    buildCategorySidebar(ideas);
  }
}

/* ─────────────────────────────────────────────────────────────
   My Activity sidebar
───────────────────────────────────────────────────────────── */

function updateMyActivity(myCount, votedCount) {
  const ideasEl = document.getElementById("myActivityIdeas");
  const votesEl = document.getElementById("myActivityVotes");
  if (ideasEl) ideasEl.textContent = myCount;
  if (votesEl) votesEl.textContent = votedCount;
}

// Count of the user's votes that still point at an available (non-deleted)
// idea — mirrors the filtering used to build the "Ideas I've voted for"
// list, so the sidebar count and the list it summarizes always agree.
function getAvailableVotedCount() {
  return Object.keys(userVotes).filter(
    (id) => userVotes[id] === true && ideasVMById[id] != null,
  ).length;
}

/* ─────────────────────────────────────────────────────────────
   Status messages
───────────────────────────────────────────────────────────── */

function setPanelBusy(scope, isBusy) {
  ui.panels[scope]?.setAttribute("aria-busy", isBusy ? "true" : "false");
}

function setStatus(scope, message, type) {
  const el = ui.status[scope];
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("is-error", "is-loading");
    return;
  }
  el.textContent = message;
  el.hidden = false;
  el.classList.toggle("is-error", type === "error");
  el.classList.toggle("is-loading", type === "loading");
}

/* ─────────────────────────────────────────────────────────────
   Modal helpers
───────────────────────────────────────────────────────────── */

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      !el.getAttribute("aria-hidden") &&
      !el.hasAttribute("hidden") &&
      el.offsetParent !== null,
  );
}

function bindFocusTrap(container) {
  if (container.dataset.focusTrap === "true") return;
  container.dataset.focusTrap = "true";
  container.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = getFocusableElements(container);
    if (!focusable.length) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

function setBackgroundHidden(hidden) {
  // Use `inert` to block both keyboard focus and screen reader access on
  // background content. `aria-hidden` alone doesn't stop keyboard Tab.
  const targets = [
    document.getElementById("lp-main"),
    document.getElementById("lp-nav-host"),
    document.querySelector(".ip-creditBadge"),
    document.getElementById("ipJumpTopBtn"),
  ].filter(Boolean);

  targets.forEach((el) => {
    if (hidden) {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    } else {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  const target =
    modal.querySelector("input, select, textarea") ||
    getFocusableElements(modal)[0];
  target?.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  setBackgroundHidden(false);
  lastFocusedElement?.focus();
  lastFocusedElement = null;
  // Leaving edit mode whenever the Add/Edit Idea modal closes, regardless
  // of how it was closed, so a later "Add Idea" from the hero CTA never
  // accidentally inherits a stale edit target.
  if (modalId === "addIdeaModal") {
    editingDraftRecordID = null;
    editingDraftAttachmentLabel = "";
    setIdeaModalMode(false);
  }
}

function bindModalEvents() {
  document.querySelectorAll("[data-ip-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Opening via any generic [data-ip-open] trigger (e.g. hero CTA) is
      // always a "create new" entry point — make sure edit-mode state from
      // a previous "Submit" click doesn't leak in.
      if (btn.dataset.ipOpen === "addIdeaModal" && !btn.dataset.editRecordId) {
        editingDraftRecordID = null;
        editingDraftAttachmentLabel = "";
        setIdeaModalMode(false);
      }
      openModal(btn.dataset.ipOpen);
    });
  });
  document.querySelectorAll("[data-ip-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.ipClose));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document
      .querySelectorAll(".ip-modal.is-open")
      .forEach((m) => closeModal(m.id));
  });
}

/* ─────────────────────────────────────────────────────────────
   Tabs
───────────────────────────────────────────────────────────── */

function bindTabs() {
  const tabs = Array.from(document.querySelectorAll(".ip-tab"));
  const panels = Array.from(document.querySelectorAll(".ip-panel"));

  function syncTabs(target) {
    tabs.forEach((tab) => {
      tab.classList.remove("is-active");
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("tabindex", "-1");
    });
    panels.forEach((panel) => {
      panel.classList.remove("is-active");
      panel.setAttribute("aria-hidden", "true");
    });
    const active = target || tabs[0];
    if (!active) return;
    active.classList.add("is-active");
    active.setAttribute("aria-selected", "true");
    active.setAttribute("tabindex", "0");
    const panel = document.getElementById(`panel-${active.dataset.ipTab}`);
    if (panel) {
      panel.classList.add("is-active");
      panel.setAttribute("aria-hidden", "false");
    }
    // Track active tab and refresh the category sidebar's counts to match
    // — previously the sidebar was built exactly once from the global
    // All Ideas list and never rebuilt on tab switch, so its counts never
    // reflected My Ideas' own categories even after the click-to-filter
    // behavior was fixed to target the right list.
    const tabKey = active.dataset.ipTab || "all";
    if (state.activeTab !== tabKey) {
      state.activeTab = tabKey;
      refreshCategorySidebarForActiveTab();
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => syncTabs(tab));
    tab.addEventListener("keydown", (e) => {
      const idx = tabs.indexOf(tab);
      let next = null;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft")
        next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        tabs[next].focus();
        syncTabs(tabs[next]);
      }
    });
  });

  syncTabs();
}

/* ─────────────────────────────────────────────────────────────
   Status resolution — single source of truth
───────────────────────────────────────────────────────────── */

function resolveDisplayStatus(idea) {
  if (!idea) return "";
  if (!isSubmittedIdea(idea)) return "Draft";
  // BUGFIX: previously this fell through to the literal string "Draft"
  // whenever a submitted record's status field (indicator 12) was blank
  // — using the exact same fallback text as the "never submitted at all"
  // case above, even though these are two entirely different situations.
  // This happened for real: writeDraftStatus() intentionally blanks
  // indicator 12 to "" whenever a draft is saved (so LEAF's own native
  // printview wouldn't show a stale "Submitted"-looking default on an
  // unsubmitted draft) — but if that same record was saved as a draft
  // first and only later actually submitted, nothing ever re-populates
  // indicator 12 with a real status value. The record IS genuinely
  // submitted (date_submitted is present, needsSubmitAction() correctly
  // hides the Submit button) — it was just showing the word "Draft" in
  // the status column by coincidence of a shared fallback string, not
  // because it was actually still a draft. "Submitted" is now used for
  // this case instead, so the two situations can never be confused again.
  const statusRaw = getIdeaStatusRaw(idea);
  return normalizeStatusLabel(sanitizeLeafValue(statusRaw)) || "Submitted";
}

/* ─────────────────────────────────────────────────────────────
   Record modal
───────────────────────────────────────────────────────────── */

async function fetchIndicator(recordID, indicatorID) {
  const url = `./ajaxIndex.php?a=getprintindicator&recordID=${encodeURIComponent(recordID)}&indicatorID=${encodeURIComponent(indicatorID)}&series=1`;
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const BLEED_MARKERS = {
  8: "if other",
  21: "please provide",
};

function stripKnownBleed(text, indicatorID) {
  const marker = BLEED_MARKERS[indicatorID];
  if (!marker) return text;
  const idx = text.toLowerCase().indexOf(marker);
  if (idx === -1) return text;
  return text.slice(0, idx).trim();
}

function extractCleanValue(html, indicatorID) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const span = tmp.querySelector(`[id^="data_${indicatorID}_"]`);
  let raw;
  if (span) {
    const clone = span.cloneNode(true);
    clone
      .querySelectorAll(`[id^="data_"]:not([id^="data_${indicatorID}_"])`)
      .forEach((el) => el.remove());
    raw = (clone.textContent || "").trim();
  } else {
    tmp
      .querySelectorAll("script, input, button, textarea, select")
      .forEach((el) => el.remove());
    raw = (tmp.textContent || "").trim();
  }
  return stripKnownBleed(raw, indicatorID);
}

function renderAttachmentsHTML(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const imgs = Array.from(tmp.querySelectorAll('img[src*="image.php"]'));
  const links = Array.from(tmp.querySelectorAll('a[href*="file.php"]'));
  if (!imgs.length && !links.length)
    return `<span class="ip-detail__empty">No attachments provided.</span>`;
  let out = `<div class="ip-detail__attach-grid">`;
  imgs.forEach((img, i) => {
    const src = escapeHtml(img.getAttribute("src") || "");
    const rawAlt =
      (img.getAttribute("alt") || "")
        .replace(/^image upload:\s*/i, "")
        .trim() || `Image ${i + 1}`;
    const filename = escapeHtml(rawAlt);
    out += `<figure style="margin:0;display:flex;flex-direction:column;gap:6px">
      <button type="button" class="ip-detail__attach-btn"
        onclick="window.open('${src}','pv_img_${i}','width=750,height=750,resizable=yes,scrollbars=yes')"
        aria-label="View full size: ${filename}">
        <img src="${src}" alt="${filename}" class="ip-detail__attach-thumb" />
      </button>
      <span class="ip-detail__attach-caption" aria-hidden="true" title="${filename}">${filename}</span>
    </figure>`;
  });
  if (links.length) {
    out += `<ul class="ip-detail__file-list" aria-label="Downloadable files">`;
    links.forEach((a) => {
      const href = escapeHtml(a.getAttribute("href") || "#");
      const filename = escapeHtml(
        (a.textContent || "").trim() || "Download file",
      );
      out += `<li class="ip-detail__file-item">
        <a href="${href}" target="_blank" rel="noopener noreferrer"
          class="ip-detail__file-link"
          aria-label="Download ${filename} (opens in new tab)">${filename}</a></li>`;
    });
    out += `</ul>`;
  }
  out += `</div>`;
  return out;
}

function extractAttachmentLabel(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const img = tmp.querySelector('img[src*="image.php"]');
  if (img) {
    const alt = (img.getAttribute("alt") || "")
      .replace(/^image upload:\s*/i, "")
      .trim();
    if (alt) return alt;
  }
  const link = tmp.querySelector('a[href*="file.php"]');
  if (link) {
    const text = (link.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

// Renders a vote button's visible state (icon/label/classes/aria) for
// either row-table buttons or the detail-modal button, so IdeaVotes(),
// unvoteIdea(), and initial row rendering all produce an identical result
// and never drift out of sync with each other.
function voteButtonStateHtml(recordID, isVoted, isOwn, hasVoteRecordId) {
  const unavailable = isVoted && !isOwn && !hasVoteRecordId;
  if (isOwn) {
    return {
      classes: "is-own",
      disabled: true,
      ariaLabel: "You can't vote on your own idea",
      title: "You can't vote on your own idea",
      icon: "thumb_up",
      label: "Your idea",
    };
  }
  if (unavailable) {
    return {
      classes: "is-voted is-unavailable",
      disabled: true,
      ariaLabel: "Vote recorded, but could not be loaded for removal — refresh and try again",
      title: "Vote record not found — refresh and try again",
      icon: "thumb_up",
      label: "Voted",
    };
  }
  if (isVoted) {
    return {
      classes: "is-voted",
      disabled: false,
      ariaLabel: `Remove your vote for idea ${recordID}`,
      title: "Click to remove your vote",
      icon: "thumb_up",
      label: "Voted",
    };
  }
  return {
    classes: "",
    disabled: false,
    ariaLabel: `Vote for idea ${recordID}`,
    title: "Vote for this idea",
    icon: "thumb_up",
    label: "",
  };
}

function buildDetailSkeleton(
  recordID,
  title,
  votes,
  isVoted,
  statusLabel,
  isOwn = false,
  isDraft = false,
  hasVoteRecordId = true,
  needsSubmit = false,
) {  const voteState = voteButtonStateHtml(recordID, isVoted, isOwn, hasVoteRecordId);
  const votesText = `${escapeHtml(String(votes))} ${votes === 1 ? "vote" : "votes"}`;
  // "Submit" / "Retry Submit" action — only shown for the submitter's own
  // record when it still needs a submit action (fresh draft, or a
  // previously-attempted submission whose workflow step failed). Reuses
  // the existing edit-form + NewIdea(true) submit path rather than a
  // separate submit-as-is endpoint.
  const submitBtnHtml =
    isOwn && needsSubmit
      ? `<button type="button"
        class="ip-btn ip-btn--primary"
        data-detail-submit-draft="${escapeHtml(recordID)}"
        aria-label="${isDraft ? `Continue editing and submit idea #${escapeHtml(recordID)}` : `Retry submitting idea #${escapeHtml(recordID)} — a previous submission didn't fully complete`}">
        ${iconSvg("send")}
        ${isDraft ? "Submit" : "Retry Submit"}
      </button>`
      : "";
  return `<div class="ip-detail" id="ipDetailRoot">

    <!-- Title row: #ID + h2 side by side -->
    <div class="ip-detail__title-row">
      <span class="ip-detail__id" aria-label="Idea number ${escapeHtml(recordID)}">#${escapeHtml(recordID)}</span>
      <h2 class="ip-detail__title" id="ip-detail-title" tabindex="-1">${escapeHtml(title || "Idea Details")}</h2>
    </div>

    <!-- Info row: Status · Votes -->
    <div class="ip-detail__info-row" role="group" aria-label="Idea metadata">
      ${statusLabel ? `<span class="ip-detail__info-item"><span class="ip-detail__info-label">Status</span><span class="ip-detail__info-val ip-detail__info-val--status" id="ip-detail-status-text">${escapeHtml(statusLabel)}</span></span><span class="ip-detail__info-sep" aria-hidden="true">·</span>` : ""}
      <span class="ip-detail__info-item"><span class="ip-detail__info-label">Votes</span><span class="ip-detail__info-val ip-detail__info-val--votes" id="ip-detail-votes-text">${iconSvg("thumb_up")}${votesText}</span></span>
    </div>

    <section class="ip-detail__card" aria-labelledby="ip-dl-6">
      <span class="ip-detail__card-label" id="ip-dl-6">Detailed Summary</span>
      <div class="ip-detail__card-body" id="ip-dv-6"><span class="ip-detail__loading">Loading\u2026</span></div>
    </section>
    <div class="ip-detail__two-col">
      <section class="ip-detail__card" aria-labelledby="ip-dl-7">
        <span class="ip-detail__card-label" id="ip-dl-7">Benefit</span>
        <div class="ip-detail__card-body" id="ip-dv-7"><span class="ip-detail__loading">Loading\u2026</span></div>
      </section>
      <section class="ip-detail__card" aria-labelledby="ip-dl-8">
        <span class="ip-detail__card-label" id="ip-dl-8">Category</span>
        <div class="ip-detail__card-body" id="ip-dv-8"><span class="ip-detail__loading">Loading\u2026</span></div>
        <div id="ip-dv-subq-13" hidden>
          <div class="ip-detail__sub-card" aria-labelledby="ip-dl-13">
            <span class="ip-detail__card-label" id="ip-dl-13">Please specify category</span>
            <div class="ip-detail__card-body" id="ip-dv-13"></div>
          </div>
        </div>
        <hr class="ip-detail__divider" role="separator" />
        <span class="ip-detail__card-label" id="ip-dl-9">Impact</span>
        <div class="ip-detail__card-body" id="ip-dv-9"><span class="ip-detail__loading">Loading\u2026</span></div>
      </section>
    </div>
    <section class="ip-detail__card" aria-labelledby="ip-dl-21">
      <span class="ip-detail__card-label" id="ip-dl-21">Have you implemented this idea on your LEAF site?</span>
      <div class="ip-detail__card-body" id="ip-dv-21"><span class="ip-detail__loading">Loading\u2026</span></div>
      <div id="ip-dv-subq-22" hidden>
        <div class="ip-detail__sub-card" aria-labelledby="ip-dl-22">
          <span class="ip-detail__card-label" id="ip-dl-22">LEAF site URL</span>
          <div class="ip-detail__card-body" id="ip-dv-22"></div>
        </div>
      </div>
    </section>
    <section class="ip-detail__card" aria-labelledby="ip-dl-10">
      <span class="ip-detail__card-label" id="ip-dl-10">Attachments</span>
      <div id="ip-dv-10" aria-live="polite"><span class="ip-detail__loading">Loading\u2026</span></div>
    </section>

    <!-- Actions -->
    <div class="ip-detail__actions" role="group" aria-label="Idea actions">
      <span class="ip-detail__meta-label">Actions</span>
      ${submitBtnHtml}
      ${
        isDraft
          ? ""
          : `<button type="button"
        class="ip-upvote${voteState.classes ? " " + voteState.classes : ""}"
        data-detail-vote="${escapeHtml(recordID)}"
        aria-label="${escapeHtml(voteState.ariaLabel)}"
        title="${escapeHtml(voteState.title)}"
        ${voteState.disabled ? "disabled" : ""}>
        <span class="material-symbols-outlined" aria-hidden="true">${voteState.icon}</span>${voteState.label ? ` ${voteState.label}` : ""}
      </button>
      <button type="button"
        class="ip-share"
        data-record-link="${escapeHtml(RECORD_VIEW_URL + recordID)}"
        aria-label="Copy link to idea #${escapeHtml(recordID)}"
        title="Copy shareable link">
        <span class="material-symbols-outlined" aria-hidden="true">share</span>
        Share
      </button>`
      }
    </div>
  </div>`;
}

async function populateDetailField(recordID, indicatorID, opts = {}) {
  const el = document.getElementById(`ip-dv-${indicatorID}`);
  if (!el) return;
  try {
    const html = await fetchIndicator(recordID, indicatorID);
    const value = extractCleanValue(html, indicatorID);
    if (opts.isAttachment) {
      el.innerHTML = renderAttachmentsHTML(html);
      return;
    }
    if (!value) {
      el.innerHTML = `<span class="ip-detail__empty">Not provided</span>`;
    } else if (opts.renderHtml) {
      el.innerHTML = opts.renderHtml(value);
    } else el.textContent = value;
    if (opts.onValue) opts.onValue(value);
  } catch {
    el.innerHTML = `<span class="ip-detail__empty">Could not load this field.</span>`;
  }
}

async function openIdeaDetailModal(recordID, title, openTabUrl) {
  const modal = document.getElementById("ipRecordModal");
  const body = document.getElementById("ipRecordModalBody");
  const header = document.getElementById("ipRecordModalTitle");
  const openBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal || !body) return;

  const ridStr = String(recordID);
  const vm = ideasVMById?.[ridStr];
  const rawIdea = ideasById?.[ridStr];
  const votes = vm?.votes ?? voteCounts[ridStr] ?? 0;
  const isVoted = userVotes[ridStr] === true;
  const statusLabel = vm?.status || (rawIdea ? resolveDisplayStatus(rawIdea) : "");
  const isDraft = rawIdea ? !isSubmittedIdea(rawIdea) : statusLabel === "Draft";
  const needsSubmit = vm?.needsSubmit ?? (rawIdea ? needsSubmitAction(rawIdea) : isDraft);
  const isOwn =
    vm?.isOwn === true ||
    Boolean(
      userID &&
      ideaOwnerMap[ridStr] &&
      String(ideaOwnerMap[ridStr]) === String(userID),
    );

  if (header) header.textContent = title || "Idea Details";
  if (openBtn) {
    openBtn.setAttribute("data-url", openTabUrl || "");
    openBtn.hidden = !openTabUrl;
  }

  body.innerHTML = buildDetailSkeleton(
    ridStr,
    title,
    votes,
    isVoted,
    statusLabel,
    isOwn,
    isDraft,
    Boolean(myVoteRecordIdByIdea[ridStr]),
    needsSubmit,
  );

  body
    .querySelector("[data-detail-vote]")
    ?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (btn.disabled || votingInProgress) return;
      if (userVotes[ridStr] === true) {
        await unvoteIdea(ridStr);
      } else {
        await IdeaVotes(ridStr);
      }
      const newVoted = userVotes[ridStr] === true;
      const newCount = voteCounts[ridStr] || 0;
      const state = voteButtonStateHtml(
        ridStr,
        newVoted,
        isOwn,
        Boolean(myVoteRecordIdByIdea[ridStr]),
      );
      btn.className = `ip-upvote${state.classes ? " " + state.classes : ""}`;
      btn.disabled = state.disabled;
      btn.setAttribute("aria-label", state.ariaLabel);
      btn.setAttribute("title", state.title);
      btn.innerHTML = `${iconSvg(state.icon)}${state.label ? ` ${state.label}` : ""}`;
      const votesText = body.querySelector("#ip-detail-votes-text");
      if (votesText) {
        votesText.innerHTML = `${iconSvg("thumb_up")}${newCount} ${newCount === 1 ? "vote" : "votes"}`;
      }
    });

  body
    .querySelector("[data-detail-submit-draft]")
    ?.addEventListener("click", async () => {
      closeRecordModal({ skipRefresh: true });
      await openDraftForEditing(ridStr);
    });

  lastRecordFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  document.getElementById("ipRecordModalCloseBtn")?.focus();

  await Promise.allSettled([
    populateDetailField(ridStr, 5, {
      onValue(val) {
        const h2 = document.getElementById("ip-detail-title");
        if (h2 && val) h2.textContent = val;
        if (header && val) header.textContent = val;
      },
    }),
    populateDetailField(ridStr, 6),
    populateDetailField(ridStr, 7),
    populateDetailField(ridStr, 8, {
      renderHtml(val) {
        return renderCategoryPills(parseCategoryValue(val));
      },
      onValue(val) {
        const cats = parseCategoryValue(val).map((c) => c.toLowerCase());
        if (cats.includes("other")) {
          populateDetailField(ridStr, 13, {
            onValue(subVal) {
              if (subVal && subVal.trim()) {
                const subq = document.getElementById("ip-dv-subq-13");
                if (subq) subq.removeAttribute("hidden");
              }
            },
          });
        }
      },
    }),
    populateDetailField(ridStr, 9),
    populateDetailField(ridStr, 21, {
      onValue(val) {
        if (val.trim().toLowerCase() === "yes") {
          populateDetailField(ridStr, 22, {
            renderHtml(url) {
              const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
              return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="ip-detail__link">${escapeHtml(url)}</a>`;
            },
            onValue(subVal) {
              if (subVal && subVal.trim()) {
                const subq = document.getElementById("ip-dv-subq-22");
                if (subq) subq.removeAttribute("hidden");
              }
            },
          });
        }
      },
    }),
    populateDetailField(ridStr, 10, { isAttachment: true }),
  ]);
}

function closeRecordModal(opts = {}) {
  const modal = document.getElementById("ipRecordModal");
  const body = document.getElementById("ipRecordModalBody");
  const openBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal) return;
  if (body) body.innerHTML = "";
  if (openBtn) openBtn.setAttribute("data-url", "");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  delete modal.dataset.focusTrap;
  setBackgroundHidden(false);
  lastRecordFocusedElement?.focus();
  lastRecordFocusedElement = null;
  if (opts.skipRefresh) return;
  loadIdeasAndVotes().catch((err) =>
    console.warn("[RecordModal] silent refresh failed:", err),
  );
}

function bindRecordModal() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a.ip-recordLink");
    if (link) {
      e.preventDefault();
      const href = link.getAttribute("href") || "";
      const recordID =
        link.getAttribute("data-record-id") ||
        href.split("recordID=")[1]?.split("&")[0] ||
        "";
      const title = link.getAttribute("data-title") || "Idea Details";
      const votedModal = document.getElementById("ipVotedModal");
      if (votedModal?.classList.contains("is-open")) {
        votedModal.classList.remove("is-open");
        votedModal.setAttribute("aria-hidden", "true");
        delete votedModal.dataset.focusTrap;
      }
      if (recordID) openIdeaDetailModal(recordID, title, href);
      return;
    }
  });
  document
    .getElementById("ipRecordModalCloseBtn")
    ?.addEventListener("click", () => closeRecordModal());
  document
    .getElementById("ipRecordModalOpenTabBtn")
    ?.addEventListener("click", function () {
      const url = this.getAttribute("data-url") || "";
      if (url) window.open(url, "_blank", "noopener");
    });
  document.getElementById("ipRecordModal")?.addEventListener("click", (e) => {
    if (e.target?.getAttribute("data-ip-record-close") === "1")
      closeRecordModal();
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      document.getElementById("ipRecordModal")?.classList.contains("is-open")
    )
      closeRecordModal();
  });
}

/* ─────────────────────────────────────────────────────────────
   Data helpers
───────────────────────────────────────────────────────────── */

function getIdeaField(idea, s1Key, fallbackKey) {
  if (idea?.s1?.[s1Key] !== undefined) return idea.s1[s1Key];
  if (fallbackKey && idea?.[fallbackKey] !== undefined)
    return idea[fallbackKey];
  return "";
}

function normalizeStatusLabel(status) {
  if (!status) return "";
  return status.replace(/[()]/g, "").trim();
}

function canonicalStatusKey(statusRaw) {
  const s = normalizeStatusLabel(sanitizeLeafValue(statusRaw)).toLowerCase();
  if (!s) return "";
  if (statusOptionsList.length) {
    const exact = statusOptionsList.find(
      (opt) => normalizeStatusLabel(opt).toLowerCase() === s,
    );
    if (exact) {
      const norm = normalizeStatusLabel(exact).toLowerCase();
      if (["new submission", "submitted", "new"].includes(norm)) return "new";
      if (["under review", "review", "in review"].includes(norm))
        return "review";
      if (["in progress", "progress", "working"].includes(norm))
        return "progress";
      if (["completed", "complete", "implemented", "done"].includes(norm))
        return "completed";
      if (["already exists", "already_exist", "exists"].includes(norm))
        return "already_exists";
      if (["duplicate", "dupe"].includes(norm)) return "duplicate";
      if (["discarded"].includes(norm)) return "discarded";
      return norm;
    }
  }
  if (["new submission", "submitted", "new"].includes(s)) return "new";
  if (["under review", "review", "in review"].includes(s)) return "review";
  if (["in progress", "progress", "working"].includes(s)) return "progress";
  if (["completed", "complete", "implemented", "done"].includes(s))
    return "completed";
  if (["already exists", "already_exist", "exists"].includes(s))
    return "already_exists";
  if (["duplicate", "dupe"].includes(s)) return "duplicate";
  if (["discarded"].includes(s)) return "discarded";
  return s;
}

function getIdeaStatusRaw(idea) {
  return getIdeaField(idea, IDEA_INDICATORS.status, "status");
}

function isSubmittedIdea(idea) {
  const dateSubmitted = sanitizeLeafValue(
    getIdeaField(
      idea,
      `id${IDEA_FIELDS.date_submitted}`,
      "date_submitted",
    ),
  );
  return Boolean(dateSubmitted);
}

// Tracks recordIDs where writeDateSubmitted() succeeded (date_submitted
// was written) but advanceWorkflow()'s /apply call failed in the SAME
// browser session. Populated live in NewIdea(); does not persist across
// page loads.
let workflowIncompleteRecordIds = new Set();

function needsSubmitAction(idea) {
  if (!isSubmittedIdea(idea)) return true;
  const recordID = idea?.recordID ? String(idea.recordID) : "";
  return recordID ? workflowIncompleteRecordIds.has(recordID) : false;
}

function buildIdeaViewModel(idea) {
  if (!idea?.recordID) return null;
  const recordID = String(idea.recordID);
  const title = sanitizeLeafValue(
    getIdeaField(idea, IDEA_INDICATORS.title, "title"),
  );
  const categoryRaw = sanitizeLeafValue(
    getIdeaField(idea, IDEA_INDICATORS.category, "category"),
  );
  const categories = parseCategoryValue(categoryRaw);
  const category = categories.join(", ");
  const status = resolveDisplayStatus(idea);
  const votes = voteCounts[recordID] || 0;
  const isVoted = userVotes[recordID] === true;
  const isOwn = Boolean(
    userID && idea.userID && String(idea.userID) === String(userID),
  );
  return {
    recordID,
    title,
    category,
    categories,
    status,
    votes,
    isVoted,
    isOwn,
    isDraft: !isSubmittedIdea(idea),
    needsSubmit: needsSubmitAction(idea),
    created_date: idea.created_date || "",
    recordLink: `${RECORD_VIEW_URL}${recordID}`,
  };
}

function buildIdeasViewModelList(rawIdeas, updateMaps = false) {
  const list = [];
  const vmMap = {};
  if (updateMaps) {
    ideasById = {};
    ideaOwnerMap = {};
  }

  (rawIdeas || []).forEach((idea) => {
    const vm = buildIdeaViewModel(idea);
    if (!vm) return;
    list.push(vm);
    vmMap[vm.recordID] = vm;
    if (updateMaps) {
      ideasById[vm.recordID] = idea;
      ideaOwnerMap[vm.recordID] = idea.userID || "";
    }
  });

  if (updateMaps) ideasVMById = vmMap;
  return list;
}

/* ─────────────────────────────────────────────────────────────
   Sort
───────────────────────────────────────────────────────────── */

function getIdeaSortValue(idea, key) {
  switch (key) {
    case "id":
      return Number(idea.recordID) || 0;
    case "title":
      return String(idea.title || "");
    case "category":
      return String(idea.category || "");
    case "status":
      return String(normalizeStatusLabel(idea.status || ""));
    case "votes":
      return typeof idea.votes === "number"
        ? idea.votes
        : voteCounts[idea.recordID] || 0;
    default:
      return "";
  }
}

function sortIdeasList(list, stateObj) {
  if (!stateObj?.key) return list;
  const dir = stateObj.dir === "desc" ? -1 : 1;
  return [...list.filter((i) => i?.recordID)].sort((a, b) => {
    const av = getIdeaSortValue(a, stateObj.key);
    const bv = getIdeaSortValue(b, stateObj.key);
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * dir;
    return (
      String(av).localeCompare(String(bv), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * dir
    );
  });
}

function setSortState(tableId, key) {
  const s = sortState[tableId] || { key: "", dir: "asc" };
  s.dir = s.key === key ? (s.dir === "asc" ? "desc" : "asc") : "asc";
  s.key = key;
  sortState[tableId] = s;
}

function applySortClasses(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const s = sortState[tableId];
  table.querySelectorAll(".ip-sortable").forEach((th) => {
    th.classList.remove("is-asc", "is-desc");
    const key = th.querySelector(".ip-sortBtn")?.getAttribute("data-sort");
    if (s && key === s.key) {
      th.classList.add(s.dir === "asc" ? "is-asc" : "is-desc");
      th.setAttribute(
        "aria-sort",
        s.dir === "asc" ? "ascending" : "descending",
      );
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   Row builder
───────────────────────────────────────────────────────────── */

const STATUS_BADGE_CLASS_BY_KEY = {
  new: "ip-badge--new",
  review: "ip-badge--review",
  progress: "ip-badge--progress",
  completed: "ip-badge--done",
  already_exists: "ip-badge--done",
  duplicate: "ip-badge--discarded",
  discarded: "ip-badge--discarded",
  draft: "ip-badge--draft",
};

function getStatusBadgeClass(status) {
  if (!status) return STATUS_BADGE_CLASS_BY_KEY.draft;
  if (status === "Draft") return STATUS_BADGE_CLASS_BY_KEY.draft;
  const key = canonicalStatusKey(status);
  return STATUS_BADGE_CLASS_BY_KEY[key] || "";
}

function buildIdeaRow(idea) {
  if (!idea?.recordID) return "";
  const recordID = String(idea.recordID);
  const titleRaw = idea.title || "";
  const title = escapeHtml(titleRaw);
  const titleDisplay = title;
  const category = renderCategoryPills(
    idea.categories && idea.categories.length ? idea.categories : idea.category,
  );

  const statusLabel = idea.status || "Draft";
  const statusBadgeClass = getStatusBadgeClass(statusLabel);
  const statusMarkup = `<span class="ip-badge ${statusBadgeClass}">${statusLabel}</span>`;

  const votes = idea.votes || 0;
  const isVoted = idea.isVoted === true;
  const isOwn = idea.isOwn === true;
  const isDraft = idea.isDraft === true;
  const needsSubmit = idea.needsSubmit === true;
  const recordLink = idea.recordLink || `${RECORD_VIEW_URL}${recordID}`;
  const labelTitle = title || `Idea ${recordID}`;
  const hasVoteRecordId = Boolean(myVoteRecordIdByIdea[recordID]);
  const voteState = voteButtonStateHtml(recordID, isVoted, isOwn, hasVoteRecordId);

  // Share button markup — only ever rendered for non-draft rows now (see
  // votingAndSharingHtml below, which omits both Vote and Share entirely
  // for drafts), so this no longer needs its own disabled/draft branch.
  const shareBtnHtml = `<button class="ip-share"
        data-record-link="${escapeHtml(recordLink)}"
        aria-label="Copy link for ${labelTitle}"
        title="Copy shareable link">
        ${iconSvg("share")}
        Share
      </button>`;

  // Submit action — shown for the current user's own drafts, AND for
  // records that were marked submitted (date_submitted written) but
  // whose workflow /apply step failed earlier in this session.
  const submitBtnHtml =
    isOwn && needsSubmit
      ? `<button class="ip-btn ip-btn--primary ip-submitDraftBtn"
          data-submit-draft-id="${recordID}"
          aria-label="${isDraft ? `Continue editing and submit ${labelTitle}` : `Retry submitting ${labelTitle} — a previous submission didn't fully complete`}">
          ${iconSvg("send")}
          ${isDraft ? "Submit" : "Retry Submit"}
        </button>`
      : "";

  // Draft rows show ONLY the Submit action — no Vote, no Share. A draft
  // isn't a real, visible-to-others idea yet, so voting or sharing it
  // doesn't make sense; previously Share was disabled-but-visible and
  // Vote was fully enabled even on the owner's own unsubmitted draft.
  const votingAndSharingHtml = isDraft
    ? ""
    : `        <button class="ip-upvote${voteState.classes ? " " + voteState.classes : ""}"
          data-record-id="${recordID}"
          ${voteState.disabled ? "disabled" : ""}
          aria-label="${escapeHtml(voteState.ariaLabel)}"
          aria-disabled="${voteState.disabled}"
          title="${escapeHtml(voteState.title)}">
          ${iconSvg(voteState.icon)}${voteState.label ? ` ${voteState.label}` : ""}
        </button>
        ${shareBtnHtml}`;

  return `
    <tr data-record-id="${recordID}">
      <td data-label="ID">
        <a class="ip-recordLink"
           data-record-id="${recordID}"
           data-title="${title}"
           aria-haspopup="dialog"
           href="${escapeHtml(recordLink)}">#${recordID}</a>
      </td>
      <td class="ip-col-title ip-cardHeading" title="${title}">
        <a class="ip-recordLink ip-recordLink--title"
           data-record-id="${recordID}"
           data-title="${title}"
           aria-haspopup="dialog"
           href="${escapeHtml(recordLink)}">${titleDisplay || `Idea ${recordID}`}</a>
      </td>
      <td data-label="Category">${category}</td>
      <td data-label="Status">${statusMarkup}</td>
      <td class="ip-votes" data-label="Votes">${votes}</td>
      <td class="ip-actionsCell" data-label="Actions">
        ${submitBtnHtml}
        ${votingAndSharingHtml}
        ${!submitBtnHtml && !votingAndSharingHtml ? `<span class="ip-actionsEmpty">No actions available</span>` : ""}
      </td>
    </tr>`;
}

/* ─────────────────────────────────────────────────────────────
   Filter
───────────────────────────────────────────────────────────── */

function getIdeaSearchText(idea) {
  return [
    idea.recordID ? String(idea.recordID) : "",
    idea.title || "",
    idea.category || "",
    normalizeStatusLabel(idea.status || ""),
  ]
    .join(" ")
    .toLowerCase();
}

function filterIdeasList(list, query) {
  let filtered = list;
  if (state.categoryFilter && state.categoryFilter !== "all") {
    filtered = filtered.filter((i) => {
      const cats =
        i.categories && i.categories.length
          ? i.categories
          : [(i.category || "").trim() || "Uncategorized"];
      return cats.includes(state.categoryFilter);
    });
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((i) => getIdeaSearchText(i).includes(q));
  }
  return filtered;
}

/* ─────────────────────────────────────────────────────────────
   Pagination
───────────────────────────────────────────────────────────── */

function paginateList(list, page, pageSize, showAll) {
  if (showAll) return { pageItems: list, pageCount: 1, page: 1 };
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: list.slice(start, start + pageSize),
    pageCount,
    page: safePage,
  };
}

function renderRows(tbody, rowsHtml, emptyMessage) {
  if (!tbody) return;
  tbody.innerHTML = rowsHtml || `<tr><td colspan="6">${emptyMessage}</td></tr>`;
}

function renderTableMessage(tbody, message, opts = {}) {
  if (!tbody) return;
  const btn = opts.retry
    ? ` <button type="button" class="ip-btn ip-btn--ghost ip-retry">Retry</button>`
    : "";
  tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(message || "")}${btn}</td></tr>`;
}

function updatePaginationUI(
  scope,
  totalCount,
  pageCount,
  page,
  showAll,
  allowToggle,
) {
  const container = ui.pagination[scope];
  if (!container) return;
  if (totalCount < PAGE_SIZE) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const prevBtn = container.querySelector('[data-page-action="prev"]');
  const nextBtn = container.querySelector('[data-page-action="next"]');
  const toggleBtn = container.querySelector('[data-page-action="toggle"]');

  if (prevBtn) prevBtn.disabled = showAll || page <= 1;
  if (nextBtn) nextBtn.disabled = showAll || page >= pageCount;
  if (ui.pageInfo[scope])
    ui.pageInfo[scope].textContent = `Page ${page} of ${pageCount}`;
  if (toggleBtn) {
    toggleBtn.hidden = !allowToggle;
    toggleBtn.textContent = showAll ? "Show pages" : "Show all";
    toggleBtn.setAttribute("aria-pressed", showAll ? "true" : "false");
  }
  if (ui.pageHint[scope]) {
    ui.pageHint[scope].textContent = showAll
      ? "Showing all results. Large lists may be slow."
      : `Showing ${PAGE_SIZE} per page.`;
  }
}

/* ─────────────────────────────────────────────────────────────
   Render panels
───────────────────────────────────────────────────────────── */

function renderAllIdeas() {
  const filtered = filterIdeasList(ideas, state.search);
  const sorted = sortIdeasList(filtered, sortState.tblIdeas);
  applySortClasses("tblIdeas");

  const shouldPaginate = sorted.length >= PAGE_SIZE;
  if (!shouldPaginate) {
    state.pagination.all.showAll = true;
    state.pagination.all.page = 1;
  }
  const showAll = shouldPaginate ? state.pagination.all.showAll : true;
  const pagination = paginateList(
    sorted,
    state.pagination.all.page,
    PAGE_SIZE,
    showAll,
  );
  state.pagination.all.page = pagination.page;

  renderRows(
    ui.results,
    pagination.pageItems.map(buildIdeaRow).join(""),
    state.search ? "No matching ideas." : "No data found",
  );
  updatePaginationUI(
    "all",
    sorted.length,
    pagination.pageCount,
    pagination.page,
    showAll,
    shouldPaginate,
  );
}

function renderMyIdeas() {
  // Apply the same category filter used by All Ideas, now that category
  // filtering is confirmed to apply to My Ideas too — previously
  // myIdeasCache was sorted but never filtered by state.categoryFilter at
  // all, so even once the re-render bug above is fixed, selecting a
  // category here would still show every personal idea regardless of
  // category. filterIdeasList() also applies state.search, which My
  // Ideas already has its own separate search box for (bindMySearch()) —
  // that box filters via direct DOM row hiding rather than state.search,
  // so passing "" here avoids double-filtering against unrelated state.
  const filteredByCategory = filterIdeasList(myIdeasCache, "");
  const sorted = sortIdeasList(filteredByCategory, sortState.tblMyIdeas);
  applySortClasses("tblMyIdeas");

  const shouldPaginate = sorted.length >= PAGE_SIZE;
  if (!shouldPaginate) {
    state.pagination.my.showAll = true;
    state.pagination.my.page = 1;
  }
  const showAll = shouldPaginate ? state.pagination.my.showAll : true;
  const pagination = paginateList(
    sorted,
    state.pagination.my.page,
    PAGE_SIZE,
    showAll,
  );
  state.pagination.my.page = pagination.page;

  renderRows(
    ui.myResults,
    pagination.pageItems.map(buildIdeaRow).join(""),
    myIdeasCache.length
      ? "No ideas match the selected category."
      : "No ideas submitted",
  );
  updatePaginationUI(
    "my",
    sorted.length,
    pagination.pageCount,
    pagination.page,
    showAll,
    shouldPaginate,
  );
}

function renderTop10Ideas() {
  if (!ui.topResults) return;
  let top10 = [...ideas]
    .filter((i) => i?.recordID)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 10);
  if (sortState.tblTopIdeas.key)
    top10 = sortIdeasList(top10, sortState.tblTopIdeas);
  applySortClasses("tblTopIdeas");
  renderRows(ui.topResults, top10.map(buildIdeaRow).join(""), "No data found");
}

/* ─────────────────────────────────────────────────────────────
   Vote state helpers
───────────────────────────────────────────────────────────── */

function setVoteButtonsDisabled(isDisabled) {
  document.querySelectorAll(".ip-upvote").forEach((btn) => {
    if (btn.classList.contains("is-own") || btn.classList.contains("is-unavailable")) {
      return;
    }
    if (isDisabled) {
      btn.dataset.loadingDisabled = "true";
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    } else if (btn.dataset.loadingDisabled === "true") {
      btn.disabled = false;
      btn.setAttribute("aria-disabled", "false");
      delete btn.dataset.loadingDisabled;
    }
  });
}

function setVotedState(recordID, isVoted, opts = {}) {
  const key = String(recordID);
  const hasVoteRecordId = Boolean(myVoteRecordIdByIdea[key]);
  document
    .querySelectorAll(`.ip-upvote[data-record-id="${key}"]`)
    .forEach((btn) => {
      const isOwn = btn.classList.contains("is-own");
      const state = voteButtonStateHtml(key, isVoted, isOwn, hasVoteRecordId);
      btn.className = `ip-upvote${state.classes ? " " + state.classes : ""}`;
      btn.disabled = state.disabled;
      btn.setAttribute("aria-disabled", state.disabled ? "true" : "false");
      btn.setAttribute("aria-label", state.ariaLabel);
      btn.setAttribute("title", state.title);
      btn.innerHTML = `${iconSvg(state.icon)}${state.label ? ` ${state.label}` : ""}`;
    });
}

function updateVoteDom(recordID, isVoted = true) {
  const key = String(recordID);

  [
    ideasVMById[key],
    myIdeasCache.find((i) => String(i.recordID) === key),
  ].forEach((item) => {
    if (!item) return;
    item.votes = voteCounts[key] || 0;
    item.isVoted = isVoted;
  });

  document
    .querySelectorAll(`tr[data-record-id="${key}"] .ip-votes`)
    .forEach((cell) => {
      cell.textContent = voteCounts[key] || 0;
    });
  setVotedState(key, isVoted);
}

/* ─────────────────────────────────────────────────────────────
   Voter email resolution — orgchart API → userID fallback
───────────────────────────────────────────────────────────── */

function isRealEmail(str) {
  return typeof str === "string" && str.includes("@") && !str.includes("<!--");
}

async function resolveVoterEmail() {
  if (!userID) return;
  try {
    const res = await fetch(
      `/platform/orgchart/api/employee/search?q=userName:${encodeURIComponent(userID)}&noLimit=0&_=${Date.now()}`,
      { credentials: "same-origin" },
    );
    if (res.ok) {
      const data = await res.json();
      const employees = Array.isArray(data) ? data : Object.values(data || {});
      const match = employees.find(
        (e) =>
          e &&
          (e.userName === userID || e.userName === userID.split("\\").pop()),
      );
      const email = match?.Email || match?.email || "";
      if (isRealEmail(email)) {
        resolvedVoterEmail = email;
        return;
      }
    }
  } catch (err) {
    console.warn("[resolveVoterEmail] orgchart API failed:", err);
  }
  resolvedVoterEmail = userID;
  console.warn(
    "[resolveVoterEmail] Could not resolve email; falling back to userID",
  );
}

/* ─────────────────────────────────────────────────────────────
   Vote submit
───────────────────────────────────────────────────────────── */

async function IdeaVotes(recordID) {
  const key = String(recordID);
  if (votingInProgress) return;
  if (userVotes[key]) {
    showToast("You already voted on this idea.", true);
    return;
  }
  if (
    userID &&
    ideaOwnerMap[key] &&
    String(ideaOwnerMap[key]) === String(userID)
  ) {
    showToast("You can't vote on your own idea.", true);
    return;
  }

  votingInProgress = true;
  userVotes[key] = true;
  setVotedState(key, true);

  const payload = {
    service: "",
    title: `Idea #${key}`,
    priority: 0,
    CSRFToken: csrfToken,
    [`numform_${FORM_KEYS.votes}`]: 1,
    [VOTE_FIELDS.user]: resolvedVoterEmail || userID,
    [VOTE_FIELDS.idea]: key,
  };

  try {
    const response = await apiPostJson("./api/?a=form/new", payload);
    const newID = parseFloat(response);

    if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
      voteCounts[key] = (voteCounts[key] || 0) + 1;
      myVoteRecordIdByIdea[key] = String(newID);
      updateVoteDom(key, true);
      renderTop10Ideas();
      if (sortState.tblIdeas.key === "votes") renderAllIdeas();
      if (sortState.tblMyIdeas.key === "votes") renderMyIdeas();

      try {
        localStorage.setItem("leafIdeaVotes", JSON.stringify(userVotes));
      } catch {}

      const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);
      renderStatsStrip(ideas.length, implementedCount, totalVotes);
      showToast("Thanks for voting!");
      updateMyActivity(myIdeasCache.length, getAvailableVotedCount());
    } else {
      throw new Error(`Unexpected response: ${response}`);
    }
  } catch (err) {
    console.error("[IdeaVotes] error:", err);
    showToast("Error processing vote. Please try again.", true);
    userVotes[key] = false;
    delete myVoteRecordIdByIdea[key];
    [
      ideasVMById[key],
      myIdeasCache.find((i) => String(i.recordID) === key),
    ].forEach((item) => {
      if (item) item.isVoted = false;
    });
    setVotedState(key, false);
  } finally {
    votingInProgress = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Vote delete (un-vote)
   CONFIRMED WORKING: POST ./api/form/{recordID} with deleted=1 returns
   HTTP 200 and the UI correctly reflects the removed vote (count
   decrements, button reverts) on this LEAF instance.
───────────────────────────────────────────────────────────── */

async function deleteVoteRecord(voteRecordID) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    recordID: String(voteRecordID),
    series: "1",
    deleted: "1",
  });

  try {
    const res = await fetch(`./api/form/${encodeURIComponent(voteRecordID)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body.toString(),
    });
    return res.ok;
  } catch (err) {
    console.warn("[UnVote] ❌ Network error deleting vote record:", err);
    return false;
  }
}

async function unvoteIdea(recordID) {
  const key = String(recordID);
  if (votingInProgress) return;
  if (!userVotes[key]) return;

  const voteRecordID = myVoteRecordIdByIdea[key];
  if (!voteRecordID) {
    console.warn(
      `[UnVote] No tracked vote record ID for idea ${key} — cannot un-vote. userVotes[key]=${userVotes[key]}, myVoteRecordIdByIdea keys=${Object.keys(myVoteRecordIdByIdea).join(",")}`,
    );
    showToast(
      "Couldn't find your vote record to remove it. Try refreshing the page.",
      true,
    );
    return;
  }

  votingInProgress = true;

  const previousCount = voteCounts[key] || 0;
  voteCounts[key] = Math.max(0, previousCount - 1);
  userVotes[key] = false;
  updateVoteDom(key, false);
  renderTop10Ideas();
  if (sortState.tblIdeas.key === "votes") renderAllIdeas();
  if (sortState.tblMyIdeas.key === "votes") renderMyIdeas();
  const totalVotesOptimistic = Object.values(voteCounts).reduce(
    (s, n) => s + n,
    0,
  );
  renderStatsStrip(ideas.length, implementedCount, totalVotesOptimistic);
  updateMyActivity(myIdeasCache.length, getAvailableVotedCount());

  try {
    const success = await deleteVoteRecord(voteRecordID);
    if (!success) throw new Error("Delete request was not accepted");

    delete myVoteRecordIdByIdea[key];
    try {
      localStorage.setItem("leafIdeaVotes", JSON.stringify(userVotes));
    } catch {}

    if (
      document.getElementById("ipVotedModal")?.classList.contains("is-open")
    ) {
      votedModalState.allRows = votedModalState.allRows.filter(
        (row) => row.id !== key,
      );
      renderVotedTable();
    }

    const detailVoteBtn = document.querySelector(
      `[data-detail-vote="${key}"]`,
    );
    if (detailVoteBtn) {
      const state = voteButtonStateHtml(key, false, false, false);
      detailVoteBtn.className = `ip-upvote${state.classes ? " " + state.classes : ""}`;
      detailVoteBtn.disabled = state.disabled;
      detailVoteBtn.setAttribute("aria-label", state.ariaLabel);
      detailVoteBtn.innerHTML = `${iconSvg(state.icon)}${state.label ? ` ${state.label}` : ""}`;
      const votesText = document.getElementById("ip-detail-votes-text");
      if (votesText) {
        const newCount = voteCounts[key] || 0;
        votesText.innerHTML = `${iconSvg("thumb_up")}${newCount} ${newCount === 1 ? "vote" : "votes"}`;
      }
    }

    showToast("Your vote has been removed.");
  } catch (err) {
    console.error("[unvoteIdea] error:", err);
    voteCounts[key] = previousCount;
    userVotes[key] = true;
    updateVoteDom(key, true);
    renderTop10Ideas();
    if (sortState.tblIdeas.key === "votes") renderAllIdeas();
    if (sortState.tblMyIdeas.key === "votes") renderMyIdeas();
    const totalVotesRollback = Object.values(voteCounts).reduce(
      (s, n) => s + n,
      0,
    );
    renderStatsStrip(ideas.length, implementedCount, totalVotesRollback);
    updateMyActivity(myIdeasCache.length, getAvailableVotedCount());
    showToast(
      "Couldn't remove your vote. Please try again — if this keeps happening, let us know.",
      true,
    );
  } finally {
    votingInProgress = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Data fetches — direct REST (LeafFormQuery's stepID handling
   without a status join silently returns 0 on this site)
───────────────────────────────────────────────────────────── */

async function leafFetchQuery(queryObj, filterData) {
  const q = JSON.stringify(queryObj);
  const url = `./api/form/query/?q=${encodeURIComponent(q)}&x-filterData=${encodeURIComponent(filterData)}&_=${Date.now()}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchIdeasData() {
  try {
    const data = await leafFetchQuery(
      {
        terms: [
          {
            id: "categoryID",
            operator: "=",
            match: FORM_IDS.idea,
            gate: "AND",
          },
          { id: "deleted", operator: "=", match: 0, gate: "AND" },
        ],
        joins: [],
        sort: { id: "created_date", direction: "desc" },
        getData: IDEA_GETDATA,
      },
      IDEA_FILTER_DATA,
    );
    const result = Object.values(data || {});
    const filtered = result.filter((idea) => {
      const key = canonicalStatusKey(getIdeaStatusRaw(idea));
      return PUBLIC_VISIBLE_STATUS_KEYS.has(key) && isSubmittedIdea(idea);
    });
    return filtered;
  } catch (err) {
    throw err;
  }
}

async function fetchVotesData() {
  try {
    const voteData = await leafFetchQuery(
      {
        terms: [
          {
            id: "categoryID",
            operator: "=",
            match: FORM_IDS.votes,
            gate: "AND",
          },
          { id: "deleted", operator: "=", match: 0, gate: "AND" },
        ],
        joins: [],
        sort: {},
        getData: VOTE_GETDATA,
      },
      VOTE_FILTER_DATA,
    );

    voteCounts = {};
    userVotes = {};
    myVoteRecordIdByIdea = {};

    const votesList = Object.values(voteData || {});
    votesList.forEach((vote) => {
      const ideanum = vote.s1?.[VOTE_INDICATORS.idea];
      const voter = vote.s1?.[VOTE_INDICATORS.user];
      if (ideanum !== undefined && ideanum !== null && ideanum !== "") {
        const key = String(ideanum);
        voteCounts[key] = (voteCounts[key] || 0) + 1;
        const voterIdentity = resolvedVoterEmail || userID;
        if (voter && voterIdentity && voter === voterIdentity) {
          userVotes[key] = true;
          const voteRecId = vote.recordID ?? vote.recordId ?? vote.id;
          if (voteRecId !== undefined && voteRecId !== null && voteRecId !== "") {
            myVoteRecordIdByIdea[key] = String(voteRecId);
          } else {
            console.warn(
              `[UnVote] Could not resolve a vote record ID for idea ${key} — un-voting will be unavailable for this vote until this is fixed. Full record:`,
              vote,
            );
          }
        }
      }
    });

    try {
      const saved = JSON.parse(localStorage.getItem("leafIdeaVotes") || "{}");
      Object.keys(saved).forEach((k) => {
        if (saved[k]) userVotes[k] = true;
      });
    } catch {}
    return votesList.length;
  } catch (err) {
    throw err;
  }
}

async function fetchUserSubmissions() {
  if (!userID) {
    myIdeasCache = [];
    setStatus("my", "Sign in to view your ideas.", "error");
    renderMyIdeas();
    return;
  }

  setPanelBusy("my", true);
  setStatus("my", "Loading your ideas…", "loading");
  renderTableMessage(ui.myResults, "Loading…");

  try {
    const data = await leafFetchQuery(
      {
        terms: [
          {
            id: "categoryID",
            operator: "=",
            match: FORM_IDS.idea,
            gate: "AND",
          },
          { id: "userID", operator: "=", match: userID, gate: "AND" },
          { id: "deleted", operator: "=", match: 0, gate: "AND" },
        ],
        joins: [],
        sort: { id: "created_date", direction: "desc" },
        getData: IDEA_GETDATA,
      },
      IDEA_FILTER_DATA,
    );

    const userIdeas = Object.values(data || {})
      .filter(
        (idea) => idea?.recordID && !(idea.title || "").startsWith("Idea #"),
      )
      .map((idea) => {
        const key = String(idea.recordID);
        const submitted = isSubmittedIdea(idea);
        if (submitted && ideasById[key]) {
          return ideasById[key];
        }
        if (submitted) {
          return idea;
        }
        return {
          ...idea,
          s1: { ...(idea.s1 || {}), [IDEA_INDICATORS.status]: "" },
        };
      });

    // BUGFIX: openDraftForEditing() (used by the My Ideas / detail-modal
    // "Submit" and "Retry Submit" buttons) looks up the raw record via
    // ideasById[recordID] to pre-fill the edit form. ideasById was
    // previously only ever populated from the PUBLIC "All Ideas" query
    // (buildIdeasViewModelList(ideasRaw, true) in loadIdeasAndVotes()) —
    // but a genuine draft that has never been submitted is, by design,
    // excluded from that public query entirely (fetchIdeasData() filters
    // on isSubmittedIdea()). That meant ideasById[recordID] was always
    // undefined for a never-submitted draft, so openDraftForEditing()
    // silently failed with just an error toast and never called
    // openModal() — this is why the Submit button appeared to do
    // nothing. My Ideas is a legitimate source of truth for the current
    // user's own records (submitted or not), so register these raw
    // records into ideasById/ideaOwnerMap here as well, without
    // overwriting an already-present (enriched) public-query entry for
    // the same record.
    userIdeas.forEach((idea) => {
      if (!idea?.recordID) return;
      const key = String(idea.recordID);
      if (!ideasById[key]) {
        ideasById[key] = idea;
      }
      if (ideaOwnerMap[key] === undefined) {
        ideaOwnerMap[key] = idea.userID || "";
      }
    });

    myIdeasCache = buildIdeasViewModelList(userIdeas, false);
    renderMyIdeas();
    setStatus("my", "", "");
    updateMyActivity(myIdeasCache.length, getAvailableVotedCount());
    // Keep the category sidebar's counts correct if My Ideas is the
    // active tab when this data refreshes (e.g. after submitting,
    // voting, or any other reload) — without this, the sidebar could
    // show stale personal counts until the next manual tab switch.
    if (state.activeTab === "my") refreshCategorySidebarForActiveTab();

    // One-time silent repair for records stuck in the "genuinely
    // submitted but indicator 12 is blank" state (see
    // writeSubmittedStatus()'s comment for the full history). This only
    // matters for records submitted before that fix existed — going
    // forward, NewIdea() writes a real status at submit time so new
    // records can't end up here. Scoped tightly to the CURRENT USER's
    // OWN records only, and only records that are unambiguously
    // genuinely submitted (date_submitted present) with a blank
    // canonical status — there's no judgment call being made here, the
    // correct value is already known with certainty, so this repairs
    // itself quietly rather than asking the user to notice and act on a
    // bug that wasn't their doing. No toast/interruption; this is
    // invisible cleanup.
    const recordsNeedingStatusRepair = userIdeas.filter((idea) => {
      if (!isSubmittedIdea(idea)) return false;
      const key = canonicalStatusKey(getIdeaStatusRaw(idea));
      if (key) return false; // has a real, recognized status already
      return !statusRepairAttempted.has(String(idea.recordID));
    });
    if (recordsNeedingStatusRepair.length) {
      recordsNeedingStatusRepair.forEach((idea) =>
        statusRepairAttempted.add(String(idea.recordID)),
      );
      const repairResults = await Promise.all(
        recordsNeedingStatusRepair.map((idea) =>
          writeSubmittedStatus(idea.recordID),
        ),
      );
      if (repairResults.some(Boolean)) {
        await fetchUserSubmissions();
        await loadIdeasAndVotes();
      }
    }
  } catch (err) {
    console.error("fetchUserSubmissions error:", err);
    renderTableMessage(ui.myResults, "Error loading your ideas.", {
      retry: true,
    });
    setStatus("my", "Error loading your ideas.", "error");
  } finally {
    setPanelBusy("my", false);
  }
}

/* ─────────────────────────────────────────────────────────────
   Main load
───────────────────────────────────────────────────────────── */

async function loadIdeasAndVotes() {
  setPanelBusy("all", true);
  setStatus("all", "Loading ideas…", "loading");
  renderTableMessage(ui.results, "Loading…");
  renderTableMessage(ui.topResults, "Loading…");
  setVoteButtonsDisabled(true);

  const fetchStart = performance.now();

  await resolveVoterEmail();

  try {
    const [ideasData] = await Promise.all([fetchIdeasData(), fetchVotesData()]);

    ideasRaw = ideasData;

    let loggedImportDebug = false;
    ideasRaw.forEach((idea) => {
      const key = String(idea.recordID);
      const fieldNum = String(IDEA_FIELDS.imported_votes);
      const candidates = [
        idea?.s1?.[IDEA_INDICATORS.imported_votes],
        idea?.s1?.[fieldNum],
        idea?.[IDEA_INDICATORS.imported_votes],
        idea?.[fieldNum],
      ];
      let importedBase = 0;
      for (const candidate of candidates) {
        const n = parseInt(candidate, 10);
        if (!isNaN(n)) {
          importedBase = n;
          break;
        }
      }
      if (importedBase > 0) {
        voteCounts[key] = importedBase + (voteCounts[key] || 0);
      }
    });

    ideas = buildIdeasViewModelList(ideasRaw, true);

    implementedCount = ideas.filter((i) => i.status === "Completed").length;
    const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);

    renderStatsStrip(ideas.length, implementedCount, totalVotes);
    buildCategorySidebar(ideas);

    renderAllIdeas();
    renderTop10Ideas();
    setStatus("all", "", "");

    await fetchUserSubmissions();
  } catch (err) {
    console.error("IdeaPortal load error", err);
    renderTableMessage(ui.results, "Error loading ideas.", { retry: true });
    renderTableMessage(ui.topResults, "Error loading ideas.", { retry: true });
    setStatus("all", "Error loading data.", "error");
  } finally {
    setPanelBusy("all", false);
    setVoteButtonsDisabled(false);
  }
}

/* ─────────────────────────────────────────────────────────────
   Workflow advance (idea submission)
───────────────────────────────────────────────────────────── */

async function advanceWorkflow(recordID) {
  try {
    const submitRes = await fetch(`./api/form/${recordID}/submit`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ CSRFToken: csrfToken }),
    });
    if (!submitRes.ok) {
      console.warn(`[Workflow] submit failed (${submitRes.status})`);
      return false;
    }

    const stepRes = await fetch(`./api/formWorkflow/${recordID}/currentStep`, {
      credentials: "same-origin",
    });
    const stepText = await stepRes.text();

    let stepData;
    try {
      stepData = JSON.parse(stepText);
    } catch {
      stepData = null;
    }

    // currentStep's response is an OBJECT keyed by dependencyID — e.g.
    //   {"9": {dependencyID:9, dependencyActions:[{actionType:"approve",...}], ...}}
    // NOT an array. Unwrap the first value regardless of what the
    // numeric key is, rather than assuming an array shape.
    let firstStep = null;
    if (Array.isArray(stepData)) {
      firstStep = stepData[0] || null;
    } else if (stepData && typeof stepData === "object") {
      const keys = Object.keys(stepData);
      firstStep = keys.length ? stepData[keys[0]] : null;
    }

    const depID = firstStep?.dependencyID ?? firstStep?.id ?? null;
    const actionType =
      firstStep?.dependencyActions?.[0]?.actionType ||
      firstStep?.actions?.[0]?.actionType ||
      "submit";

    const applyBody = new URLSearchParams({ CSRFToken: csrfToken, actionType });
    if (depID !== null && depID !== undefined) {
      applyBody.set("dependencyID", String(depID));
    }

    const applyRes = await fetch(`./api/formWorkflow/${recordID}/apply`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: applyBody,
    });

    if (!applyRes.ok) {
      const applyText = await applyRes.text();
      console.warn(
        `[Workflow] apply failed (${applyRes.status}) — record may still be draft:`,
        applyText,
      );
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Workflow] advance failed:", err);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Date helpers
───────────────────────────────────────────────────────────── */

function todayLocalYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function writeDateSubmitted(recordID, dateStr) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    recordID: String(recordID),
    series: "1",
    [IDEA_FIELDS.date_submitted]: dateStr,
  });

  try {
    const res = await fetch(`./api/form/${encodeURIComponent(recordID)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body.toString(),
    });
    const text = await res.text();
    if (res.ok) {
      return true;
    }
    console.warn(`[DateSubmit] ❌ HTTP ${res.status}:`, text);
    return false;
  } catch (err) {
    console.warn("[DateSubmit] ❌ Network error:", err);
    return false;
  }
}

async function writeDraftStatus(recordID) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    recordID: String(recordID),
    series: "1",
    [IDEA_FIELDS.status]: "",
  });
  try {
    const res = await fetch(`./api/form/${encodeURIComponent(recordID)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      console.warn(
        `[DraftStatus] Failed to blank status on record ${recordID} (HTTP ${res.status})`,
      );
    }
  } catch (err) {
    console.warn("[DraftStatus] Network error blanking status:", err);
  }
}

// Writes a real status value ("Submitted", matching the live LEAF
// indicator-12 dropdown option confirmed via loadStatusOptions()) to a
// record that has just been genuinely submitted.
//
// BUGFIX CONTEXT: writeDraftStatus() (above) intentionally blanks
// indicator 12 on every draft save, so LEAF's own native printview
// wouldn't show a stale "Submitted"-looking default on an unsubmitted
// draft. That was correct for drafts. But nothing ever reversed it: if a
// record was saved as a draft first (blanking indicator 12) and only
// later actually submitted via NewIdea(true), indicator 12 stayed blank
// forever — even though date_submitted was correctly written. This had
// two compounding effects: (1) the status badge fell back to a
// coincidentally-reused "Draft" string (fixed separately in
// resolveDisplayStatus()), and (2) more importantly, fetchIdeasData()'s
// public All Ideas visibility filter requires BOTH a recognized
// non-blank canonical status key AND date_submitted — canonicalStatusKey
// of a blank status is itself blank, which is not in
// PUBLIC_VISIBLE_STATUS_KEYS, so a genuinely, fully submitted record
// could be permanently excluded from All Ideas with no way to recover
// short of a manual database edit. Writing a real status value at the
// moment of successful submission closes this gap at the source, rather
// than trying to special-case a blank status further down the read path.
async function writeSubmittedStatus(recordID) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    recordID: String(recordID),
    series: "1",
    [IDEA_FIELDS.status]: "Submitted",
  });
  try {
    const res = await fetch(`./api/form/${encodeURIComponent(recordID)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body.toString(),
    });
    const text = await res.text();
    if (res.ok) {
      return true;
    }
    console.warn(`[SubmitStatus] ❌ HTTP ${res.status}:`, text);
    return false;
  } catch (err) {
    console.warn("[SubmitStatus] ❌ Network error:", err);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Idea form
───────────────────────────────────────────────────────────── */

function setIdeaModalMode(isEditing) {
  const titleEl = document.getElementById("addIdeaModalLabel");
  const submitBtn = document.getElementById("submitButton");
  const saveBtn = document.getElementById("saveDraftButton");
  if (titleEl) {
    const labelText = isEditing ? "Continue Your Idea" : "Add Idea";
    const icon = titleEl.querySelector(".material-symbols-outlined");
    titleEl.innerHTML = "";
    if (icon) titleEl.appendChild(icon);
    titleEl.appendChild(document.createTextNode(labelText));
  }
  if (submitBtn) {
    const label = submitBtn.querySelector(".material-symbols-outlined");
    submitBtn.innerHTML = "";
    if (label) submitBtn.appendChild(label);
    submitBtn.appendChild(document.createTextNode(" Submit Idea"));
  }
  if (saveBtn) saveBtn.disabled = false;
}

async function openDraftForEditing(recordID) {
  const ridStr = String(recordID);
  const raw = ideasById[ridStr];
  if (!raw) {
    console.warn(
      `[SubmitDraft] No raw record found for ${ridStr} in ideasById — cannot open edit form. Known ideasById keys: ${Object.keys(ideasById).join(",")}`,
    );
    showToast("Could not load this draft for editing.", true);
    return;
  }

  editingDraftRecordID = ridStr;
  setIdeaModalMode(true);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("inpTitle", sanitizeLeafValue(getIdeaField(raw, IDEA_INDICATORS.title, "title")));

  openModal("addIdeaModal");

  try {
    const [summaryHtml, benefitHtml, impactHtml, implementedHtml, attachHtml] =
      await Promise.all([
        fetchIndicator(ridStr, 6),
        fetchIndicator(ridStr, 7),
        fetchIndicator(ridStr, 9),
        fetchIndicator(ridStr, 21),
        fetchIndicator(ridStr, 10),
      ]);

    setVal("inpDescription", extractCleanValue(summaryHtml, 6));
    setVal("inpBenefit", extractCleanValue(benefitHtml, 7));

    const impactVal = extractCleanValue(impactHtml, 9);
    const impactSelect = document.getElementById("inpImpact");
    if (impactSelect && impactVal) impactSelect.value = impactVal;

    const categoryVal = sanitizeLeafValue(
      getIdeaField(raw, IDEA_INDICATORS.category, "category"),
    );
    const categorySelect = document.getElementById("inpCategory");
    if (categorySelect && categoryVal) {
      const cats = parseCategoryValue(categoryVal);
      const primary = cats[0] || categoryVal;
      const matchesKnown = Array.from(categorySelect.options).some(
        (o) => o.value === primary,
      );
      if (matchesKnown) {
        categorySelect.value = primary;
      } else {
        categorySelect.value = "Other";
        setVal("inpOtherCategory", primary);
        const wrapper = document.getElementById("otherCategoryWrapper");
        if (wrapper) wrapper.style.display = "";
        const otherInput = document.getElementById("inpOtherCategory");
        if (otherInput) otherInput.required = true;
      }
    }

    const implementedVal = extractCleanValue(implementedHtml, 21)
      .trim()
      .toLowerCase();
    const isYes = implementedVal === "yes";
    const yesRadio = document.getElementById("inpImplementedYes");
    const noRadio = document.getElementById("inpImplementedNo");
    if (isYes && yesRadio) {
      yesRadio.checked = true;
      const wrapper = document.getElementById("implementedUrlWrapper");
      if (wrapper) wrapper.style.display = "";
      fetchIndicator(ridStr, 22)
        .then((urlHtml) => {
          const urlVal = extractCleanValue(urlHtml, 22);
          setVal("inpImplementedUrl", urlVal);
          const urlInput = document.getElementById("inpImplementedUrl");
          if (urlInput) urlInput.required = true;
        })
        .catch(() => {});
    } else if (noRadio) {
      noRadio.checked = true;
    }

    editingDraftAttachmentLabel = extractAttachmentLabel(attachHtml);
    const attachHint = document.getElementById("currentAttachmentHint");
    if (attachHint) {
      if (editingDraftAttachmentLabel) {
        attachHint.hidden = false;
        attachHint.textContent = `Currently attached: ${editingDraftAttachmentLabel}. Uploading a new file will replace it; leaving this blank keeps the current attachment.`;
      } else {
        attachHint.hidden = true;
        attachHint.textContent = "";
      }
    }
  } catch (err) {
    console.warn("[openDraftForEditing] Could not load full draft data:", err);
    showToast(
      "Loaded partial draft data — some fields may need to be re-entered.",
      true,
    );
  }
}

async function NewIdea(advanceOnSuccess) {
  const form = document.getElementById("ideaForm");
  const submitBtn = document.getElementById("submitButton");
  const saveBtn = document.getElementById("saveDraftButton");
  const fileInputEl = document.getElementById("fileInput");

  const val = (id) => document.getElementById(id)?.value.trim() || "";
  const titleValue = val("inpTitle");
  const descValue = val("inpDescription");
  const benefitValue = val("inpBenefit");
  const categoryValue = val("inpCategory");
  const impactValue = val("inpImpact");
  const otherCatValue = val("inpOtherCategory");
  const implementedValue =
    document.querySelector('input[name="inpImplemented"]:checked')?.value ||
    "No";
  const implementedUrlValue = val("inpImplementedUrl");

  const editingRecordID = editingDraftRecordID;

  if (submitBtn) submitBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;
  ideaSubmitInProgress = true;

  const todayStr = advanceOnSuccess ? todayLocalYMD() : null;

  try {
    const payload = {
      service: "",
      title: titleValue || "Idea Submission",
      priority: 0,
      CSRFToken: csrfToken,
      [`numform_${FORM_KEYS.idea}`]: 1,
      [IDEA_FIELDS.title]: titleValue,
      [IDEA_FIELDS.summary]: descValue,
      [IDEA_FIELDS.benefit]: benefitValue,
      [IDEA_FIELDS.category]: categoryValue,
      [IDEA_FIELDS.impact]: impactValue,
      [IDEA_FIELDS.implemented]: implementedValue,
    };
    if (categoryValue === "Other" && otherCatValue) {
      payload[IDEA_FIELDS.other_category] = otherCatValue;
    }
    if (implementedValue === "Yes" && implementedUrlValue) {
      payload[IDEA_FIELDS.implemented_url] = implementedUrlValue;
    }
    if (todayStr) {
      payload[IDEA_FIELDS.date_submitted] = todayStr;
    }

    let newID;
    if (editingRecordID) {
      payload.recordID = editingRecordID;
      payload.series = "1";
      const updateBody = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        updateBody.append(String(k), String(v));
      });
      const updateRes = await fetch(
        `./api/form/${encodeURIComponent(editingRecordID)}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: updateBody.toString(),
        },
      );
      if (!updateRes.ok) {
        throw new Error(`Update failed with status ${updateRes.status}`);
      }
      newID = Number(editingRecordID);
    } else {
      const response = await apiPostJson("./api/?a=form/new", payload);
      newID = parseFloat(response);
    }

    if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
      // Validate one more time immediately before upload, as a second
      // layer behind bindFileInput()'s selection-time check — guards
      // against a file somehow reaching this point despite that check
      // (e.g. files set programmatically, or a future code path that
      // populates fileInputEl without going through the change handler).
      // Invalid files are dropped from what gets uploaded; the idea
      // record itself is never blocked on this, per the decision that a
      // bad attachment should not prevent the idea from saving/submitting.
      const allFiles = fileInputEl?.files ? Array.from(fileInputEl.files) : [];
      const files = allFiles.filter(isAcceptedAttachmentFile);
      const rejectedFiles = allFiles.filter((f) => !isAcceptedAttachmentFile(f));
      if (rejectedFiles.length) {
        console.warn(
          "[IdeaUpload] Rejected file(s) reached NewIdea() despite selection-time validation:",
          rejectedFiles.map((f) => f.name),
        );
      }

      let attachmentResult = null;
      if (files.length) {
        attachmentResult = await uploadIdeaAttachment(newID, files);
      }

      form?.reset();
      form?.classList.remove("was-validated");
      resetImplementedField();
      if (fileInputEl) fileInputEl.value = "";
      const fileList = document.getElementById("fileList");
      if (fileList) fileList.innerHTML = "";
      const attachHint = document.getElementById("currentAttachmentHint");
      if (attachHint) {
        attachHint.hidden = true;
        attachHint.textContent = "";
      }
      editingDraftRecordID = null;
      editingDraftAttachmentLabel = "";
      setIdeaModalMode(false);
      closeModal("addIdeaModal");

      // Build a suffix describing the attachment outcome, appended to
      // whichever idea-level success/failure message ends up showing
      // below — the idea record's own success/failure is independent of
      // and takes priority over the attachment's, per the decision that
      // an attachment problem should never block or overshadow the idea
      // itself having saved/submitted correctly.
      let attachmentNote = "";
      if (rejectedFiles.length && !files.length) {
        attachmentNote = ` Note: the file you selected (${rejectedFiles.map((f) => f.name).join(", ")}) is not a supported type (${ACCEPTED_ATTACHMENT_LABEL}) and was not attached.`;
      } else if (attachmentResult && !attachmentResult.success) {
        attachmentNote =
          " Note: your idea saved, but the attached file could not be uploaded. You can try attaching it again by editing this idea.";
      }

      if (advanceOnSuccess) {
        const dateWritten = await writeDateSubmitted(newID, todayStr);
        // Write a real status value alongside date_submitted — see
        // writeSubmittedStatus()'s comment for why this matters: without
        // it, a record that started life as a draft (which blanks
        // indicator 12) could stay permanently invisible on the public
        // All Ideas list even after being fully, genuinely submitted.
        await writeSubmittedStatus(newID);
        const workflowAdvanced = await advanceWorkflow(newID);

        if (dateWritten && workflowAdvanced) {
          workflowIncompleteRecordIds.delete(String(newID));
          showToast(
            `Your idea has been submitted successfully.${attachmentNote}`,
            Boolean(attachmentNote),
          );
        } else if (dateWritten && !workflowAdvanced) {
          workflowIncompleteRecordIds.add(String(newID));
          showToast(
            `Your idea was recorded as submitted, but a workflow step didn't complete. You can try submitting again from My Ideas — no data was lost.${attachmentNote}`,
            true,
          );
        } else {
          showToast(
            `Your idea was saved, but submission didn't complete — it's in My Ideas as a draft. Please try submitting again.${attachmentNote}`,
            true,
          );
        }
        await loadIdeasAndVotes();
      } else {
        await writeDraftStatus(newID);
        showToast(
          `${editingRecordID ? "Draft updated. You can find it in My Ideas." : "Idea saved. You can find it in My Ideas."}${attachmentNote}`,
          Boolean(attachmentNote),
        );
        await fetchUserSubmissions();
      }
    } else {
      throw new Error(`Unexpected response`);
    }
  } catch (err) {
    console.warn("[NewIdea] error:", err);
    showToast("Error submitting idea. Please try again.", true);
  } finally {
    ideaSubmitInProgress = false;
    if (submitBtn) submitBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Form selects + validation
───────────────────────────────────────────────────────────── */

function populateSelect(select, options, appendOther = false) {
  if (!select) return;
  const placeholder = select.options[0];
  select.innerHTML = "";
  if (placeholder) select.appendChild(placeholder);
  options.forEach((opt) => {
    const label = typeof opt === "string" ? opt : opt.label || opt.name || opt;
    const el = document.createElement("option");
    el.value = label;
    el.textContent = label;
    select.appendChild(el);
  });
  if (appendOther) {
    const other = document.createElement("option");
    other.value = "Other";
    other.textContent = "Other";
    select.appendChild(other);
  }
}

async function loadCategoryOptions() {
  try {
    const res = await fetch(
      "/platform/ideas/ajaxIndex.php?a=getindicator&indicatorID=8&series=1&recordID=0",
      { credentials: "same-origin" },
    );
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const sel = doc.querySelector('select[id="8"]');
    if (!sel || !sel.options.length) throw new Error("no options");
    const options = Array.from(sel.options)
      .map((o) => o.value)
      .filter(Boolean);
    categoryOptionsList = options;
    populateSelect(document.getElementById("inpCategory"), options, false);
  } catch {
    categoryOptionsList = CATEGORY_FALLBACK.slice();
    populateSelect(
      document.getElementById("inpCategory"),
      CATEGORY_FALLBACK,
      true,
    );
  }
  if (ideasRaw.length) {
    ideas = buildIdeasViewModelList(ideasRaw, true);
    buildCategorySidebar(ideas);
    renderAllIdeas();
    renderTop10Ideas();
  }
}

async function loadImpactOptions() {
  try {
    const res = await fetch(
      "/platform/ideas/ajaxIndex.php?a=getindicator&indicatorID=9&series=1&recordID=0",
      { credentials: "same-origin" },
    );
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const sel = doc.querySelector('select[id="9"]');
    if (!sel || !sel.options.length) throw new Error("no options");
    populateSelect(
      document.getElementById("inpImpact"),
      Array.from(sel.options)
        .map((o) => o.value)
        .filter(Boolean),
      false,
    );
  } catch {
    populateSelect(
      document.getElementById("inpImpact"),
      IMPACT_FALLBACK,
      false,
    );
  }
}

let statusOptionsList = [];

async function loadStatusOptions() {
  try {
    const res = await fetch(
      `/platform/ideas/ajaxIndex.php?a=getindicator&indicatorID=${IDEA_FIELDS.status}&series=1&recordID=0`,
      { credentials: "same-origin" },
    );
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const sel = doc.querySelector(`select[id="${IDEA_FIELDS.status}"]`);
    if (!sel || !sel.options.length) throw new Error("no options");
    const options = Array.from(sel.options)
      .map((o) => o.value)
      .filter(Boolean);
    statusOptionsList = options;
  } catch (err) {
    console.warn(
      "[IdeaPortal v3] Could not load live status options for indicator 12:",
      err,
    );
  }
}

function bindCategoryChange() {
  const categorySelect = document.getElementById("inpCategory");
  const otherWrapper = document.getElementById("otherCategoryWrapper");
  const otherInput = document.getElementById("inpOtherCategory");
  if (!categorySelect || !otherWrapper || !otherInput) return;

  categorySelect.addEventListener("change", () => {
    const isOther = categorySelect.value === "Other";
    otherWrapper.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
    if (isOther) {
      otherInput.focus();
    } else {
      otherInput.value = "";
      otherInput.removeAttribute("aria-invalid");
    }
  });
}

function bindImplementedChange() {
  const radios = document.querySelectorAll('input[name="inpImplemented"]');
  const urlWrapper = document.getElementById("implementedUrlWrapper");
  const urlInput = document.getElementById("inpImplementedUrl");
  if (!radios.length || !urlWrapper || !urlInput) return;

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const anyYesChecked = document.querySelector(
        'input[name="inpImplemented"][value="Yes"]:checked',
      );
      urlWrapper.style.display = anyYesChecked ? "" : "none";
      urlInput.required = !!anyYesChecked;
      if (anyYesChecked) {
        urlInput.focus();
      } else {
        urlInput.value = "";
        urlInput.removeAttribute("aria-invalid");
      }
    });
  });
}

function resetImplementedField() {
  const noRadio = document.getElementById("inpImplementedNo");
  const urlWrapper = document.getElementById("implementedUrlWrapper");
  const urlInput = document.getElementById("inpImplementedUrl");
  if (noRadio) noRadio.checked = true;
  if (urlWrapper) urlWrapper.style.display = "none";
  if (urlInput) {
    urlInput.required = false;
    urlInput.value = "";
    urlInput.removeAttribute("aria-invalid");
  }
}

function initValidation() {
  document.querySelectorAll(".needs-validation").forEach((form) => {
    form.addEventListener("input", (e) => {
      const target = e.target;
      if (!target) return;
      if (target.checkValidity?.()) {
        target.removeAttribute("aria-invalid");
      } else {
        target.setAttribute("aria-invalid", "true");
      }
    });
    form.addEventListener("change", (e) => {
      const target = e.target;
      if (!target) return;
      if (target.checkValidity?.()) {
        target.removeAttribute("aria-invalid");
      } else {
        target.setAttribute("aria-invalid", "true");
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Event delegation
───────────────────────────────────────────────────────────── */

function handleSortClick(sortBtn) {
  const key = sortBtn.getAttribute("data-sort");
  const tableId = sortBtn.closest("table")?.getAttribute("id");
  if (!tableId || !key) return;
  setSortState(tableId, key);
  applySortClasses(tableId);
  if (tableId === "tblIdeas") {
    state.pagination.all.page = 1;
    renderAllIdeas();
  } else if (tableId === "tblTopIdeas") renderTop10Ideas();
  else if (tableId === "tblMyIdeas") {
    state.pagination.my.page = 1;
    renderMyIdeas();
  }
}

function handlePaginationAction(scope, action) {
  const pager = state.pagination[scope];
  if (!pager) return;
  if (action === "prev") pager.page = Math.max(1, pager.page - 1);
  else if (action === "next") pager.page += 1;
  else if (action === "toggle") {
    pager.showAll = !pager.showAll;
    pager.page = 1;
  }
  if (scope === "all") renderAllIdeas();
  else if (scope === "my") renderMyIdeas();
}

function bindDelegatedEvents() {
  document.addEventListener("click", (e) => {
    const sortBtn = e.target.closest(".ip-sortBtn");
    if (sortBtn) {
      handleSortClick(sortBtn);
      return;
    }

    const retryBtn = e.target.closest(".ip-retry");
    if (retryBtn) {
      loadIdeasAndVotes();
      return;
    }

    const submitDraftBtn = e.target.closest("[data-submit-draft-id]");
    if (submitDraftBtn) {
      openDraftForEditing(submitDraftBtn.getAttribute("data-submit-draft-id"));
      return;
    }

    const upvoteBtn = e.target.closest(".ip-upvote");
    if (upvoteBtn && !upvoteBtn.disabled) {
      const recId = upvoteBtn.getAttribute("data-record-id");
      if (userVotes[recId] === true) {
        unvoteIdea(recId);
      } else {
        IdeaVotes(recId);
      }
      return;
    }

    const shareBtn = e.target.closest(".ip-share");
    if (shareBtn) {
      if (shareBtn.disabled) return;
      const link = shareBtn.getAttribute("data-record-link");
      if (!link) return;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(link)
          .then(() => showToast("Idea link copied to clipboard."))
          .catch(() => copyFallback(link));
      } else {
        copyFallback(link);
      }
      return;
    }

    const pageBtn = e.target.closest(".ip-pageBtn, .ip-pageToggle");
    if (pageBtn) {
      handlePaginationAction(
        pageBtn.getAttribute("data-page-scope"),
        pageBtn.getAttribute("data-page-action"),
      );
    }
  });
}

function applySearch(value) {
  state.search = value.trim();
  if (!state.pagination.all.showAll) state.pagination.all.page = 1;
  renderAllIdeas();
}

function bindSearch() {
  if (!ui.searchInput) return;
  const handler = debounce(
    (e) => applySearch(e.target.value),
    SEARCH_DEBOUNCE_MS,
  );
  ui.searchInput.addEventListener("input", handler);
  ui.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch(ui.searchInput.value);
    }
  });
  ui.searchBtn?.addEventListener("click", () =>
    applySearch(ui.searchInput.value),
  );
}

function bindFileInput() {
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  if (!fileInput || !fileList) return;
  fileInput.addEventListener("change", () => {
    fileList.innerHTML = Array.from(fileInput.files || [])
      .map((f) => `<li>${escapeHtml(f.name)}</li>`)
      .join("");
    if (fileInput.files && fileInput.files.length) {
      const attachHint = document.getElementById("currentAttachmentHint");
      if (attachHint) attachHint.hidden = true;
    }
  });
}

function bindMySearch() {
  const input = document.getElementById("mySearchInput");
  const btn = document.getElementById("mySearchBtn");
  if (!input) return;
  const handler = debounce(() => {
    const q = input.value.toLowerCase();
    document.querySelectorAll("#myResults tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  }, SEARCH_DEBOUNCE_MS);
  input.addEventListener("input", handler);
  btn?.addEventListener("click", handler);
}

/* ─────────────────────────────────────────────────────────────
   My Activity — clickable rows
───────────────────────────────────────────────────────────── */

function switchToMyIdeasTab() {
  const myTab = document.querySelector('.ip-tab[data-ip-tab="my"]');
  if (!myTab) return;
  myTab.click();
  myTab.scrollIntoView({ behavior: "smooth", block: "nearest" });
  myTab.focus();
}

/* ─────────────────────────────────────────────────────────────
   Voted modal — sort + search state
───────────────────────────────────────────────────────────── */

const votedModalState = {
  sort: { key: "id", dir: "asc" },
  search: "",
  allRows: [],
};

function buildVotedRow(id, idea) {
  if (!idea) {
    return `<tr data-voted-id="${escapeHtml(id)}">
      <td data-label="ID"><span style="color:var(--ip-muted)">#${escapeHtml(id)}</span></td>
      <td class="ip-cardHeading" style="color:var(--ip-muted);font-style:italic" colspan="4">Idea not available</td>
    </tr>`;
  }
  const titleFull = escapeHtml(idea.title || `Idea ${id}`);
  const titleDisplay = escapeHtml(truncateTitle(idea.title || `Idea ${id}`));
  const category = renderCategoryPills(
    idea.categories && idea.categories.length ? idea.categories : idea.category,
  );
  const statusLabel = idea.status || "Draft";
  const statusBadgeClass = getStatusBadgeClass(statusLabel);
  const votes = idea.votes || 0;
  const recordLink = escapeHtml(idea.recordLink || `${RECORD_VIEW_URL}${id}`);
  return `<tr data-voted-id="${escapeHtml(id)}">
    <td data-label="ID"><a class="ip-recordLink" href="${recordLink}" data-record-id="${escapeHtml(id)}" data-title="${titleFull}" aria-haspopup="dialog">#${escapeHtml(id)}</a></td>
    <td class="ip-col-title ip-cardHeading" title="${titleFull}">
      <a class="ip-recordLink ip-recordLink--title" href="${recordLink}" data-record-id="${escapeHtml(id)}" data-title="${titleFull}" aria-haspopup="dialog">${titleDisplay}</a>
    </td>
    <td data-label="Category">${category}</td>
    <td data-label="Status"><span class="ip-badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span></td>
    <td data-label="Votes">${votes}</td>
  </tr>`;
}

function getVotedSortValue(row, key) {
  switch (key) {
    case "id":
      return Number(row.id) || 0;
    case "title":
      return String(row.idea?.title || "").toLowerCase();
    case "category":
      return String(row.idea?.category || "").toLowerCase();
    case "status":
      return String(row.idea?.status || "").toLowerCase();
    case "votes":
      return Number(row.idea?.votes) || 0;
    default:
      return "";
  }
}

function renderVotedTable() {
  const tableBody = document.getElementById("ipVotedTableBody");
  const table = document.getElementById("ipVotedTable");
  const empty = document.getElementById("ipVotedModalEmpty");
  const noResults = document.getElementById("ipVotedModalNoResults");
  if (!tableBody || !table || !empty) return;

  const q = votedModalState.search.toLowerCase();
  let filtered = votedModalState.allRows;

  if (q) {
    filtered = filtered.filter(({ id, idea }) => {
      if (!idea) return String(id).includes(q);
      return [
        String(id),
        idea.title || "",
        idea.category || "",
        idea.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }

  const { key, dir } = votedModalState.sort;
  const mult = dir === "desc" ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    const av = getVotedSortValue(a, key);
    const bv = getVotedSortValue(b, key);
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * mult;
    return (
      String(av).localeCompare(String(bv), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * mult
    );
  });

  const thead = table.querySelector("thead");
  thead?.querySelectorAll(".ip-sortable").forEach((th) => {
    th.classList.remove("is-asc", "is-desc");
    const k = th.querySelector(".ip-sortBtn")?.getAttribute("data-sort");
    if (k === key) {
      th.classList.add(dir === "asc" ? "is-asc" : "is-desc");
      th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });

  if (!votedModalState.allRows.length) {
    table.hidden = true;
    empty.hidden = false;
    if (noResults) noResults.hidden = true;
    return;
  }

  empty.hidden = true;

  if (!sorted.length) {
    table.hidden = true;
    if (noResults) noResults.hidden = false;
    return;
  }

  if (noResults) noResults.hidden = true;
  tableBody.innerHTML = sorted
    .map(({ id, idea }) => buildVotedRow(id, idea))
    .join("");
  table.hidden = false;
}

function openVotedModal() {
  const modal = document.getElementById("ipVotedModal");
  const searchWrap = document.getElementById("ipVotedModalSearch");
  const searchInput = document.getElementById("ipVotedSearchInput");
  if (!modal) return;

  const votedIDs = Object.keys(userVotes).filter((k) => userVotes[k] === true);
  votedModalState.allRows = votedIDs
    .map((id) => ({
      id,
      idea: ideasVMById[id] || null,
    }))
    .filter((row) => row.idea !== null);
  votedModalState.sort = { key: "id", dir: "asc" };
  votedModalState.search = "";

  if (searchInput) searchInput.value = "";
  if (searchWrap) searchWrap.hidden = !votedModalState.allRows.length;

  renderVotedTable();

  lastFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  document.getElementById("ipVotedModalCloseBtn")?.focus();
}

function closeVotedModal() {
  const modal = document.getElementById("ipVotedModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  delete modal.dataset.focusTrap;
  setBackgroundHidden(false);
  lastFocusedElement?.focus();
  lastFocusedElement = null;
}

function bindVotedModal() {
  document
    .getElementById("ipVotedModalCloseBtn")
    ?.addEventListener("click", closeVotedModal);
  document
    .getElementById("ipVotedModalBackdrop")
    ?.addEventListener("click", closeVotedModal);

  document.getElementById("ipVotedTable")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ip-sortBtn");
    if (!btn) return;
    const key = btn.getAttribute("data-sort");
    if (!key) return;
    if (votedModalState.sort.key === key) {
      votedModalState.sort.dir =
        votedModalState.sort.dir === "asc" ? "desc" : "asc";
    } else {
      votedModalState.sort = { key, dir: "asc" };
    }
    renderVotedTable();
  });

  const searchInput = document.getElementById("ipVotedSearchInput");
  const searchBtn = document.getElementById("ipVotedSearchBtn");
  if (searchInput) {
    const handler = debounce(() => {
      votedModalState.search = searchInput.value;
      renderVotedTable();
    }, SEARCH_DEBOUNCE_MS);
    searchInput.addEventListener("input", handler);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        votedModalState.search = searchInput.value;
        renderVotedTable();
      }
    });
  }
  searchBtn?.addEventListener("click", () => {
    votedModalState.search = searchInput?.value || "";
    renderVotedTable();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("ipVotedModal");
      if (modal?.classList.contains("is-open")) closeVotedModal();
    }
  });
}

function bindActivityButtons() {
  document
    .getElementById("actMyIdeasBtn")
    ?.addEventListener("click", switchToMyIdeasTab);
  document
    .getElementById("actVotedBtn")
    ?.addEventListener("click", openVotedModal);
}

const HOW_IT_WORKS_SEEN_KEY = "leafIdeaPortalHowItWorksSeen";

function openHowItWorksModal() {
  openModal("howItWorksModal");
}

function bindHowItWorksModal() {
  document
    .getElementById("ipHowItWorksBtn")
    ?.addEventListener("click", openHowItWorksModal);
}

function maybeShowHowItWorksOnFirstVisit() {
  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(HOW_IT_WORKS_SEEN_KEY) === "true";
  } catch {
    return;
  }
  if (alreadySeen) return;
  openHowItWorksModal();
  try {
    localStorage.setItem(HOW_IT_WORKS_SEEN_KEY, "true");
  } catch {
    // Non-fatal.
  }
}

function initPortal() {
  cacheElements();
  bindModalEvents();
  bindTabs();
  bindRecordModal();
  bindVotedModal();
  bindActivityButtons();
  bindHowItWorksModal();
  bindDelegatedEvents();
  bindSearch();
  bindMySearch();
  bindFileInput();
  bindCategoryChange();
  bindImplementedChange();
  loadCategoryOptions();
  loadImpactOptions();
  loadStatusOptions();
  initValidation();
  maybeShowHowItWorksOnFirstVisit();

  document
    .getElementById("saveDraftButton")
    ?.addEventListener("click", async () => {
      const form = document.getElementById("ideaForm");
      if (!form) return;
      const titleVal = document.getElementById("inpTitle")?.value.trim();
      if (!titleVal) {
        form.classList.add("was-validated");
        document.getElementById("inpTitle")?.focus();
        return;
      }
      await NewIdea(false);
    });

  document
    .getElementById("submitButton")
    ?.addEventListener("click", async () => {
      const form = document.getElementById("ideaForm");
      if (!form) return;
      form.classList.add("was-validated");
      if (!form.reportValidity()) return;
      await NewIdea(true);
    });

  loadIdeasAndVotes().catch((err) => {
    console.error("loadIdeasAndVotes failed", err);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortal);
} else {
  initPortal();
}
