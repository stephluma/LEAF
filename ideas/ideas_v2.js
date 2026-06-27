const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;
const RECORD_VIEW_URL =
  "https://leaf.va.gov/platform/ideas/index.php?a=printview&recordID=";

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
];

// Fields to retrieve for vote records
const VOTE_GETDATA = [
  String(VOTE_FIELDS.idea),
  String(VOTE_FIELDS.user),
];

// x-filterData values — keep s1 so indicator data is preserved,
// drop unused top-level metadata for bandwidth savings
const IDEA_FILTER_DATA = "recordID,title,created_date,userID,s1";
const VOTE_FILTER_DATA  = "recordID,s1";

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

// Material Symbols Filled variation settings
const ICON_FILL = `'opsz' 24, 'wght' 400, 'FILL' 1, 'GRAD' 0`;

let ideas         = [];
let ideasRaw      = [];
let ideasById     = {};
let ideasVMById   = {};
let ideaOwnerMap  = {};
let voteCounts    = {};

const portalConfig = window.leafIdeaPortal || {};
const debugEnabled = portalConfig?.debug === true;

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

function sanitizeLeafValue(value) {
  return String(value || "")
    .replace(/<!--|-->/g, "")
    .trim();
}

function logDebug(message, data) {
  if (!debugEnabled) return;
  data !== undefined
    ? console.log("IdeaPortal debug:", message, data)
    : console.log("IdeaPortal debug:", message);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateTitle(title, max = 100) {
  if (!title) return "";
  return title.length <= max ? title : `${title.substring(0, max).trimEnd()}…`;
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
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: body.toString(),
    credentials: "same-origin",
  });

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}

/* ─────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────── */

const userID    = sanitizeLeafValue(portalConfig.userID);
const csrfToken = sanitizeLeafValue(portalConfig.csrfToken);

let userVotes = (() => {
  try { return JSON.parse(localStorage.getItem("leafIdeaVotes") || "{}"); }
  catch { return {}; }
})();

let votingInProgress    = false;
let ideaSubmitInProgress = false;
let implementedCount    = 0;
let myIdeasCache        = [];
let lastFocusedElement  = null;
let lastRecordFocusedElement = null;

const state = {
  search: "",
  categoryFilter: "all",
  pagination: {
    all: { page: 1, showAll: false },
    my:  { page: 1, showAll: false },
  },
};

const sortState = {
  tblIdeas:    { key: "", dir: "asc" },
  tblTopIdeas: { key: "", dir: "desc" },
  tblMyIdeas:  { key: "", dir: "asc" },
};

const ui = {
  results:    null,
  topResults: null,
  myResults:  null,
  searchInput: null,
  searchBtn:   null,
  status:     { all: null, my: null },
  pagination: { all: null, my: null },
  pageInfo:   { all: null, my: null },
  pageHint:   { all: null, my: null },
  panels:     { all: null, my: null },
};

/* ─────────────────────────────────────────────────────────────
   DOM cache
───────────────────────────────────────────────────────────── */

function cacheElements() {
  ui.results    = document.getElementById("results");
  ui.topResults = document.getElementById("topResults");
  ui.myResults  = document.getElementById("myResults");
  ui.searchInput = document.getElementById("searchInput");
  ui.searchBtn   = document.getElementById("searchBtn");
  ui.status.all  = document.getElementById("allStatus");
  ui.status.my   = document.getElementById("myStatus");
  ui.pagination.all = document.getElementById("allPagination");
  ui.pagination.my  = document.getElementById("myPagination");
  ui.pageInfo.all   = document.getElementById("allPageInfo");
  ui.pageInfo.my    = document.getElementById("myPageInfo");
  ui.pageHint.all   = document.getElementById("allPageHint");
  ui.pageHint.my    = document.getElementById("myPageHint");
  ui.panels.all     = document.getElementById("panel-all");
  ui.panels.my      = document.getElementById("panel-my");
}

/* ─────────────────────────────────────────────────────────────
   Toast
───────────────────────────────────────────────────────────── */

let _toastTimer = null;

function showToast(msg, isError = false) {
  const toast = document.getElementById("ipToast");
  if (!toast) return;
  toast.textContent = msg || "";
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(hideToast, 4000);
}

function hideToast() {
  document.getElementById("ipToast")?.classList.remove("is-visible");
}

/* ─────────────────────────────────────────────────────────────
   Debug Panel
───────────────────────────────────────────────────────────── */

const PortalDebug = (() => {
  const $ = id => document.getElementById(id);

  const colorFor = status =>
    status === "success" ? "#4ade80"
    : status === "error"   ? "#f87171"
    : status === "loading" ? "#facc15"
    : "#94a3b8";

  const iconFor = status =>
    status === "success" ? "✅"
    : status === "error"   ? "❌"
    : status === "loading" ? "⏳"
    : "○";

  const dbgState = {
    dom: "initializing",
    leaf: "unknown",
    ideas: { status: "pending", count: 0, error: null },
    votes: { status: "pending", count: 0, error: null },
    stats: { total: "—", implemented: "—", votes: "—" },
    initFired: false,
    tables: { results: 0, topResults: 0, myResults: 0 },
  };

  function render() {
    const panel = $("ipDebugPanel");
    if (!panel) return;

    const domEl = $("ipDbgDom");
    if (domEl) {
      domEl.textContent = `🌐 DOM readyState: ${dbgState.dom}`;
      domEl.style.color = ["complete","interactive"].includes(dbgState.dom) ? "#4ade80" : "#facc15";
    }

    const leafEl = $("ipDbgLeaf");
    if (leafEl) {
      const ok = typeof LeafFormQuery !== "undefined";
      leafEl.textContent = `📦 LeafFormQuery: ${ok ? "available ✅" : "NOT FOUND ❌"}`;
      leafEl.style.color = ok ? "#4ade80" : "#f87171";
    }

    const userEl = $("ipDbgUser");
    if (userEl) {
      const uid = (window.leafIdeaPortal || {}).userID || "(none)";
      const isReal = uid && !uid.includes("<!--");
      userEl.textContent = `👤 userID: ${isReal ? uid.substring(0, 20) : "(Smarty not rendering — check CMS)"}`;
      userEl.style.color = isReal ? "#4ade80" : "#f87171";
    }

    const initEl = $("ipDbgInit");
    if (initEl) {
      initEl.textContent = `🔧 init fired: ${dbgState.initFired ? "yes ✅" : "NO"}`;
      initEl.style.color = dbgState.initFired ? "#4ade80" : "#f87171";
    }

    const ideasEl = $("ipDbgIdeas");
    if (ideasEl) {
      const i = dbgState.ideas;
      ideasEl.textContent = `${iconFor(i.status)} Ideas query: ${i.status}${i.count ? ` — ${i.count} records` : ""}${i.error ? ` | ERR: ${i.error}` : ""}`;
      ideasEl.style.color = colorFor(i.status);
    }

    const votesEl = $("ipDbgVotes");
    if (votesEl) {
      const v = dbgState.votes;
      votesEl.textContent = `${iconFor(v.status)} Votes query: ${v.status}${v.count ? ` — ${v.count} records` : ""}${v.error ? ` | ERR: ${v.error}` : ""}`;
      votesEl.style.color = colorFor(v.status);
    }

    const statsEl = $("ipDbgStats");
    if (statsEl) {
      statsEl.textContent = `📊 Stats → total: ${dbgState.stats.total} | implemented: ${dbgState.stats.implemented} | votes: ${dbgState.stats.votes}`;
    }

    const tableEl = $("ipDbgTable");
    if (tableEl) {
      const t = dbgState.tables;
      tableEl.textContent = `📋 Rows rendered → All: ${t.results} | Top10: ${t.topResults} | Mine: ${t.myResults}`;
    }
  }

  function wireToggle() {
    const btn  = $("ipDbgToggle");
    const body = $("ipDbgBody");
    const icon = $("ipDbgToggleIcon");
    if (!btn || !body) return;
    btn.addEventListener("click", () => {
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "grid" : "none";
      if (icon) icon.textContent = hidden ? "▼" : "▲";
    });
  }

  function set(key, value) {
    const parts = key.split(".");
    let obj = dbgState;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    render();
  }

  return {
    init() { wireToggle(); dbgState.dom = document.readyState; render(); },
    set,
    error(msg) {
      const el = $("ipDbgErr");
      if (el) { el.style.display = "block"; el.textContent = `🚨 ${msg}`; }
      render();
    },
    render,
  };
})();

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
  PortalDebug.set("stats.total", totalIdeas);
  PortalDebug.set("stats.implemented", implemented);
  PortalDebug.set("stats.votes", totalVotes);
}

/* ─────────────────────────────────────────────────────────────
   Category sidebar
───────────────────────────────────────────────────────────── */

function buildCategorySidebar(ideaList) {
  const catList = document.getElementById("catList");
  if (!catList) return;

  const counts = {};
  let total = 0;
  (ideaList || []).forEach(idea => {
    const cat = (idea.category || "").trim() || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
    total++;
  });

  const allCountEl = document.getElementById("ip-cat-count-all");
  if (allCountEl) allCountEl.textContent = total;

  // Remove previously injected items
  catList.querySelectorAll("li[data-cat]").forEach(li => {
    if (!li.querySelector("[data-cat='all']")) catList.removeChild(li);
  });

  Object.keys(counts).sort((a, b) => a.localeCompare(b)).forEach(cat => {
    const li = document.createElement("li");
    li.setAttribute("data-cat", cat);
    li.innerHTML = `
      <button class="ip-catItem" data-cat="${escapeHtml(cat)}" type="button">
        <span>${escapeHtml(cat)}</span>
        <span class="ip-catCount">${counts[cat]}</span>
      </button>`;
    catList.appendChild(li);
  });

  catList.addEventListener("click", e => {
    const btn = e.target.closest(".ip-catItem");
    if (!btn) return;
    const cat = btn.getAttribute("data-cat") || "all";
    state.categoryFilter = cat;
    state.pagination.all.page = 1;
    catList.querySelectorAll(".ip-catItem").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderAllIdeas();
  });
}

/* ─────────────────────────────────────────────────────────────
   Recently added bar
───────────────────────────────────────────────────────────── */

function renderRecentChips(ideaList) {
  const bar   = document.getElementById("ipRecentBar");
  const chips = document.getElementById("ipRecentChips");
  if (!bar || !chips) return;

  const recent = [...(ideaList || [])]
    .filter(i => i?.created_date)
    .sort((a, b) => (Number(b.created_date) || 0) - (Number(a.created_date) || 0))
    .slice(0, 5);

  if (!recent.length) { bar.hidden = true; return; }

  chips.innerHTML = recent.map(idea => {
    const label = escapeHtml(truncateTitle(idea.title || `Idea ${idea.recordID}`, 40));
    const url   = escapeHtml(idea.recordLink || `${RECORD_VIEW_URL}${idea.recordID}`);
    const title = escapeHtml(idea.title || `Idea ${idea.recordID}`);
    return `<button class="ip-recentChip" type="button"
      data-chip-id="${escapeHtml(String(idea.recordID))}"
      data-chip-url="${url}"
      data-chip-title="${title}"
      aria-label="View idea: ${title}">${label}</button>`;
  }).join("");

  bar.hidden = false;
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
  el.classList.toggle("is-error",   type === "error");
  el.classList.toggle("is-loading", type === "loading");
}

/* ─────────────────────────────────────────────────────────────
   Modal helpers
───────────────────────────────────────────────────────────── */

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
}

function bindFocusTrap(container) {
  if (container.dataset.focusTrap === "true") return;
  container.dataset.focusTrap = "true";
  container.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const focusable = getFocusableElements(container);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

function setBackgroundHidden(hidden) {
  const main = document.querySelector(".ip-wrap");
  if (main) {
    hidden ? main.setAttribute("aria-hidden", "true") : main.removeAttribute("aria-hidden");
  }
  const jump = document.getElementById("ipJumpTopBtn");
  if (jump) {
    hidden ? jump.setAttribute("aria-hidden", "true") : jump.removeAttribute("aria-hidden");
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  const target = modal.querySelector("input, select, textarea") || getFocusableElements(modal)[0];
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
}

function bindModalEvents() {
  document.querySelectorAll("[data-ip-open]").forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.dataset.ipOpen));
  });
  document.querySelectorAll("[data-ip-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.ipClose));
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".ip-modal.is-open").forEach(m => closeModal(m.id));
  });
}

/* ─────────────────────────────────────────────────────────────
   Tabs
───────────────────────────────────────────────────────────── */

function bindTabs() {
  const tabs   = Array.from(document.querySelectorAll(".ip-tab"));
  const panels = Array.from(document.querySelectorAll(".ip-panel"));

  function syncTabs(target) {
    tabs.forEach(tab => {
      tab.classList.remove("is-active");
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("tabindex", "-1");
    });
    panels.forEach(panel => {
      panel.classList.remove("is-active");
      panel.setAttribute("aria-hidden", "true");
    });
    const active = target || tabs[0];
    if (!active) return;
    active.classList.add("is-active");
    active.setAttribute("aria-selected", "true");
    active.setAttribute("tabindex", "0");
    const panel = document.getElementById(`panel-${active.dataset.ipTab}`);
    if (panel) { panel.classList.add("is-active"); panel.setAttribute("aria-hidden", "false"); }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => syncTabs(tab));
    tab.addEventListener("keydown", e => {
      const idx = tabs.indexOf(tab);
      let next = null;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End")  next = tabs.length - 1;
      if (next !== null) { e.preventDefault(); tabs[next].focus(); syncTabs(tabs[next]); }
    });
  });

  syncTabs();
}

/* ─────────────────────────────────────────────────────────────
   Record modal
───────────────────────────────────────────────────────────── */

function openRecordModal(title, url) {
  const modal    = document.getElementById("ipRecordModal");
  const frame    = document.getElementById("ipRecordModalFrame");
  const titleEl  = document.getElementById("ipRecordModalTitle");
  const openBtn  = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal || !frame || !titleEl) return;
  lastRecordFocusedElement = document.activeElement;
  titleEl.textContent = title || "Idea Details";
  frame.src = url;
  if (openBtn) openBtn.setAttribute("data-url", url || "");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  getFocusableElements(modal)[0]?.focus();
}

function closeRecordModal() {
  const modal   = document.getElementById("ipRecordModal");
  const frame   = document.getElementById("ipRecordModalFrame");
  const openBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal || !frame) return;
  frame.src = "about:blank";
  if (openBtn) openBtn.setAttribute("data-url", "");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  setBackgroundHidden(false);
  lastRecordFocusedElement?.focus();
  lastRecordFocusedElement = null;
}

function bindRecordModal() {
  document.addEventListener("click", e => {
    const link = e.target.closest("a.ip-recordLink");
    if (link) {
      e.preventDefault();
      const url   = link.getAttribute("href");
      const title = link.getAttribute("data-title") || "Idea Details";
      if (url) openRecordModal(title, url);
      return;
    }
    const chip = e.target.closest(".ip-recentChip");
    if (chip) {
      const url   = chip.getAttribute("data-chip-url");
      const title = chip.getAttribute("data-chip-title") || "Idea Details";
      if (url) openRecordModal(title, url);
    }
  });

  document.getElementById("ipRecordModalCloseBtn")?.addEventListener("click", closeRecordModal);

  document.getElementById("ipRecordModalOpenTabBtn")?.addEventListener("click", function () {
    const url = this.getAttribute("data-url") || "";
    if (url) window.open(url, "_blank", "noopener");
  });

  document.getElementById("ipRecordModal")?.addEventListener("click", e => {
    if (e.target?.getAttribute("data-ip-record-close") === "1") closeRecordModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeRecordModal();
  });
}

/* ─────────────────────────────────────────────────────────────
   Jump to top + credit badge
───────────────────────────────────────────────────────────── */

function wireJumpToTop() {
  const btn = document.getElementById("ipJumpTopBtn");
  if (!btn) return;

  function updateVisibility() {
    const scrollTop    = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    const needsScroll  = scrollHeight - clientHeight > 80;
    btn.classList.toggle("is-visible", needsScroll && scrollTop > 120);
    const credit = document.getElementById("ipCreditBadge");
    if (credit) {
      credit.classList.toggle("is-visible", scrollTop + clientHeight >= scrollHeight - 80);
    }
  }

  btn.addEventListener("click", () => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}

/* ─────────────────────────────────────────────────────────────
   Data helpers
───────────────────────────────────────────────────────────── */

function getIdeaField(idea, s1Key, fallbackKey) {
  if (idea?.s1?.[s1Key] !== undefined) return idea.s1[s1Key];
  if (fallbackKey && idea?.[fallbackKey] !== undefined) return idea[fallbackKey];
  return "";
}

function normalizeStatusLabel(status) {
  if (!status) return "";
  return status.replace(/[()]/g, "").trim();
}

function buildIdeaViewModel(idea) {
  if (!idea?.recordID) return null;
  const recordID = String(idea.recordID);
  const title    = sanitizeLeafValue(getIdeaField(idea, IDEA_INDICATORS.title, "title"));
  const category = sanitizeLeafValue(getIdeaField(idea, IDEA_INDICATORS.category, "category"));
  const statusRaw = getIdeaField(idea, IDEA_INDICATORS.status, "status");
  const status   = normalizeStatusLabel(sanitizeLeafValue(statusRaw));
  const votes    = voteCounts[recordID] || 0;
  const isVoted  = userVotes[recordID] === true;
  return {
    recordID,
    title,
    category,
    status,
    votes,
    isVoted,
    created_date: idea.created_date || "",
    recordLink: `${RECORD_VIEW_URL}${recordID}`,
  };
}

function buildIdeasViewModelList(rawIdeas, updateMaps = false) {
  const list  = [];
  const vmMap = {};
  if (updateMaps) { ideasById = {}; ideaOwnerMap = {}; }

  (rawIdeas || []).forEach(idea => {
    const vm = buildIdeaViewModel(idea);
    if (!vm) return;
    list.push(vm);
    vmMap[vm.recordID] = vm;
    if (updateMaps) {
      ideasById[vm.recordID]    = idea;
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
    case "id":       return Number(idea.recordID) || 0;
    case "title":    return String(idea.title    || "");
    case "category": return String(idea.category || "");
    case "status":   return String(normalizeStatusLabel(idea.status || ""));
    case "votes":    return typeof idea.votes === "number" ? idea.votes : (voteCounts[idea.recordID] || 0);
    default:         return "";
  }
}

function sortIdeasList(list, stateObj) {
  if (!stateObj?.key) return list;
  const dir = stateObj.dir === "desc" ? -1 : 1;
  return [...list.filter(i => i?.recordID)].sort((a, b) => {
    const av = getIdeaSortValue(a, stateObj.key);
    const bv = getIdeaSortValue(b, stateObj.key);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
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
  table.querySelectorAll(".ip-sortable").forEach(th => {
    th.classList.remove("is-asc", "is-desc");
    const key = th.querySelector(".ip-sortBtn")?.getAttribute("data-sort");
    if (s && key === s.key) {
      th.classList.add(s.dir === "asc" ? "is-asc" : "is-desc");
      th.setAttribute("aria-sort", s.dir === "asc" ? "ascending" : "descending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   Row builder
───────────────────────────────────────────────────────────── */

function getStatusBadgeClass(status) {
  const map = {
    "New Submission": "ip-badge--new",
    "Under Review":   "ip-badge--review",
    "In Progress":    "ip-badge--progress",
    "Completed":      "ip-badge--done",
    "Discarded":      "ip-badge--discarded",
    "Draft":          "ip-badge--draft",
  };
  return map[status] || "";
}

function buildIdeaRow(idea) {
  if (!idea?.recordID) return "";
  const recordID     = String(idea.recordID);
  const titleRaw     = idea.title || "";
  const title        = escapeHtml(titleRaw);
  const titleDisplay = escapeHtml(truncateTitle(titleRaw));
  const category     = escapeHtml(idea.category || "");

  // Show "Draft" when status is empty (not-submitted records)
  const statusLabel     = idea.status || "Draft";
  const statusBadgeClass = getStatusBadgeClass(statusLabel);
  const statusMarkup    = `<span class="ip-badge ${statusBadgeClass}">${statusLabel}</span>`;

  const votes      = idea.votes || 0;
  const isVoted    = idea.isVoted === true;
  const recordLink = idea.recordLink || `${RECORD_VIEW_URL}${recordID}`;
  const labelTitle = title || `Idea ${recordID}`;
  const voteLabel  = isVoted ? `Already voted for ${labelTitle}` : `Vote for ${labelTitle}`;

  return `
    <tr data-record-id="${recordID}">
      <td>
        <a class="ip-recordLink"
           data-title="${title}"
           aria-haspopup="dialog"
           href="${escapeHtml(recordLink)}">#${recordID}</a>
      </td>
      <td title="${title}">${titleDisplay}</td>
      <td>${category}</td>
      <td>${statusMarkup}</td>
      <td class="ip-votes">${votes}</td>
      <td class="ip-actionsCell">
        <button class="ip-btn ip-btn--ghost ip-btn--icon ip-upvote${isVoted ? " is-voted" : ""}"
          data-record-id="${recordID}"
          ${isVoted ? "disabled" : ""}
          aria-label="${voteLabel}"
          aria-disabled="${isVoted}"
          title="${isVoted ? "Already voted" : "Vote for this idea"}">
          <span class="material-symbols-outlined" style="font-variation-settings:${ICON_FILL}" aria-hidden="true">thumb_up</span>
        </button>
        <button class="ip-btn ip-btn--ghost ip-share"
          data-record-link="${escapeHtml(recordLink)}"
          aria-label="Copy link for ${labelTitle}"
          title="Copy shareable link">
          <span class="material-symbols-outlined" style="font-variation-settings:${ICON_FILL}" aria-hidden="true">share</span>
          Share
        </button>
      </td>
    </tr>`;
}

/* ─────────────────────────────────────────────────────────────
   Filter
───────────────────────────────────────────────────────────── */

function getIdeaSearchText(idea) {
  return [
    idea.recordID ? String(idea.recordID) : "",
    idea.title    || "",
    idea.category || "",
    normalizeStatusLabel(idea.status || ""),
  ].join(" ").toLowerCase();
}

function filterIdeasList(list, query) {
  let filtered = list;
  if (state.categoryFilter && state.categoryFilter !== "all") {
    filtered = filtered.filter(i => (i.category || "").trim() === state.categoryFilter);
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(i => getIdeaSearchText(i).includes(q));
  }
  return filtered;
}

/* ─────────────────────────────────────────────────────────────
   Pagination
───────────────────────────────────────────────────────────── */

function paginateList(list, page, pageSize, showAll) {
  if (showAll) return { pageItems: list, pageCount: 1, page: 1 };
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage  = Math.min(Math.max(1, page), pageCount);
  const start     = (safePage - 1) * pageSize;
  return { pageItems: list.slice(start, start + pageSize), pageCount, page: safePage };
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

function updatePaginationUI(scope, totalCount, pageCount, page, showAll, allowToggle) {
  const container = ui.pagination[scope];
  if (!container) return;
  if (totalCount < PAGE_SIZE) { container.hidden = true; return; }
  container.hidden = false;

  const prevBtn   = container.querySelector('[data-page-action="prev"]');
  const nextBtn   = container.querySelector('[data-page-action="next"]');
  const toggleBtn = container.querySelector('[data-page-action="toggle"]');

  if (prevBtn)   prevBtn.disabled = showAll || page <= 1;
  if (nextBtn)   nextBtn.disabled = showAll || page >= pageCount;
  if (ui.pageInfo[scope]) ui.pageInfo[scope].textContent = `Page ${page} of ${pageCount}`;
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
  const sorted   = sortIdeasList(filtered, sortState.tblIdeas);
  applySortClasses("tblIdeas");

  const shouldPaginate = sorted.length >= PAGE_SIZE;
  if (!shouldPaginate) { state.pagination.all.showAll = true; state.pagination.all.page = 1; }
  const showAll    = shouldPaginate ? state.pagination.all.showAll : true;
  const pagination = paginateList(sorted, state.pagination.all.page, PAGE_SIZE, showAll);
  state.pagination.all.page = pagination.page;

  renderRows(ui.results, pagination.pageItems.map(buildIdeaRow).join(""), state.search ? "No matching ideas." : "No data found");
  PortalDebug.set("tables.results", pagination.pageItems.length);
  updatePaginationUI("all", sorted.length, pagination.pageCount, pagination.page, showAll, shouldPaginate);
}

function renderMyIdeas() {
  const sorted   = sortIdeasList(myIdeasCache, sortState.tblMyIdeas);
  applySortClasses("tblMyIdeas");

  const shouldPaginate = sorted.length >= PAGE_SIZE;
  if (!shouldPaginate) { state.pagination.my.showAll = true; state.pagination.my.page = 1; }
  const showAll    = shouldPaginate ? state.pagination.my.showAll : true;
  const pagination = paginateList(sorted, state.pagination.my.page, PAGE_SIZE, showAll);
  state.pagination.my.page = pagination.page;

  renderRows(ui.myResults, pagination.pageItems.map(buildIdeaRow).join(""), "No ideas submitted");
  PortalDebug.set("tables.myResults", pagination.pageItems.length);
  updatePaginationUI("my", sorted.length, pagination.pageCount, pagination.page, showAll, shouldPaginate);
}

function renderTop10Ideas() {
  if (!ui.topResults) return;
  let top10 = [...ideas]
    .filter(i => i?.recordID)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 10);
  if (sortState.tblTopIdeas.key) top10 = sortIdeasList(top10, sortState.tblTopIdeas);
  applySortClasses("tblTopIdeas");
  renderRows(ui.topResults, top10.map(buildIdeaRow).join(""), "No data found");
  PortalDebug.set("tables.topResults", top10.length);
}

/* ─────────────────────────────────────────────────────────────
   Vote state helpers
───────────────────────────────────────────────────────────── */

function setVoteButtonsDisabled(isDisabled) {
  document.querySelectorAll(".ip-upvote").forEach(btn => {
    if (isDisabled) {
      btn.dataset.loadingDisabled = "true";
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    } else if (btn.dataset.loadingDisabled === "true") {
      const voted = btn.classList.contains("is-voted");
      btn.disabled = voted;
      btn.setAttribute("aria-disabled", voted ? "true" : "false");
      delete btn.dataset.loadingDisabled;
    }
  });
}

function setVotedState(recordID, isVoted) {
  document.querySelectorAll(`.ip-upvote[data-record-id="${recordID}"]`).forEach(btn => {
    btn.disabled = isVoted;
    btn.classList.toggle("is-voted", isVoted);
    btn.setAttribute("aria-disabled", isVoted ? "true" : "false");
  });
}

function updateVoteDom(recordID) {
  const key = String(recordID);

  [ideasVMById[key], myIdeasCache.find(i => String(i.recordID) === key)].forEach(item => {
    if (!item) return;
    item.votes   = voteCounts[key] || 0;
    item.isVoted = true;
  });

  document.querySelectorAll(`tr[data-record-id="${key}"] .ip-votes`).forEach(cell => {
    cell.textContent = voteCounts[key] || 0;
  });
  setVotedState(key, true);
}

/* ─────────────────────────────────────────────────────────────
   Vote submit
───────────────────────────────────────────────────────────── */

async function IdeaVotes(recordID) {
  const key = String(recordID);
  if (votingInProgress) return;
  if (userVotes[key]) { showToast("You already voted on this idea.", true); return; }

  votingInProgress = true;
  userVotes[key]   = true;
  setVotedState(key, true);

  const payload = {
    service: "",
    title: `Idea #${key}`,
    priority: 0,
    CSRFToken: csrfToken,
    [`numform_${FORM_KEYS.votes}`]: 1,
    [VOTE_FIELDS.user]: userID,
    [VOTE_FIELDS.idea]: key,
  };

  logDebug("[IdeaVotes] payload", payload);

  try {
    const response = await apiPostJson("./api/?a=form/new", payload);
    logDebug("[IdeaVotes] response", response);
    const newID = parseFloat(response);

    if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
      voteCounts[key] = (voteCounts[key] || 0) + 1;
      updateVoteDom(key);
      renderTop10Ideas();
      if (sortState.tblIdeas.key   === "votes") renderAllIdeas();
      if (sortState.tblMyIdeas.key === "votes") renderMyIdeas();

      try { localStorage.setItem("leafIdeaVotes", JSON.stringify(userVotes)); } catch {}

      const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);
      renderStatsStrip(ideas.length, implementedCount, totalVotes);
      showToast("Thanks for voting!");
      updateMyActivity(myIdeasCache.length, Object.values(userVotes).filter(Boolean).length);
    } else {
      throw new Error(`Unexpected response: ${response}`);
    }
  } catch (err) {
    console.error("[IdeaVotes] error:", err);
    showToast("Error processing vote. Please try again.", true);
    userVotes[key] = false;
    [ideasVMById[key], myIdeasCache.find(i => String(i.recordID) === key)].forEach(item => {
      if (item) item.isVoted = false;
    });
    setVotedState(key, false);
  } finally {
    votingInProgress = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Data fetches — LeafFormQuery
───────────────────────────────────────────────────────────── */

async function fetchIdeasData() {
  PortalDebug.set("ideas.status", "loading");
  try {
    const query = new LeafFormQuery();
    query.addTerm("categoryID", "=", FORM_IDS.idea);
    query.addTerm("deleted",    "=", 0);
    // Note: no stepID filter here — we include all statuses so All Ideas
    // shows submitted records. Drafts are excluded naturally since they
    // won't appear in public queries without userID scoping.
    query.addTerm("stepID",     "!=", "notSubmitted");
    query.sort("created_date", "DESC");
    query.getData(IDEA_GETDATA);
    // Keep s1 so indicator fields survive the filter
    query.setExtraParams(`&x-filterData=${IDEA_FILTER_DATA}`);
    query.onProgress(count => {
      setStatus("all", `Loading ideas… (${count} loaded)`, "loading");
      PortalDebug.set("ideas.count", count);
    });

    const result = Object.values((await query.execute()) || {});
    PortalDebug.set("ideas.count", result.length);
    PortalDebug.set("ideas.status", "success");
    return result;
  } catch (err) {
    PortalDebug.set("ideas.status", "error");
    PortalDebug.set("ideas.error", String(err));
    PortalDebug.error(`Ideas query failed: ${err}`);
    throw err;
  }
}

async function fetchVotesData() {
  PortalDebug.set("votes.status", "loading");
  try {
    const query = new LeafFormQuery();
    query.addTerm("categoryID", "=", FORM_IDS.votes);
    query.addTerm("deleted",    "=", 0);
    query.getData(VOTE_GETDATA);
    // Only need recordID + s1 for vote tallying
    query.setExtraParams(`&x-filterData=${VOTE_FILTER_DATA}`);
    query.onProgress(count => {
      setStatus("all", `Loading votes… (${count} loaded)`, "loading");
      PortalDebug.set("votes.count", count);
    });

    const voteData  = (await query.execute()) || {};
    voteCounts = {};
    userVotes  = {};

    const votesList = Object.values(voteData);
    votesList.forEach(vote => {
      const ideanum = vote.s1?.[VOTE_INDICATORS.idea];
      const voter   = vote.s1?.[VOTE_INDICATORS.user];
      if (ideanum !== undefined && ideanum !== null && ideanum !== "") {
        const key = String(ideanum);
        voteCounts[key] = (voteCounts[key] || 0) + 1;
        if (voter && voter === userID) userVotes[key] = true;
      }
    });

    // Merge locally-cached votes (optimistic from past sessions)
    try {
      const saved = JSON.parse(localStorage.getItem("leafIdeaVotes") || "{}");
      Object.keys(saved).forEach(k => { if (saved[k]) userVotes[k] = true; });
    } catch {}

    PortalDebug.set("votes.count", votesList.length);
    PortalDebug.set("votes.status", "success");
    return votesList.length;
  } catch (err) {
    PortalDebug.set("votes.status", "error");
    PortalDebug.set("votes.error", String(err));
    PortalDebug.error(`Votes query failed: ${err}`);
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
    const query = new LeafFormQuery();
    // Scope to idea form type + this user — includes drafts (no stepID filter)
    query.addTerm("categoryID", "=", FORM_IDS.idea);
    query.addTerm("userID",     "=", userID);
    query.addTerm("deleted",    "=", 0);
    query.sort("created_date", "DESC");
    query.getData(IDEA_GETDATA);
    query.setExtraParams(`&x-filterData=${IDEA_FILTER_DATA}`);
    query.onProgress(count => setStatus("my", `Loading… (${count} records)`, "loading"));

    const data      = (await query.execute()) || {};
    const userIdeas = Object.values(data).map(idea => {
      // Prefer enriched data from the full ideas fetch if available
      const key = String(idea.recordID);
      return ideasById[key] || idea;
    });

    myIdeasCache = buildIdeasViewModelList(userIdeas, false);
    renderMyIdeas();
    setStatus("my", "", "");
    updateMyActivity(myIdeasCache.length, Object.values(userVotes).filter(Boolean).length);
  } catch (err) {
    console.error("fetchUserSubmissions error:", err);
    renderTableMessage(ui.myResults, "Error loading your ideas.", { retry: true });
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

  try {
    const [ideasData] = await Promise.all([fetchIdeasData(), fetchVotesData()]);

    ideasRaw = ideasData;
    ideas    = buildIdeasViewModelList(ideasRaw, true);

    implementedCount = ideas.filter(i => i.status === "Completed").length;
    const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);

    renderStatsStrip(ideas.length, implementedCount, totalVotes);
    buildCategorySidebar(ideas);
    renderRecentChips(ideas);

    renderAllIdeas();
    renderTop10Ideas();
    setStatus("all", "", "");

    logDebug("Fetch duration (ms)", Math.round(performance.now() - fetchStart));

    await fetchUserSubmissions();
  } catch (err) {
    console.error("IdeaPortal load error", err);
    renderTableMessage(ui.results,    "Error loading ideas.", { retry: true });
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
    await fetch(`./api/form/${recordID}/submit`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ CSRFToken: csrfToken }),
    });

    const stepRes  = await fetch(`./api/formWorkflow/${recordID}/currentStep`, { credentials: "same-origin" });
    const stepData = await stepRes.json();
    logDebug("[Workflow] current step:", stepData);

    const firstStep  = Array.isArray(stepData) ? stepData[0] : stepData;
    const depID      = firstStep?.dependencyID;
    const actionType = firstStep?.dependencyActions?.[0]?.actionType || "submit";

    const applyRes  = await fetch(`./api/formWorkflow/${recordID}/apply`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ CSRFToken: csrfToken, actionType, dependencyID: depID }),
    });
    logDebug("[Workflow] advance response:", await applyRes.text());
  } catch (err) {
    console.warn("[Workflow] advance failed:", err);
  }
}

/* ─────────────────────────────────────────────────────────────
   Idea form
───────────────────────────────────────────────────────────── */

async function NewIdea(advanceOnSuccess) {
  const form        = document.getElementById("ideaForm");
  const submitBtn   = document.getElementById("submitButton");
  const saveBtn     = document.getElementById("saveDraftButton");
  const fileInputEl = document.getElementById("fileInput");

  const val = id => document.getElementById(id)?.value.trim() || "";
  const titleValue    = val("inpTitle");
  const descValue     = val("inpDescription");
  const benefitValue  = val("inpBenefit");
  const categoryValue = val("inpCategory");
  const impactValue   = val("inpImpact");
  const otherCatValue = val("inpOtherCategory");

  if (submitBtn) submitBtn.disabled = true;
  if (saveBtn)   saveBtn.disabled   = true;
  ideaSubmitInProgress = true;

  try {
    const payload = {
      service: "",
      title: titleValue || "Idea Submission",
      priority: 0,
      CSRFToken: csrfToken,
      [`numform_${FORM_KEYS.idea}`]: 1,
      [IDEA_FIELDS.title]:    titleValue,
      [IDEA_FIELDS.summary]:  descValue,
      [IDEA_FIELDS.benefit]:  benefitValue,
      [IDEA_FIELDS.category]: categoryValue,
      [IDEA_FIELDS.impact]:   impactValue,
    };
    if (categoryValue === "Other" && otherCatValue) {
      payload[IDEA_FIELDS.other_category] = otherCatValue;
    }

    const response = await apiPostJson("./api/?a=form/new", payload);
    const newID    = parseFloat(response);

    if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
      // File upload — fire and forget
      const files = fileInputEl?.files ? Array.from(fileInputEl.files) : [];
      if (files.length) {
        const fd = new FormData();
        fd.append("CSRFToken", csrfToken);
        files.forEach(f => fd.append("10", f));
        fetch(`./api/?a=form/${newID}`, { method: "POST", credentials: "same-origin", body: fd })
          .catch(err => console.warn("[IdeaUpload] file upload failed", err));
      }

      form?.reset();
      form?.classList.remove("was-validated");
      if (fileInputEl) fileInputEl.value = "";
      const fileList = document.getElementById("fileList");
      if (fileList) fileList.innerHTML = "";
      closeModal("addIdeaModal");

      if (advanceOnSuccess) {
        await advanceWorkflow(newID);
        showToast("Your idea has been submitted successfully.");
        await loadIdeasAndVotes();
      } else {
        showToast("Idea saved. You can find it in My Ideas.");
        await fetchUserSubmissions();
      }
    } else {
      throw new Error(`Unexpected response: ${response}`);
    }
  } catch (err) {
    console.warn("[NewIdea] error:", err);
    showToast("Error submitting idea. Please try again.", true);
  } finally {
    ideaSubmitInProgress = false;
    if (submitBtn) submitBtn.disabled = false;
    if (saveBtn)   saveBtn.disabled   = false;
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
  options.forEach(opt => {
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
    const res  = await fetch("/platform/ideas/ajaxIndex.php?a=getindicator&indicatorID=8&series=1&recordID=0", { credentials: "same-origin" });
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, "text/html");
    const sel  = doc.querySelector("select#8");
    if (!sel || !sel.options.length) throw new Error("no options");
    populateSelect(
      document.getElementById("inpCategory"),
      Array.from(sel.options).map(o => o.value).filter(Boolean),
      false
    );
  } catch {
    populateSelect(document.getElementById("inpCategory"), CATEGORY_FALLBACK, true);
  }
}

async function loadImpactOptions() {
  try {
    const res  = await fetch("/platform/ideas/ajaxIndex.php?a=getindicator&indicatorID=9&series=1&recordID=0", { credentials: "same-origin" });
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, "text/html");
    const sel  = doc.querySelector("select#9");
    if (!sel || !sel.options.length) throw new Error("no options");
    populateSelect(
      document.getElementById("inpImpact"),
      Array.from(sel.options).map(o => o.value).filter(Boolean),
      false
    );
  } catch {
    populateSelect(document.getElementById("inpImpact"), IMPACT_FALLBACK, false);
  }
}

function bindCategoryChange() {
  const categorySelect = document.getElementById("inpCategory");
  const otherWrapper   = document.getElementById("otherCategoryWrapper");
  const otherInput     = document.getElementById("inpOtherCategory");
  if (!categorySelect || !otherWrapper || !otherInput) return;

  categorySelect.addEventListener("change", () => {
    const isOther = categorySelect.value === "Other";
    otherWrapper.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
    if (!isOther) { otherInput.value = ""; otherInput.removeAttribute("aria-invalid"); }
  });
}

function initValidation() {
  document.querySelectorAll(".needs-validation").forEach(form => {
    form.addEventListener("input", e => {
      const target = e.target;
      if (target?.checkValidity?.()) target.removeAttribute("aria-invalid");
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Event delegation
───────────────────────────────────────────────────────────── */

function handleSortClick(sortBtn) {
  const key     = sortBtn.getAttribute("data-sort");
  const tableId = sortBtn.closest("table")?.getAttribute("id");
  if (!tableId || !key) return;
  setSortState(tableId, key);
  applySortClasses(tableId);
  if (tableId === "tblIdeas")    { state.pagination.all.page = 1; renderAllIdeas(); }
  else if (tableId === "tblTopIdeas") renderTop10Ideas();
  else if (tableId === "tblMyIdeas") { state.pagination.my.page = 1; renderMyIdeas(); }
}

function handlePaginationAction(scope, action) {
  const pager = state.pagination[scope];
  if (!pager) return;
  if (action === "prev")   pager.page = Math.max(1, pager.page - 1);
  else if (action === "next")   pager.page += 1;
  else if (action === "toggle") { pager.showAll = !pager.showAll; pager.page = 1; }
  if (scope === "all") renderAllIdeas();
  else if (scope === "my") renderMyIdeas();
}

function bindDelegatedEvents() {
  const wrap = document.querySelector(".ip-wrap");
  if (!wrap) return;

  wrap.addEventListener("click", e => {
    const sortBtn = e.target.closest(".ip-sortBtn");
    if (sortBtn) { handleSortClick(sortBtn); return; }

    const retryBtn = e.target.closest(".ip-retry");
    if (retryBtn) { loadIdeasAndVotes(); return; }

    const upvoteBtn = e.target.closest(".ip-upvote");
    if (upvoteBtn && !upvoteBtn.disabled) {
      IdeaVotes(upvoteBtn.getAttribute("data-record-id"));
      return;
    }

    const shareBtn = e.target.closest(".ip-share");
    if (shareBtn) {
      const link = shareBtn.getAttribute("data-record-link");
      if (!link) return;
      navigator.clipboard.writeText(link)
        .then(() => showToast("Idea link copied to clipboard."))
        .catch(err => console.error("Could not copy link:", err));
      return;
    }

    const pageBtn = e.target.closest(".ip-pageBtn, .ip-pageToggle");
    if (pageBtn) {
      handlePaginationAction(
        pageBtn.getAttribute("data-page-scope"),
        pageBtn.getAttribute("data-page-action")
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
  const handler = debounce(e => applySearch(e.target.value), SEARCH_DEBOUNCE_MS);
  ui.searchInput.addEventListener("input", handler);
  ui.searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); applySearch(ui.searchInput.value); }
  });
  ui.searchBtn?.addEventListener("click", () => applySearch(ui.searchInput.value));
}

function bindFileInput() {
  const fileInput = document.getElementById("fileInput");
  const fileList  = document.getElementById("fileList");
  if (!fileInput || !fileList) return;
  fileInput.addEventListener("change", () => {
    fileList.innerHTML = Array.from(fileInput.files || [])
      .map(f => `<li>${escapeHtml(f.name)}</li>`)
      .join("");
  });
}

function bindMySearch() {
  const input = document.getElementById("mySearchInput");
  const btn   = document.getElementById("mySearchBtn");
  if (!input) return;
  const handler = debounce(() => {
    const q = input.value.toLowerCase();
    document.querySelectorAll("#myResults tr").forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }, SEARCH_DEBOUNCE_MS);
  input.addEventListener("input", handler);
  btn?.addEventListener("click", handler);
}

/* ─────────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────────── */

function initPortal() {
  PortalDebug.set("initFired", true);
  PortalDebug.set("dom", document.readyState);

  cacheElements();
  bindModalEvents();
  bindTabs();
  bindRecordModal();
  bindDelegatedEvents();
  bindSearch();
  bindMySearch();
  bindFileInput();
  bindCategoryChange();
  loadCategoryOptions();
  loadImpactOptions();
  wireJumpToTop();
  initValidation();

  document.getElementById("saveDraftButton")?.addEventListener("click", async () => {
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

  document.getElementById("submitButton")?.addEventListener("click", async () => {
    const form = document.getElementById("ideaForm");
    if (!form) return;
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;
    await NewIdea(true);
  });

  loadIdeasAndVotes().catch(err => {
    console.error("loadIdeasAndVotes failed", err);
    PortalDebug.error(`loadIdeasAndVotes threw: ${err}`);
  });
}

// Wire debug panel immediately
PortalDebug.init();

// Fire init as soon as DOM is available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortal);
} else {
  initPortal();
}
