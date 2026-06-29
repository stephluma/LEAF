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
  date_submitted: 15,
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

// Material Symbols Filled variation settings
const ICON_FILL = `'opsz' 24, 'wght' 400, 'FILL' 1, 'GRAD' 0`;

let ideas = [];
let ideasRaw = [];
let ideasById = {};
let ideasVMById = {};
let ideaOwnerMap = {};
let voteCounts = {};

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

let votingInProgress = false;
let ideaSubmitInProgress = false;
let implementedCount = 0;
let myIdeasCache = [];
let lastFocusedElement = null;
let lastRecordFocusedElement = null;
let resolvedVoterEmail = "";

const state = {
  search: "",
  categoryFilter: "all",
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
    const cat = (idea.category || "").trim() || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
    total++;
  });

  const allCountEl = document.getElementById("ip-cat-count-all");
  if (allCountEl) allCountEl.textContent = total;

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
      <button class="ip-catItem" data-cat="${escapeHtml(cat)}" type="button">
        <span>${escapeHtml(cat)}</span>
        <span class="ip-catCount">${counts[cat]}</span>
      </button>`;
      catList.appendChild(li);
    });

  catList.addEventListener("click", (e) => {
    const btn = e.target.closest(".ip-catItem");
    if (!btn) return;
    const cat = btn.getAttribute("data-cat") || "all";
    state.categoryFilter = cat;
    state.pagination.all.page = 1;
    catList
      .querySelectorAll(".ip-catItem")
      .forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderAllIdeas();
  });
}

/* ─────────────────────────────────────────────────────────────
   Recently added bar
───────────────────────────────────────────────────────────── */

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
}

function bindModalEvents() {
  document.querySelectorAll("[data-ip-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.ipOpen));
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

function extractCleanValue(html, indicatorID) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const span = tmp.querySelector(`[id^="data_${indicatorID}_"]`);
  if (span) return (span.textContent || "").trim();
  tmp
    .querySelectorAll("script, input, button, textarea, select")
    .forEach((el) => el.remove());
  return (tmp.textContent || "").trim();
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

function buildDetailSkeleton(recordID, title, votes, isVoted, statusLabel) {
  const isVotedClass = isVoted ? " is-voted" : "";
  const voteDisabled = isVoted ? "disabled" : "";
  const voteAriaLabel = isVoted
    ? "You already voted"
    : `Vote for idea #${escapeHtml(recordID)}`;
  const votesText = `${escapeHtml(String(votes))} ${votes === 1 ? "vote" : "votes"}`;
  return `<div class="ip-detail" id="ipDetailRoot">

    <!-- Title row: #ID + h2 side by side -->
    <div class="ip-detail__title-row">
      <span class="ip-detail__id" aria-label="Idea number ${escapeHtml(recordID)}">#${escapeHtml(recordID)}</span>
      <h2 class="ip-detail__title" id="ip-detail-title" tabindex="-1">${escapeHtml(title || "Idea Details")}</h2>
    </div>

    <!-- Info row: Status · Votes -->
    <div class="ip-detail__info-row" role="group" aria-label="Idea metadata">
      ${statusLabel ? `<span class="ip-detail__info-item"><span class="ip-detail__info-label">Status</span><span class="ip-detail__info-val ip-detail__info-val--status" id="ip-detail-status-text">${escapeHtml(statusLabel)}</span></span><span class="ip-detail__info-sep" aria-hidden="true">·</span>` : ""}
      <span class="ip-detail__info-item"><span class="ip-detail__info-label">Votes</span><span class="ip-detail__info-val ip-detail__info-val--votes" id="ip-detail-votes-text"><span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>${votesText}</span></span>
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
    <section class="ip-detail__card" aria-labelledby="ip-dl-10">
      <span class="ip-detail__card-label" id="ip-dl-10">Attachments</span>
      <div id="ip-dv-10" aria-live="polite"><span class="ip-detail__loading">Loading\u2026</span></div>
    </section>

    <!-- Actions -->
    <div class="ip-detail__actions" role="group" aria-label="Idea actions">
      <span class="ip-detail__meta-label">Actions</span>
      <button type="button"
        class="ip-upvote${isVotedClass}"
        data-detail-vote="${escapeHtml(recordID)}"
        aria-label="${voteAriaLabel}"
        ${voteDisabled}>
        <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
        ${isVoted ? "Voted" : "Vote"}
      </button>
      <button type="button"
        class="ip-share"
        data-record-link="${escapeHtml(RECORD_VIEW_URL + recordID)}"
        aria-label="Copy link to idea #${escapeHtml(recordID)}">
        <span class="material-symbols-outlined" aria-hidden="true">share</span>
        Share
      </button>
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
  const votes = vm?.votes ?? voteCounts[ridStr] ?? 0;
  const isVoted = userVotes[ridStr] === true;
  const statusLabel = vm?.status || "";

  if (header) header.textContent = title || "Idea Details";
  if (openBtn) {
    openBtn.setAttribute("data-url", openTabUrl || "");
    openBtn.hidden = !openTabUrl;
  }

  // Render skeleton with pill layout + action buttons
  body.innerHTML = buildDetailSkeleton(
    ridStr,
    title,
    votes,
    isVoted,
    statusLabel,
  );

  // Wire the vote button inside the modal
  body
    .querySelector("[data-detail-vote]")
    ?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (btn.disabled || votingInProgress) return;
      await IdeaVotes(ridStr);
      // Refresh the vote button state
      const newVoted = userVotes[ridStr] === true;
      const newCount = voteCounts[ridStr] || 0;
      if (newVoted) {
        btn.disabled = true;
        btn.classList.add("is-voted");
        btn.setAttribute("aria-label", "You already voted");
        btn.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">thumb_up</span> Voted`;
      }
      // Update votes pill
      const votesText = body.querySelector("#ip-detail-votes-text");
      if (votesText) {
        votesText.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>${newCount} ${newCount === 1 ? "vote" : "votes"}`;
      }
    });

  lastRecordFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setBackgroundHidden(true);
  bindFocusTrap(modal);
  // Focus the close button first so Tab order starts at the top of the modal
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
      onValue(val) {
        if (val.trim().toLowerCase() === "other") {
          const subq = document.getElementById("ip-dv-subq-13");
          if (subq) subq.removeAttribute("hidden");
          populateDetailField(ridStr, 13);
        }
      },
    }),
    populateDetailField(ridStr, 9),
    populateDetailField(ridStr, 10, { isAttachment: true }),
  ]);
}

function closeRecordModal() {
  const modal = document.getElementById("ipRecordModal");
  const body = document.getElementById("ipRecordModalBody");
  const openBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal) return;
  if (body) body.innerHTML = "";
  if (openBtn) openBtn.setAttribute("data-url", "");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  // Clear the focus trap guard so it re-binds correctly next open
  delete modal.dataset.focusTrap;
  setBackgroundHidden(false);
  lastRecordFocusedElement?.focus();
  lastRecordFocusedElement = null;
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
      // If the voted modal is open, close it silently before opening the record
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
    ?.addEventListener("click", closeRecordModal);
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

function buildIdeaViewModel(idea) {
  if (!idea?.recordID) return null;
  const recordID = String(idea.recordID);
  const title = sanitizeLeafValue(
    getIdeaField(idea, IDEA_INDICATORS.title, "title"),
  );
  const category = sanitizeLeafValue(
    getIdeaField(idea, IDEA_INDICATORS.category, "category"),
  );
  const statusRaw = getIdeaField(idea, IDEA_INDICATORS.status, "status");
  const status = normalizeStatusLabel(sanitizeLeafValue(statusRaw));
  const votes = voteCounts[recordID] || 0;
  const isVoted = userVotes[recordID] === true;
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

function getStatusBadgeClass(status) {
  const map = {
    "New Submission": "ip-badge--new",
    "Under Review": "ip-badge--review",
    "In Progress": "ip-badge--progress",
    Completed: "ip-badge--done",
    Discarded: "ip-badge--discarded",
    Draft: "ip-badge--draft",
  };
  return map[status] || "";
}

function buildIdeaRow(idea) {
  if (!idea?.recordID) return "";
  const recordID = String(idea.recordID);
  const titleRaw = idea.title || "";
  const title = escapeHtml(titleRaw);
  // CSS handles truncation via text-overflow:ellipsis on .ip-col-title;
  // render the full title so the tooltip always matches the visible text.
  const titleDisplay = title;
  const category = escapeHtml(idea.category || "");

  // Show "Draft" when status is empty (not-submitted records)
  const statusLabel = idea.status || "Draft";
  const statusBadgeClass = getStatusBadgeClass(statusLabel);
  const statusMarkup = `<span class="ip-badge ${statusBadgeClass}">${statusLabel}</span>`;

  const votes = idea.votes || 0;
  const isVoted = idea.isVoted === true;
  const recordLink = idea.recordLink || `${RECORD_VIEW_URL}${recordID}`;
  const labelTitle = title || `Idea ${recordID}`;
  const voteLabel = isVoted
    ? `Already voted for ${labelTitle}`
    : `Vote for ${labelTitle}`;

  return `
    <tr data-record-id="${recordID}">
      <td>
        <a class="ip-recordLink"
           data-record-id="${recordID}"
           data-title="${title}"
           aria-haspopup="dialog"
           href="${escapeHtml(recordLink)}">#${recordID}</a>
      </td>
      <td class="ip-col-title" title="${title}">${titleDisplay}</td>
      <td>${category}</td>
      <td>${statusMarkup}</td>
      <td class="ip-votes">${votes}</td>
      <td class="ip-actionsCell">
        <button class="ip-upvote${isVoted ? " is-voted" : ""}"
          data-record-id="${recordID}"
          ${isVoted ? "disabled" : ""}
          aria-label="${voteLabel}"
          aria-disabled="${isVoted}"
          title="${isVoted ? "Already voted" : "Vote for this idea"}">
          <span class="material-symbols-outlined" style="font-variation-settings:${ICON_FILL}" aria-hidden="true">thumb_up</span>
        </button>
        <button class="ip-share"
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
    filtered = filtered.filter(
      (i) => (i.category || "").trim() === state.categoryFilter,
    );
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
  const sorted = sortIdeasList(myIdeasCache, sortState.tblMyIdeas);
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
    "No ideas submitted",
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
  document
    .querySelectorAll(`.ip-upvote[data-record-id="${recordID}"]`)
    .forEach((btn) => {
      btn.disabled = isVoted;
      btn.classList.toggle("is-voted", isVoted);
      btn.setAttribute("aria-disabled", isVoted ? "true" : "false");
    });
}

function updateVoteDom(recordID) {
  const key = String(recordID);

  [
    ideasVMById[key],
    myIdeasCache.find((i) => String(i.recordID) === key),
  ].forEach((item) => {
    if (!item) return;
    item.votes = voteCounts[key] || 0;
    item.isVoted = true;
  });

  document
    .querySelectorAll(`tr[data-record-id="${key}"] .ip-votes`)
    .forEach((cell) => {
      cell.textContent = voteCounts[key] || 0;
    });
  setVotedState(key, true);
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
  // Last resort — userID so votes still record something identifiable
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
      updateVoteDom(key);
      renderTop10Ideas();
      if (sortState.tblIdeas.key === "votes") renderAllIdeas();
      if (sortState.tblMyIdeas.key === "votes") renderMyIdeas();

      try {
        localStorage.setItem("leafIdeaVotes", JSON.stringify(userVotes));
      } catch {}

      const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);
      renderStatsStrip(ideas.length, implementedCount, totalVotes);
      showToast("Thanks for voting!");
      updateMyActivity(
        myIdeasCache.length,
        Object.values(userVotes).filter(Boolean).length,
      );
    } else {
      throw new Error(`Unexpected response: ${response}`);
    }
  } catch (err) {
    console.error("[IdeaVotes] error:", err);
    showToast("Error processing vote. Please try again.", true);
    userVotes[key] = false;
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
          { id: "stepID", operator: "!=", match: "notSubmitted", gate: "AND" },
        ],
        joins: [],
        sort: { id: "created_date", direction: "desc" },
        getData: IDEA_GETDATA,
      },
      IDEA_FILTER_DATA,
    );
    const result = Object.values(data || {});
    return result;
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

    const votesList = Object.values(voteData || {});
    votesList.forEach((vote) => {
      const ideanum = vote.s1?.[VOTE_INDICATORS.idea];
      const voter = vote.s1?.[VOTE_INDICATORS.user];
      if (ideanum !== undefined && ideanum !== null && ideanum !== "") {
        const key = String(ideanum);
        voteCounts[key] = (voteCounts[key] || 0) + 1;
        // Match on resolvedVoterEmail first; fall back to userID for records
        // stored before the email migration or when email didn't resolve.
        const voterIdentity = resolvedVoterEmail || userID;
        if (voter && voterIdentity && voter === voterIdentity) {
          userVotes[key] = true;
        }
      }
    });

    // Merge locally-cached votes (optimistic from past sessions)
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
    // No stepID filter — includes the user's own drafts intentionally.
    // Filter out vote records (title starts with "Idea #") which share userID.
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
        if (ideasById[key]) {
          // Record exists in the public submitted query — use enriched data as-is
          return ideasById[key];
        }
        // Not in the submitted set — it's a draft. Clear the status indicator so
        // buildIdeaRow falls back to the "Draft" label.
        return {
          ...idea,
          s1: { ...(idea.s1 || {}), [IDEA_INDICATORS.status]: "" },
        };
      });

    myIdeasCache = buildIdeasViewModelList(userIdeas, false);
    renderMyIdeas();
    setStatus("my", "", "");
    updateMyActivity(
      myIdeasCache.length,
      Object.values(userVotes).filter(Boolean).length,
    );
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

  // Resolve voter email before fetching votes so the "did I vote" check
  // in fetchVotesData() uses the correct identity.
  await resolveVoterEmail();

  try {
    const [ideasData] = await Promise.all([fetchIdeasData(), fetchVotesData()]);

    ideasRaw = ideasData;
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
    // Step 1 — submit the record into the workflow
    const submitRes = await fetch(`./api/form/${recordID}/submit`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ CSRFToken: csrfToken }),
    });
    console.log(`[Workflow] submit HTTP ${submitRes.status}`);

    // Step 2 — fetch current step to get dependencyID and actionType
    const stepRes = await fetch(`./api/formWorkflow/${recordID}/currentStep`, {
      credentials: "same-origin",
    });
    const stepText = await stepRes.text();
    console.log("[Workflow] currentStep raw:", stepText);

    let stepData;
    try {
      stepData = JSON.parse(stepText);
    } catch {
      stepData = null;
    }
    console.log("[Workflow] currentStep parsed:", stepData);

    const firstStep = Array.isArray(stepData) ? stepData[0] : stepData;
    const depID = firstStep?.dependencyID ?? firstStep?.id ?? null;
    const actionType =
      firstStep?.dependencyActions?.[0]?.actionType ||
      firstStep?.actions?.[0]?.actionType ||
      "submit";

    console.log(
      `[Workflow] applying — dependencyID: ${depID}, actionType: ${actionType}`,
    );

    // Step 3 — apply the workflow action
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
    const applyText = await applyRes.text();
    console.log(`[Workflow] apply HTTP ${applyRes.status}:`, applyText);

    if (!applyRes.ok) {
      console.warn(
        `[Workflow] apply failed (${applyRes.status}) — record may still be draft`,
      );
    }
  } catch (err) {
    console.warn("[Workflow] advance failed:", err);
  }
}

/* ─────────────────────────────────────────────────────────────
   Date helper — returns today as YYYY-MM-DD in local time.
   LEAF date inputs typically expect this format; the debug
   write below will confirm whether it lands correctly.
───────────────────────────────────────────────────────────── */

function todayLocalYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ─────────────────────────────────────────────────────────────
   Write date_submitted (indicator 15) to an existing record.
   Approach B — separate POST after record creation to guarantee
   the field is written even if form/new ignores it.
───────────────────────────────────────────────────────────── */

async function writeDateSubmitted(recordID, dateStr) {
  const body = new URLSearchParams({
    CSRFToken: csrfToken,
    recordID: String(recordID),
    series: "1",
    [IDEA_FIELDS.date_submitted]: dateStr,
  });

  console.log(
    `[DateSubmit] Writing indicator ${IDEA_FIELDS.date_submitted} → "${dateStr}" on record ${recordID}`,
  );

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
      console.log(
        `[DateSubmit] ✅ Success (HTTP ${res.status}):`,
        text || "(empty body)",
      );
    } else {
      console.warn(`[DateSubmit] ❌ HTTP ${res.status}:`, text);
    }
  } catch (err) {
    console.warn("[DateSubmit] ❌ Network error:", err);
  }
}

/* ─────────────────────────────────────────────────────────────
   Idea form
───────────────────────────────────────────────────────────── */

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

  if (submitBtn) submitBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;
  ideaSubmitInProgress = true;

  // Build today's date — only written on submit, not draft saves
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
    };
    if (categoryValue === "Other" && otherCatValue) {
      payload[IDEA_FIELDS.other_category] = otherCatValue;
    }
    // Approach A — include date in the initial create POST
    if (todayStr) {
      payload[IDEA_FIELDS.date_submitted] = todayStr;
      console.log(
        `[DateSubmit] Approach A — including indicator ${IDEA_FIELDS.date_submitted} in form/new payload:`,
        todayStr,
      );
    }

    const response = await apiPostJson("./api/?a=form/new", payload);
    const newID = parseFloat(response);

    if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
      // File upload — fire and forget
      const files = fileInputEl?.files ? Array.from(fileInputEl.files) : [];
      if (files.length) {
        const fd = new FormData();
        fd.append("CSRFToken", csrfToken);
        files.forEach((f) => fd.append("10", f));
        fetch(`./api/?a=form/${newID}`, {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        }).catch((err) => console.warn("[IdeaUpload] file upload failed", err));
      }

      form?.reset();
      form?.classList.remove("was-validated");
      if (fileInputEl) fileInputEl.value = "";
      const fileList = document.getElementById("fileList");
      if (fileList) fileList.innerHTML = "";
      closeModal("addIdeaModal");

      if (advanceOnSuccess) {
        // Approach B — write date BEFORE advancing workflow so it lands even
        // if the workflow apply step 400s. advanceWorkflow is best-effort.
        console.log(
          `[DateSubmit] Approach B — writing date to record ${newID}`,
        );
        await writeDateSubmitted(newID, todayStr);
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
    const sel = doc.querySelector("select#8");
    if (!sel || !sel.options.length) throw new Error("no options");
    populateSelect(
      document.getElementById("inpCategory"),
      Array.from(sel.options)
        .map((o) => o.value)
        .filter(Boolean),
      false,
    );
  } catch {
    populateSelect(
      document.getElementById("inpCategory"),
      CATEGORY_FALLBACK,
      true,
    );
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
    const sel = doc.querySelector("select#9");
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

function bindCategoryChange() {
  const categorySelect = document.getElementById("inpCategory");
  const otherWrapper = document.getElementById("otherCategoryWrapper");
  const otherInput = document.getElementById("inpOtherCategory");
  if (!categorySelect || !otherWrapper || !otherInput) return;

  categorySelect.addEventListener("change", () => {
    const isOther = categorySelect.value === "Other";
    otherWrapper.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
    if (!isOther) {
      otherInput.value = "";
      otherInput.removeAttribute("aria-invalid");
    }
  });
}

function initValidation() {
  document.querySelectorAll(".needs-validation").forEach((form) => {
    // Re-check validity on every input/change so errors clear as user fixes them
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

    const upvoteBtn = e.target.closest(".ip-upvote");
    if (upvoteBtn && !upvoteBtn.disabled) {
      IdeaVotes(upvoteBtn.getAttribute("data-record-id"));
      return;
    }

    const shareBtn = e.target.closest(".ip-share");
    if (shareBtn) {
      const link = shareBtn.getAttribute("data-record-link");
      if (!link) return;

      // Try modern clipboard API first; fall back to execCommand for
      // iframe contexts or browsers where clipboard API is unavailable.
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
   Init
───────────────────────────────────────────────────────────── */

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
  // Full list of view-model objects built when modal opens
  allRows: [],
};

function buildVotedRow(id, idea) {
  if (!idea) {
    return `<tr data-voted-id="${escapeHtml(id)}">
      <td><span style="color:var(--ip-muted)">#${escapeHtml(id)}</span></td>
      <td style="color:var(--ip-muted);font-style:italic" colspan="4">Idea not available</td>
    </tr>`;
  }
  const titleFull = escapeHtml(idea.title || `Idea ${id}`);
  const titleDisplay = escapeHtml(truncateTitle(idea.title || `Idea ${id}`));
  const category = escapeHtml(idea.category || "");
  const statusLabel = idea.status || "Draft";
  const statusBadgeClass = getStatusBadgeClass(statusLabel);
  const votes = idea.votes || 0;
  const recordLink = escapeHtml(idea.recordLink || `${RECORD_VIEW_URL}${id}`);
  return `<tr data-voted-id="${escapeHtml(id)}">
    <td><a class="ip-recordLink" href="${recordLink}" data-record-id="${escapeHtml(id)}" data-title="${titleFull}" aria-haspopup="dialog">#${escapeHtml(id)}</a></td>
    <td class="ip-col-title" title="${titleFull}">${titleDisplay}</td>
    <td>${category}</td>
    <td><span class="ip-badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span></td>
    <td>${votes}</td>
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

  // Sort
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

  // Apply sort indicator classes to headers
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

  // Build the full row data — reset sort/search to defaults each open
  const votedIDs = Object.keys(userVotes).filter((k) => userVotes[k] === true);
  votedModalState.allRows = votedIDs.map((id) => ({
    id,
    idea: ideasVMById[id] || null,
  }));
  votedModalState.sort = { key: "id", dir: "asc" };
  votedModalState.search = "";

  if (searchInput) searchInput.value = "";
  if (searchWrap) searchWrap.hidden = !votedIDs.length;

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

  // Sort — delegated on the table header
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

  // Search
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

function initPortal() {
  cacheElements();
  bindModalEvents();
  bindTabs();
  bindRecordModal();
  bindVotedModal();
  bindActivityButtons();
  bindDelegatedEvents();
  bindSearch();
  bindMySearch();
  bindFileInput();
  bindCategoryChange();
  loadCategoryOptions();
  loadImpactOptions();
  initValidation();

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
      // reportValidity() checks all fields including selects and returns false
      // if any required field is empty, preventing premature submission.
      if (!form.reportValidity()) return;
      await NewIdea(true);
    });

  loadIdeasAndVotes().catch((err) => {
    console.error("loadIdeasAndVotes failed", err);
  });
}

// Fire init as soon as DOM is available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortal);
} else {
  initPortal();
}
