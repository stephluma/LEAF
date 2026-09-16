/* ============================================================
   TEAM COMMAND CENTER — LEAF standalone app
   Pattern:
     • Reads   → LeafFormQuery (global on LEAF sites), per formQuery.md
     • Writes  → POST ./api/form/new  → POST ./api/form/{id} → submit
     • Records → opened in an iframe modal (printview)

   ============================================================
   ▼▼▼  CONFIG — FILL THIS IN AFTER YOU BUILD THE FORM  ▼▼▼
   ============================================================ */
const CONFIG = {
  // Form category for the Calendar Entry form
  categoryID: "form_34212",

  // Base URL of this LEAF site's record printview
  recordViewBase: "https://leaf.va.gov/platform/calendar/index.php?a=printview&recordID=",

  // Numeric indicator IDs from the Calendar Entry form
  indicators: {
    entryDate: "11", // Date       — the day the entry lands on
    entryType: "2", // Dropdown   — Meeting Notes / Action Item / Out-of-Office / General Log
    title: "3", // Text       — chip label
    body: "4", // Textarea / rich text — details
    linked: "5", // Textarea   — app-managed JSON list of {recordID, categoryID}
    status: "6", // Dropdown   — Open / In Progress / Done / Carried Forward
    assignedTo: "7", // Orgchart employee (empUID) — action-item owner
    dueDate: "8", // Date       — action-item due date
    endDate: "9", // Date       — OOO range end
    coveredBy: "10", // Orgchart employee (empUID) — OOO coverage
  },

  // How many chips fit in a month cell before "+N more"
  monthCellChipLimit: 3,

  // Week starts on Sunday (0) or Monday (1)
  weekStartsOn: 0,
};
/* ▲▲▲  END CONFIG  ▲▲▲ */

/* ============================================================
   Runtime config from the page (Smarty-filled in LEAF)
   ============================================================ */
const pageConfig = window.leafCalendar || {};
const DEBUG = pageConfig.debug === true;

// calendar.html escapes CSRF/userID server-side via |unescape|escape:"quotes"
// (same convention as ideas.html), so no client-side comment-stripping
// workaround is needed here.
const CSRF = String(pageConfig.csrfToken || "").trim();
const CURRENT_USER = String(pageConfig.userID || "").trim();

const TYPES = ["Meeting Notes", "Action Item", "Out-of-Office", "General Log"];
const TYPE_CLASS = {
  "Meeting Notes": "meeting",
  "Action Item": "action",
  "Out-of-Office": "ooo",
  "General Log": "log",
};

/* ============================================================
   State
   ============================================================ */
const state = {
  view: "week", // week | month
  cursor: startOfDay(new Date()), // the date the current view is centered on
  entries: [], // normalized entry view-models
  entriesByDate: {}, // 'YYYY-MM-DD' -> [entry]
  authors: {}, // userID -> display name
  filters: { type: "", author: "", search: "", showClosed: false },
  editing: null, // entry being edited (or null for new)
  draftLinks: [], // [{recordID, categoryID, title, formName}]
  draftAssigned: null, // {empUID, name}
  draftCovered: null, // {empUID, name}
};

// Tracks in-flight link searches so a fast typist can't race an old
// response into overwriting a newer one.
let linkSearchToken = 0;

/* ============================================================
   Small utilities
   ============================================================ */
function logDebug(...args) {
  if (!DEBUG) return;
  console.log("[Calendar]", ...args);
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'");
}

function debounce(fn, delay) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function announce(msg, assertive) {
  const node = byId(assertive ? "cal-live-assertive" : "cal-live-polite");
  if (!node) return;
  node.textContent = "";
  setTimeout(() => {
    node.textContent = msg;
  }, 50);
}

function setStatus(msg, isError) {
  const el = byId("calStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("is-error", !!isError);
}

/* ── Date helpers (local-time, no UTC drift) ─────────────── */
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYMD(s) {
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a, b) {
  return a && b && ymd(a) === ymd(b);
}
function isTodayDate(d) {
  return sameDay(d, new Date());
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function orderedDow() {
  const out = [];
  for (let i = 0; i < 7; i++) out.push((CONFIG.weekStartsOn + i) % 7);
  return out;
}
function startOfWeek(d) {
  const x = startOfDay(d);
  const diff = (x.getDay() - CONFIG.weekStartsOn + 7) % 7;
  return addDays(x, -diff);
}
function fmtLongDate(d) {
  return `${DOW_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ============================================================
   LEAF API helpers
   ============================================================ */
function recordViewURL(recordID) {
  const base = CONFIG.recordViewBase || "";
  if (!base || base.indexOf("REPLACE_ME") === 0) {
    // Relative fallback — works when the app is served from the site root
    return `index.php?a=printview&recordID=${encodeURIComponent(recordID)}`;
  }
  return `${base}${encodeURIComponent(recordID)}`;
}

function encodeBody(obj) {
  const body = new URLSearchParams();
  Object.keys(obj || {}).forEach((k) => {
    const v = obj[k];
    if (v === undefined || v === null) return;
    body.append(String(k), String(v));
  });
  return body.toString();
}

// POST helper returning text (or parsed JSON when possible)
async function apiPost(url, dataObj) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body: encodeBody(dataObj),
  });
  if (!res.ok) throw new Error(`POST ${url} → HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

async function apiGet(url) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "x-requested-with": "XMLHttpRequest",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.json();
}

// Create a record of CONFIG.categoryID; returns the new numeric recordID.
// Field name confirmed against the working SNAP/UC-cache pattern in
// activity_map.html: the POST field is `num{categoryID}` with the
// "form_" prefix INTACT (e.g. "numform_34212"), not stripped.
async function createRecord() {
  const payload = {
    CSRFToken: CSRF,
    title: "Calendar Entry",
    [`num${CONFIG.categoryID}`]: "on",
  };
  const res = await apiPost("./api/form/new", payload);
  const id = parseInt(String(res).trim().replace(/^"|"$/g, ""), 10);
  if (!id || id <= 0) throw new Error(`Record creation returned no ID: ${res}`);
  return id;
}

// Write indicator values to a record.
// Payload shape confirmed against LeafForm.doModify() (form.js): the POST
// body must include `recordID` as a top-level field alongside each
// {indicatorID: value} pair.
async function writeIndicators(recordID, indicatorValues) {
  const payload = { recordID, CSRFToken: CSRF };
  Object.keys(indicatorValues).forEach((indID) => {
    if (indID && indID !== "REPLACE_ME") payload[indID] = indicatorValues[indID];
  });
  return apiPost(`./api/form/${encodeURIComponent(recordID)}`, payload);
}

// Submit a freshly-created record into its (single-step) workflow so it's live
async function submitRecord(recordID) {
  try {
    await apiPost(`./api/form/${encodeURIComponent(recordID)}/submit`, {
      CSRFToken: CSRF,
    });
  } catch (e) {
    logDebug("submit skipped/failed (record may already be live):", e.message);
  }
}

/* ============================================================
   Diagnostics — discover indicator IDs / categories
   Runs when window.leafCalendar.debug = true
   ============================================================ */
async function runDiagnostics() {
  console.log("=== CALENDAR DIAGNOSTICS ===");
  console.log("Configured categoryID:", CONFIG.categoryID);
  try {
    const cats = await apiGet("./api/workflow/categoriesUnabridged");
    console.log("--- Forms available on this site ---");
    (Array.isArray(cats) ? cats : Object.values(cats || {})).forEach((c) => {
      console.log(`  ${c.categoryID || c.id} => ${c.categoryName || c.name}`);
    });
  } catch (e) {
    console.log("Could not list categories:", e.message);
  }

  if (CONFIG.categoryID && CONFIG.categoryID.indexOf("REPLACE_ME") !== 0) {
    try {
      const raw = String(CONFIG.categoryID).replace("form_", "");
      const inds = await apiGet(`./api/formEditor/indicator/list/category/${raw}`);
      console.log(`--- Indicator IDs for ${CONFIG.categoryID} ---`);
      Object.keys(inds || {}).forEach((k) => {
        const i = inds[k];
        console.log(`  id ${k} | ${i.name || i.description || ""} | format: ${i.format || i.input_type || ""}`);
      });
      console.log(">>> Copy these numbers into CONFIG.indicators above.");
    } catch (e) {
      console.log(
        "Could not fetch indicator list — build the form first, then set categoryID.",
        e.message,
      );
    }
  } else {
    console.log(">>> Set CONFIG.categoryID first, then reload to see indicator IDs.");
  }
}

/* ============================================================
   Data loading — read all Calendar Entry records
   Uses LeafFormQuery per formQuery.md rather than hitting
   api/form/query directly, and reports progress via onProgress
   so large record sets don't look like a hang.
   ============================================================ */
function indVal(series, indID) {
  if (!indID || indID === "REPLACE_ME" || !series) return "";
  // LEAF response shape is s1.id{N} (optionally {value: ...}).
  let v = series[`id${indID}`];
  if (v && typeof v === "object" && "value" in v) v = v.value;
  return v == null ? "" : decodeEntities(String(v));
}

function safeParseLinks(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .map((o) => {
          if (o == null) return null;
          if (typeof o === "number" || typeof o === "string") {
            return { recordID: String(o), categoryID: "" };
          }
          return {
            recordID: String(o.recordID || o.id || ""),
            categoryID: String(o.categoryID || ""),
          };
        })
        .filter((o) => o && o.recordID);
    }
  } catch (e) {
    /* fall through to delimiter parse */
  }
  // Fallback: comma/space separated recordIDs
  return String(raw)
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((id) => ({ recordID: id, categoryID: "" }));
}

function normalizeEntry(recordID, rec) {
  const series = rec.s1 || rec;
  const I = CONFIG.indicators;
  const type = indVal(series, I.entryType) || "General Log";
  const dateStr = indVal(series, I.entryDate);
  const d = parseYMD(dateStr) || parseYMD(rec.date) || null;
  return {
    recordID: String(recordID),
    type,
    typeClass: TYPE_CLASS[type] || "log",
    date: d,
    dateKey: d ? ymd(d) : "",
    title: indVal(series, I.title) || rec.title || "(untitled)",
    body: indVal(series, I.body),
    status: indVal(series, I.status),
    dueDate: parseYMD(indVal(series, I.dueDate)),
    endDate: parseYMD(indVal(series, I.endDate)),
    assignedTo: indVal(series, I.assignedTo),
    coveredBy: indVal(series, I.coveredBy),
    links: safeParseLinks(indVal(series, I.linked)),
    author: rec.userID || rec.initiatorName || "",
    authorName: rec.initiatorName || rec.userID || "",
    lastUpdated: rec.lastUpdated || "",
  };
}

async function loadEntries() {
  setStatus("Loading entries…");
  if (typeof LeafFormQuery === "undefined") {
    setStatus("LeafFormQuery is not available — this page must run inside LEAF.", true);
    throw new Error("LeafFormQuery missing");
  }
  const I = CONFIG.indicators;
  const wantedIndicators = [
    I.entryDate, I.entryType, I.title, I.body, I.linked,
    I.status, I.assignedTo, I.dueDate, I.endDate, I.coveredBy,
  ].filter((x) => x && x !== "REPLACE_ME");

  const q = new LeafFormQuery();
  q.addTerm("categoryID", "=", CONFIG.categoryID);
  q.addTerm("deleted", "=", 0);
  q.join("initiatorName");
  q.getData(wantedIndicators);

  // IMPORTANT: indicator data lives under the nested "s1" object in the
  // response (s1.id{N}), not a top-level "s1" scalar. Naming "s1" in
  // x-filterData strips the entire indicator payload and silently
  // breaks every entry — so we only whitelist the flat, top-level
  // fields we actually read off `rec` directly.
  q.setExtraParams("&x-filterData=recordID,title,userID,initiatorName,lastUpdated");

  q.onProgress((count) => {
    setStatus(`Loading entries… ${count} loaded`);
  });

  const res = await q.execute();
  const entries = [];
  Object.keys(res || {}).forEach((rid) => {
    const e = normalizeEntry(rid, res[rid]);
    if (e.date) entries.push(e);
  });

  state.entries = entries;
  indexEntries();
  buildAuthorFilter();
  await resolveLinkTitles();
  logDebug("Loaded entries:", entries.length);
  setStatus("");
}

function indexEntries() {
  const map = {};
  // Carry-forward: open/in-progress action items also appear on "today" until closed
  const todayKey = ymd(new Date());
  state.entries.forEach((e) => {
    (map[e.dateKey] = map[e.dateKey] || []).push(e);

    // OOO ranges: also index each day between date..endDate (used by week
    // view; month view renders OOO as a spanning band instead)
    if (e.type === "Out-of-Office" && e.endDate && e.endDate > e.date) {
      let cur = addDays(e.date, 1);
      while (cur <= e.endDate) {
        const k = ymd(cur);
        const clone = { ...e, _spanDay: true, dateKey: k };
        (map[k] = map[k] || []).push(clone);
        cur = addDays(cur, 1);
      }
    }

    // Carry-forward open action items onto today (if the entry is in the past)
    const isOpenAction =
      e.type === "Action Item" &&
      (e.status === "Open" || e.status === "In Progress" || e.status === "Carried Forward");
    if (isOpenAction && e.dateKey && e.dateKey < todayKey) {
      const cf = { ...e, _carriedForward: true, dateKey: todayKey };
      (map[todayKey] = map[todayKey] || []).push(cf);
    }
  });
  state.entriesByDate = map;
}

function buildAuthorFilter() {
  const sel = byId("calFilterAuthor");
  if (!sel) return;
  const seen = {};
  state.entries.forEach((e) => {
    if (e.author && !seen[e.author]) seen[e.author] = e.authorName || e.author;
  });
  state.authors = seen;
  const keep = sel.value;
  sel.innerHTML = '<option value="">Everyone</option>';
  Object.keys(seen)
    .sort((a, b) => String(seen[a]).localeCompare(String(seen[b])))
    .forEach((uid) => {
      const o = document.createElement("option");
      o.value = uid;
      o.textContent = seen[uid];
      sel.appendChild(o);
    });
  sel.value = keep;
}

// Resolve titles for all linked records in one batched query, so chips show live names
async function resolveLinkTitles() {
  const ids = {};
  state.entries.forEach((e) => {
    e.links.forEach((l) => {
      if (l.recordID) ids[l.recordID] = true;
    });
  });
  const idList = Object.keys(ids);
  if (!idList.length || typeof LeafFormQuery === "undefined") return;
  try {
    const q = new LeafFormQuery();
    q.addTerm("recordIDs", "=", idList.join(","));
    q.join("categoryName");
    q.setExtraParams("&x-filterData=recordID,title,categoryID,categoryName,categoryNames");
    q.onProgress((count) => {
      logDebug(`Resolving linked record titles… ${count} loaded`);
    });
    const res = await q.execute();
    const titleMap = {};
    Object.keys(res || {}).forEach((rid) => {
      const r = res[rid];
      titleMap[rid] = {
        title: decodeEntities(r.title || `#${rid}`),
        formName:
          r.categoryName ||
          (Array.isArray(r.categoryNames) ? r.categoryNames.join(", ") : "") ||
          "",
        categoryID: r.categoryID || "",
      };
    });
    state.entries.forEach((e) => {
      e.links.forEach((l) => {
        const m = titleMap[l.recordID];
        if (m) {
          l.title = m.title;
          l.formName = m.formName;
          if (!l.categoryID) l.categoryID = m.categoryID;
        } else if (!l.title) {
          l.title = `#${l.recordID}`;
        }
      });
    });
  } catch (e) {
    logDebug("Link title resolution failed:", e.message);
  }
}

/* ============================================================
   Filtering
   ============================================================ */
function passesFilter(e) {
  const f = state.filters;
  if (f.type && e.type !== f.type) return false;
  if (f.author && e.author !== f.author) return false;
  if (!f.showClosed && e.type === "Action Item" && e.status === "Done" && !e._carriedForward) {
    // closed items hidden unless the toggle is on
    return false;
  }
  if (f.search) {
    const hay = `${e.title} ${stripHtml(e.body)}`.toLowerCase();
    if (!hay.includes(f.search.toLowerCase())) return false;
  }
  return true;
}

function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// document.execCommand (used by the rich-text toolbar) notoriously wraps
// every line in its own <div> in Chromium browsers, producing "div soup"
// like <div>text</div><div>text</div> instead of real paragraphs. This
// collapses top-level <div> wrappers into <p> tags and normalizes legacy
// <b>/<i> (also produced by execCommand) into <strong>/<em>.
function normalizeRichText(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  Array.from(tmp.children).forEach((child) => {
    if (child.tagName === "DIV") {
      const p = document.createElement("p");
      p.innerHTML = child.innerHTML;
      child.replaceWith(p);
    }
  });

  tmp.querySelectorAll("b").forEach((el) => {
    const strong = document.createElement("strong");
    strong.innerHTML = el.innerHTML;
    el.replaceWith(strong);
  });
  tmp.querySelectorAll("i").forEach((el) => {
    const em = document.createElement("em");
    em.innerHTML = el.innerHTML;
    el.replaceWith(em);
  });

  tmp.querySelectorAll("p").forEach((p) => {
    if (p.innerHTML.trim() === "<br>" || p.innerHTML.trim() === "") {
      p.remove();
    }
  });

  return tmp.innerHTML.trim();
}

function entriesForDay(dateKey) {
  const list = (state.entriesByDate[dateKey] || []).filter(passesFilter);
  // Stable order: type priority then title
  const order = { "Out-of-Office": 0, "Meeting Notes": 1, "Action Item": 2, "General Log": 3 };
  return list.sort((a, b) => order[a.type] - order[b.type] || a.title.localeCompare(b.title));
}

/* ============================================================
   Rendering — shared chip / helpers
   ============================================================ */
function chipLabel(e) {
  if (e._spanDay && e.type === "Out-of-Office") return `${e.title} (out)`;
  return e.title;
}

function chipHTML(e) {
  let cls = `cal-chip t-${e.typeClass}`;
  if (e.type === "Action Item" && e.status === "Done") cls += " is-done";
  if (e._carriedForward) cls += " is-carried";
  const prefix = e._carriedForward ? "↺ " : "";
  return `<button type="button" class="${cls}" data-record="${escapeHtml(e.recordID)}" title="${escapeHtml(`${e.type}: ${e.title}`)}">${escapeHtml(prefix)}${escapeHtml(chipLabel(e))}</button>`;
}

/* ── Month view ──────────────────────────────────────────── */
// Single CSS grid for the whole month (not one grid per week) with
// explicit row/column line numbers on every cell. Each week occupies:
//   - 1 row for day numbers
//   - 1 row per OOO band that touches that week
//   - 1 row for chip content
// Using one grid (rather than nested grids) avoids cascade/context bugs
// where a child grid's own `display:grid` fails to apply and its cells
// fall back to block/flex stacking.
function renderMonth() {
  const head = byId("calWeekHead");
  const grid = byId("calMonthGrid");
  if (!head || !grid) return;

  head.innerHTML = orderedDow()
    .map((d) => `<div>${DOW_SHORT[d]}</div>`)
    .join("");

  const first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
  const monthEnd = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 0);
  const gridStart = startOfWeek(first);
  const gridEnd = startOfWeek(monthEnd);
  const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 7;
  const totalWeeks = totalDays / 7;

  const oooEntries = state.entries.filter((e) => e.type === "Out-of-Office" && passesFilter(e));

  // First pass: figure out how many OOO band rows each week needs, and
  // the absolute grid-row line number where each week's content starts.
  const weekBands = []; // weekBands[w] = [{entry, colStart, colEnd}, ...]
  const weekRowStart = []; // weekRowStart[w] = grid-row line where week w's day-number row begins
  let cursorRow = 1;
  for (let w = 0; w < totalWeeks; w++) {
    const rowStart = addDays(gridStart, w * 7);
    const rowEnd = addDays(rowStart, 6);
    const bands = oooEntries
      .map((e) => {
        const spanStart = e.date;
        const spanEnd = e.endDate && e.endDate > e.date ? e.endDate : e.date;
        if (spanEnd < rowStart || spanStart > rowEnd) return null;
        const segStart = spanStart > rowStart ? spanStart : rowStart;
        const segEnd = spanEnd < rowEnd ? spanEnd : rowEnd;
        return {
          entry: e,
          colStart: Math.round((segStart - rowStart) / 86400000),
          colEnd: Math.round((segEnd - rowStart) / 86400000),
        };
      })
      .filter(Boolean);
    weekBands.push(bands);
    weekRowStart.push(cursorRow);
    cursorRow += 1 + bands.length + 1; // day-number row + band rows + chip row
  }
  const totalRows = cursorRow - 1;

  // Build the grid-template-rows track list to match: auto for day-number
  // rows, a fixed 22px for each band row, 1fr (min 96px) for chip rows.
  const rowTracks = [];
  for (let w = 0; w < totalWeeks; w++) {
    rowTracks.push("auto"); // day numbers
    weekBands[w].forEach(() => rowTracks.push("22px")); // one per band
    rowTracks.push("minmax(96px, 1fr)"); // chip content
  }
  grid.style.gridTemplateColumns = "repeat(7, 1fr)";
  grid.style.gridTemplateRows = rowTracks.join(" ");

  let html = "";
  for (let w = 0; w < totalWeeks; w++) {
    const rowStart = addDays(gridStart, w * 7);
    const dayNumRow = weekRowStart[w];
    const bands = weekBands[w];
    const chipRow = dayNumRow + 1 + bands.length;

    // Day-number row
    for (let d = 0; d < 7; d++) {
      const day = addDays(rowStart, d);
      const outside = day.getMonth() !== state.cursor.getMonth();
      html += `<div class="cal-dayNumCell${outside ? " is-outside" : ""}${isTodayDate(day) ? " is-today" : ""}" style="grid-column:${d + 1};grid-row:${dayNumRow}"><span class="cal-dayNum">${day.getDate()}</span></div>`;
    }

    // OOO band rows for this week
    bands.forEach((b, bandIdx) => {
      const gridRow = dayNumRow + 1 + bandIdx;
      const spanStartLabel = fmtLongDate(b.entry.date);
      const spanEndLabel =
        b.entry.endDate && b.entry.endDate > b.entry.date ? ` through ${fmtLongDate(b.entry.endDate)}` : "";
      html += `<button type="button" class="cal-oooBand" style="grid-column:${b.colStart + 1} / span ${b.colEnd - b.colStart + 1};grid-row:${gridRow}" data-record="${escapeHtml(b.entry.recordID)}" title="${escapeHtml(`${b.entry.type}: ${b.entry.title}`)}" aria-label="${escapeHtml(b.entry.title)}, Out-of-Office, ${escapeHtml(spanStartLabel)}${escapeHtml(spanEndLabel)}">${escapeHtml(b.entry.title)}</button>`;
    });

    // Chip content row — always the last row for this week, below every
    // band row above it, so it can never be visually covered.
    for (let d = 0; d < 7; d++) {
      const day = addDays(rowStart, d);
      const key = ymd(day);
      const outside = day.getMonth() !== state.cursor.getMonth();
      const list = entriesForDay(key).filter((e) => !(e.type === "Out-of-Office" && (e._spanDay || e.endDate)));
      const limit = CONFIG.monthCellChipLimit;
      const shown = list.slice(0, limit);
      const extra = list.length - shown.length;

      html += `<div class="cal-dayCell${outside ? " is-outside" : ""}${isTodayDate(day) ? " is-today" : ""}" style="grid-column:${d + 1};grid-row:${chipRow}" data-day="${key}" tabindex="0" role="button" aria-label="${escapeHtml(fmtLongDate(day))}, ${list.length} ${list.length === 1 ? "entry" : "entries"}">`;
      html += '<div class="cal-dayChips">';
      shown.forEach((e) => {
        html += chipHTML(e);
      });
      if (extra > 0) {
        html += `<button type="button" class="cal-moreLink" data-more="${key}">+${extra} more</button>`;
      }
      html += "</div></div>";
    }
  }
  grid.innerHTML = html;
}

/* ── Week view ───────────────────────────────────────────── */
function renderWeek() {
  const board = byId("calWeekBoard");
  if (!board) return;
  const start = startOfWeek(state.cursor);
  let html = "";
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const key = ymd(day);
    const list = entriesForDay(key);
    const today = isTodayDate(day);
    html += '<div class="cal-weekCol">';
    html += `<div class="cal-weekColHead${today ? " is-today" : ""}"><div class="cal-weekDow">${DOW_SHORT[day.getDay()]}</div><div class="cal-weekDate">${day.getDate()}</div></div>`;
    html += `<div class="cal-weekColBody" data-day="${key}">`;
    if (!list.length) {
      html += '<span style="font-size:12px;color:#97a1ad">No entries</span>';
    } else {
      list.forEach((e) => {
        const meta = weekCardMeta(e);
        html += `<div class="cal-weekCard t-${e.typeClass}" data-record="${escapeHtml(e.recordID)}"><div class="cal-weekCardType">${escapeHtml(e.type)}${e._carriedForward ? " ↺" : ""}</div><div class="cal-weekCardTitle">${escapeHtml(e.title)}</div>${meta ? `<div class="cal-weekCardMeta">${meta}</div>` : ""}</div>`;
      });
    }
    html += "</div></div>";
  }
  board.innerHTML = html;
}

function weekCardMeta(e) {
  const bits = [];
  if (e.type === "Action Item") {
    if (e.status) bits.push(escapeHtml(e.status));
    if (e.assignedTo) bits.push(`👤 ${escapeHtml(peopleLabel(e.assignedTo))}`);
  }
  if (e.type === "Out-of-Office" && e.coveredBy) {
    bits.push(`Covered: ${escapeHtml(peopleLabel(e.coveredBy))}`);
  }
  if (e.links && e.links.length) bits.push(`🔗 ${e.links.length}`);
  return bits.join(" · ");
}

// Display label for an empUID we may have cached; falls back to the raw value
const peopleCache = {}; // empUID -> name
function peopleLabel(empUID) {
  if (!empUID) return "";
  return peopleCache[empUID] || String(empUID);
}

/* ── View switch ─────────────────────────────────────────── */
function render() {
  updateRangeLabel();
  byId("calMonthView").hidden = state.view !== "month";
  byId("calWeekView").hidden = state.view !== "week";
  if (state.view === "month") renderMonth();
  else renderWeek();
}

function updateRangeLabel() {
  const el = byId("calRangeLabel");
  if (!el) return;
  if (state.view === "week") {
    const s = startOfWeek(state.cursor);
    const e = addDays(s, 6);
    const crossesMonth = s.getMonth() !== e.getMonth();
    el.textContent = `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${crossesMonth ? `${MONTHS[e.getMonth()].slice(0, 3)} ` : ""}${e.getDate()}, ${e.getFullYear()}`;
  } else {
    el.textContent = `${MONTHS[state.cursor.getMonth()]} ${state.cursor.getFullYear()}`;
  }
}

/* ============================================================
   Modal plumbing (focus trap + open/close)
   ============================================================ */
let modalStack = [];
function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href],button:not([disabled]),textarea,input:not([disabled]),select:not([disabled]),iframe,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}
function trapKey(e, modal) {
  if (e.key !== "Tab") return;
  const f = getFocusable(modal);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
function openModal(id) {
  const modal = byId(id);
  if (!modal) return;
  modal._lastFocus = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modal._trap = (e) => trapKey(e, modal);
  modal.addEventListener("keydown", modal._trap);
  modalStack.push(modal);
  const f = getFocusable(modal);
  if (f[0]) f[0].focus();
}
function closeModal(id) {
  const modal = byId(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (modal._trap) modal.removeEventListener("keydown", modal._trap);
  modalStack = modalStack.filter((m) => m !== modal);
  if (modal._lastFocus && modal._lastFocus.focus) modal._lastFocus.focus();
}

/* ============================================================
   Record viewer (iframe)
   ============================================================ */
function openRecord(recordID, title) {
  const frame = byId("calRecordFrame");
  const titleEl = byId("calRecordModalTitle");
  const openTab = byId("calRecordOpenTab");
  const url = recordViewURL(recordID);
  if (titleEl) titleEl.textContent = title || `Record #${recordID}`;
  if (openTab) openTab.href = url;
  if (frame) frame.src = url;
  openModal("calRecordModal");
}

/* ============================================================
   Entry modal — open / populate / conditional fields
   ============================================================ */
function applyConditionalFields(type) {
  byId("calCondAction").hidden = type !== "Action Item";
  byId("calCondOoo").hidden = type !== "Out-of-Office";
}

function openEntryModal(entry, presetDate) {
  state.editing = entry || null;
  state.draftLinks = entry ? entry.links.map((l) => ({ ...l })) : [];
  state.draftAssigned = null;
  state.draftCovered = null;

  byId("calEntryModalTitle").textContent = entry ? "Edit entry" : "New entry";
  byId("calSaveBtn").textContent = entry ? "Save changes" : "Save entry";
  byId("calDeleteBtn").hidden = !entry;

  const openTab = byId("calEntryOpenTab");
  if (openTab) {
    if (entry) {
      openTab.href = recordViewURL(entry.recordID);
      openTab.hidden = false;
    } else {
      openTab.hidden = true;
    }
  }

  byId("calEntryMsg").textContent = "";

  byId("calEntryRecordID").value = entry ? entry.recordID : "";
  byId("calFldDate").value = entry && entry.date ? ymd(entry.date) : presetDate || ymd(new Date());
  byId("calFldType").value = entry ? entry.type : "";
  byId("calFldTitle").value = entry ? entry.title : "";
  // Ensure the editor starts from clean <p> markup even for entries saved
  // before normalizeRichText() existed, so re-editing doesn't compound div soup.
  byId("calFldBody").innerHTML = entry ? normalizeRichText(entry.body || "") : "";
  byId("calFldBody").setAttribute("data-placeholder", "Notes, decisions, links…");

  byId("calFldStatus").value = entry && entry.status ? entry.status : "Open";
  byId("calFldDue").value = entry && entry.dueDate ? ymd(entry.dueDate) : "";
  byId("calFldEnd").value = entry && entry.endDate ? ymd(entry.endDate) : "";

  // People
  if (entry && entry.assignedTo) {
    state.draftAssigned = { empUID: entry.assignedTo, name: peopleLabel(entry.assignedTo) };
  }
  if (entry && entry.coveredBy) {
    state.draftCovered = { empUID: entry.coveredBy, name: peopleLabel(entry.coveredBy) };
  }
  renderPeopleSelected("assigned");
  renderPeopleSelected("covered");

  applyConditionalFields(entry ? entry.type : "");
  renderDraftLinks();
  openModal("calEntryModal");
}

function renderDraftLinks() {
  const wrap = byId("calLinkChips");
  if (!wrap) return;
  if (!state.draftLinks.length) {
    wrap.innerHTML = '<span style="font-size:13px;color:#97a1ad">No records linked yet.</span>';
    return;
  }
  wrap.innerHTML = state.draftLinks
    .map((l, idx) => {
      const label = l.title || `#${l.recordID}`;
      const form = l.formName
        ? ` <span class="cal-linkChipForm">· ${escapeHtml(l.formName)}</span>`
        : "";
      return `<span class="cal-linkChip" role="listitem"><span class="cal-linkChipMain" data-open-link="${idx}" role="button" tabindex="0"><span class="material-symbols-outlined" style="font-size:15px" aria-hidden="true">description</span>${escapeHtml(label)}</span>${form}<button type="button" data-remove-link="${idx}" aria-label="Remove link: ${escapeHtml(label)}"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></span>`;
    })
    .join("");
}

/* ============================================================
   People picker (orgchart)
   ============================================================ */
function renderPeopleSelected(role) {
  const containerId = role === "assigned" ? "calAssignedSelected" : "calCoveredSelected";
  const searchId = role === "assigned" ? "calAssignedSearch" : "calCoveredSearch";
  const person = role === "assigned" ? state.draftAssigned : state.draftCovered;
  const el = byId(containerId);
  const search = byId(searchId);
  if (!el) return;
  if (person && person.empUID) {
    const label = person.name || person.empUID;
    el.innerHTML = `<span class="cal-personChip">${escapeHtml(label)}<button type="button" data-clear-person="${role}" aria-label="Remove ${escapeHtml(label)}"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></span>`;
    if (search) search.style.display = "none";
  } else {
    el.innerHTML = "";
    if (search) search.style.display = "";
  }
}

// Reads an orgchart "indicator data" cell out of an employee record's
// `data` array, matching the shape used by employeeSelector.js:
//   response[i].data[5] => { data: "555-1234" }  (phone)
//   response[i].data[6] => { data: "a@b.gov" }   (email)
function empIndicatorText(emp, indicatorID) {
  const cell = emp && emp.data ? emp.data[indicatorID] : null;
  return cell && cell.data ? String(cell.data) : "";
}

async function searchPeople(term, role) {
  const listId = role === "assigned" ? "calAssignedResults" : "calCoveredResults";
  const searchId = role === "assigned" ? "calAssignedSearch" : "calCoveredSearch";
  const listEl = byId(listId);
  const searchEl = byId(searchId);
  if (!listEl) return;
  if (!term || term.length < 2) {
    listEl.hidden = true;
    if (searchEl) searchEl.setAttribute("aria-expanded", "false");
    return;
  }
  try {
    // Real endpoint per employeeSelector.js: "./api/?a=employee/search"
    // (query-string routed action, NOT a REST path segment).
    const res = await apiGet(`./api/?a=employee/search&q=${encodeURIComponent(term)}`);
    const rows = Array.isArray(res) ? res : Object.values(res || {});
    if (!rows.length) {
      listEl.innerHTML = '<li role="option" aria-disabled="true">No matches</li>';
      listEl.hidden = false;
      if (searchEl) searchEl.setAttribute("aria-expanded", "true");
      return;
    }
    listEl.innerHTML = rows
      .filter((p) => !p.deleted)
      .slice(0, 8)
      .map((p) => {
        const middle = p.middleName ? ` ${p.middleName}.` : "";
        const name = decodeEntities(
          p.lastName || p.firstName
            ? `${p.lastName || ""}, ${p.firstName || ""}${middle}`
            : p.userName || `#${p.empUID || ""}`,
        );
        const email = empIndicatorText(p, 6);
        const uid = p.empUID ?? "";
        return `<li role="option" tabindex="-1" data-empuid="${escapeHtml(uid)}" data-name="${escapeHtml(name)}" data-role="${role}">${escapeHtml(name)}<small>${escapeHtml(p.userName || email || "")}</small></li>`;
      })
      .join("");
    listEl.hidden = false;
    if (searchEl) searchEl.setAttribute("aria-expanded", "true");
  } catch (e) {
    listEl.innerHTML = '<li role="option" aria-disabled="true">Search unavailable</li>';
    listEl.hidden = false;
    logDebug("people search failed:", e.message);
  }
}

// NOTE: there is no confirmed "import employee" endpoint in the LEAF
// source reviewed so far (only ./api/?a=employee/search is verified). The
// empUID returned by that search is already usable directly as an
// indicator value, so no separate import step is required.
async function importEmployee() {
  // Intentionally does nothing until a real import endpoint is confirmed.
}

function pickPerson(role, empUID, name, userName) {
  peopleCache[empUID] = name;
  if (role === "assigned") state.draftAssigned = { empUID, name, userName };
  else state.draftCovered = { empUID, name, userName };
  renderPeopleSelected(role);
  const listId = role === "assigned" ? "calAssignedResults" : "calCoveredResults";
  const searchId = role === "assigned" ? "calAssignedSearch" : "calCoveredSearch";
  if (byId(listId)) byId(listId).hidden = true;
  if (byId(searchId)) byId(searchId).setAttribute("aria-expanded", "false");
  if (userName) importEmployee(userName);
}

/* ============================================================
   Link picker — search across ALL forms
   ============================================================ */
let linkFormFilterReady = false;
async function ensureLinkFormFilter() {
  if (linkFormFilterReady) return;
  const sel = byId("calLinkFormFilter");
  if (!sel) return;
  try {
    const cats = await apiGet("./api/workflow/categoriesUnabridged");
    const arr = (Array.isArray(cats) ? cats : Object.values(cats || {})).filter(
      (c) => c && (c.categoryName || c.name),
    );
    arr.sort((a, b) => String(a.categoryName || a.name).localeCompare(String(b.categoryName || b.name)));
    arr.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.categoryID || c.id;
      o.textContent = c.categoryName || c.name;
      sel.appendChild(o);
    });
    linkFormFilterReady = true;
  } catch (e) {
    logDebug("form filter load failed:", e.message);
  }
}

const linkSearchRun = debounce(() => {
  const term = byId("calLinkSearch").value.trim();
  const formFilter = byId("calLinkFormFilter").value;
  runLinkSearch(term, formFilter);
}, 250);

async function runLinkSearch(term, formFilter) {
  const out = byId("calLinkResults");
  if (!out) return;
  if (!term || term.length < 2) {
    out.innerHTML = '<p class="cal-linkHint">Type at least 2 characters to search across all forms.</p>';
    return;
  }
  const myToken = ++linkSearchToken;
  out.innerHTML = '<p class="cal-linkHint">Searching…</p>';
  try {
    const q = new LeafFormQuery();
    q.addTerm("title", "LIKE", `*${term}*`);
    q.addTerm("deleted", "=", 0);
    if (formFilter) q.addTerm("categoryID", "=", formFilter);
    q.join("categoryName");
    q.setLimit(40);
    q.setExtraParams("&x-filterData=recordID,title,categoryID,categoryName,categoryNames");
    q.onProgress((count) => {
      if (myToken !== linkSearchToken) return; // a newer search superseded this one
      out.innerHTML = `<p class="cal-linkHint">Searching… ${count} matched so far</p>`;
    });
    const res = await q.execute();
    if (myToken !== linkSearchToken) return; // stale response — a newer search is in flight

    const rows = Object.keys(res || {}).map((rid) => {
      const r = res[rid];
      return {
        recordID: rid,
        title: decodeEntities(r.title || `#${rid}`),
        categoryID: r.categoryID || "",
        formName:
          r.categoryName ||
          (Array.isArray(r.categoryNames) ? r.categoryNames.join(", ") : "") ||
          "",
      };
    });
    if (!rows.length) {
      out.innerHTML = `<p class="cal-linkHint">No records match "${escapeHtml(term)}".</p>`;
      return;
    }
    const linkedIds = {};
    state.draftLinks.forEach((l) => {
      linkedIds[l.recordID] = true;
    });
    out.innerHTML = rows
      .map((r) => {
        const isLinked = !!linkedIds[r.recordID];
        return `<div class="cal-linkResult${isLinked ? " is-linked" : ""}" role="button" tabindex="0" data-record="${escapeHtml(r.recordID)}" data-cat="${escapeHtml(r.categoryID)}" data-title="${escapeHtml(r.title)}" data-form="${escapeHtml(r.formName)}"><div class="cal-linkResultMain"><div class="cal-linkResultTitle">${escapeHtml(r.title)}</div><div class="cal-linkResultMeta">${escapeHtml(r.formName || "Form")} · #${escapeHtml(r.recordID)}</div></div><span class="cal-linkResultAdd">${isLinked ? "✓ Linked" : "+ Add"}</span></div>`;
      })
      .join("");
  } catch (e) {
    if (myToken !== linkSearchToken) return;
    out.innerHTML = `<p class="cal-linkHint">Search failed. ${escapeHtml(e.message)}</p>`;
  }
}

function toggleDraftLink(recordID, categoryID, title, formName) {
  const idx = state.draftLinks.findIndex((l) => l.recordID === recordID);
  if (idx >= 0) state.draftLinks.splice(idx, 1);
  else state.draftLinks.push({ recordID, categoryID, title, formName });
  renderDraftLinks();
  // reflect in the open search list
  const term = byId("calLinkSearch").value.trim();
  runLinkSearch(term, byId("calLinkFormFilter").value);
}

/* ============================================================
   Save / delete
   ============================================================ */
async function saveEntry() {
  const msg = byId("calEntryMsg");
  msg.textContent = "";
  const I = CONFIG.indicators;

  const type = byId("calFldType").value;
  const date = byId("calFldDate").value;
  const title = byId("calFldTitle").value.trim();

  if (!date) {
    msg.textContent = "Pick a date.";
    byId("calFldDate").focus();
    return;
  }
  if (!type) {
    msg.textContent = "Choose an entry type.";
    byId("calFldType").focus();
    return;
  }
  if (!title) {
    msg.textContent = "Add a title.";
    byId("calFldTitle").focus();
    return;
  }

  const saveBtn = byId("calSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  // Build indicator payload
  const values = {};
  values[I.entryDate] = date;
  values[I.entryType] = type;
  values[I.title] = title;
  values[I.body] = normalizeRichText(byId("calFldBody").innerHTML.trim());
  values[I.linked] = JSON.stringify(
    state.draftLinks.map((l) => ({ recordID: l.recordID, categoryID: l.categoryID || "" })),
  );

  if (type === "Action Item") {
    values[I.status] = byId("calFldStatus").value;
    values[I.dueDate] = byId("calFldDue").value || "";
    values[I.assignedTo] = state.draftAssigned ? state.draftAssigned.empUID : "";
  } else {
    values[I.status] = "";
    values[I.dueDate] = "";
    values[I.assignedTo] = "";
  }
  if (type === "Out-of-Office") {
    values[I.endDate] = byId("calFldEnd").value || "";
    values[I.coveredBy] = state.draftCovered ? state.draftCovered.empUID : "";
  } else {
    values[I.endDate] = "";
    values[I.coveredBy] = "";
  }

  try {
    let recordID = byId("calEntryRecordID").value;
    const isNew = !recordID;
    if (isNew) {
      recordID = await createRecord();
    }
    await writeIndicators(recordID, values);
    if (isNew) await submitRecord(recordID);

    closeModal("calEntryModal");
    announce(isNew ? "Entry created." : "Entry saved.");
    setStatus("Reloading…");
    await loadEntries();
    render();
  } catch (e) {
    msg.textContent = `Save failed: ${e.message}`;
    logDebug("save error", e);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = state.editing ? "Save changes" : "Save entry";
  }
}

async function deleteEntry() {
  const recordID = byId("calEntryRecordID").value;
  if (!recordID) return;
  if (!window.confirm("Delete this entry? This can't be undone.")) return;
  try {
    // LEAF soft-delete endpoint
    await apiPost(`./api/form/${encodeURIComponent(recordID)}/delete`, { CSRFToken: CSRF });
    closeModal("calEntryModal");
    announce("Entry deleted.");
    await loadEntries();
    render();
  } catch (e) {
    byId("calEntryMsg").textContent = `Delete failed: ${e.message}`;
  }
}

/* ============================================================
   Day peek popover ("+N more")
   ============================================================ */
function openDayPeek(dateKey, anchorEl) {
  const peek = byId("calDayPeek");
  if (!peek) return;
  const d = parseYMD(dateKey);
  const list = entriesForDay(dateKey);
  peek.innerHTML = `<div class="cal-dayPeekHead">${escapeHtml(fmtLongDate(d))}<button type="button" data-close-peek aria-label="Close"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div>${list.map((e) => chipHTML(e)).join("")}`;
  peek.hidden = false;
  const r = anchorEl.getBoundingClientRect();
  const top = window.scrollY + r.bottom + 4;
  let left = window.scrollX + r.left;
  left = Math.min(left, window.scrollX + window.innerWidth - 320);
  peek.style.top = `${top}px`;
  peek.style.left = `${Math.max(8, left)}px`;
  // Move focus to the close button so keyboard/AT users land somewhere sensible
  const closeBtn = peek.querySelector("[data-close-peek]");
  if (closeBtn) closeBtn.focus();
}
function closeDayPeek() {
  const p = byId("calDayPeek");
  if (p) p.hidden = true;
}

/* ============================================================
   Event wiring
   ============================================================ */
function wireControls() {
  // Navigation
  byId("calPrevBtn").addEventListener("click", () => navigate(-1));
  byId("calNextBtn").addEventListener("click", () => navigate(1));
  byId("calTodayBtn").addEventListener("click", () => {
    state.cursor = startOfDay(new Date());
    render();
  });

  // View toggle
  document.querySelectorAll(".cal-viewBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cal-viewBtn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      state.view = btn.getAttribute("data-view");
      render();
    });
  });

  // Filters
  byId("calFilterType").addEventListener("change", function onChange() {
    state.filters.type = this.value;
    render();
  });
  byId("calFilterAuthor").addEventListener("change", function onChange() {
    state.filters.author = this.value;
    render();
  });
  byId("calShowClosed").addEventListener("change", function onChange() {
    state.filters.showClosed = this.checked;
    render();
  });
  byId("calFilterSearch").addEventListener(
    "input",
    debounce(() => {
      state.filters.search = byId("calFilterSearch").value.trim();
      render();
    }, 200),
  );
  byId("calClearFilters").addEventListener("click", () => {
    state.filters = { type: "", author: "", search: "", showClosed: false };
    byId("calFilterType").value = "";
    byId("calFilterAuthor").value = "";
    byId("calFilterSearch").value = "";
    byId("calShowClosed").checked = false;
    render();
  });

  // Add
  byId("calAddBtn").addEventListener("click", () => openEntryModal(null));

  // Delegated clicks across views
  document.addEventListener("click", onDelegatedClick);

  // Day cell / chip keyboard activation + Escape handling
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!byId("calDayPeek").hidden) {
        closeDayPeek();
        return;
      }
      if (modalStack.length) closeModal(modalStack[modalStack.length - 1].id);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const cell = e.target.closest && e.target.closest(".cal-dayCell");
    if (cell && e.target === cell) {
      e.preventDefault();
      openEntryModal(null, cell.getAttribute("data-day"));
    }
  });

  // Modal close buttons / backdrops
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      const which = el.getAttribute("data-close");
      const map = { entry: "calEntryModal", link: "calLinkModal", record: "calRecordModal" };
      closeModal(map[which]);
      if (which === "record") byId("calRecordFrame").src = "about:blank";
    });
  });

  // Entry form
  byId("calEntryForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveEntry();
  });
  byId("calDeleteBtn").addEventListener("click", deleteEntry);
  byId("calFldType").addEventListener("change", function onChange() {
    applyConditionalFields(this.value);
  });

  // Rich text toolbar
  byId("calFldBodyToolbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cmd]");
    if (!b) return;
    e.preventDefault();
    byId("calFldBody").focus();
    document.execCommand(b.getAttribute("data-cmd"), false, null);
  });

  // Nudge execCommand toward <p> paragraphs instead of its default bare
  // <div> line-wrapping (normalizeRichText still does the full cleanup
  // on save — this just reduces how much cleanup is needed).
  byId("calFldBody").addEventListener("focus", () => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch (e) {
      /* unsupported in some browsers — normalizeRichText() still cleans up on save */
    }
  });

  // People pickers
  wirePeople("assigned", "calAssignedSearch", "calAssignedResults");
  wirePeople("covered", "calCoveredSearch", "calCoveredResults");

  // Link picker
  byId("calLinkAddBtn").addEventListener("click", () => {
    ensureLinkFormFilter();
    byId("calLinkSearch").value = "";
    byId("calLinkResults").innerHTML =
      '<p class="cal-linkHint">Type at least 2 characters to search across all forms.</p>';
    openModal("calLinkModal");
    setTimeout(() => byId("calLinkSearch").focus(), 50);
  });
  byId("calLinkSearch").addEventListener("input", linkSearchRun);
  byId("calLinkFormFilter").addEventListener("change", linkSearchRun);

  // Jump to top
  const jump = byId("calJumpTop");
  window.addEventListener(
    "scroll",
    () => {
      jump.hidden = window.scrollY < 400;
    },
    { passive: true },
  );
  jump.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Close peek on outside click
  document.addEventListener("click", (e) => {
    const peek = byId("calDayPeek");
    if (peek.hidden) return;
    if (!peek.contains(e.target) && !e.target.closest("[data-more]")) closeDayPeek();
  });
}

function wirePeople(role, searchId, listId) {
  const search = byId(searchId);
  const list = byId(listId);
  if (!search) return;
  search.addEventListener(
    "input",
    debounce(() => searchPeople(search.value.trim(), role), 250),
  );
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-empuid]");
    if (!li) return;
    const small = li.querySelector("small");
    const uname = small ? small.textContent : "";
    pickPerson(role, li.getAttribute("data-empuid"), li.getAttribute("data-name"), uname);
    search.value = "";
    search.focus();
  });
}

function onDelegatedClick(e) {
  // OOO band (month view multi-day span)
  const oooBand = e.target.closest(".cal-oooBand");
  if (oooBand) {
    const rid = oooBand.getAttribute("data-record");
    const entry = state.entries.find((x) => x.recordID === rid);
    if (entry) openEntryModal(entry);
    return;
  }

  // Open a record chip / card
  const recEl = e.target.closest("[data-record]");
  if (recEl && !e.target.closest("[data-remove-link],[data-open-link],[data-close]")) {
    const rid = recEl.getAttribute("data-record");
    const entry = state.entries.find((x) => x.recordID === rid);
    if (entry) openEntryModal(entry);
    return;
  }

  // "+N more"
  const more = e.target.closest("[data-more]");
  if (more) {
    e.stopPropagation();
    openDayPeek(more.getAttribute("data-more"), more);
    return;
  }

  // close peek button
  if (e.target.closest("[data-close-peek]")) {
    closeDayPeek();
    return;
  }

  // Empty day cell / week column body → new entry for that day
  const body = e.target.closest(".cal-weekColBody");
  if (body && !e.target.closest("[data-record]")) {
    openEntryModal(null, body.getAttribute("data-day"));
    return;
  }
  const cell = e.target.closest(".cal-dayCell");
  if (cell && e.target === cell) {
    openEntryModal(null, cell.getAttribute("data-day"));
    return;
  }
  const chips = e.target.closest(".cal-dayChips");
  if (cell && !chips && !e.target.closest("[data-record],[data-more]")) {
    openEntryModal(null, cell.getAttribute("data-day"));
    return;
  }

  // Draft link chip: open record
  const openLink = e.target.closest("[data-open-link]");
  if (openLink) {
    const l = state.draftLinks[+openLink.getAttribute("data-open-link")];
    if (l) openRecord(l.recordID, l.title);
    return;
  }
  // Draft link chip: remove
  const rmLink = e.target.closest("[data-remove-link]");
  if (rmLink) {
    state.draftLinks.splice(+rmLink.getAttribute("data-remove-link"), 1);
    renderDraftLinks();
    return;
  }
  // Clear a picked person
  const clearP = e.target.closest("[data-clear-person]");
  if (clearP) {
    const role = clearP.getAttribute("data-clear-person");
    if (role === "assigned") state.draftAssigned = null;
    else state.draftCovered = null;
    renderPeopleSelected(role);
    return;
  }
  // Link search result add/remove
  const lr = e.target.closest(".cal-linkResult");
  if (lr) {
    toggleDraftLink(
      lr.getAttribute("data-record"),
      lr.getAttribute("data-cat"),
      lr.getAttribute("data-title"),
      lr.getAttribute("data-form"),
    );
  }
}

function navigate(dir) {
  if (state.view === "week") state.cursor = addDays(state.cursor, dir * 7);
  else state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + dir, 1);
  render();
}

/* ============================================================
   Init
   ============================================================ */
async function main() {
  wireControls();
  render(); // paints the empty grid immediately

  if (DEBUG) {
    await runDiagnostics();
  }

  if (String(CONFIG.categoryID).indexOf("REPLACE_ME") === 0) {
    setStatus(
      "Calendar not configured yet — set CONFIG.categoryID and indicator IDs in calendar.js.",
      true,
    );
    return;
  }

  const hasAnyIndicator = Object.values(CONFIG.indicators).some((v) => v && v !== "REPLACE_ME");
  if (!hasAnyIndicator) {
    setStatus(
      "Calendar not configured yet — set CONFIG.indicators in calendar.js.",
      true,
    );
    return;
  }

  try {
    await loadEntries();
    render();
  } catch (e) {
    setStatus(`Could not load entries. ${e.message}`, true);
    logDebug("load failed", e);
  }
}

document.addEventListener("DOMContentLoaded", main);
