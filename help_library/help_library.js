var HelpLib = (function () {
  /* ── Icons ── */
  const ICON_NAMES = [
    "close", "search", "grid_view", "star", "label", "play_circle",
    "menu_book", "help", "timeline", "change_circle", "folder",
    "chevron_right", "chevron_left", "update", "picture_as_pdf",
    "search_off", "schedule", "sort_by_alpha", "unfold_less",
    "unfold_more", "open_in_new", "smart_display", "lightbulb",
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

  function icon(name, size) {
    const svg = ICONS[name] ?? "";
    const style = size ? ` style="width:${size}px;height:${size}px"` : "";
    return `<span class="hl-icon" aria-hidden="true"${style}>${svg}</span>`;
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
    consultURL:
      "https://leaf.va.gov/platform/support/report.php?a=LEAF_Start_Request&id=form_ba7de",
    GROUP_CAP: 10,
    FLAT_CAP: 15,
  };

  const ALL_TAB = { id: "all", label: "All topics", icon: "grid_view", cls: "" };
  const START_TAB = { id: "start", label: "Start Here", icon: "star", cls: "hl-ctab-sh" };

  /* ── State ── */
  let DATA = [];
  let dynCats = [];
  let hasStartHere = false;
  let groupVisible = {};
  let groupCollapsed = {};
  let lastOpenedId = null;

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

  /* LEAF's header renders the logged-in user's full name (from $login->getName()).
     We extract the first name from that existing DOM content rather than
     duplicating the lookup server-side. Falls back to null (→ plain "Hello!")
     if neither method finds a name. */
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

    const fixUst = (s) =>
      s
        ? s
            .replace(/"ust"%3Atrue/gi, '"ust"%3Afalse')
            .replace(/"ust":true/gi, '"ust":false')
        : null;

    if (!iframe) {
      const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
      const titleMatch = decoded.match(/title=["']([^"']+)["']/i);
      return {
        src: fixUst(srcMatch?.[1] ?? null),
        title: titleMatch?.[1] ?? "Video",
      };
    }

    return {
      src: fixUst(iframe.getAttribute("src") ?? null),
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
      videoURL,
      embedSrc,
      pdfURL,
      pdfTitle: scrubHTML(rec.title ?? ""),
      updDate,
      _raw: s1,
    };
  }

  /* ── Build dynamic category list from id47 values ── */
  function buildDynCats() {
    const seen = new Set();
    const cats = [];
    DATA.forEach((r) =>
      r.cats.forEach((c) => {
        if (!seen.has(c)) {
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

  /* ── Render: category strip ── */
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
        return `<button class="hl-ctab${on ? " on" : ""} ${c.cls ?? ""}" type="button"
  data-cat="${esc(c.id)}" aria-pressed="${on}">
  ${showIcon ? icon(c.icon) : ""}
  ${esc(c.label)}</button>`;
      })
      .join("");

    document.querySelectorAll("#catStrip .hl-ctab").forEach((btn) => {
      btn.addEventListener("click", () => setCat(btn.dataset.cat));
    });
  }

  /* ── Render: sidebar ── */
  function renderSidebar() {
    const types = [
      { id: "all", label: "All resources", icon: "grid_view" },
      { id: "video", label: "Videos", icon: "play_circle" },
      { id: "tutorial", label: "Tutorials", icon: "menu_book" },
      { id: "faq", label: "FAQs", icon: "help" },
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
    <p>Can't find what you need? Our team is here to help.</p>
    <a href="${CFG.consultURL}" target="_blank" rel="noopener">Request a consultation ${icon("open_in_new", 14)}</a>
  </div>
</div>`;

    document.querySelectorAll("#sidebar [data-type]").forEach((btn) => {
      btn.addEventListener("click", () => setType(btn.dataset.type));
    });
    document.querySelectorAll("#sidebar [data-days]").forEach((btn) => {
      btn.addEventListener("click", () => setDays(btn.dataset.days));
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

  /* ── Render: single row ── */
  function renderRow(r) {
    return `<button class="hl-lrow ${rowClass(r.type)}" type="button"
data-id="${r.id}" aria-label="${esc(r.title)}, ${bdgLabel(r.type)}">
<div class="hl-lr-ico ${icoClass(r.type)}" aria-hidden="true">
  ${icon(typeIcon(r.type))}
</div>
<div class="hl-lr-body">
  <p class="hl-lr-t">${esc(r.title)}</p>
  <div class="hl-lr-m">
    <span class="hl-badge ${bdgClass(r.type)}">${bdgLabel(r.type)}</span>
    ${r.isNew ? '<span class="hl-badge hl-bn">Updated recently</span>' : ""}
    ${r.cats.length ? `<span class="hl-lr-cat">${esc(r.cats.join(", "))}</span>` : ""}
  </div>
</div>
<span class="hl-icon hl-lr-arr" aria-hidden="true">${ICONS.chevron_right ?? ""}</span>
</button>`;
  }

  /* ── Render: featured card ── */
  function renderFeatCard(r) {
    return `<button class="hl-fcard" type="button"
data-id="${r.id}" aria-label="${esc(r.title)}, ${bdgLabel(r.type)}">
<div class="hl-fc-top">
  <div class="hl-fc-ico ${icoClass(r.type)}" aria-hidden="true">
    ${icon(typeIcon(r.type))}
  </div>
  <div class="hl-fc-badges">
    <span class="hl-badge ${bdgClass(r.type)}">${bdgLabel(r.type)}</span>
    ${r.isNew ? '<span class="hl-badge hl-bn">New</span>' : ""}
  </div>
</div>
<p class="hl-fc-title">${esc(r.title)}</p>
<p class="hl-fc-desc">${esc(r.desc)}</p>
</button>`;
  }

  /* ── Render: category group ── */
  function renderGroup(groupKey, records) {
    const visible = groupVisible[groupKey] ?? CFG.GROUP_CAP;
    const shown = records.slice(0, visible);
    const remaining = records.length - shown.length;
    const moreBtn =
      remaining > 0
        ? `<button class="hl-show-more" type="button"
    data-showmore="${esc(groupKey)}"
    aria-label="Show ${remaining} more in ${esc(groupKey)}">
    ${icon("unfold_more")}
    Show ${remaining} more in ${esc(groupKey)}
  </button>`
        : "";
    const collapsed = groupCollapsed[groupKey] === true;
    const domSafeKey = esc(groupKey);

    return `<div class="hl-grp${collapsed ? " collapsed" : ""}" data-group="${domSafeKey}">
<button class="hl-grp-hdr" type="button"
  data-togglegroup="${domSafeKey}"
  aria-expanded="${!collapsed}">
  ${icon("folder")}
  <span class="hl-grp-name">${esc(groupKey)}</span>
  <span class="hl-grp-count">${records.length}</span>
  <span class="hl-icon hl-grp-chevron" aria-hidden="true">${ICONS[collapsed ? "unfold_more" : "unfold_less"] ?? ""}</span>
</button>
<div class="hl-grp-body">
  ${shown.map(renderRow).join("")}${moreBtn}
</div>
</div>`;
  }

  /* Attach click handlers to any card/row buttons and controls inside a container */
  function bindResultControls(root) {
    root.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.dataset.id));
    });
    root.querySelectorAll("[data-showmore]").forEach((btn) => {
      btn.addEventListener("click", () => showMore(btn.dataset.showmore));
    });
    root.querySelectorAll("[data-togglegroup]").forEach((btn) => {
      btn.addEventListener("click", () => toggleGroup(btn.dataset.togglegroup));
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
      const remFlat = list.length - shownFlat.length;
      el.innerHTML = `
  <div class="hl-list-rows">${shownFlat.map(renderRow).join("")}</div>
  ${
    remFlat > 0
      ? `<button class="hl-show-more-global" type="button" data-showmore="__flat__">Show ${remFlat} more results</button>`
      : ""
  }`;
      bindResultControls(el);
      return;
    }

    /* Start Here tab */
    if (state.cat === "start") {
      fs.innerHTML = "";
      if (list.length) {
        el.innerHTML = `<div class="hl-list-rows">${list.map(renderRow).join("")}</div>`;
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
      fsHTML += `<div class="hl-sh-band">
  <div class="hl-sh-hdr">
    <span class="hl-sh-ico">${icon("star")}</span>
    <span class="hl-sh-title">Start Here</span>
    <span class="hl-sh-desc">Recommended for new users</span>
  </div>
  <div class="hl-feat-grid">${startItems.slice(0, 4).map(renderFeatCard).join("")}</div>
</div>`;
    }

    const featItems = list.filter((r) => r.featured && !r.startHere);
    if (featItems.length && state.cat === "all") {
      fsHTML += `<div class="hl-feat-hdr">
  <span class="hl-feat-hdr-label">Featured</span>
  <span class="hl-feat-hdr-line"></span>
</div>
<div class="hl-feat-grid" style="margin-bottom:20px">
  ${featItems.slice(0, 4).map(renderFeatCard).join("")}
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
      const keys = r.cats.length ? r.cats : ["Other resources"];
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
      const rem = list.length - shown.length;
      el.innerHTML = `
  <div class="hl-list-rows">${shown.map(renderRow).join("")}</div>
  ${
    rem > 0
      ? `<button class="hl-show-more-global" type="button" data-showmore="${esc(state.cat)}">Show ${rem} more</button>`
      : ""
  }`;
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

  /* ── Show more ── */
  function showMore(key) {
    groupVisible[key] = (groupVisible[key] ?? CFG.GROUP_CAP) + CFG.GROUP_CAP;
    render();
    const grp = document.querySelector(`[data-group="${CSS.escape(key)}"]`);
    if (grp) grp.querySelector(".hl-show-more")?.focus();
  }

  /* ── Toggle group collapse ── */
  function toggleGroup(key) {
    groupCollapsed[key] = !groupCollapsed[key];
    const grpEl = document.querySelector(`[data-group="${CSS.escape(key)}"]`);
    if (!grpEl) return;
    grpEl.classList.toggle("collapsed", groupCollapsed[key]);
    const hdr = grpEl.querySelector(".hl-grp-hdr");
    hdr?.setAttribute("aria-expanded", String(!groupCollapsed[key]));
    const chevron = grpEl.querySelector(".hl-grp-chevron");
    if (chevron) {
      chevron.innerHTML = ICONS[groupCollapsed[key] ? "unfold_more" : "unfold_less"] ?? "";
    }
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
  }

  /* ── Inline video playback (article main content) ── */
  function playInlineVideo(src, title) {
    const wrap = document.getElementById("vpreviewWrap");
    if (!wrap || !src) return;

    wrap.innerHTML = `<div class="hl-vplaying">
  <iframe id="vinlineFrame" src="${esc(src)}" title="${esc(title || "Video")}" allowfullscreen frameborder="0"></iframe>
</div>
<div class="hl-vfallback" id="vfallback" role="status">
  <span>Trouble viewing this video?</span>
  <a href="${esc(src)}" target="_blank" rel="noopener">Open in a new tab ${icon("open_in_new", 14)}</a>
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
    modalFocus.vid?.focus();
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
    modalFocus.pdf?.focus();
  }

  /* ── Detail page ── */
  function open(id) {
    const r = DATA.find((x) => String(x.id) === String(id));
    if (!r) return;
    lastOpenedId = id;

    document.title = `${r.title} — VA LEAF Help Library`;
    window.location.hash = `article-${id}`;

    const catCrumb = r.cats.length
      ? `<span class="hl-dsep" aria-hidden="true">/</span>
   <a href="#" class="hl-dbc-cat" data-backtocat="${esc(r.cats[0])}"
      aria-label="Filter by ${esc(r.cats[0])}">${esc(r.cats[0])}</a>`
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
    <div class="hl-dhmeta">
      <span class="hl-badge ${bdgClass(r.type)}">${bdgLabel(r.type)}</span>
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

    const videoPreview = canEmbedInline
      ? `<div class="hl-vpreview-wrap" id="vpreviewWrap">
    <button class="hl-vpreview" type="button" id="vpreviewBtn"
      data-embed-src="${esc(r.embedSrc.src)}" data-title="${esc(r.title)}"
      aria-label="Play video: ${esc(r.title)}">
      <span class="hl-vpreview-play" aria-hidden="true">${icon("play_circle", 56)}</span>
    </button>
  </div>`
      : externalVideoOnly
        ? `<a class="hl-vpreview hl-vpreview-ext" href="${esc(r.videoURL)}" target="_blank" rel="noopener"
    aria-label="Watch video on SharePoint: ${esc(r.title)} (opens in new tab)">
    <span class="hl-vpreview-play" aria-hidden="true">${icon("play_circle", 56)}</span>
    <span class="hl-vpreview-ext-label">${icon("open_in_new", 16)} Opens on SharePoint</span>
  </a>`
        : "";

    const pdfPreview =
      r.pdfURL
        ? `<button class="hl-dpreview" type="button" id="pdfPreviewBtn"
    data-pdf-url="${esc(r.pdfURL)}" data-title="${esc(r.pdfTitle)}"
    aria-label="Open document: ${esc(r.title)}">
    <span class="hl-dpreview-ico" aria-hidden="true">${icon("picture_as_pdf", 32)}</span>
    <span class="hl-dpreview-body">
      <span class="hl-dpreview-title">${esc(r.pdfTitle)}</span>
      <span class="hl-dpreview-sub">PDF document — click to open</span>
    </span>
    <span class="hl-icon hl-dpreview-arr" aria-hidden="true">${ICONS.chevron_right ?? ""}</span>
  </button>`
        : "";

    document.getElementById("dmain").innerHTML = `${videoPreview}${pdfPreview}<div class="hl-dcard">
<h2>About this resource</h2>
${formatDesc(r.desc) || "<p>No description available.</p>"}
</div>`;

    document.getElementById("vpreviewBtn")?.addEventListener("click", (e) => {
      playInlineVideo(e.currentTarget.dataset.embedSrc, e.currentTarget.dataset.title);
    });
    document.getElementById("pdfPreviewBtn")?.addEventListener("click", (e) => {
      openPDF(e.currentTarget.dataset.pdfUrl, e.currentTarget.dataset.title);
    });

    const related = DATA.filter(
      (x) => x.id !== r.id && x.cats.some((c) => r.cats.includes(c)),
    ).slice(0, 3);

    const relatedHTML = related.length
      ? `<div class="hl-dsbc"><h3>Related resources</h3>
    ${related
      .map(
        (rx) => `
      <button class="hl-drel" type="button"
        data-id="${rx.id}"
        aria-label="${esc(rx.title)}, ${bdgLabel(rx.type)}">
        <div class="hl-drii ${icoClass(rx.type)}" aria-hidden="true">
          ${icon(typeIcon(rx.type))}
        </div>
        <div class="hl-drib">
          <span class="hl-drit">${esc(rx.title)}</span>
          <span class="hl-dric">${bdgLabel(rx.type)}</span>
        </div>
        <span class="hl-icon hl-drel-arr" aria-hidden="true">${ICONS.chevron_right ?? ""}</span>
      </button>`,
      )
      .join("")}
   </div>`
      : "";

    document.getElementById("dsb").innerHTML = `
<div class="hl-dsbc hl-dsbc-actions"><h3>Actions</h3>
  ${
    canEmbedInline
      ? `<button class="hl-dact" type="button"
    data-embed-src="${esc(r.embedSrc.src)}"
    data-title="${esc(r.title)}"
    data-openvid
    aria-label="Watch video: ${esc(r.title)}">
    ${icon("play_circle")}Watch video</button>`
      : externalVideoOnly
        ? `<a class="hl-dact" href="${esc(r.videoURL)}" target="_blank" rel="noopener"
    aria-label="Watch video: ${esc(r.title)} (opens on SharePoint in new tab)">
    ${icon("play_circle")}Watch video ${icon("open_in_new", 14)}</a>`
        : ""
  }
  ${
    r.pdfURL
      ? `<button class="hl-dact" type="button"
    data-pdf-url="${esc(r.pdfURL)}"
    data-title="${esc(r.pdfTitle)}"
    data-openpdf-sidebar
    aria-label="View PDF: ${esc(r.title)}">
    ${icon("picture_as_pdf")}View PDF</button>`
      : ""
  }
</div>
${relatedHTML}
<div class="hl-dcta"><h3>Need help?</h3>
  <p>Our team can walk you through this live in a 30-min consultation.</p>
  <a href="${CFG.consultURL}" target="_blank" rel="noopener">Request a consultation ${icon("open_in_new", 14)}</a>
</div>`;

    document.querySelector("#dsb [data-openvid]")?.addEventListener("click", (e) => {
      const src = e.currentTarget.dataset.embedSrc;
      const title = e.currentTarget.dataset.title;
      const wrap = document.getElementById("vpreviewWrap");
      if (wrap) {
        playInlineVideo(src, title);
        wrap.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        openVid(src, title);
      }
    });
    document.querySelectorAll("#dsb [data-id]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.dataset.id));
    });
    document.querySelector("#dsb [data-openpdf-sidebar]")?.addEventListener("click", (e) => {
      openPDF(e.currentTarget.dataset.pdfUrl, e.currentTarget.dataset.title);
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
    if (card) {
      card.focus();
    } else {
      document.getElementById("sq").focus();
    }
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
    auditVideoTypes();
    const m = window.location.hash.match(/^#article-(\d+)$/);
    if (m) open(m[1]);
  }

  /* ── TEMPORARY AUDIT — flags "video" records whose underlying URL/embed
     data looks invalid so content owners can find and fix bad entries.
     Safe to delete once the source data has been cleaned up. ── */
  function looksLikeUrl(s) {
    if (!s) return false;
    const v = s.trim().toLowerCase();
    if (!v) return false;
    if (["n/a", "na", "tbd", "-", "--", "none", "pending"].includes(v)) return false;
    return /^https?:\/\//.test(v);
  }

  function looksLikeVideoEmbed(s) {
    if (!looksLikeUrl(s)) return false;
    return /sharepoint\.com|stream\.microsoft|onedrive|\.mp4($|\?)|youtube\.|vimeo\./i.test(s);
  }

  function auditVideoTypes() {
    const suspects = DATA.filter((r) => r.type === "video").map((r) => {
      const reasons = [];
      const urlOk = looksLikeUrl(r.videoURL);
      const embedOk = looksLikeVideoEmbed(r.embedSrc?.src);

      if (r.videoURL && !urlOk) reasons.push(`videoURL field (id${CFG.indVideoURL}) has non-URL value: "${r.videoURL}"`);
      if (r.embedSrc?.src && !embedOk) reasons.push(`embed field (id${CFG.indEmbed}) src doesn't look like a known video host: "${r.embedSrc.src}"`);
      if (!r.videoURL && !r.embedSrc?.src) reasons.push("typed as video but both videoURL and embed src are empty");

      return reasons.length ? { id: r.id, title: r.title, reasons } : null;
    }).filter(Boolean);

    if (!suspects.length) {
      console.log("[HelpLib audit] No suspect 'video' records found — all video-typed items have plausible URLs/embeds.");
      return;
    }

    console.warn(
      `[HelpLib audit] ${suspects.length} record(s) typed as "video" have questionable source data:`,
    );
    console.table(
      suspects.map((s) => ({ id: s.id, title: s.title, issues: s.reasons.join(" | ") })),
    );
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

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAnyOpenModal();
    });
    document.addEventListener("keydown", (e) => trapModalFocus("vidModal", e));
    document.addEventListener("keydown", (e) => trapModalFocus("pdfModal", e));

    window.addEventListener("hashchange", () => {
      const m = window.location.hash.match(/^#article-(\d+)$/);
      if (!m) {
        document.title = "VA LEAF — Help Library";
        document.getElementById("dpage").classList.remove("on");
        document.getElementById("lpage").classList.remove("off");
        window.scrollTo(0, 0);
        const card = lastOpenedId && document.querySelector(`[data-id="${lastOpenedId}"]`);
        if (card) {
          card.focus();
        } else {
          document.getElementById("sq").focus();
        }
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
    showMore,
    toggleGroup,
  };
})();

HelpLib.init();
