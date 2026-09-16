const statusRepairAttempted = new Set();
const sendBackRepairFailed = new Set();

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
}

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;
const RECORD_VIEW_URL = `${window.location.origin}/platform/ideas/index.php?a=printview&recordID=`;
const TITLE_MAX_LENGTH = 100;
const MODAL_HEADER_TITLE_MAX_LENGTH = 60;

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
  if (
    file.type &&
    ACCEPTED_ATTACHMENT_MIME_TYPES.has(file.type.toLowerCase())
  ) {
    return true;
  }
  const name = file.name || "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
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
  comment: 20,
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
  comment: `id${IDEA_FIELDS.comment}`,
  imported_votes: `id${IDEA_FIELDS.imported_votes}`,
  implemented: `id${IDEA_FIELDS.implemented}`,
  implemented_url: `id${IDEA_FIELDS.implemented_url}`,
};

const VOTE_INDICATORS = {
  idea: `id${VOTE_FIELDS.idea}`,
  user: `id${VOTE_FIELDS.user}`,
};

const IDEA_GETDATA = [
  String(IDEA_FIELDS.category),
  String(IDEA_FIELDS.title),
  String(IDEA_FIELDS.status),
  String(IDEA_FIELDS.imported_votes),
  String(IDEA_FIELDS.date_submitted),
  String(IDEA_FIELDS.comment),
];

const VOTE_GETDATA = [String(VOTE_FIELDS.idea), String(VOTE_FIELDS.user)];

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
  "backlog",
  "in_development",
  "need_more_info",
  "unlikely",
]);

let ideas = [];
let ideasRaw = [];
let ideasById = {};
let ideasVMById = {};
let ideaOwnerMap = {};
let voteCounts = {};
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

// Icon path data sourced from Google's Material Symbols (Filled) set.
const ICON_SVG = {
  thumb_up:
    '<path d="M720-120H320v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h218q32 0 56 24t24 56v80q0 7-1.5 15t-4.5 15L794-168q-9 20-30 34t-44 14ZM240-640v520H80v-520h160Z"/>',
  thumb_down:
    '<path d="M240-840h400v520L360-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 1.5-15t4.5-15l120-282q9-20 30-34t44-14Zm480 520v-520h160v520H720Z"/>',
  share:
    '<path d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>',
  send: '<path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z"/>',
  check_circle:
    '<path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>',
  error:
    '<path d="M508.5-291.5Q520-303 520-320t-11.5-28.5Q497-360 480-360t-28.5 11.5Q440-337 440-320t11.5 28.5Q463-280 480-280t28.5-11.5ZM440-440h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>',
  close:
    '<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>',
  edit: '<path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>',
  open_in_new:
    '<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/>',
  sort: '<path d="M120-240v-80h240v80H120Zm0-200v-80h480v80H120Zm0-200v-80h720v80H120Z"/>',
  comment:
    '<path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"/>',
  close_small:
    '<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>',
};

function iconSvg(name, opts = {}) {
  const inner = ICON_SVG[name];
  if (!inner) return "";
  const hidden = opts.ariaHidden === false ? "" : ' aria-hidden="true"';
  const extraClass = opts.extraClass ? ` ${opts.extraClass}` : "";
  const style = opts.style ? ` style="${opts.style}"` : "";
  return `<svg class="ip-icon${extraClass}" viewBox="0 -960 960 960" fill="currentColor" focusable="false"${hidden}${style}>${inner}</svg>`;
}

function truncateTitle(title, max = 100) {
  if (!title) return "";
  return title.length <= max ? title : `${title.substring(0, max).trimEnd()}…`;
}

/* ─────────────────────────────────────────────────────────────
   Multi-select category parsing
───────────────────────────────────────────────────────────── */

function parseCategoryValue(raw) {
  const str = String(raw || "").trim();
  if (!str) return [];

  if (/[,;\n]/.test(str)) {
    return str
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

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
    if (out.length && !remaining.trim()) return out;
  }

  return [str];
}

let categoryPillPopoverSeq = 0;

// "+N" overflow indicator: a real button with an attached popover
// (not a title tooltip) so the full category list is keyboard- and
// screen-reader-reachable.
function renderCategoryPills(categories, opts = {}) {
  const list = Array.isArray(categories) ? categories : [categories];
  const clean = list.map((c) => String(c || "").trim()).filter(Boolean);
  if (!clean.length) return "";
  if (opts.showAll || clean.length === 1) {
    return `<span class="ip-cat-pills">${clean
      .map((c) => `<span class="ip-cat-pill" title="${escapeHtml(c)}" aria-label="${escapeHtml(c)}">${escapeHtml(c)}</span>`)
      .join("")}</span>`;
  }
  const [first, ...rest] = clean;
  const popoverId = `ip-cat-pop-${++categoryPillPopoverSeq}`;
  const restLabel = rest.join(", ");
  return `<span class="ip-cat-pills">
    <span class="ip-cat-pill" title="${escapeHtml(first)}" aria-label="${escapeHtml(first)}">${escapeHtml(first)}</span>
    <button type="button" class="ip-cat-pill ip-cat-pill--more"
      data-cat-more-toggle="${popoverId}"
      aria-expanded="false"
      aria-controls="${popoverId}"
      aria-label="Show ${rest.length} more ${rest.length === 1 ? "category" : "categories"}: ${escapeHtml(restLabel)}">+${rest.length}</button>
    <span class="ip-cat-pill--more-popover" id="${popoverId}" role="group" aria-label="Additional categories">
      ${rest.map((c) => `<span class="ip-cat-pill" title="${escapeHtml(c)}" aria-label="${escapeHtml(c)}">${escapeHtml(c)}</span>`).join("")}
    </span>
  </span>`;
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

let userVotes = {};
let myVoteRecordIdByIdea = {};

let votingInProgress = false;
let ideaSubmitInProgress = false;
let implementedCount = 0;
let myIdeasCache = [];
let lastFocusedElement = null;
let lastRecordFocusedElement = null;
let resolvedVoterEmail = "";

let editingDraftRecordID = null;
let editingDraftAttachmentLabel = "";

const state = {
  search: "",
  categoryFilter: "all",
  activeTab: "all",
  pagination: {
    all: { page: 1, showAll: false },
    my: { page: 1, showAll: false },
  },
};

const sortState = {
  tblIdeas: { key: "id", dir: "desc" },
  tblTopIdeas: { key: "", dir: "desc" },
  tblMyIdeas: { key: "id", dir: "desc" },
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
  tabCount: { all: null, my: null },
};

/* ─────────────────────────────────────────────────────────────
   Table scroll-edge fade
   Toggles can-scroll-left/can-scroll-right based on actual scroll
   position, so the fade only shows when there's real content to
   scroll to.
───────────────────────────────────────────────────────────── */

function updateTableScrollEdges(el) {
  if (!el) return;
  // Tolerance avoids sub-pixel rounding from falsely registering as
  // "has more to scroll," which would permanently reapply the fade and
  // mask the row hover background beneath it.
  const SCROLL_TOLERANCE_PX = 4;
  const max = el.scrollWidth - el.clientWidth;
  if (max <= SCROLL_TOLERANCE_PX) {
    el.classList.remove("can-scroll-left", "can-scroll-right");
    return;
  }
  const atStart = el.scrollLeft <= SCROLL_TOLERANCE_PX;
  const atEnd = el.scrollLeft >= max - SCROLL_TOLERANCE_PX;
  el.classList.toggle("can-scroll-left", !atStart);
  el.classList.toggle("can-scroll-right", !atEnd);
}

function bindTableScrollEdges() {
  const containers = Array.from(document.querySelectorAll(".ip-tableScroll"));
  containers.forEach((el) => {
    updateTableScrollEdges(el);
    el.addEventListener("scroll", () => updateTableScrollEdges(el), {
      passive: true,
    });
  });
  const onResize = debounce(() => {
    containers.forEach((el) => updateTableScrollEdges(el));
  }, 150);
  window.addEventListener("resize", onResize);

  // Table content re-renders often (sort, page, filter, tab switch),
  // which can change scrollWidth without a scroll/resize event firing.
  setInterval(() => {
    containers.forEach((el) => updateTableScrollEdges(el));
  }, 1000);
}

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
  ui.tabCount.all = document.getElementById("allTabCount");
  ui.tabCount.my = document.getElementById("myTabCount");
}

/* ─────────────────────────────────────────────────────────────
   Toast → sticky top banner
   Manual-dismiss only (no auto-hide timer) per WCAG 2.2.1/2.2.3.
───────────────────────────────────────────────────────────── */

function showToast(msg, isError = false) {
  const toast = document.getElementById("ipToast");
  if (!toast) return;
  const iconName = isError ? "error" : "check_circle";
  toast.innerHTML = `<span class="ip-toast__icon" aria-hidden="true">${iconSvg(iconName)}</span>
    <span class="ip-toast__msg">${escapeHtml(msg || "")}</span>
    <button type="button" class="ip-toast__close" aria-label="Dismiss notification">
      ${iconSvg("close")}
      Close
    </button>`;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  toast
    .querySelector(".ip-toast__close")
    ?.addEventListener("click", hideToast, { once: true });

  const computed = window.getComputedStyle(toast);
  if (computed.position !== "fixed") {
    console.warn(
      "[Toast] Unexpected computed styles — CSS may not have applied:",
      {
        position: computed.position,
        top: computed.top,
        zIndex: computed.zIndex,
        display: computed.display,
      },
    );
  }
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
   Tab count pills
───────────────────────────────────────────────────────────── */

function updateTabCount(scope, count) {
  const el = ui.tabCount[scope];
  if (el) el.textContent = `(${count})`;
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

  const previouslyActiveCat = state.categoryFilter || "all";

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

  const allBtn = catList.querySelector('[data-cat="all"]');
  if (allBtn) {
    allBtn.classList.toggle("is-active", previouslyActiveCat === "all");
  }

  applyCategorySidebarInertState(state.activeTab === "top");

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
      if (state.activeTab === "my") {
        renderMyIdeas();
      } else {
        renderAllIdeas();
      }
    });
  }
}

// Applies/removes keyboard-inert state on category buttons. CSS
// already blocks pointer interaction visually via .is-inert, but
// buttons stayed in the tab order — tabindex="-1" removes them fully.
function applyCategorySidebarInertState(isInert) {
  const catList = document.getElementById("catList");
  if (!catList) return;
  catList.querySelectorAll(".ip-catItem").forEach((btn) => {
    if (isInert) {
      btn.setAttribute("tabindex", "-1");
    } else {
      btn.removeAttribute("tabindex");
    }
  });
}

function refreshCategorySidebarForActiveTab() {
  const catList = document.getElementById("catList");
  const note = document.getElementById("ipCatSidebarNote");
  if (state.activeTab === "top") {
    if (catList) {
      catList.classList.add("is-inert");
      catList.setAttribute("aria-disabled", "true");
    }
    if (note) note.hidden = false;
    applyCategorySidebarInertState(true);
    return;
  }
  if (catList) {
    catList.classList.remove("is-inert");
    catList.removeAttribute("aria-disabled");
  }
  if (note) note.hidden = true;
  applyCategorySidebarInertState(false);

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

function getAvailableVotedCount() {
  return Object.keys(userVotes).filter(
    (id) => userVotes[id] === true && ideasVMById[id] != null,
  ).length;
}

/* ─────────────────────────────────────────────────────────────
   Category "+N" popover
───────────────────────────────────────────────────────────── */

function closeAllCategoryPopovers(exceptId) {
  document.querySelectorAll(".ip-cat-pill--more-popover.is-open").forEach((pop) => {
    if (pop.id === exceptId) return;
    pop.classList.remove("is-open");
    const toggle = document.querySelector(`[data-cat-more-toggle="${pop.id}"]`);
    toggle?.setAttribute("aria-expanded", "false");
  });
}

// Popover uses position:fixed (see CSS) so it escapes any ancestor's
// overflow:hidden clipping — table cells clip content for ellipsis
// truncation, which would otherwise hide this popover too. Position is
// computed here relative to the toggle button instead of via CSS
// anchoring, and re-clamped to stay within the viewport.
function positionCategoryPopover(popover, toggle) {
  const rect = toggle.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 6;
  const maxLeft = window.innerWidth - popRect.width - 8;
  if (left > maxLeft) left = Math.max(8, maxLeft);
  if (top + popRect.height > window.innerHeight - 8) {
    top = rect.top - popRect.height - 6;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function bindCategoryPillPopovers() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-cat-more-toggle]");
    if (toggle) {
      const popoverId = toggle.getAttribute("data-cat-more-toggle");
      const popover = document.getElementById(popoverId);
      if (!popover) return;
      const willOpen = !popover.classList.contains("is-open");
      closeAllCategoryPopovers(willOpen ? popoverId : null);
      popover.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) positionCategoryPopover(popover, toggle);
      return;
    }
    if (!e.target.closest(".ip-cat-pill--more-popover")) {
      closeAllCategoryPopovers(null);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllCategoryPopovers(null);
  });
  window.addEventListener(
    "scroll",
    () => closeAllCategoryPopovers(null),
    true,
  );
  window.addEventListener("resize", () => closeAllCategoryPopovers(null));
}

/* ─────────────────────────────────────────────────────────────
   Modal helpers
───────────────────────────────────────────────────────────── */

// Measures the live height of any fixed/sticky header/nav bar so the
// modal's dialog renders below it instead of underneath it. Falls
// back to the CSS default if nothing is found (mirrors lp_team.html's
// thb-modal pattern).
function measureHeaderOffset(modalEl, cssVarName) {
  if (!modalEl) return;
  let bottom = 0;
  document
    .querySelectorAll('header, nav, [class*="breadcrumb"], [class*="nav"]')
    .forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.position === "sticky") {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 4 && rect.bottom > bottom) bottom = rect.bottom;
      }
    });
  if (bottom > 0) {
    modalEl.style.setProperty(cssVarName, `${Math.ceil(bottom) + 16}px`);
  }
}

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
  measureHeaderOffset(modal, "--ip-header-offset");
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
  if (modalId === "addIdeaModal") {
    editingDraftRecordID = null;
    editingDraftAttachmentLabel = "";
    setIdeaModalMode(false);
  }
}

function bindModalEvents() {
  document.querySelectorAll("[data-ip-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
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
        aria-label="View full size: ${filename} (opens in new window)">
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

// Single source of truth for a vote button's visible state, reused by
// every render path (table rows, detail modal, voted modal).
function voteButtonStateHtml(recordID, isVoted, isOwn, hasVoteRecordId) {
  const unavailable = isVoted && !isOwn && !hasVoteRecordId;
  if (isOwn) {
    return {
      classes: "is-own",
      disabled: true,
      ariaLabel: "You can't vote on your own idea",
      title: "You can't vote on your own idea",
      icon: "thumb_up",
      label: "",
    };
  }
  if (unavailable) {
    return {
      classes: "is-voted is-unavailable",
      disabled: true,
      ariaLabel:
        "Vote recorded, but could not be loaded for removal — refresh and try again",
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
      hoverIcon: "thumb_down",
      hoverLabel: "Unvote",
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

// Both spans exist in the DOM at once (CSS toggles visibility on
// hover/focus) — aria-hidden on both prevents "Voted Unvote" being
// announced together. The button's own aria-label is the sole
// accessible name.
function voteButtonInnerHtml(state) {
  if (state.hoverIcon) {
    return `<span class="ip-upvote__rest" aria-hidden="true">${iconSvg(state.icon)}${state.label ? ` ${state.label}` : ""}</span><span class="ip-upvote__hover" aria-hidden="true">${iconSvg(state.hoverIcon)} ${state.hoverLabel}</span>`;
  }
  return `${iconSvg(state.icon)}${state.label ? ` ${state.label}` : ""}`;
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
) {
  const voteState = voteButtonStateHtml(
    recordID,
    isVoted,
    isOwn,
    hasVoteRecordId,
  );
  const votesText = `${escapeHtml(String(votes))} ${votes === 1 ? "vote" : "votes"}`;
  const submitBtnHtml =
    isOwn && needsSubmit && !isDraft
      ? `<button type="button"
        class="ip-btn ip-btn--primary"
        data-detail-submit-draft="${escapeHtml(recordID)}"
        aria-label="Retry submitting idea #${escapeHtml(recordID)} — a previous submission didn't fully complete">
        ${iconSvg("send")}
        Retry Submit
      </button>`
      : "";
  return `<div class="ip-detail" id="ipDetailRoot">

    <div class="ip-detail__title-row">
      <span class="ip-detail__id" aria-label="Idea number ${escapeHtml(recordID)}">#${escapeHtml(recordID)}</span>
      <h2 class="ip-detail__title" id="ip-detail-title" tabindex="-1">${escapeHtml(title || "Idea Details")}</h2>
    </div>

    <div class="ip-detail__info-row" role="group" aria-label="Idea metadata">
      ${statusLabel ? `<span class="ip-detail__info-item"><span class="ip-detail__info-label">Status</span><span class="ip-badge ${getStatusBadgeClass(statusLabel)}" id="ip-detail-status-text">${escapeHtml(statusLabel)}</span></span><span class="ip-detail__info-sep" aria-hidden="true">·</span>` : ""}
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

    <section class="ip-detail__card" id="ip-detail-comment-card" aria-labelledby="ip-dl-comment" hidden>
      <span class="ip-detail__card-label" id="ip-dl-comment">Comments</span>
      <div class="ip-detail__card-body" id="ip-detail-comment-body"></div>
    </section>

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
        ${voteButtonInnerHtml(voteState)}
      </button>
      <button type="button"
        class="ip-share"
        data-record-link="${escapeHtml(RECORD_VIEW_URL + recordID)}"
        aria-label="Copy link to idea #${escapeHtml(recordID)}"
        title="Copy shareable link">
        ${iconSvg("share")}
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
  const statusLabel =
    vm?.status || (rawIdea ? resolveDisplayStatus(rawIdea) : "");
  const isDraft = rawIdea ? !isSubmittedIdea(rawIdea) : statusLabel === "Draft";
  const needsSubmit =
    vm?.needsSubmit ?? (rawIdea ? needsSubmitAction(rawIdea) : isDraft);
  const isOwn =
    vm?.isOwn === true ||
    Boolean(
      userID &&
      ideaOwnerMap[ridStr] &&
      String(ideaOwnerMap[ridStr]) === String(userID),
    );

  if (header) header.textContent = truncateTitle(title, MODAL_HEADER_TITLE_MAX_LENGTH) || "Idea Details";
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

  const commentText =
    vm?.comment || sanitizeLeafValue(getIdeaField(rawIdea, IDEA_INDICATORS.comment, "comment"));
  if (commentText && commentText.trim()) {
    const commentCard = document.getElementById("ip-detail-comment-card");
    const commentBody = document.getElementById("ip-detail-comment-body");
    if (commentCard && commentBody) {
      commentBody.textContent = commentText;
      commentCard.hidden = false;
    }
  }

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
      btn.innerHTML = voteButtonInnerHtml(state);
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
  measureHeaderOffset(modal, "--ip-header-offset");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  // Focus the title so a screen reader announces the idea being viewed
  // first, rather than landing on "Close" with no context.
  document.getElementById("ip-detail-title")?.focus();

  await Promise.allSettled([
    populateDetailField(ridStr, 5, {
      onValue(val) {
        const h2 = document.getElementById("ip-detail-title");
        if (h2 && val) h2.textContent = val;
        if (header && val) header.textContent = truncateTitle(val, MODAL_HEADER_TITLE_MAX_LENGTH);
      },
    }),
    populateDetailField(ridStr, 6),
    populateDetailField(ridStr, 7),
    populateDetailField(ridStr, 8, {
      renderHtml(val) {
        return renderCategoryPills(parseCategoryValue(val), { showAll: true });
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
      if (!recordID) return;

      const isDraftRecord =
        ideasVMById[recordID]?.isDraft ??
        myIdeasCache.find((i) => String(i.recordID) === String(recordID))
          ?.isDraft;
      if (isDraftRecord) {
        openDraftForEditing(recordID);
        return;
      }

      openIdeaDetailModal(recordID, title, href);
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

  const resolve = (norm) => {
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
    if (["in backlog", "backlog"].includes(norm)) return "backlog";
    if (["in development", "in-development", "development"].includes(norm))
      return "in_development";
    if (
      ["need more information", "needs more information", "need more info"].includes(
        norm,
      )
    )
      return "need_more_info";
    if (
      ["unlikely to implement", "unlikely"].includes(norm)
    )
      return "unlikely";
    return norm;
  };

  if (statusOptionsList.length) {
    const exact = statusOptionsList.find(
      (opt) => normalizeStatusLabel(opt).toLowerCase() === s,
    );
    if (exact) return resolve(normalizeStatusLabel(exact).toLowerCase());
  }

  return resolve(s);
}

function getIdeaStatusRaw(idea) {
  return getIdeaField(idea, IDEA_INDICATORS.status, "status");
}

function isSubmittedIdea(idea) {
  const dateSubmitted = sanitizeLeafValue(
    getIdeaField(idea, `id${IDEA_FIELDS.date_submitted}`, "date_submitted"),
  );
  return Boolean(dateSubmitted);
}

// LEAF's "Send back to requestor" workflow action only emails the
// requestor — it never touches status/date_submitted. The reliable
// signal is the workflow step: sendback always returns to stepID -1,
// the same sentinel step a never-submitted draft starts at.
async function isSentBackToRequestor(recordID) {
  try {
    const res = await fetch(
      `./api/formWorkflow/${encodeURIComponent(recordID)}/currentStep`,
      { credentials: "same-origin", cache: "no-store" },
    );
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    const steps = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? Object.values(data)
        : [];
    if (!steps.length) return true;
    return steps.some((s) => Number(s?.stepID ?? s?.dependencyID) === -1);
  } catch (err) {
    console.warn("[SendBack] Could not check current step:", err);
    return false;
  }
}

// Reverts a sent-back record to draft: blanks status (12) and
// date_submitted (15). isSentBackToRequestor()'s stepID -1 signal can
// false-positive on normal submitted records, so this re-checks each
// field's current value first and only clears a field that is already
// blank — it never overwrites existing data. Returns false both on
// fetch failure and when nothing needed clearing (record was already
// fine), so the caller can distinguish "no repair happened" from "a
// repair succeeded."
async function repairSentBackRecord(recordID) {
  const postField = async (fieldNum, value, label) => {
    const body = new URLSearchParams({
      CSRFToken: csrfToken,
      recordID: String(recordID),
      series: "1",
      [fieldNum]: value,
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
          `[SendBack] ${label} write failed for ${recordID} (HTTP ${res.status})`,
        );
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`[SendBack] Network error writing ${label}:`, err);
      return false;
    }
  };

  let currentStatus = "";
  let currentDate = "";
  try {
    const data = await leafFetchQuery(
      {
        terms: [
          { id: "recordID", operator: "=", match: String(recordID), gate: "AND" },
        ],
        joins: [],
        sort: {},
        getData: [String(IDEA_FIELDS.status), String(IDEA_FIELDS.date_submitted)],
      },
      "recordID,s1",
    );
    const record = Object.values(data || {})[0];
    currentStatus = sanitizeLeafValue(
      getIdeaField(record, IDEA_INDICATORS.status, "status"),
    );
    currentDate = sanitizeLeafValue(
      getIdeaField(record, `id${IDEA_FIELDS.date_submitted}`, "date_submitted"),
    );
  } catch (err) {
    console.warn(
      `[SendBack] Could not fetch current field values for record ${recordID} — skipping clear to avoid overwriting real data:`,
      err,
    );
    return false;
  }

  let dateCleared = true;
  if (!currentDate) {
    dateCleared = await postField(
      IDEA_FIELDS.date_submitted,
      "",
      "date_submitted",
    );
  }

  let statusCleared = true;
  if (!currentStatus) {
    statusCleared = await postField(IDEA_FIELDS.status, "", "status");
  }

  if (currentDate && currentStatus) {
    // Both fields already had values — nothing was actually cleared.
    return false;
  }

  if (!dateCleared) {
    console.warn(
      `[SendBack] Record ${recordID} still has date_submitted set — it will keep showing as submitted until this is retried.`,
    );
  }
  return dateCleared || statusCleared;
}

function needsSubmitAction(idea) {
  if (!isSubmittedIdea(idea)) return true;
  const recordID = idea?.recordID ? String(idea.recordID) : "";
  return recordID ? workflowIncompleteRecordIds.has(recordID) : false;
}

// Tracks recordIDs where writeDateSubmitted() succeeded but
// advanceWorkflow()'s /apply call failed in the same browser session.
let workflowIncompleteRecordIds = new Set();

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
  const comment = sanitizeLeafValue(
    getIdeaField(idea, IDEA_INDICATORS.comment, "comment"),
  );
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
    comment,
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
   Status resolution — single source of truth
───────────────────────────────────────────────────────────── */

function resolveDisplayStatus(idea) {
  if (!idea) return "";
  if (!isSubmittedIdea(idea)) return "Draft";
  const statusRaw = getIdeaStatusRaw(idea);
  return normalizeStatusLabel(sanitizeLeafValue(statusRaw)) || "Submitted";
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
  duplicate: "ip-badge--unlikely",
  discarded: "ip-badge--unlikely",
  draft: "ip-badge--draft",
  backlog: "ip-badge--backlog",
  in_development: "ip-badge--progress",
  need_more_info: "ip-badge--unlikely",
  unlikely: "ip-badge--unlikely",
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
  const statusMarkup = `<span class="ip-badge ${statusBadgeClass}" title="${escapeHtml(statusLabel)}" aria-label="${escapeHtml(statusLabel)}">${escapeHtml(statusLabel)}</span>`;

  const votes = idea.votes || 0;
  const isVoted = idea.isVoted === true;
  const isOwn = idea.isOwn === true;
  const isDraft = idea.isDraft === true;
  const needsSubmit = idea.needsSubmit === true;
  const recordLink = idea.recordLink || `${RECORD_VIEW_URL}${recordID}`;
  const labelTitle = title || `Idea ${recordID}`;
  const hasVoteRecordId = Boolean(myVoteRecordIdByIdea[recordID]);
  const voteState = voteButtonStateHtml(
    recordID,
    isVoted,
    isOwn,
    hasVoteRecordId,
  );

  const shareBtnHtml = `<button class="ip-share"
        data-record-link="${escapeHtml(recordLink)}"
        aria-label="Copy link for ${labelTitle}"
        title="Copy shareable link">
        ${iconSvg("share")}
        Share
      </button>`;

  const comment = idea.comment || "";
  const commentCellHtml = comment
    ? `<button type="button" class="ip-commentBtn"
        data-comment-view="${recordID}"
        data-comment-text="${escapeHtml(comment)}"
        data-comment-title="${labelTitle}"
        aria-label="View LEAF team comment for ${labelTitle}"
        aria-haspopup="dialog"
        title="${escapeHtml(truncateTitle(comment, 160))}">
        ${iconSvg("comment")}
        View
      </button>`
    : "";

  const submitBtnHtml =
    isOwn && needsSubmit
      ? isDraft
        ? `<button class="ip-btn ip-btn--ghost ip-editDraftBtn"
            data-submit-draft-id="${recordID}"
            aria-label="Continue editing draft: ${labelTitle}"
            title="Continue editing draft">
            ${iconSvg("edit")}
            Edit
          </button>`
        : `<button class="ip-btn ip-btn--primary ip-submitDraftBtn"
            data-submit-draft-id="${recordID}"
            aria-label="Retry submitting ${labelTitle} — a previous submission didn't fully complete">
            ${iconSvg("send")}
            Retry Submit
          </button>`
      : "";

  const votingAndSharingHtml = isDraft
    ? ""
    : `        <button class="ip-upvote${voteState.classes ? " " + voteState.classes : ""}"
          data-record-id="${recordID}"
          ${voteState.disabled ? "disabled" : ""}
          aria-label="${escapeHtml(voteState.ariaLabel)}"
          aria-disabled="${voteState.disabled}"
          title="${escapeHtml(voteState.title)}">
          ${voteButtonInnerHtml(voteState)}
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
        <div class="ip-actionsInner">
          ${submitBtnHtml}
          ${votingAndSharingHtml}
          ${!submitBtnHtml && !votingAndSharingHtml ? `<span class="ip-actionsEmpty">No actions available</span>` : ""}
        </div>
      </td>
      <td class="ip-commentCell" data-label="Comment">${commentCellHtml}</td>
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
  tbody.innerHTML = rowsHtml || `<tr><td colspan="7">${emptyMessage}</td></tr>`;
}

function renderTableMessage(tbody, message, opts = {}) {
  if (!tbody) return;
  const btn = opts.retry
    ? ` <button type="button" class="ip-btn ip-btn--ghost ip-retry">Retry</button>`
    : "";
  tbody.innerHTML = `<tr><td colspan="7">${escapeHtml(message || "")}${btn}</td></tr>`;
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
      : `Showing ${PAGE_SIZE} per page`;
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
  updateTabCount("all", filtered.length);
}

function renderMyIdeas() {
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
  updateTabCount("my", filteredByCategory.length);
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
    if (
      btn.classList.contains("is-own") ||
      btn.classList.contains("is-unavailable")
    ) {
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
      btn.innerHTML = voteButtonInnerHtml(state);
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
      if (
        document.getElementById("ipVotedModal")?.classList.contains("is-open")
      ) {
        refreshVotedRowActions(key);
      }

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
   Uses LEAF's soft-delete route (POST .../cancel → Form::cancelRecord())
   with suppressNotification=1 to avoid stray emails, since vote records
   don't go through a workflow.
───────────────────────────────────────────────────────────── */

async function deleteVoteRecord(voteRecordID) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    suppressNotification: "1",
  });

  try {
    const res = await fetch(
      `./api/form/${encodeURIComponent(voteRecordID)}/cancel`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: body.toString(),
      },
    );
    if (!res.ok) return false;
    const text = (await res.text()).trim();
    return text === "1" || text === '"1"';
  } catch (err) {
    console.warn("[UnVote] Network error deleting vote record:", err);
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
      `[UnVote] No tracked vote record ID for idea ${key} — cannot un-vote.`,
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

    if (
      document.getElementById("ipVotedModal")?.classList.contains("is-open")
    ) {
      votedModalState.allRows = votedModalState.allRows.filter(
        (row) => row.id !== key,
      );
      renderVotedTable();
    }

    const detailVoteBtn = document.querySelector(`[data-detail-vote="${key}"]`);
    if (detailVoteBtn) {
      const state = voteButtonStateHtml(key, false, false, false);
      detailVoteBtn.className = `ip-upvote${state.classes ? " " + state.classes : ""}`;
      detailVoteBtn.disabled = state.disabled;
      detailVoteBtn.setAttribute("aria-label", state.ariaLabel);
      detailVoteBtn.innerHTML = voteButtonInnerHtml(state);
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
          if (
            voteRecId !== undefined &&
            voteRecId !== null &&
            voteRecId !== ""
          ) {
            myVoteRecordIdByIdea[key] = String(voteRecId);
          } else {
            console.warn(
              `[UnVote] Could not resolve a vote record ID for idea ${key} — un-voting will be unavailable until this is fixed.`,
              vote,
            );
          }
        }
      }
    });

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
    if (state.activeTab === "my") refreshCategorySidebarForActiveTab();

    const recordsNeedingStatusRepair = userIdeas.filter((idea) => {
      if (!isSubmittedIdea(idea)) return false;
      const key = canonicalStatusKey(getIdeaStatusRaw(idea));
      if (key) return false;
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

    // Ideas with a real status already recorded are done being
    // reviewed and can't legitimately be in a sent-back state, so
    // skip the /currentStep check for them entirely.
    const recordsToCheckForSendBack = userIdeas.filter((idea) => {
      if (!isSubmittedIdea(idea)) return false;
      if (canonicalStatusKey(getIdeaStatusRaw(idea))) return false;
      return !sendBackRepairFailed.has(String(idea.recordID));
    });
    if (recordsToCheckForSendBack.length) {
      const sendBackFlags = await Promise.all(
        recordsToCheckForSendBack.map((idea) =>
          isSentBackToRequestor(idea.recordID),
        ),
      );
      const sentBackRecords = recordsToCheckForSendBack.filter(
        (_, i) => sendBackFlags[i],
      );
      if (sentBackRecords.length) {
        const repairResults = await Promise.all(
          sentBackRecords.map((idea) => repairSentBackRecord(idea.recordID)),
        );
        sentBackRecords.forEach((idea, i) => {
          const key = String(idea.recordID);
          if (repairResults[i]) {
            sendBackRepairFailed.delete(key);
          } else {
            sendBackRepairFailed.add(key);
          }
        });
        if (repairResults.some(Boolean)) {
          await fetchUserSubmissions();
          await loadIdeasAndVotes();
        }
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

  await resolveVoterEmail();

  try {
    const [ideasData] = await Promise.all([fetchIdeasData(), fetchVotesData()]);

    ideasRaw = ideasData;

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
   Calls only LEAF's /submit route, which places a newly-submitted
   record at the workflow's first step automatically. No separate
   /apply call — that's for a reviewer acting on an existing step, and
   calling it at submission time was firing whichever reviewer action
   happened to be first in the response, auto-returning ideas to the
   requestor on submit.
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
    return true;
  } catch (err) {
    console.warn("[Workflow] submit failed:", err);
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
    console.warn(`[DateSubmit] HTTP ${res.status}:`, text);
    return false;
  } catch (err) {
    console.warn("[DateSubmit] Network error:", err);
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

// Writes a real "Submitted" status so a newly-submitted record isn't
// permanently excluded from the public All Ideas list by a blank status.
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
    console.warn(`[SubmitStatus] HTTP ${res.status}:`, text);
    return false;
  } catch (err) {
    console.warn("[SubmitStatus] Network error:", err);
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
    const labelText = isEditing ? "Continue Your Idea" : "Share Your Idea";
    const icon = titleEl.querySelector(".ip-icon");
    titleEl.innerHTML = "";
    if (icon) titleEl.appendChild(icon);
    titleEl.appendChild(document.createTextNode(labelText));
  }
  if (submitBtn) {
    const label = submitBtn.querySelector(".ip-icon");
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
      `[SubmitDraft] No raw record found for ${ridStr} in ideasById — cannot open edit form.`,
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

  setVal(
    "inpTitle",
    sanitizeLeafValue(getIdeaField(raw, IDEA_INDICATORS.title, "title")),
  );
  updateTitleCharCount();

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
    const attachHintText = document.getElementById("currentAttachmentText");
    if (attachHint) {
      if (editingDraftAttachmentLabel) {
        attachHint.hidden = false;
        if (attachHintText) {
          attachHintText.textContent = `Currently attached: ${editingDraftAttachmentLabel}. Uploading a new file will replace it; leaving this blank keeps the current attachment.`;
        }
      } else {
        attachHint.hidden = true;
        if (attachHintText) attachHintText.textContent = "";
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
  const titleValue = val("inpTitle").slice(0, TITLE_MAX_LENGTH);
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
      const allFiles = fileInputEl?.files ? Array.from(fileInputEl.files) : [];
      const files = allFiles.filter(isAcceptedAttachmentFile);
      const rejectedFiles = allFiles.filter(
        (f) => !isAcceptedAttachmentFile(f),
      );
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
      updateTitleCharCount();
      if (fileInputEl) fileInputEl.value = "";
      const fileList = document.getElementById("fileList");
      if (fileList) fileList.innerHTML = "";
      const attachHint = document.getElementById("currentAttachmentHint");
      if (attachHint) {
        attachHint.hidden = true;
        const attachHintText = document.getElementById("currentAttachmentText");
        if (attachHintText) attachHintText.textContent = "";
      }
      editingDraftRecordID = null;
      editingDraftAttachmentLabel = "";
      setIdeaModalMode(false);
      closeModal("addIdeaModal");

      let attachmentNote = "";
      if (rejectedFiles.length && !files.length) {
        attachmentNote = ` Note: the file you selected (${rejectedFiles.map((f) => f.name).join(", ")}) is not a supported type (${ACCEPTED_ATTACHMENT_LABEL}) and was not attached.`;
      } else if (attachmentResult && !attachmentResult.success) {
        attachmentNote =
          " Note: your idea saved, but the attached file could not be uploaded. You can try attaching it again by editing this idea.";
      }

      if (advanceOnSuccess) {
        const dateWritten = await writeDateSubmitted(newID, todayStr);
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
      "[IdeaPortal] Could not load live status options for indicator 12:",
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

function bindTitleCharCount() {
  const input = document.getElementById("inpTitle");
  const countValue = document.getElementById("titleCharCountValue");
  const countWrap = document.getElementById("titleCharCount");
  if (!input || !countValue || !countWrap) return;

  input.addEventListener("input", () => {
    if (input.value.length > TITLE_MAX_LENGTH) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.slice(0, TITLE_MAX_LENGTH);
      if (start !== null && end !== null) {
        const pos = Math.min(start, TITLE_MAX_LENGTH);
        input.setSelectionRange(pos, pos);
      }
    }
    updateTitleCharCount();
  });
  updateTitleCharCount();
}

function updateTitleCharCount() {
  const input = document.getElementById("inpTitle");
  const countValue = document.getElementById("titleCharCountValue");
  const countWrap = document.getElementById("titleCharCount");
  if (!input || !countValue || !countWrap) return;
  const len = input.value.length;
  countValue.textContent = len;
  countWrap.classList.toggle("is-limit", len >= TITLE_MAX_LENGTH);
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

function bindClearAll() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    sortState.tblIdeas = { key: "id", dir: "desc" };
    applySortClasses("tblIdeas");
    renderAllIdeas();
  });
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

function bindClearMy() {
  const clearBtn = document.getElementById("clearMyBtn");
  if (!clearBtn) return;
  clearBtn.addEventListener("click", () => {
    sortState.tblMyIdeas = { key: "id", dir: "desc" };
    applySortClasses("tblMyIdeas");
    renderMyIdeas();
  });
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

function buildVotedActionsCell(id, idea) {
  if (!idea) return "";
  const isVoted = userVotes[id] === true;
  const isOwn = idea.isOwn === true;
  const hasVoteRecordId = Boolean(myVoteRecordIdByIdea[id]);
  const voteState = voteButtonStateHtml(id, isVoted, isOwn, hasVoteRecordId);
  const recordLink = idea.recordLink || `${RECORD_VIEW_URL}${id}`;
  const labelTitle = idea.title || `Idea ${id}`;
  return `<div class="ip-actionsInner">
    <button class="ip-upvote${voteState.classes ? " " + voteState.classes : ""}"
      data-record-id="${escapeHtml(id)}"
      ${voteState.disabled ? "disabled" : ""}
      aria-label="${escapeHtml(voteState.ariaLabel)}"
      aria-disabled="${voteState.disabled}"
      title="${escapeHtml(voteState.title)}">
      ${voteButtonInnerHtml(voteState)}
    </button>
    <button class="ip-share"
      data-record-link="${escapeHtml(recordLink)}"
      aria-label="Copy link for ${escapeHtml(labelTitle)}"
      title="Copy shareable link">
      ${iconSvg("share")}
      Share
    </button>
  </div>`;
}

function buildVotedRow(id, idea) {
  if (!idea) {
    return `<tr data-voted-id="${escapeHtml(id)}">
      <td data-label="ID"><span style="color:var(--ip-muted)">#${escapeHtml(id)}</span></td>
      <td class="ip-cardHeading" data-label="Idea" style="color:var(--ip-muted);font-style:italic" colspan="5">Idea not available</td>
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
    <td class="ip-col-title ip-cardHeading" data-label="Title" title="${titleFull}">
      <a class="ip-recordLink ip-recordLink--title" href="${recordLink}" data-record-id="${escapeHtml(id)}" data-title="${titleFull}" aria-haspopup="dialog">${titleDisplay}</a>
    </td>
    <td data-label="Category">${category}</td>
    <td data-label="Status"><span class="ip-badge ${statusBadgeClass}" title="${escapeHtml(statusLabel)}" aria-label="${escapeHtml(statusLabel)}">${escapeHtml(statusLabel)}</span></td>
    <td data-label="Votes">${votes}</td>
    <td class="ip-actionsCell" data-label="Actions">${buildVotedActionsCell(id, idea)}</td>
  </tr>`;
}

function refreshVotedRowActions(id) {
  const row = document.querySelector(`tr[data-voted-id="${id}"]`);
  if (!row) return;
  const idea = votedModalState.allRows.find((r) => r.id === id)?.idea;
  const cell = row.querySelector(".ip-actionsCell");
  if (cell && idea) cell.innerHTML = buildVotedActionsCell(id, idea);
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

  // Empty/no-results states use role="status" (in the markup) so a
  // screen reader is told when a search comes back empty.
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
  measureHeaderOffset(modal, "--ip-header-offset");
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

function bindClearVoted() {
  const btn = document.getElementById("clearVotedBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    votedModalState.sort = { key: "id", dir: "asc" };
    renderVotedTable();
  });
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

  bindClearVoted();

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

/* ─────────────────────────────────────────────────────────────
   Comment modal
───────────────────────────────────────────────────────────── */

let lastCommentFocusedElement = null;

function openCommentModal(title, commentText) {
  const modal = document.getElementById("ipCommentModal");
  const body = document.getElementById("ipCommentModalBody");
  const heading = document.getElementById("ipCommentModalTitle");
  if (!modal || !body) return;

  if (heading) heading.textContent = title ? `LEAF Team Comment: ${title}` : "LEAF Team Comment";
  body.textContent = commentText || "";

  lastCommentFocusedElement = document.activeElement;
  measureHeaderOffset(modal, "--ip-header-offset");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  document.getElementById("ipCommentModalCloseBtn")?.focus();
}

function closeCommentModal() {
  const modal = document.getElementById("ipCommentModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  delete modal.dataset.focusTrap;
  setBackgroundHidden(false);
  lastCommentFocusedElement?.focus();
  lastCommentFocusedElement = null;
}

function bindCommentModal() {
  document
    .getElementById("ipCommentModalCloseBtn")
    ?.addEventListener("click", closeCommentModal);
  document
    .getElementById("ipCommentModalOverlay")
    ?.addEventListener("click", closeCommentModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("ipCommentModal");
      if (modal?.classList.contains("is-open")) closeCommentModal();
    }
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-comment-view]");
    if (!btn) return;
    openCommentModal(
      btn.getAttribute("data-comment-title") || "",
      btn.getAttribute("data-comment-text") || "",
    );
  });
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

// Runs in a real browser (not the artifacts sandbox), so localStorage is
// available. Falls through silently if storage is blocked (private
// browsing, org policy, etc.) rather than showing the modal on a lookup
// failure.
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
    // Non-fatal — modal will just show again next visit.
  }
}

/* ─────────────────────────────────────────────────────────────
   Background sendback recheck
───────────────────────────────────────────────────────────── */

const SENDBACK_POLL_MS = 3 * 60 * 1000;
let sendBackRecheckInProgress = false;

async function recheckMyIdeasForSendBack() {
  if (sendBackRecheckInProgress || document.hidden) return;
  sendBackRecheckInProgress = true;
  try {
    await fetchUserSubmissions();
  } catch (err) {
    console.warn("[SendBack] Background recheck failed:", err);
  } finally {
    sendBackRecheckInProgress = false;
  }
}

function bindSendBackRecheck() {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) recheckMyIdeasForSendBack();
  });
  setInterval(recheckMyIdeasForSendBack, SENDBACK_POLL_MS);
}

function initPortal() {
  cacheElements();
  bindModalEvents();
  bindTabs();
  bindRecordModal();
  bindVotedModal();
  bindCommentModal();
  bindActivityButtons();
  bindHowItWorksModal();
  bindDelegatedEvents();
  bindSearch();
  bindMySearch();
  bindClearAll();
  bindClearMy();
  bindFileInput();
  bindCategoryChange();
  bindImplementedChange();
  bindTitleCharCount();
  bindSendBackRecheck();
  bindCategoryPillPopovers();
  bindTableScrollEdges();
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