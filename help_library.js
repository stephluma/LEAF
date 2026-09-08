var HelpLib = (function () {
  /* ── Icons ── */
  const ICON_NAMES = [
    "close", "search", "grid_view", "star", "label", "play_circle",
    "menu_book", "help", "timeline", "change_circle", "folder",
    "chevron_right", "chevron_left", "update", "picture_as_pdf",
    "search_off", "schedule", "sort_by_alpha", "unfold_less",
    "unfold_more", "open_in_new", "smart_display", "lightbulb",
    "thumb_up", "thumb_down",
  ];
  const ICONS = {};

  async function loadIcons() {
    await Promise.all(
      ICON_NAMES.map(async (name) => {
        try {
          const res = await fetch(`./files/${name}.svg`);
          ICONS[name] = await res.text();
        } catch (err) {
          console.error(`[loadIcons] failed to load ${name}.svg`, err);
          ICONS[name] = "";
        }
      }),
    );
  }

  function icon(name) {
    const svg = ICONS[name] ?? "";
    return `<span class="hl-icon" aria-hidden="true">${svg}</span>`;
  }

  /* ── Config ── */
  const CFG = {
    categoryID: "form_08f4f",
    stepID: 15,
    indDesc: "40",
    indTutFile: "41",
    indVideoURL: "42",
    indUpdated: "22",
    indCategory: "47",
    indFeatured: "48",
    indEmbed: "49",
    indStartHere: "50",
    indLearningObj: "53",
    votesApiRoot: "https://leaf.va.gov/platform/votes/api/",
    feedbackFormID: "form_faf54",
    indVoteArticleID: "3",
    indVoteYesNo: "4",
    indVoteArticleName: "5",
    indVoteUser: "2",
    consultURL:
      "https://leaf.va.gov/platform/support/report.php?a=LEAF_Start_Request&id=form_ba7de&title=Consultation+Request+from+Help+Library",
    GROUP_CAP: 10,
    HOME_GROUP_CAP: 2,
    FLAT_CAP: 15,
    START_HERE_CAP: 4,
  };

  // Categories that still exist as data tags (searchable/filterable) but
  // are not browsable as their own tab or homepage group — their items
  // only surface via the Start Here band (if flagged) or search.
  const HIDDEN_CATS = ["Getting Started"];

  const ALL_TAB = { id: "all", label: "All topics", icon: "grid_view", cls: "" };
  const START_TAB = { id: "start", label: "Start Here", icon: "star", cls: "hl-ctab-sh" };

  /* ── State ── */
  let DATA = [];
  let dynCats = [];
  let hasStartHere = false;
  let groupVisible = {};
  let lastOpenedId = null;

  // Config injected by the page (mirrors window.leafIdeaPortal used by
  // ideas_v4.js) — needed to identify the voting user and authorize the
  // write. Falls back to empty strings so the feedback widget can still
  // render (and fail gracefully with an explanatory error) if the host
  // page hasn't been updated to inject this yet.
  const HL_CFG = window.helpLibConfig || {};
  const feedbackUserID = String(HL_CFG.userID ?? "").trim();
  const feedbackCSRF = String(HL_CFG.csrfToken ?? "").trim();

  const state = {
    cat: "all",
    type: "all",
    days: "all",
    sort: "recent",
    q: "",
    words: [],
  };

  const TODAY = new Date();
  const LAST_MONTH = new Date();
  LAST_MONTH.setDate(TODAY.getDate() - 30);

  /* ── Utilities ── */
  function scrubHTML(s) {
    if (!s) return "";
    const el = document.createElement("div");
    el.innerHTML = s;
    return el.innerText;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fmtDate(d) {
    return d
      ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;
  }

  /* Focus an element only if it's still attached to the document; otherwise
     fall back to main content. Guards against re-renders removing the
     original trigger element while a modal was open. */
  function safeFocus(el) {
    const target = el && document.contains(el) ? el : document.getElementById("hl-main-content");
    target?.focus();
  }

  /* LEAF's header renders the logged-in user's full name (from $login->getName()).
     We extract the first name from that existing DOM content rather than
     duplicating the lookup server-side. Falls back to null (→ plain "Hello!")
     if neither method finds a name. Fragile: depends on LEAF shell markup
     staying stable; breakage here is silent beyond the console.error below. */
  function getFirstName() {
    try {
      const headerEl =
        document.querySelector("#headerHelp span b") ||
        document.querySelector(".user-name") ||
        document.querySelector('[id*="header"] b');

      if (headerEl?.textContent?.trim()) {
        const first = headerEl.textContent.trim().split(/\s+/)[0];
        if (first) return first;
      }

      const bodyMatch = document.body.innerText.match(/Welcome,\s+([A-Za-z]+)\s+/);
      if (bodyMatch?.[1]) return bodyMatch[1];
    } catch (err) {
      console.error("[getFirstName] lookup failed", err);
    }
    return null;
  }

  function renderHeroGreeting() {
    const el = document.getElementById("heroGreeting");
    if (!el) return;
    const first = getFirstName();
    el.textContent = first ? `Hello, ${first}!` : "Hello!";
  }

  /* Turn plain-text descriptions into lightly structured HTML: consecutive
     numbered lines ("1. ...", "2. ...") become a real <ol>; blank-line
     separated blocks become distinct <p> tags. Source data is untouched —
     this only affects rendering. Output is still fully escaped. */
  function formatDesc(raw) {
    if (!raw) return "";
    const blocks = raw.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    if (!blocks.length) return "";

    return blocks
      .map((block) => {
        const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
        const isNumbered = lines.length > 1 && lines.every((l) => /^\d+[.)]\s+/.test(l));
        if (isNumbered) {
          const items = lines.map((l) => `<li>${esc(l.replace(/^\d+[.)]\s+/, ""))}</li>`).join("");
          return `<ol class="hl-desc-list">${items}</ol>`;
        }
        return `<p>${esc(block.replace(/\n/g, " "))}</p>`;
      })
      .join("");
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* Safely assigns HTML that may contain rich/user-authored content.
     Sanitizes via DOMPurify when available. If DOMPurify isn't loaded,
     html is expected to already be safe, escaped markup (see sanitizeRich's
     fallback path) and is assigned as-is rather than flattened to text,
     which would break its intended list structure. */
  function setSafeHTML(el, html) {
    if (!el) return;
    if (window.DOMPurify?.sanitize) {
      el.innerHTML = window.DOMPurify.sanitize(html ?? "");
    } else {
      el.innerHTML = html ?? "";
    }
  }

  /* Detects PHP serialize()'s array format, e.g. a:3:{i:0;s:11:"Objective 1";...}.
     Indicator 53 is a Trumbowyg (HTML) field, but some existing records still
     hold raw serialized arrays from a prior field type/migration. Extracts
     each string value in order; returns null if the input doesn't match
     (caller falls back to normal HTML handling) or if parsing fails partway
     (e.g. truncated/corrupt data). */
  function parsePHPSerializedStrings(raw) {
    if (!/^a:\d+:\{/.test(raw)) return null;
    const values = [];
    const re = /s:(\d+):"/g;
    let match;
    while ((match = re.exec(raw))) {
      const len = parseInt(match[1], 10);
      const start = match.index + match[0].length;
      const value = raw.slice(start, start + len);
      if (raw.slice(start + len, start + len + 2) !== '";') return null;
      values.push(value);
      re.lastIndex = start + len + 2;
    }
    return values.length ? values : null;
  }

  /* Sanitizes rich-text HTML (e.g. Trumbowyg-authored fields) into a string
     ready for setSafeHTML(). Checks for legacy PHP-serialized array data
     first (see parsePHPSerializedStrings) since that isn't valid HTML and
     would otherwise render as a literal string. Falls back to a manual
     plain-text extraction when DOMPurify isn't loaded, so content stays
     readable as a bullet list rather than depending on .innerText's
     unreliable behavior on detached (unattached) elements. */
  function sanitizeRich(html) {
    if (!html) return "";

    const serialized = parsePHPSerializedStrings(html);
    if (serialized) {
      return `<ul>${serialized.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`;
    }

    if (window.DOMPurify?.sanitize) return html;

    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    tmp.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, tr").forEach((el) => {
      el.append("\n");
    });
    const lines = (tmp.textContent ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return "";
    return `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
  }

  /* Advances a freshly-created vote record into its workflow (silent — no
     UI difference on success or failure beyond the console warning). A
     single POST to /submit is sufficient: it's what moves the record from
     unsubmitted into the workflow, landing it on the form's first step
     (stepID 1). Step 1 itself has an automatic/no-input action that fires
     the moment a record arrives there, so nothing further should be
     triggered here — a subsequent /currentStep + /apply call (as
     ideas_v4.js's advanceWorkflow() does for the idea-submission flow)
     would advance the record a second time, past step 1 and into whatever
     step follows its auto-action. Do not add that back without confirming
     step 1's configuration hasn't changed. */
  async function advanceFeedbackWorkflow(recordID) {
    try {
      const submitRes = await fetch(`${CFG.votesApiRoot}form/${recordID}/submit`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ CSRFToken: feedbackCSRF }),
      });
      if (!submitRes.ok) {
        console.warn(`[Feedback] Workflow submit failed (${submitRes.status}) for record ${recordID}`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[Feedback] Workflow advance error:", err);
      return false;
    }
  }

  /* ── Feedback widget ("Was this resource helpful?") ──
     Each click logs a brand-new record on the votes app's form
     (CFG.feedbackFormID) rather than updating the article's own record —
     this is a vote log, not a single persistent field, so repeat votes
     (including changing your mind) all get recorded rather than
     overwriting a prior one. Mirrors ideas_v4.js's IdeaVotes(): a POST to
     the votes app's ./api/?a=form/new with numform_{formKey}=1 and the raw
     indicator IDs as payload keys. Returns the new record's ID on success
     (needed to advance its workflow afterward), or null on failure. */
  async function submitFeedback(articleID, articleTitle, vote) {
    const radioValue = vote === "up" ? "Yes" : "No";
    const formKey = CFG.feedbackFormID.replace("form_", "");
    const body = new URLSearchParams({
      service: "",
      title: `Help Library Feedback — Article #${articleID}`,
      priority: "0",
      CSRFToken: feedbackCSRF,
      [`numform_${formKey}`]: "1",
      [CFG.indVoteArticleID]: String(articleID),
      [CFG.indVoteYesNo]: radioValue,
      [CFG.indVoteArticleName]: articleTitle ?? "",
      [CFG.indVoteUser]: feedbackUserID,
    });
    try {
      const res = await fetch(`${CFG.votesApiRoot}?a=form/new`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: body.toString(),
      });
      if (!res.ok) {
        console.warn(`[Feedback] HTTP ${res.status} logging feedback for article ${articleID}`);
        return false;
      }
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      const newID = parseFloat(parsed);
      if (isNaN(newID) || !isFinite(newID) || newID === 0) {
        console.warn(`[Feedback] Unexpected response logging feedback for article ${articleID}:`, text);
        return null;
      }
      return newID;
    } catch (err) {
      console.warn("[Feedback] Network error logging feedback:", err);
      return null;
    }
  }

  /* Renders the widget's inner markup for a given state:
     - vote: null | "up" | "down" (the just-submitted vote, if any)
     - status: "idle" | "pending" | "done" | "error" */
  function feedbackHTML(vote, status) {
    const upOn = vote === "up";
    const downOn = vote === "down";
    const upDisabled = status === "pending" || status === "done";
    const downDisabled = status === "pending" || status === "done";

    let statusLine = `<p class="hl-fb-thanks" role="status" aria-live="polite"${status === "done" ? "" : " hidden"}>Thanks for your feedback!</p>`;
    if (status === "error") {
      statusLine = `<p class="hl-fb-error" role="alert">Couldn't save your feedback.
        <button type="button" class="hl-fb-retry" id="fbRetry">Try again</button></p>`;
    }

    return `<p class="hl-fb-question">Was this resource helpful?</p>
<div class="hl-fb-btns" role="group" aria-label="Was this resource helpful?">
  <button type="button" class="hl-fb-btn hl-fb-btn-up${upOn ? " on" : ""}" id="fbUp"
    aria-pressed="${upOn}" ${upDisabled ? "disabled" : ""}>
    ${icon("thumb_up")} Yes
  </button>
  <button type="button" class="hl-fb-btn hl-fb-btn-down${downOn ? " on" : ""}" id="fbDown"
    aria-pressed="${downOn}" ${downDisabled ? "disabled" : ""}>
    ${icon("thumb_down")} No
  </button>
</div>
${statusLine}`;
  }

  function renderFeedbackWidget(articleID, articleTitle) {
    const el = document.getElementById("feedbackContent");
    if (!el) return;

    let currentVote = null;
    let status = "idle";

    function draw() {
      el.innerHTML = feedbackHTML(currentVote, status);
      el.querySelector("#fbUp")?.addEventListener("click", () => cast("up"));
      el.querySelector("#fbDown")?.addEventListener("click", () => cast("down"));
      el.querySelector("#fbRetry")?.addEventListener("click", () => cast(currentVote));
    }

    async function cast(vote) {
      if (!vote) return;
      currentVote = vote;
      status = "pending";
      draw();

      if (!feedbackUserID) {
        console.warn("[Feedback] Missing userID — cannot attribute feedback. Set window.helpLibConfig.userID.");
      }

      const newRecordID = await submitFeedback(articleID, articleTitle, vote);
      if (newRecordID !== null) {
        status = "done";
        draw();
        advanceFeedbackWorkflow(newRecordID);
      } else {
        status = "error";
        draw();
      }
    }

    draw();
  }

  /* ── SharePoint embed parser ── */
  function parseEmbed(raw) {
    if (!raw?.trim()) return { src: null, title: "Video" };

    let decoded = raw;
    if (raw.includes("&lt;") || raw.includes("&#")) {
      const dec = document.createElement("textarea");
      dec.innerHTML = raw;
      decoded = dec.value;
    }

    const tmp = document.createElement("div");
    tmp.innerHTML = decoded;
    const iframe = tmp.querySelector("iframe") ?? tmp.getElementsByTagName("iframe")[0];

    /* SharePoint's stream embed sets "ust" (UI Shell Toggle?) true by default,
       which shows Stream's own chrome/branding inside our player. Forcing it
       false suppresses that chrome so the embed matches our modal styling. */
    const fixUst = (s) =>
      s
        ? s
            .replace(/"ust"%3Atrue/gi, '"ust"%3Afalse')
            .replace(/"ust":true/gi, '"ust":false')
        : null;

    /* Without "ap" (autoplay) in the embed JSON, our own play-button click
       only loads the player — the person then has to click Stream's own
       play button too. Adding "ap":true makes our click the only click
       needed; if the browser's autoplay policy blocks unmuted playback,
       the Stream player automatically falls back to muted autoplay rather
       than failing to play. */
    const addAutoplay = (s) => {
      if (!s) return null;
      if (/"ap"%3Atrue|"ap":true/i.test(s)) return s;
      return s
        .replace(/%7D(?!.*%7D)/i, '%2C%22ap%22%3Atrue%7D')
        .replace(/\}(?!.*\})/, ',"ap":true}');
    };

    const finalize = (s) => addAutoplay(fixUst(s));

    if (!iframe) {
      const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
      const titleMatch = decoded.match(/title=["']([^"']+)["']/i);
      return {
        src: finalize(srcMatch?.[1] ?? null),
        title: titleMatch?.[1] ?? "Video",
      };
    }

    return {
      src: finalize(iframe.getAttribute("src") ?? null),
      title: iframe.getAttribute("title") ?? "Video",
    };
  }

  /* ── Normalize API record → UI record ── */
  function norm(rec) {
    const s1 = rec.s1 ?? {};
    const videoURL = s1[`id${CFG.indVideoURL}`]?.trim() || null;
    const tutFile = s1[`id${CFG.indTutFile}`]?.trim() || null;
    const rawEmbed = s1[`id${CFG.indEmbed}`] ?? "";
    const rawDate = s1[`id${CFG.indUpdated}`]?.trim() ?? "";
    const updDate = rawDate ? new Date(rawDate) : null;
    const embedSrc = parseEmbed(rawEmbed);
    const type = embedSrc.src || videoURL ? "video" : tutFile ? "tutorial" : "faq";
    const isNew = updDate ? updDate > LAST_MONTH : false;
    const desc = scrubHTML(s1[`id${CFG.indDesc}`] ?? "");
    const featured = scrubHTML(s1[`id${CFG.indFeatured}`] ?? "").toLowerCase() === "yes";
    const startHere = scrubHTML(s1[`id${CFG.indStartHere}`] ?? "").toLowerCase() === "yes";
    const rawCats = scrubHTML(s1[`id${CFG.indCategory}`] ?? "");
    const cats = rawCats
      ? rawCats.split(/[\n,]+/).map((c) => c.trim()).filter(Boolean)
      : [];
    const learningObj = (s1[`id${CFG.indLearningObj}`] ?? "").trim() || null;
    const pdfURL = tutFile
      ? `file.php?form=${rec.recordID}&id=${CFG.indTutFile}&series=1&file=0`
      : null;

    return {
      id: rec.recordID,
      title: scrubHTML(rec.title ?? ""),
      cats,
      type,
      isNew,
      featured,
      startHere,
      desc,
      learningObj,
      videoURL,
      embedSrc,
      pdfURL,
      pdfTitle: scrubHTML(rec.title ?? ""),
      updDate,
      _raw: s1,
    };
  }

  /* ── Build dynamic category list from id47 values (excludes HIDDEN_CATS,
     which stay searchable but aren't browsable as tabs/groups) ── */
  function buildDynCats() {
    const seen = new Set();
    const cats = [];
    DATA.forEach((r) =>
      r.cats.forEach((c) => {
        if (!seen.has(c) && !HIDDEN_CATS.includes(c)) {
          seen.add(c);
          cats.push(c);
        }
      }),
    );
    cats.sort();
    dynCats = cats;
    hasStartHere = DATA.some((r) => r.startHere);
    if (state.cat !== "all" && state.cat !== "start" && !dynCats.includes(state.cat)) {
      state.cat = "all";
    }
  }

  /* ── Filtering ── */
  function applyFilter(list, s) {
    return list.filter((r) => {
      if (s.cat === "start" && !r.startHere) return false;
      if (s.cat !== "all" && s.cat !== "start" && !r.cats.includes(s.cat)) return false;
      if (s.type !== "all" && r.type !== s.type) return false;
      if (s.days !== "all" && !r.isNew) return false;
      return true;
    });
  }

  function getFiltered() {
    let list = applyFilter(DATA, state);

    if (state.words.length) {
      list.forEach((r) => {
        let score = 0;
        state.words.forEach((w) => {
          const wl = w.toLowerCase();
          if (r.title.toLowerCase().includes(wl)) score += 3;
          Object.values(r._raw).forEach((v) => {
            if (typeof v === "string" && v.toLowerCase().includes(wl)) score++;
          });
        });
        r._rank = score;
      });
      list = list.filter((r) => r._rank > 0);
      list.sort((a, b) => b._rank - a._rank);
    } else if (state.sort === "alpha") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => (b.updDate ?? new Date(0)) - (a.updDate ?? new Date(0)));
    }
    return list;
  }

  function countWith(overrides) {
    return applyFilter(DATA, { ...state, ...overrides }).length;
  }

  /* ── Display helpers ── */
  const icoClass = (t) => (t === "video" ? "hl-ico-v" : t === "tutorial" ? "hl-ico-t" : "hl-ico-f");
  const bdgClass = (t) => (t === "video" ? "hl-bv" : t === "tutorial" ? "hl-bt" : "hl-bf");
  const bdgLabel = (t) => (t === "video" ? "Video" : t === "tutorial" ? "Tutorial" : "FAQ");
  const typeIcon = (t) => (t === "video" ? "play_circle" : t === "tutorial" ? "menu_book" : "help");
  const rowClass = (t) => (t === "video" ? "hl-lrow-video" : t === "tutorial" ? "hl-lrow-tutorial" : "hl-lrow-faq");

  /* Shared icon-wrapper markup used by both list rows and featured cards */
  function renderMediaIcon(r, wrapClass) {
    return `<div class="${wrapClass} ${icoClass(r.type)}" aria-hidden="true">${icon(typeIcon(r.type))}</div>`;
  }

  /* Shared badge cluster used by both list rows and featured cards.
     Shows a badge for each format the resource actually has (video/tutorial),
     not just its primary rendered type, so dual-format resources are marked
     as such at a glance. FAQ-only resources fall back to a single FAQ badge. */
  function renderFormatBadges(r) {
    const hasVideo = !!(r.embedSrc?.src || r.videoURL);
    const hasTutorial = !!r.pdfURL;
    if (!hasVideo && !hasTutorial) {
      return `<span class="hl-badge ${bdgClass("faq")}">${bdgLabel("faq")}</span>`;
    }
    return `${hasVideo ? `<span class="hl-badge ${bdgClass("video")}">${bdgLabel("video")}</span>` : ""}${
      hasTutorial ? `<span class="hl-badge ${bdgClass("tutorial")}">${bdgLabel("tutorial")}</span>` : ""
    }`;
  }

  /* ── Render: category tablist ── */
  function renderCats() {
    const tabs = [
      ALL_TAB,
      ...(hasStartHere ? [START_TAB] : []),
      ...dynCats.map((c) => ({ id: c, label: c, icon: "label", cls: "" })),
    ];

    document.getElementById("catStrip").innerHTML = tabs
      .map((c) => {
        const on = state.cat === c.id;
        const showIcon = c.id === "start";
        const tabId = `cattab-${esc(c.id)}`;
        return `<button class="hl-ctab${on ? " on" : ""} ${c.cls ?? ""}" type="button"
  id="${tabId}" role="tab" data-cat="${esc(c.id)}"
  aria-selected="${on}" aria-controls="results" tabindex="${on ? 0 : -1}">
  ${showIcon ? icon(c.icon) : ""}
  ${esc(c.label)}</button>`;
      })
      .join("");

    const tabEls = Array.from(document.querySelectorAll("#catStrip .hl-ctab"));
    tabEls.forEach((btn, i) => {
      btn.addEventListener("click", () => setCat(btn.dataset.cat));
      btn.addEventListener("keydown", (e) => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        let next;
        if (e.key === "ArrowRight") next = (i + 1) % tabEls.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + tabEls.length) % tabEls.length;
        else if (e.key === "Home") next = 0;
        else next = tabEls.length - 1;
        tabEls[next].focus();
        setCat(tabEls[next].dataset.cat);
      });
    });
  }

  /* ── Render: sidebar ── */
  function renderSidebar() {
    const types = [
      { id: "all", label: "All resources", icon: "grid_view" },
      { id: "video", label: "Videos", icon: "play_circle" },
      { id: "tutorial", label: "Tutorials", icon: "menu_book" },
    ];
    const dates = [
      { id: "all", label: "All time", icon: "timeline" },
      { id: "30", label: "Past 30 days", icon: "change_circle" },
    ];

    const typeHTML = types
      .map((t) => {
        const cnt = countWith({ type: t.id });
        const on = state.type === t.id;
        return `<button class="hl-sbr${on ? " on" : ""}" type="button"
  data-type="${esc(t.id)}" aria-pressed="${on}">
  ${icon(t.icon)}
  ${esc(t.label)}<span class="hl-sbr-n">${cnt}</span></button>`;
      })
      .join("");

    const dateHTML = dates
      .map((o) => {
        const cnt = countWith({ days: o.id });
        const on = state.days === o.id;
        return `<button class="hl-sbr${on ? " on" : ""}" type="button"
  data-days="${esc(o.id)}" aria-pressed="${on}">
  ${icon(o.icon)}
  ${esc(o.label)}<span class="hl-sbr-n">${cnt}</span></button>`;
      })
      .join("");

    document.getElementById("sidebar").innerHTML = `
<div class="hl-sb-sec">
  <span class="hl-sb-lbl" id="sb-type-lbl">Content type</span>
  <div role="group" aria-labelledby="sb-type-lbl">${typeHTML}</div>
</div>
<div class="hl-sb-sec">
  <span class="hl-sb-lbl" id="sb-date-lbl">Last updated</span>
  <div role="group" aria-labelledby="sb-date-lbl">${dateHTML}</div>
</div>
<div class="hl-sb-sec">
  <div class="hl-sb-cta">
    <h3>Need 1-on-1 help?</h3>
    <p>Let our support team know what you're working on, and a member of our team will follow up with you.</p>
    <a href="${CFG.consultURL}" target="_blank" rel="noopener" data-openconsult>Request a consultation ${icon("open_in_new")}</a>
  </div>
</div>`;

    document.querySelectorAll("#sidebar [data-type]").forEach((btn) => {
      btn.addEventListener("click", () => setType(btn.dataset.type));
    });
    document.querySelectorAll("#sidebar [data-days]").forEach((btn) => {
      btn.addEventListener("click", () => setDays(btn.dataset.days));
    });
    document.querySelector("#sidebar [data-openconsult]")?.addEventListener("click", (e) => {
      e.preventDefault();
      openConsult();
    });
  }

  function renderSortPills() {
    document.querySelectorAll(".hl-spill").forEach((p) => {
      const on = p.dataset.s === state.sort;
      p.classList.toggle("on", on);
      p.setAttribute("aria-pressed", String(on));
    });
  }

  function announce(msg) {
    const el = document.getElementById("srAnnounce");
    el.textContent = "";
    setTimeout(() => {
      el.textContent = msg;
    }, 50);
  }

  /* ── Render: single row ──
     hideCat: category label to omit from the row's meta line, used when a
     row is rendered inside a group whose header already names that category
     (avoids repeating "Reporting" on every row under the Reporting group). */
  function renderRow(r, hideCat) {
    const catsToShow = (hideCat ? r.cats.filter((c) => c !== hideCat) : r.cats).filter(
      (c) => !HIDDEN_CATS.includes(c),
    );
    return `<a class="hl-lrow ${rowClass(r.type)}" href="#article-${r.id}"
data-id="${r.id}" aria-label="${esc(r.title)}, ${bdgLabel(r.type)}">
${renderMediaIcon(r, "hl-lr-ico")}
<div class="hl-lr-body">
  <p class="hl-lr-t" title="${esc(r.title)}">${esc(r.title)}</p>
  ${r.desc ? `<p class="hl-lr-desc" title="${esc(r.desc)}">${esc(r.desc)}</p>` : ""}
  <div class="hl-lr-m">
    ${renderFormatBadges(r)}
    ${r.isNew ? `<span class="hl-badge hl-bn">Recently updated</span>` : ""}
    ${catsToShow.length ? `<span class="hl-lr-cat">${esc(catsToShow.join(", "))}</span>` : ""}
  </div>
</div>
<span class="hl-icon hl-lr-arr" aria-hidden="true">${ICONS.chevron_right ?? ""}</span>
</a>`;
  }

  /* ── Render: featured card ── */
  function renderFeatCard(r) {
    return `<a class="hl-fcard" href="#article-${r.id}"
data-id="${r.id}" aria-label="${esc(r.title)}, ${bdgLabel(r.type)}">
${renderMediaIcon(r, "hl-fc-ico")}
${r.isNew ? `<span class="hl-badge hl-bn hl-fc-badge-corner">Recently updated</span>` : ""}
<p class="hl-fc-title" title="${esc(r.title)}">${esc(r.title)}</p>
<p class="hl-fc-desc" title="${esc(r.desc)}">${esc(r.desc)}</p>
<div class="hl-fc-badges-row">${renderFormatBadges(r)}</div>
</a>`;
  }

  /* ── Render: expand/collapse control shared by category groups, the flat
     list, category-page lists, and the Start Here band ── */
  function renderExpandControl(key, total, shownCount, baseCap, opts = {}) {
    const remaining = total - shownCount;
    const isExpanded = (groupVisible[key] ?? baseCap) > baseCap;
    const cls = opts.global ? "hl-show-more-global" : "hl-show-more";
    if (remaining > 0) {
      const label = opts.moreLabel ? opts.moreLabel(remaining) : `Show ${remaining} more`;
      return `<button class="${cls}" type="button" data-showmore="${esc(key)}" aria-label="${esc(label)}">
    ${icon("unfold_more")}${esc(label)}
  </button>`;
    }
    if (isExpanded) {
      return `<button class="${cls}" type="button" data-showless="${esc(key)}" aria-label="Show fewer">
    ${icon("unfold_less")}Show less
  </button>`;
    }
    return "";
  }

  /* ── Render: category group ── */
  function renderGroup(groupKey, records) {
    const visible = groupVisible[groupKey] ?? CFG.HOME_GROUP_CAP;
    const shown = records.slice(0, visible);
    const domSafeKey = esc(groupKey);

    return `<div class="hl-grp" data-group="${domSafeKey}">
<div class="hl-grp-hdr">
  ${icon("folder")}
  <span class="hl-grp-name">${esc(groupKey)}</span>
  <span class="hl-grp-count">${records.length}</span>
</div>
<div class="hl-grp-body">
  ${shown.map((r) => renderRow(r, groupKey)).join("")}${renderExpandControl(
    groupKey,
    records.length,
    shown.length,
    CFG.HOME_GROUP_CAP,
    { moreLabel: (n) => `Show ${n} more in ${groupKey}` },
  )}
</div>
</div>`;
  }

  /* ── Render: Start Here band ── */
  function renderStartHereBand(items) {
    const visible = groupVisible["__starthere__"] ?? CFG.START_HERE_CAP;
    const shown = items.slice(0, visible);
    return `<div class="hl-sh-band" data-group="__starthere__">
  <div class="hl-sh-hdr">
    <span class="hl-sh-ico">${icon("star")}</span>
    <span class="hl-sh-title">Start Here</span>
    <span class="hl-sh-desc">Recommended for new users</span>
  </div>
  <div class="hl-feat-grid">${shown.map((r) => renderFeatCard(r)).join("")}</div>
  ${renderExpandControl("__starthere__", items.length, shown.length, CFG.START_HERE_CAP, { global: true })}
</div>`;
  }

  /* Attach click handlers to any card/row links and controls inside a container.
     Uses <a href="#article-ID"> so Ctrl/Cmd/middle-click and "open in new tab"
     work natively; plain left-clicks are intercepted for in-place navigation. */
  function bindResultControls(root) {
    root.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(el.dataset.id);
      });
    });
    root.querySelectorAll("[data-showmore]").forEach((btn) => {
      btn.addEventListener("click", () => showMore(btn.dataset.showmore));
    });
    root.querySelectorAll("[data-showless]").forEach((btn) => {
      btn.addEventListener("click", () => showLess(btn.dataset.showless));
    });
  }

  /* ── Main render ── */
  function render() {
    const list = getFiltered();
    const label = `Showing ${list.length} resource${list.length !== 1 ? "s" : ""}${state.q ? ` for "${state.q}"` : ""}`;

    document.getElementById("rcount").innerHTML =
      `Showing <strong>${list.length} resource${list.length !== 1 ? "s" : ""}</strong>${state.q ? ` for "${esc(state.q)}"` : ""}`;
    announce(label);

    const fs = document.getElementById("featSection");
    const el = document.getElementById("results");

    /* Search or type filter → flat ranked list */
    if (state.words.length > 0 || state.type !== "all") {
      fs.innerHTML = "";
      if (!list.length) {
        el.innerHTML = emptyHTML();
        bindEmptyControls(el);
        return;
      }
      const flatVisible = groupVisible["__flat__"] ?? CFG.FLAT_CAP;
      const shownFlat = list.slice(0, flatVisible);
      el.innerHTML = `
  <div class="hl-list-rows">${shownFlat.map((r) => renderRow(r)).join("")}</div>
  ${renderExpandControl("__flat__", list.length, shownFlat.length, CFG.FLAT_CAP, {
    global: true,
    moreLabel: (n) => `Show ${n} more results`,
  })}`;
      bindResultControls(el);
      return;
    }

    /* Start Here tab */
    if (state.cat === "start") {
      fs.innerHTML = "";
      if (list.length) {
        el.innerHTML = `<div class="hl-list-rows">${list.map((r) => renderRow(r)).join("")}</div>`;
        bindResultControls(el);
      } else {
        el.innerHTML = emptyHTML();
        bindEmptyControls(el);
      }
      return;
    }

    /* Default grouped view */
    let fsHTML = "";

    const startItems = DATA.filter(
      (r) => r.startHere && applyFilter([r], { ...state, cat: "all" }).length,
    );
    if (startItems.length && state.cat === "all") {
      fsHTML += renderStartHereBand(startItems);
    }

    const featItems = list.filter((r) => r.featured && !r.startHere);
    if (featItems.length && state.cat === "all") {
      fsHTML += `<div class="hl-feat-band">
  <div class="hl-feat-hdr">
    ${icon("label")}
    <span class="hl-feat-hdr-label">Featured</span>
            <span class="hl-feat-hdr-desc">Popular resources</span>
  </div>
  <div class="hl-feat-grid">
    ${featItems.slice(0, 4).map((r) => renderFeatCard(r)).join("")}
  </div>
</div>`;
    }

    fs.innerHTML = fsHTML;
    bindResultControls(fs);

    if (!list.length) {
      el.innerHTML = emptyHTML();
      bindEmptyControls(el);
      return;
    }

    const groupMap = {};
    const groupOrder = [];
    list.forEach((r) => {
      const browsableCats = r.cats.filter((c) => !HIDDEN_CATS.includes(c));
      const keys = browsableCats.length ? browsableCats : r.cats.length ? [] : ["Other resources"];
      keys.forEach((k) => {
        if (!groupMap[k]) groupMap[k] = [];
        if (!groupMap[k].includes(r)) groupMap[k].push(r);
      });
    });
    dynCats.forEach((c) => {
      if (groupMap[c]) groupOrder.push(c);
    });
    if (groupMap["Other resources"]) groupOrder.push("Other resources");

    /* Specific category selected — flat list */
    if (state.cat !== "all" && state.cat !== "start") {
      const visible = groupVisible[state.cat] ?? CFG.GROUP_CAP;
      const shown = list.slice(0, visible);
      el.innerHTML = `
  <div class="hl-grp-hdr">
    ${icon("folder")}
    <span class="hl-grp-name">${esc(state.cat)}</span>
    <span class="hl-grp-count">${list.length}</span>
  </div>
  <div class="hl-list-rows">${shown.map((r) => renderRow(r, state.cat)).join("")}</div>
  ${renderExpandControl(state.cat, list.length, shown.length, CFG.GROUP_CAP, { global: true })}`;
      bindResultControls(el);
      return;
    }

    el.innerHTML = groupOrder.map((k) => renderGroup(k, groupMap[k])).join("");
    bindResultControls(el);
  }

  function emptyHTML() {
    return `<div class="hl-empty" role="status">
${icon("search_off")}
<p>No results found — try a different keyword or filter.</p>
${state.q ? '<button class="hl-empty-reset" type="button" data-clearsearch>Clear search</button>' : ""}
</div>`;
  }

  function bindEmptyControls(root) {
    root.querySelectorAll("[data-clearsearch]").forEach((btn) => {
      btn.addEventListener("click", clearSearch);
    });
  }

  /* ── Show more / show less ── */
  function showMore(key) {
    const base =
      key === "__starthere__"
        ? CFG.START_HERE_CAP
        : key === "__flat__"
          ? CFG.FLAT_CAP
          : CFG.GROUP_CAP;
    groupVisible[key] = (groupVisible[key] ?? base) + CFG.GROUP_CAP;
    render();
    const container = document.querySelector(`[data-group="${CSS.escape(key)}"]`) ?? document.getElementById("results");
    container?.querySelector("[data-showmore], [data-showless]")?.focus();
  }

  function showLess(key) {
    delete groupVisible[key];
    render();
    const container = document.querySelector(`[data-group="${CSS.escape(key)}"]`) ?? document.getElementById("results");
    const scrollTarget = container?.querySelector(".hl-grp-hdr, .hl-sh-hdr") ?? container;
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
    container?.querySelector("[data-showmore], [data-showless]")?.focus();
  }

  /* ── Shared modal engine ── */
  const modalFocus = {};

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function trapModalFocus(modalId, e) {
    const modal = document.getElementById(modalId);
    if (!modal.classList.contains("is-open") || e.key !== "Tab") return;
    const focusable = getFocusable(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function closeAnyOpenModal() {
    if (document.getElementById("vidModal").classList.contains("is-open")) closeVid();
    if (document.getElementById("pdfModal").classList.contains("is-open")) closePDF();
    if (document.getElementById("consultModal").classList.contains("is-open")) closeConsult();
  }

  /* ── Inline video playback (article main content) ── */
  function playInlineVideo(src, title) {
    const wrap = document.getElementById("vpreviewWrap");
    if (!wrap || !src) return;

    wrap.innerHTML = `<div class="hl-vplaying">
  <iframe id="vinlineFrame" src="${esc(src)}" title="${esc(title || "Video")}" allow="autoplay" allowfullscreen frameborder="0"></iframe>
</div>
<div class="hl-vfallback" id="vfallback" role="status">
  <span>Trouble viewing this video?</span>
  <a href="${esc(src)}" target="_blank" rel="noopener">Open in a new tab ${icon("open_in_new")}</a>
</div>`;

    const fallback = document.getElementById("vfallback");
    setTimeout(() => {
      fallback?.classList.add("hl-vfallback-prompt");
    }, 6000);
  }

  /* ── Video modal (fallback / used only if no inline player is present) ── */
  function openVid(src, title) {
    if (!src || typeof src !== "string" || src.indexOf("object") !== -1) {
      console.error("[openVid] invalid src, aborting:", src);
      return;
    }
    modalFocus.vid = document.activeElement;
    const frame = document.getElementById("vidModalFrame");
    if (!frame) {
      console.error("[openVid] vidModalFrame element not found");
      return;
    }
    document.getElementById("vidModalTitle").textContent = title || "Video";
    frame.setAttribute("title", title || "Video");
    frame.src = src;
    document.getElementById("vidModal").classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.getElementById("vidModalClose").focus();
  }

  function closeVid() {
    document.getElementById("vidModal").classList.remove("is-open");
    document.getElementById("vidModalFrame").src = "";
    document.body.style.overflow = "";
    safeFocus(modalFocus.vid);
  }

  /* ── PDF modal ── */
  function openPDF(url, title) {
    modalFocus.pdf = document.activeElement;
    document.getElementById("pdfModalTitle").textContent = title ?? "Document";
    document.getElementById("pdfFrame").setAttribute("data", `${url}&inline#view=FitH`);
    document.getElementById("pdfModal").classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.getElementById("pdfClose").focus();
  }

  function closePDF() {
    document.getElementById("pdfModal").classList.remove("is-open");
    document.getElementById("pdfFrame").setAttribute("data", "about:blank");
    document.body.style.overflow = "";
    safeFocus(modalFocus.pdf);
  }

  /* ── Consultation modal ──
     Embeds the LEAF request form via iframe. The "&iframe=1" suffix is only
     applied here (not on CFG.consultURL itself) so every "open in a new
     tab" link elsewhere stays a clean URL. Some LEAF forms may block
     framing (auth redirects, X-Frame-Options); a visible fallback link
     appears after a short delay so the person is never stuck. */
  function openConsult() {
    modalFocus.consult = document.activeElement;
    const frame = document.getElementById("consultFrame");
    frame.src = `${CFG.consultURL}&iframe=1`;
    document.getElementById("consultModal").classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.getElementById("consultClose").focus();

    const fallback = document.getElementById("consultFallback");
    fallback?.classList.remove("hl-consult-fallback-prompt");
    clearTimeout(modalFocus.consultFallbackTimer);
    modalFocus.consultFallbackTimer = setTimeout(() => {
      fallback?.classList.add("hl-consult-fallback-prompt");
    }, 5000);
  }

  function closeConsult() {
    document.getElementById("consultModal").classList.remove("is-open");
    document.getElementById("consultFrame").src = "about:blank";
    document.body.style.overflow = "";
    clearTimeout(modalFocus.consultFallbackTimer);
    safeFocus(modalFocus.consult);
  }

  /* ── Detail page ── */
  function open(id) {
    const r = DATA.find((x) => String(x.id) === String(id));
    if (!r) return;
    lastOpenedId = id;

    document.title = `${r.title} — VA LEAF Help Library`;
    window.location.hash = `article-${id}`;

    const crumbCat = r.cats.find((c) => !HIDDEN_CATS.includes(c));
    const catCrumb = crumbCat
      ? `<span class="hl-dsep" aria-hidden="true">/</span>
   <a href="#" class="hl-dbc-cat" data-backtocat="${esc(crumbCat)}"
      aria-label="Filter by ${esc(crumbCat)}">${esc(crumbCat)}</a>`
      : "";

    document.getElementById("dbc").innerHTML = `
<a href="#" data-back>
  ${icon("chevron_left")}
  <span class="hl-dbc-label">Help Library</span>
</a>
${catCrumb}
<span class="hl-dsep" aria-hidden="true">/</span>
<span>${esc(r.title)}</span>`;

    document.querySelector("#dbc [data-back]")?.addEventListener("click", (e) => {
      e.preventDefault();
      back();
    });
    document.querySelector("#dbc [data-backtocat]")?.addEventListener("click", (e) => {
      e.preventDefault();
      backToCategory(e.currentTarget.dataset.backtocat);
    });

    const recentPill = r.isNew
      ? '<span class="hl-badge hl-bn" style="font-size:.75rem;padding:3px 10px">Recently updated</span>'
      : "";

    document.getElementById("dhero").innerHTML = `
<div class="hl-dhrow">
  <div class="hl-dhico" aria-hidden="true">
    ${icon(typeIcon(r.type))}
  </div>
  <div class="hl-dhtxt">
    <h1>${esc(r.title)}</h1>
    ${r.desc ? `<div class="hl-dhdesc">${formatDesc(r.desc)}</div>` : ""}
    <div class="hl-dhmeta">
      ${renderFormatBadges(r)}
      ${
        r.updDate
          ? `<span class="hl-dhmeta-item">
        ${icon("update")}
        Last updated: ${esc(fmtDate(r.updDate))}</span>`
          : ""
      }
      ${recentPill}
    </div>
  </div>
</div>`;

    const canEmbedInline = r.type === "video" && !!r.embedSrc?.src;
    const externalVideoOnly = r.type === "video" && !r.embedSrc?.src && !!r.videoURL;
    const hasVideo = canEmbedInline || externalVideoOnly;
    const hasPDF = !!r.pdfURL;
    const showTabs = hasVideo && hasPDF;

    const videoPanel = canEmbedInline
      ? `<div class="hl-vpreview-wrap" id="vpreviewWrap">
    <button class="hl-vpreview" type="button" id="vpreviewBtn"
      data-embed-src="${esc(r.embedSrc.src)}" data-title="${esc(r.title)}"
      aria-label="Play video: ${esc(r.title)}">
      <span class="hl-vpreview-cluster">
        <span class="hl-vpreview-circle">
          <span class="hl-vpreview-ring" aria-hidden="true"></span>
          <span class="hl-vpreview-play" aria-hidden="true">${icon("play_circle")}</span>
        </span>
        <span class="hl-vpreview-cta" aria-hidden="true">Click to play</span>
      </span>
    </button>
  </div>`
      : externalVideoOnly
        ? `<a class="hl-vpreview hl-vpreview-ext" href="${esc(r.videoURL)}" target="_blank" rel="noopener"
    aria-label="Watch video on SharePoint: ${esc(r.title)} (opens in new tab)">
    <span class="hl-vpreview-play" aria-hidden="true">${icon("play_circle")}</span>
    <span class="hl-vpreview-ext-label">${icon("open_in_new")} Opens on SharePoint</span>
  </a>`
        : "";

    const pdfPanel = hasPDF
      ? `<div class="hl-pdf-inline-wrap" id="pdfInlineWrap">
    <object
      class="hl-pdf-inline"
      type="application/pdf"
      data="${esc(r.pdfURL)}&inline#view=FitH"
      title="${esc(r.pdfTitle)}"
      aria-label="PDF document: ${esc(r.pdfTitle)}">
      <div class="hl-pdf-inline-fallback">
        <p>This browser can't preview the PDF inline.</p>
        <a href="${esc(r.pdfURL)}" target="_blank" rel="noopener">Open the PDF in a new tab ${icon("open_in_new")}</a>
      </div>
    </object>
  </div>`
      : "";

    const tabsHTML = showTabs
      ? `<div class="hl-ctab-row" role="tablist" aria-label="View resource as">
    <button class="hl-ctab-flat on" type="button" role="tab" id="tabWatchBtn"
      aria-selected="true" aria-controls="tabpanelWatch" data-mediatab="watch">
      ${icon("play_circle")}Watch Video</button>
    <button class="hl-ctab-flat" type="button" role="tab" id="tabReadBtn"
      aria-selected="false" aria-controls="tabpanelRead" tabindex="-1" data-mediatab="read">
      ${icon("picture_as_pdf")}Read Tutorial</button>
  </div>`
      : "";

    const mediaBlock = showTabs
      ? `${tabsHTML}
<div id="tabpanelWatch" role="tabpanel" aria-labelledby="tabWatchBtn">${videoPanel}</div>
<div id="tabpanelRead" role="tabpanel" aria-labelledby="tabReadBtn" hidden>${pdfPanel}</div>`
      : hasVideo
        ? videoPanel
        : hasPDF
          ? pdfPanel
          : "";

    document.getElementById("dmain").innerHTML = mediaBlock;

    document.getElementById("vpreviewBtn")?.addEventListener("click", (e) => {
      playInlineVideo(e.currentTarget.dataset.embedSrc, e.currentTarget.dataset.title);
    });

    if (showTabs) {
      const watchBtn = document.getElementById("tabWatchBtn");
      const readBtn = document.getElementById("tabReadBtn");
      const watchPanel = document.getElementById("tabpanelWatch");
      const readPanel = document.getElementById("tabpanelRead");

      function activateTab(which) {
        const toWatch = which === "watch";
        watchBtn.classList.toggle("on", toWatch);
        readBtn.classList.toggle("on", !toWatch);
        watchBtn.setAttribute("aria-selected", String(toWatch));
        readBtn.setAttribute("aria-selected", String(!toWatch));
        watchBtn.tabIndex = toWatch ? 0 : -1;
        readBtn.tabIndex = toWatch ? -1 : 0;
        watchPanel.hidden = !toWatch;
        readPanel.hidden = toWatch;
      }

      watchBtn.addEventListener("click", () => activateTab("watch"));
      readBtn.addEventListener("click", () => activateTab("read"));
      [watchBtn, readBtn].forEach((btn) => {
        btn.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            activateTab(btn === watchBtn ? "read" : "watch");
            (btn === watchBtn ? readBtn : watchBtn).focus();
          }
        });
      });
    }

    const relatedPool = DATA.filter(
      (x) => x.id !== r.id && x.cats.some((c) => r.cats.includes(c)),
    );
    for (let i = relatedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [relatedPool[i], relatedPool[j]] = [relatedPool[j], relatedPool[i]];
    }
    const related = relatedPool.slice(0, 3);

    const relatedHTML = related.length
      ? `<div class="hl-dsbc"><h3>Related resources</h3>
    ${related
      .map(
        (rx) => `
      <a class="hl-drel" href="#article-${rx.id}"
        data-id="${rx.id}"
        aria-label="${esc(rx.title)}, ${bdgLabel(rx.type)}">
        <div class="hl-drii ${icoClass(rx.type)}" aria-hidden="true">
          ${icon(typeIcon(rx.type))}
        </div>
        <div class="hl-drib">
          <span class="hl-drit">${esc(rx.title)}</span>
          ${renderFormatBadges(rx)}
        </div>
        <span class="hl-icon hl-drel-arr" aria-hidden="true">${ICONS.chevron_right ?? ""}</span>
      </a>`,
      )
      .join("")}
   </div>`
      : "";

    const learningObjHTML = r.learningObj
      ? `<div class="hl-dsbc hl-dsbc-learning"><h3>Learning Objectives</h3>
    <div class="hl-learning-content" id="learningObjContent"></div>
   </div>`
      : "";

    const feedbackHTMLWrap = `<div class="hl-dsbc hl-dsbc-feedback" id="feedbackContent"></div>`;

    document.getElementById("dsb").innerHTML = `
${learningObjHTML}
${feedbackHTMLWrap}
${relatedHTML}
<div class="hl-dcta"><h3>Need help?</h3>
  <p>Our team can walk you through this live in a 30-min consultation.</p>
  <a href="${CFG.consultURL}" target="_blank" rel="noopener" data-openconsult>Request a consultation ${icon("open_in_new")}</a>
</div>`;

    if (r.learningObj) {
      setSafeHTML(document.getElementById("learningObjContent"), sanitizeRich(r.learningObj));
    }
    renderFeedbackWidget(r.id, r.title);

    document.querySelectorAll("#dsb [data-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(el.dataset.id);
      });
    });
    document.querySelector("#dsb [data-openconsult]")?.addEventListener("click", (e) => {
      e.preventDefault();
      openConsult();
    });

    document.getElementById("lpage").classList.add("off");
    document.getElementById("dpage").classList.add("on");
    window.scrollTo(0, 0);
    document.querySelector("#dbc a")?.focus();
  }

  /* ── Navigation ── */
  function back() {
    document.title = "VA LEAF — Help Library";
    history.pushState("", document.title, `${window.location.pathname}${window.location.search}`);
    document.getElementById("dpage").classList.remove("on");
    document.getElementById("lpage").classList.remove("off");
    window.scrollTo(0, 0);
    const card = lastOpenedId && document.querySelector(`[data-id="${lastOpenedId}"]`);
    safeFocus(card || document.getElementById("sq"));
  }

  function backToCategory(cat) {
    document.title = "VA LEAF — Help Library";
    history.pushState("", document.title, `${window.location.pathname}${window.location.search}`);
    document.getElementById("dpage").classList.remove("on");
    document.getElementById("lpage").classList.remove("off");
    window.scrollTo(0, 0);
    state.cat = cat;
    groupVisible = {};
    renderCats();
    renderSidebar();
    render();
    document.getElementById("hl-main-content").focus();
  }

  function setCat(id) {
    state.cat = id;
    groupVisible = {};
    renderCats();
    renderSidebar();
    render();
  }
  function setType(id) {
    state.type = id;
    groupVisible = {};
    renderSidebar();
    render();
  }
  function setDays(id) {
    state.days = id;
    groupVisible = {};
    renderSidebar();
    render();
  }
  function setSort(btn) {
    state.sort = btn.dataset.s;
    renderSortPills();
    render();
  }

  function search() {
    state.q = document.getElementById("sq").value.trim();
    state.words = state.q ? state.q.split(/\s+/) : [];
    groupVisible = {};
    render();
  }

  function clearSearch() {
    document.getElementById("sq").value = "";
    state.q = "";
    state.words = [];
    groupVisible = {};
    render();
    document.getElementById("sq").focus();
  }

  /* ── Loading state ── */
  function showLoading(msg = "Loading resources…") {
    document.getElementById("results").innerHTML = `
<div class="hl-loading" role="status" aria-label="${esc(msg)}">
  <span class="hl-loading-msg" id="loadingMsg">${esc(msg)}</span>
  <div class="hl-loading-dots" aria-hidden="true">
    <span></span><span></span><span></span>
  </div>
</div>`;
    document.getElementById("rcount").innerHTML = "";
    document.getElementById("featSection").innerHTML = "";
  }

  function updateLoadingMsg(msg) {
    const el = document.getElementById("loadingMsg");
    if (el) el.textContent = msg;
  }

  function showError(msg) {
    document.getElementById("results").innerHTML = `<div class="hl-err" role="alert">${esc(msg)}</div>`;
  }

  /* ── Data fetch ── */
  async function fetchData() {
    showLoading("Loading resources…");

    try {
      const query = new LeafFormQuery();
      query.addTerm("categoryID", "=", CFG.categoryID, "AND");
      query.addTerm("deleted", "=", 0, "AND");
      query.addTerm("stepID", "=", CFG.stepID, "AND");
      query.getData(CFG.indDesc);
      query.getData(CFG.indTutFile);
      query.getData(CFG.indVideoURL);
      query.getData(CFG.indUpdated);
      query.getData(CFG.indCategory);
      query.getData(CFG.indFeatured);
      query.getData(CFG.indEmbed);
      query.getData(CFG.indStartHere);
      query.getData(CFG.indLearningObj);
      query.sort("date", "DESC");
      query.setExtraParams("&x-filterData=recordID,title");

      query.onProgress((count) => {
        updateLoadingMsg(`Loading resources… ${count} loaded`);
      });

      const blob = await query.execute();
      loadBlob(blob);
    } catch (err) {
      showError("Could not load help resources. Please try refreshing the page.");
      console.error("LeafFormQuery error:", err);
    }
  }

  function loadBlob(blob) {
    DATA = Object.keys(blob).map((k) => norm(blob[k]));
    buildDynCats();
    renderCats();
    renderSidebar();
    renderSortPills();
    render();
    const m = window.location.hash.match(/^#article-(\d+)$/);
    if (m) open(m[1]);
  }

  /* ── Init ── */
  async function init() {
    const iconsReady = loadIcons();
    fetchData();

    const debouncedSearch = debounce(search, 300);
    document.getElementById("sq").addEventListener("input", debouncedSearch);
    document.getElementById("sqBtn").addEventListener("click", search);
    document.getElementById("sq").addEventListener("keydown", (e) => {
      if (e.key === "Enter") search();
    });

    document.querySelectorAll(".hl-spill").forEach((btn) => {
      btn.addEventListener("click", () => setSort(btn));
    });

    document.getElementById("vidModalClose").addEventListener("click", closeVid);
    document.getElementById("vidModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("vidModal")) closeVid();
    });
    document.getElementById("pdfClose").addEventListener("click", closePDF);
    document.getElementById("pdfOverlay").addEventListener("click", closePDF);
    document.getElementById("consultClose").addEventListener("click", closeConsult);
    document.getElementById("consultOverlay").addEventListener("click", closeConsult);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAnyOpenModal();
    });
    document.addEventListener("keydown", (e) => trapModalFocus("vidModal", e));
    document.addEventListener("keydown", (e) => trapModalFocus("pdfModal", e));
    document.addEventListener("keydown", (e) => trapModalFocus("consultModal", e));

    window.addEventListener("hashchange", () => {
      const m = window.location.hash.match(/^#article-(\d+)$/);
      if (!m) {
        document.title = "VA LEAF — Help Library";
        document.getElementById("dpage").classList.remove("on");
        document.getElementById("lpage").classList.remove("off");
        window.scrollTo(0, 0);
        const card = lastOpenedId && document.querySelector(`[data-id="${lastOpenedId}"]`);
        safeFocus(card || document.getElementById("sq"));
      }
    });

    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    if (topic) {
      const tmp = document.createElement("div");
      tmp.innerHTML = topic;
      const safe = tmp.innerText.trim();
      document.getElementById("sq").value = safe;
      state.q = safe;
      state.words = safe ? safe.split(/\s+/) : [];
    }

    await iconsReady;
    document.getElementById("searchIcon").innerHTML = ICONS.search ?? "";
    document.getElementById("scheduleIcon").innerHTML = ICONS.schedule ?? "";
    document.getElementById("alphaIcon").innerHTML = ICONS.sort_by_alpha ?? "";
    document.getElementById("vidCloseIcon").innerHTML = ICONS.close ?? "";
    document.getElementById("pdfCloseIcon").innerHTML = ICONS.close ?? "";
    document.getElementById("consultCloseIcon").innerHTML = ICONS.close ?? "";
    document.getElementById("consultFallbackIcon").innerHTML = ICONS.open_in_new ?? "";
    document.getElementById("consultFallbackLink").href = CFG.consultURL;
    document.getElementById("heroDecoBook").innerHTML = ICONS.menu_book ?? "";
    document.getElementById("heroDecoVideo").innerHTML = ICONS.smart_display ?? "";
    document.getElementById("heroDecoHelp").innerHTML = ICONS.help ?? "";
    document.getElementById("heroDecoBulb").innerHTML = ICONS.lightbulb ?? "";

    renderHeroGreeting();
  }

  return {
    init,
    setCat,
    setType,
    setDays,
    setSort,
    search,
    clearSearch,
    open,
    back,
    backToCategory,
    openVid,
    openPDF,
    openConsult,
    showMore,
  };
})();

HelpLib.init();