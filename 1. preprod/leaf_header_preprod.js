/* ============================================================
   LEAF Universal Header (Preprod)  |  leaf_header_preprod.js
   ─────────────────────────────────────────────────────────────
   Lives at /launchpad/files/leaf_header_preprod.js — every preprod
   page should point here directly so there's exactly one copy to
   edit.

   Renders branding/logo, nav menu, and breadcrumb row as one
   sticky unit. Hides LEAF's native #header/#footer chrome (see
   leaf_header_preprod.css) since this component owns branding.

   Self-mounting: auto-injects its own stylesheet and, if the
   host page doesn't already have one, creates the
   <div id="lp-header-host"> for itself. A brand-new page only
   needs ONE line added to it, right before </head> or </body>:

       <script src="/launchpad/files/leaf_header_preprod.js"></script>

   ── Breadcrumb: auto-detected, no per-page flag ─────────────
   Every real page's URL already matches an entry in NAV_SECTIONS
   or SUBROUTES (that's how the router looks routes up by hash).
   On page load, resolveCurrentRoute() matches this page's own
   URL against that same table:
     - matches the home route  → breadcrumb hidden
     - matches any other route → breadcrumb shown, trail built
       from that route's section/parent/title (same fields the
       SPA router already used)
     - matches nothing         → breadcrumb hidden (unknown page)
   On the launchpad's own hash-routed views, the same trail
   builder runs off the active route instead of the URL.

   ── Option B: Hash router (Launchpad v4) ────────────────────
   On the launchpad page (report.php?a=lp_home), nav link
   left-clicks push a hash and trigger a fetch+inject cycle:

   1. Hash is pushed to window.location → hashchange fires
   2. Router maps hash key → URL from NAV_SECTIONS
   3. fetch(url) → DOMParser → extract #content
   4. Chrome suppression strips #header, #footer, nav, etc.
   5. Safe script re-execution re-appends <script> nodes
   6. Injected into #lpSwapHost; launchpad <main> hidden
   7. Header's breadcrumb row updates to reflect current view
   8. Live region announces new page to screen readers

   A full separate LEAF app (wrong document, wrong scripts, wrong
   DOM if fetched+spliced) can still be registered with
   iframe: true in NAV_SECTIONS to mount in an <iframe> instead —
   still hash-routed so the header stays visible and
   back-to-launchpad still works. No current nav item needs this
   (all now live under the same launchpad domain and fetch+splice
   normally), but the mechanism stays available for a future one
   that doesn't.

   Back button works natively via hash history.
   Modifier-key clicks (Ctrl/Cmd/middle) always open real tabs.
   Pages not on the launchpad get the header only — no router.

   ── Accessibility (WCAG 2.1 AA / Section 508) ───────────────
   • Skip navigation link auto-injected at top of <body>
     (targets #main-content; auto-added to first <main> if absent)
   • Disclosure navigation pattern — aria-expanded only, no
     aria-haspopup, so there's no role mismatch with the panel
   • External links announce "(opens in new tab)" to screen readers
   • Mobile toggle aria-label toggles "Open menu" / "Close menu"
   • Mobile panel traps focus while open; Escape returns focus
   • window.LEAF_NAV_CURRENT = "Section Label" marks active
     section with aria-current="true" for screen readers
   • SPA view changes announced via #lp-live-region (aria-live)
   • Focus moved to #lpSwapHost after each view load
   • document.title updated to fetched page title on each view
   • prefers-reduced-motion: all animations suppressed in CSS
   ============================================================ */

(function () {
  "use strict";

  /* ── Announcement banner config ──────────────────────────────────
     Placeholder record/indicator IDs — swap in real values before
     promoting to production. Search "REPLACE_ME" to find these and
     any other unfilled placeholder in this file.

     Sourced from a LEAF form's rawIndicator endpoint:
       GET {ANNOUNCEMENT_ROOT_URL}api/form/{ANNOUNCEMENT_RECORD_ID}
           /rawIndicator/{ANNOUNCEMENT_INDICATOR_ID}/{ANNOUNCEMENT_SERIES}

     ANNOUNCEMENT_ROOT_URL      : base URL of the LEAF site/app hosting
                                  the announcement record, trailing
                                  slash included (e.g.
                                  "https://leaf.va.gov/platform/xyz/").
     ANNOUNCEMENT_RECORD_ID     : the form record ID.
     ANNOUNCEMENT_INDICATOR_ID  : the rich-text (Trumbowyg) indicator ID
                                  whose value is the announcement copy.
     ANNOUNCEMENT_SERIES        : series number — 1 unless the record
                                  uses a different series. */
  var ANNOUNCEMENT_ROOT_URL = "REPLACE_ME_ANNOUNCEMENT_ROOT_URL";
  var ANNOUNCEMENT_RECORD_ID = "REPLACE_ME_ANNOUNCEMENT_RECORD_ID";
  var ANNOUNCEMENT_INDICATOR_ID = "REPLACE_ME_ANNOUNCEMENT_INDICATOR_ID";
  var ANNOUNCEMENT_SERIES = 1;

  /* ── Home route — used for the brand logo link and as the
     breadcrumb auto-detect's "hide breadcrumb here" match. Absolute
     to the preprod host — the header is site-wide now, so this has
     to bring users on any LEAF page back into the app, not off of
     it. Kept in sync with the matching entry in
     HREF_HASH_KEY_OVERRIDES below — that entry must be updated too
     if this ever changes, since hrefToHashKey() looks it up by exact
     string match. ── */
  var HOME_HREF = "https://leaf-preprod.va.gov/launchpad/report.php";

  /* ── Nav content (single source of truth for desktop + mobile) ──
     href values here are the canonical URLs used by the router
     AND by the breadcrumb auto-detect (a static page's own URL is
     matched against these same hrefs). Hash keys are derived from
     the ?a= param value automatically. Placeholder hrefs (#) are
     skipped by the router. */
  var NAV_SECTIONS = [
    {
      label: "About LEAF",
      items: [
        {
          icon: "bar_chart",
          title: "Our Impact",
          desc: "LEAF's impact across the VA enterprise",
          href: "/launchpad/report.php?a=lp_impact",
        },
        {
          icon: "play_circle",
          title: "Watch a Demo",
          desc: "A short video tour of the LEAF platform",
          href: "#",
          action: "demo-modal",
        },
        {
          icon: "route",
          title: "Roadmap",
          desc: "What's coming to LEAF",
          href: "/launchpad/report.php?a=lp_roadmap",
          hidden: true,
        },
      ],
    },
    {
      label: "Solutions",
      items: [
        {
          icon: "description",
          title: "Form Library",
          desc: "Forms and templates built by VA teams",
          href: "/launchpad/report.php?a=lp_form_library",
        },
        {
          icon: "cases",
          title: "Use Cases",
          desc: "Explore real workflows from teams across the VA",
          href: "/launchpad/report.php?a=lp_use_case",
          badge: "Coming Soon",
        },
        {
          icon: "cable",
          title: "Integrations",
          desc: "Connect LEAF to other systems and tools",
          href: "/launchpad/report.php?a=lp_integrations",
          hidden: true,
        },
      ],
    },
    {
      label: "Resources",
      items: [
        {
          icon: "location_on",
          title: "Find a LEAF Site",
          desc: "Locate a LEAF site at your VA facility",
          href: "/launchpad/report.php?a=lp_find_site",
        },
        {
          icon: "record_voice_over",
          title: "Voice of the Customer",
          desc: "Share feedback to help shape LEAF",
          href: "/launchpad/report.php?a=lp_voc",
          children: [
            {
              icon: "diversity_3",
              title: "Community of Practice",
              desc: "Connect with LEAF site admins and builders VA-wide",
              href: "/launchpad/report.php?a=lp_cop",
            },
          ],
        },
        {
          icon: "lightbulb",
          title: "Suggest an Idea",
          desc: "Submit an idea to improve LEAF",
          href: "/launchpad/report.php?a=lp_ideas",
        },
        {
          icon: "privacy_tip",
          title: "Privacy & Compliance",
          desc: "LEAF privacy and compliance resources",
          href: "/launchpad/report.php?a=lp_privacy",
        },
      ],
    },
    {
      label: "Knowledge Center",
      items: [
        {
          icon: "menu_book",
          title: "Help Library",
          desc: "Guides and documentation",
          href: "/launchpad/report.php?a=lp_help_library",
        },
        {
          icon: "article",
          title: "Blog",
          desc: "Updates, stories, and news from the LEAF team",
          href: "/launchpad/report.php?a=lp_blog",
        },
        {
          icon: "school",
          title: "Learn",
          desc: "Training, videos, and resources to get the most out of LEAF",
          href: "/launchpad/report.php?a=lp_learn",
          badge: "Coming Soon",
        },
        {
          icon: "quiz",
          title: "FAQ",
          desc: "Quick answers to common questions",
          href: "#",
          hidden: true,
        },
      ],
    },
  ];

  /* ── Sub-routes: pages nested under a nav item (not in the dropdown) ──
     These get registered in ROUTE_MAP at init so the hash router can
     load them and breadcrumbs get the correct 4-level trail. Also
     matched against a static page's own URL for breadcrumb auto-detect. */
  var SUBROUTES = [
    {
      href: "/launchpad/report.php?a=lp_brand_guide",
      title: "Brand Guide",
      section: "About LEAF",
      parent: {
        label: "Our Impact",
        href: "/launchpad/report.php?a=lp_impact",
      },
    },
  ];

  /* ── Router: hash key → { href, title, section } lookup table ──
     Built once at init from NAV_SECTIONS. Hash key is the ?a= param
     value (e.g. "lp_impact", "lp_find_site"). Also doubles as the
     breadcrumb auto-detect table for static (non-launchpad) pages —
     see resolveCurrentRoute(). Leadership is also registered here
     even though it lives in the separate INTERNAL_SECTION — it
     still hash-routes. */
  var ROUTE_MAP = {};

  /* Static definitions for the Internal section's direct links so the
     router knows about them, same as any other nav destination. */
  var INTERNAL_LEADERSHIP_ROUTE = {
    href: "/launchpad/report.php?a=lp_leadership",
    title: "Leadership",
    section: "Internal",
  };
  var INTERNAL_TEAM_ROUTE = {
    href: "/launchpad/report.php?a=lp_team",
    title: "Team",
    section: "Internal",
  };
  var INTERNAL_ADMIN_ROUTE = {
    href: "/launchpad/admin",
    title: "Admin",
    section: "Internal",
  };

  function buildRouteMap() {
    /* Registers one item into ROUTE_MAP — shared by top-level items and
       nested children so both hash-route the same way. External items
       (real <a target="_blank"> links, not internal launchpad routes)
       are skipped entirely. parentItem is only passed for nested
       children (e.g. Community of Practice under Voice of the
       Customer) — it fills in route.parent so buildTrailHTML() renders
       the full 3-level breadcrumb (section > parent > title) instead
       of just section > title. */
    function registerItem(item, section, parentItem) {
      if (
        item.divider ||
        !item.href ||
        item.href === "#" ||
        item.hidden ||
        item.external
      )
        return;
      var key = hrefToHashKey(item.href);
      if (key) {
        ROUTE_MAP[key] = {
          href: item.href,
          title: item.title,
          section: section.label,
          iframe: !!item.iframe,
        };
        if (parentItem) {
          ROUTE_MAP[key].parent = {
            label: parentItem.title,
            href: parentItem.href,
          };
        }
      }
    }
    NAV_SECTIONS.forEach(function (section) {
      section.items.forEach(function (item) {
        registerItem(item, section);
        (item.children || []).forEach(function (child) {
          registerItem(child, section, item);
        });
      });
    });
    /* Register sub-routes (pages nested under a nav item) */
    SUBROUTES.forEach(function (route) {
      var key = hrefToHashKey(route.href);
      if (key) ROUTE_MAP[key] = route;
    });

    /* Register Leadership, Team, and Admin so the hash router can load them inline */
    var leadershipKey = hrefToHashKey(INTERNAL_LEADERSHIP_ROUTE.href);
    if (leadershipKey) {
      ROUTE_MAP[leadershipKey] = INTERNAL_LEADERSHIP_ROUTE;
    }
    var teamKey = hrefToHashKey(INTERNAL_TEAM_ROUTE.href);
    if (teamKey) {
      ROUTE_MAP[teamKey] = INTERNAL_TEAM_ROUTE;
    }
    var adminKey = hrefToHashKey(INTERNAL_ADMIN_ROUTE.href);
    if (adminKey) {
      ROUTE_MAP[adminKey] = INTERNAL_ADMIN_ROUTE;
    }
  }

  /* Derive a hash key from any href.
     "/launchpad/report.php?a=lp_find_site" → "lp_find_site"
     "report.php?a=Find_my_site"               → "find_my_site" (lowercased)
     Absolute URLs with different origin handled gracefully. */
  /* Explicit hash-key overrides for hrefs whose derived key would
     otherwise be wrong. Checked first in hrefToHashKey() so every
     caller (registerItem, wireLinkIntercept's click-time lookup,
     resolveCurrentRoute) agrees on the same key automatically. */
  var HREF_HASH_KEY_OVERRIDES = {
    /* HOME_HREF has no ?a= param — the homepage renders for the
       empty/default action — so it falls back to the last-path-segment
       rule and derives "report.php", a key router() doesn't recognize
       as home (only "", "home", "lp_home" are). Left alone, clicking
       the brand logo or the breadcrumb's "Launchpad" crumb (real
       <a href=HOME_HREF> elements that wireLinkIntercept hash-routes)
       would push "#report.php" and land on the "page doesn't exist"
       state instead of home. Pin it to "home" instead: router() then
       recognizes the pushed hash. */
    "https://leaf-preprod.va.gov/launchpad/report.php": "home",
    /* window.location.pathname/search never include the origin, so
       resolveCurrentRoute()'s "here" (a page's own relative URL) is
       matched against this relative form — needed alongside the
       absolute entry above so resolveCurrentRoute()'s "here" vs
       HOME_HREF comparison still agrees and the breadcrumb keeps
       hiding correctly on a direct load of the actual homepage. */
    "/launchpad/report.php": "home",
  };

  function hrefToHashKey(href) {
    if (!href || href === "#") return null;
    if (HREF_HASH_KEY_OVERRIDES[href]) return HREF_HASH_KEY_OVERRIDES[href];
    var match = href.match(/[?&]a=([^&#]+)/i);
    if (match) return match[1].toLowerCase();
    /* Fall back: use last path segment for hrefs without ?a= */
    var pathMatch = href.replace(/\/$/, "").match(/([^/?#]+)$/);
    return pathMatch ? pathMatch[1].toLowerCase() : null;
  }

  /* ── Breadcrumb auto-detect for static pages ──────────────────
     Matches this page's own URL against ROUTE_MAP/HOME_HREF using
     the exact same key-derivation the router uses for hashes.
     Returns "home" (breadcrumb hidden), a route object (breadcrumb
     shown, trail built from it), or null (unknown page — hidden). */
  function resolveCurrentRoute() {
    var here = window.location.pathname + window.location.search;
    var key = hrefToHashKey(here);
    if (!key) return null;
    if (key === hrefToHashKey(HOME_HREF)) return "home";
    return ROUTE_MAP[key] || null;
  }

  /* ── Detect whether we're on the launchpad ──
     The router only activates on report.php?a=lp_home. All other
     pages get the header only — no router, no fetch. Detected via
     the page's own URL, not a DOM marker like #lp-main — every
     lp_*.html page shares that id on its own <main> (generic
     page-shell boilerplate, not launchpad-specific), so it can't
     reliably distinguish the launchpad page from any other. */
  function isLaunchpad() {
    /* Native swap host present in the page's own markup — the
       launchpad page's own marker, checked before buildRouteMap()
       could have created one via ensureSwapHost(). */
    if (document.getElementById("lpSwapHost")) return true;
    return resolveCurrentRoute() === "home";
  }

  /* ─────────────────────────────────────────────────────────────
     ICON LIBRARY
     Inline Material Symbols (Filled), sourced once and reused by
     every render site below — keeps SVG path data out of every
     template string while still inlining full markup per occurrence
     (no <use>/sprite references, no network request per icon).
  ───────────────────────────────────────────────────────────── */
  var ICON_SVG = {
    bar_chart:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M640-160v-280h160v280H640Zm-240 0v-640h160v640H400Zm-240 0v-440h160v440H160Z"/></svg>',
    play_circle:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>',
    route:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M360-120q-66 0-113-47t-47-113v-327q-35-13-57.5-43.5T120-720q0-50 35-85t85-35q50 0 85 35t35 85q0 39-22.5 69.5T280-607v327q0 33 23.5 56.5T360-200q33 0 56.5-23.5T440-280v-400q0-66 47-113t113-47q66 0 113 47t47 113v327q35 13 57.5 43.5T840-240q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-39 22.5-70t57.5-43v-327q0-33-23.5-56.5T600-760q-33 0-56.5 23.5T520-680v400q0 66-47 113t-113 47Z"/></svg>',
    library_books:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M400-400h160v-80H400v80Zm0-120h320v-80H400v80Zm0-120h320v-80H400v80Zm-80 400q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>',
    description:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520h200L520-800v200Z"/></svg>',
    cases:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M120-80q-33 0-56.5-23.5T40-160v-440h80v440h680v80H120Zm160-160q-33 0-56.5-23.5T200-320v-440h200v-80q0-33 23.5-56.5T480-920h160q33 0 56.5 23.5T720-840v80h200v440q0 33-23.5 56.5T840-240H280Zm200-520h160v-80H480v80Z"/></svg>',
    cable:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120q-17 0-28.5-11.5T160-160v-40h-40v-160q0-17 11.5-28.5T160-400h40v-280q0-66 47-113t113-47q66 0 113 47t47 113v400q0 33 23.5 56.5T600-200q33 0 56.5-23.5T680-280v-280h-40q-17 0-28.5-11.5T600-600v-160h40v-40q0-17 11.5-28.5T680-840h80q17 0 28.5 11.5T800-800v40h40v160q0 17-11.5 28.5T800-560h-40v280q0 66-47 113t-113 47q-66 0-113-47t-47-113v-400q0-33-23.5-56.5T360-760q-33 0-56.5 23.5T280-680v280h40q17 0 28.5 11.5T360-360v160h-40v40q0 17-11.5 28.5T280-120h-80Z"/></svg>',
    location_on:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z"/></svg>',
    record_voice_over:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m798-322-62-62q44-41 69-97t25-119q0-63-25-118t-69-96l62-64q56 53 89 125t33 153q0 81-33 153t-89 125ZM670-450l-64-64q18-17 29-38.5t11-47.5q0-26-11-47.5T606-686l64-64q32 29 50 67.5t18 82.5q0 44-18 82.5T670-450Zm-310 10q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-120v-112q0-33 17-62t47-44q51-26 115-44t141-18q77 0 141 18t115 44q30 15 47 44t17 62v112H40Z"/></svg>',
    lightbulb:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-200v-80h320v80H320Zm10-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Z"/></svg>',
    privacy_tip:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z"/></svg>',
    menu_book:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454Zm-40 176q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q47-23 96.5-35.5T260-800q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 101.5 12.5T898-752q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59Z"/></svg>',
    article:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm97-159h275v-60H277v60Zm0-171h406v-60H277v60Zm0-171h406v-60H277v60Z"/></svg>',
    school:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M840-280v-276L480-360 40-600l440-240 440 240v320h-80ZM480-120 200-272v-200l280 152 280-152v200L480-120Z"/></svg>',
    quiz:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M560-360q17 0 29.5-12.5T602-402q0-17-12.5-29.5T560-444q-17 0-29.5 12.5T518-402q0 17 12.5 29.5T560-360Zm-30-128h60q0-29 6-42.5t28-35.5q30-30 40-48.5t10-43.5q0-45-31.5-73.5T560-760q-41 0-71.5 23T446-676l54 22q9-25 24.5-37.5T560-704q24 0 39 13.5t15 36.5q0 14-8 26.5T578-596q-33 29-40.5 45.5T530-488ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>',
    arrow_drop_down:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-360 280-560h400L480-360Z"/></svg>',
    lock:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/></svg>',
    sync:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160v-80h110l-16-14q-49-49-71.5-106.5T160-478q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z"/></svg>',
    groups:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Z"/></svg>',
    link_off:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m770-302-60-62q40-11 65-42.5t25-73.5q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 57-29.5 105T770-302ZM634-440l-80-80h86v80h-6ZM792-56 56-792l56-56 736 736-56 56ZM440-280H280q-83 0-141.5-58.5T80-480q0-69 42-123t108-71l74 74h-24q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h65l79 80H320Z"/></svg>',
    cloud_off:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M792-56 686-160H260q-92 0-156-64T40-380q0-77 47.5-137T210-594q3-8 6-15.5t6-16.5L56-792l56-56 736 736-56 56Zm72-154L322-751q35-24 74.5-36.5T480-800q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 39-15 72.5T864-210Z"/></svg>',
    bug_report:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-120q-65 0-120.5-32T272-240H160v-80h84q-3-20-3.5-40t-.5-40h-80v-80h80q0-20 .5-40t3.5-40h-84v-80h112q14-23 31.5-43t40.5-35l-64-66 56-56 86 86q28-9 57-9t57 9l88-86 56 56-66 66q23 15 41.5 34.5T688-640h112v80h-84q3 20 3.5 40t.5 40h80v80h-80q0 20-.5 40t-3.5 40h84v80H688q-32 56-87.5 88T480-120Zm-80-200h160v-80H400v80Zm0-160h160v-80H400v80Z"/></svg>',
    close:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>',
    wrong_location:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q17 0 35 2t35 4l96 96-84 84 113 113 84-84 31 32q4 20 7 40t3 41q0 100-79.5 217.5T480-80Zm195-558-56-56 84-84-84-84 56-56 84 84 84-84 56 56-84 84 84 84-56 56-84-84-84 84Z"/></svg>',
    home:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>',
    refresh:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/></svg>',
    open_in_new:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>',
    arrow_upward:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>',
    diversity_3:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M40-160v-160q0-34 23.5-57t56.5-23h131q20 0 38 10t29 27q29 39 71.5 61t90.5 22q49 0 91.5-22t70.5-61q13-17 30.5-27t36.5-10h131q34 0 57 23t23 57v160H640v-91q-35 25-75.5 38T480-200q-43 0-84-13.5T320-252v92H40Zm440-160q-38 0-72-17.5T351-386q-17-25-42.5-39.5T253-440q22-37 93-58.5T480-520q63 0 134 21.5t93 58.5q-29 0-55 14.5T609-386q-22 32-56 49t-73 17ZM160-440q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T280-560q0 50-34.5 85T160-440Zm640 0q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T920-560q0 50-34.5 85T800-440ZM480-560q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-680q0 50-34.5 85T480-560Z"/></svg>',
    co_present:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M840-120v-640H120v320H40v-320q0-33 23.5-56.5T120-840h720q33 0 56.5 23.5T920-760v560q0 33-23.5 56.5T840-120ZM360-400q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-80v-112q0-34 17.5-62.5T104-298q62-31 126-46.5T360-360q66 0 130 15.5T616-298q29 15 46.5 43.5T680-192v112H40Z"/></svg>',
    account_balance:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Z"/></svg>',
    support:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m480-80-10-120h-10q-142 0-241-99t-99-241q0-142 99-241t241-99q71 0 132.5 26.5t108 73q46.5 46.5 73 108T800-540q0 75-24.5 144t-67 128q-42.5 59-101 107T480-80Zm-21-241q17 0 29-12t12-29q0-17-12-29t-29-12q-17 0-29 12t-12 29q0 17 12 29t29 12Zm-29-127h60q0-30 6-42t38-44q18-18 30-39t12-45q0-51-34.5-76.5T460-720q-44 0-74 24.5T344-636l56 22q5-17 19-33.5t41-16.5q27 0 40.5 15t13.5 33q0 17-10 30.5T480-558q-35 30-42.5 47.5T430-448Z"/></svg>',
  };

  /* ─────────────────────────────────────────────────────────────
     MARKUP BUILDERS
     Shared by desktop dropdowns + mobile accordion
  ───────────────────────────────────────────────────────────── */
  function linkHTML(item) {
    if (item.divider) return '<hr class="dd-divider" aria-hidden="true">';
    if (item.children && item.children.length) return nestedLinkHTML(item);
    return `<li>${linkRowHTML(item)}</li>`;
  }

  /* Renders one <button class="dd-link">. Shared by plain items (via
     linkHTML) and nested parent/child rows (via nestedLinkHTML) so both
     look and behave identically. Use <button data-href> instead of
     <a href> so the browser status bar never previews the destination
     URL on hover — navigation is handled by wireLinkIntercept(), which
     reads data-href. Applies to any future iframe: true item too —
     it's still hash-routed so the header stays visible; loadView()
     mounts it in an <iframe> instead of fetching+splicing its HTML,
     since it's a full separate LEAF app rather than a lightweight
     content page. */
  function linkRowHTML(item, extraClass) {
    var badgeHTML = item.badge
      ? `<span class="dd-badge">${item.badge}</span>`
      : "";
    /* data-action flags items that trigger in-page behavior (e.g. opening
       the demo modal) instead of navigating — read by wireLinkIntercept()
       before it falls through to href-based routing. */
    var actionAttr = item.action ? ` data-action="${item.action}"` : "";
    var cls = extraClass ? `dd-link ${extraClass}` : "dd-link";
    /* Submenu-level items (dd-link--sub, e.g. Community of Practice
       under Voice of the Customer) render text-only — an icon crowds
       the already-indented title/description and breaks symmetry with
       the rest of the submenu. */
    var iconHTML =
      extraClass === "dd-link--sub"
        ? ""
        : `
          <span class="dd-link-ico">
            <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG[item.icon] || ""}</span>
          </span>`;
    /* item.external: true renders a real <a target="_blank"> instead
       of the <button data-href> every other item uses — same
       data-nav-external/rel/sr-only pattern already used for Coaches
       (see buildInternalNavHTML), so wireLinkIntercept() leaves it
       alone entirely rather than hash-routing or iframe-mounting it.
       Not currently used by any NAV_SECTIONS item, but kept as a
       general option for a future genuinely-external nav destination. */
    if (item.external) {
      return `
        <a class="${cls}" href="${item.href}" data-nav-external target="_blank" rel="noopener noreferrer">${iconHTML}
          <span class="dd-link-text">
            <span class="dd-link-title-row">
              <strong>${item.title}</strong>
              ${badgeHTML}
            </span>
            <span class="dd-link-desc">${item.desc}</span>
            <span class="lp-sr-only">(opens in new tab)</span>
          </span>
        </a>`;
    }
    return `
        <button class="${cls}" data-href="${item.href}"${actionAttr}>${iconHTML}
          <span class="dd-link-text">
            <span class="dd-link-title-row">
              <strong>${item.title}</strong>
              ${badgeHTML}
            </span>
            <span class="dd-link-desc">${item.desc}</span>
          </span>
        </button>`;
  }

  /* Renders a parent item (a real link to its own page) plus its child
     items as a permanently-visible indented list beneath it — no
     expand/collapse, no toggle, no user interaction needed to reveal
     them. Same shape in both the desktop dd-panel and mobile acc-panel,
     since both call linkHTML() over the same NAV_SECTIONS data. */
  function nestedLinkHTML(item) {
    var childItemsHTML = item.children
      .map(function (child) {
        return `<li>${linkRowHTML(child, "dd-link--sub")}</li>`;
      })
      .join("");
    return `
      <li class="dd-item-nested">
        ${linkRowHTML(item)}
        <ul class="dd-sub-list">
          ${childItemsHTML}
        </ul>
      </li>`;
  }

  function desktopSectionHTML(section, i) {
    var isCurrent =
      window.LEAF_NAV_CURRENT &&
      window.LEAF_NAV_CURRENT.trim().toLowerCase() ===
        section.label.trim().toLowerCase();
    var currentAttr = isCurrent ? ' aria-current="true"' : "";
    return `
      <li class="dd-item" id="dd-item-${i}">
        <button class="dd-trigger" aria-expanded="false" aria-controls="dd-${i}"${currentAttr}>
          ${section.label} <span class="dd-chevron" aria-hidden="true"><span class="material-symbols-outlined">${ICON_SVG.arrow_drop_down}</span></span>
        </button>
        <div class="dd-panel" id="dd-${i}" hidden>
          <ul class="dd-list">
            ${section.items
              .filter(function (item) {
                return !item.hidden;
              })
              .map(linkHTML)
              .join("")}
          </ul>
        </div>
      </li>`;
  }

  function mobileSectionHTML(section, i) {
    return `
      <li class="acc-item" id="acc-item-${i}">
        <button class="acc-trigger" aria-expanded="false" aria-controls="acc-${i}">
          ${section.label} <span class="dd-chevron" aria-hidden="true"><span class="material-symbols-outlined">${ICON_SVG.arrow_drop_down}</span></span>
        </button>
        <div class="acc-panel" id="acc-${i}" hidden>
          <ul class="dd-list">
            ${section.items
              .filter(function (item) {
                return !item.hidden;
              })
              .map(linkHTML)
              .join("")}
          </ul>
        </div>
      </li>`;
  }

  /* ─────────────────────────────────────────────────────────────
     INTERNAL NAV SECTION
     Right-aligned group: [ 🔒 ] Coaches (new tab) → Team → Leadership
     → Users Online (live status). Renders unconditionally — no
     per-user gating right now.

     Real gating was built and tested (admin via window.leafHeaderConfig
     .isAdmin ← Smarty $empMembership['groupID'][1], Leadership via
     .isLeadershipGroup ← groupID[52]), but is disabled until these
     pages are converted to .tpl and $empMembership is confirmed
     available server-side. Re-enabling it means restoring the
     window.leafHeaderConfig read + the isAdminFlag/isLeadershipGroupFlag
     params this function used to take.
  ───────────────────────────────────────────────────────────── */
  function buildInternalNavHTML() {
    var desktopInternal = `
<div class="lp-nav-internal" role="navigation" aria-label="Internal team links">

  <!-- Lock icon is the only visible content — role="img" + aria-label
       gives it an accessible name since there's no visible text. -->
  <span class="lp-internal-label" role="img" aria-label="Internal">
    <span class="material-symbols-outlined lp-internal-label-icon" aria-hidden="true">${ICON_SVG.lock}</span>
  </span>

  <span class="lp-internal-rule" aria-hidden="true"></span>

  <!-- Coaches: external, opens in a new tab. data-nav-external tells
       wireLinkIntercept() to leave this <a> alone entirely so its real
       target="_blank" fires natively instead of being hash-routed.
       Text-only — no icon, matching Team/Leadership. -->
  <!-- PREPROD: URL updated for preprod testing -->
  <a class="lp-internal-btn" href="https://leaf-preprod.va.gov/launchpad/report.php?a=Coaches" data-nav-external target="_blank" rel="noopener noreferrer">
    Coaches
    <span class="lp-sr-only">(opens in new tab)</span>
  </a>

  <button class="lp-internal-btn" data-href="/launchpad/report.php?a=lp_team">
    Team
  </button>

  <button class="lp-internal-btn" data-href="/launchpad/report.php?a=lp_leadership">
    Leadership
  </button>

  <!-- Admin is a real standalone page, not meant to fetch+splice into
       the launchpad shell like Team/Leadership — data-nav-fullpage tells
       wireLinkIntercept() to always navigate here for real. -->
  <button class="lp-internal-btn" data-href="/launchpad/admin" data-nav-fullpage>
    Admin
  </button>

  <!-- Users Online: live count via Server-Sent Events (see
       wireUsersOnlineBadge()) — not a link, so plain <span>, not
       <button>. .lp-internal-online-count is a class (not an id)
       since this markup also renders in the mobile accordion below;
       one EventSource updates every matching node. -->
  <span class="lp-internal-btn lp-internal-online">
    <span class="lp-internal-online-dot" aria-hidden="true"></span>
    Users Online:
    <span class="lp-internal-online-count" aria-live="polite" aria-atomic="true">0</span>
  </span>

</div>`;

    var mobileInternal = `

<!-- Mobile separator before Internal section — lock icon only, same
     role="img"+aria-label treatment as the desktop version. -->
<li class="lp-internal-mobile-item" role="separator">
  <div class="lp-mobile-internal-sep" role="img" aria-label="Internal">
    <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.lock}</span>
  </div>
</li>

<li class="lp-internal-mobile-item">
  <!-- PREPROD: URL updated for preprod testing -->
  <a class="dd-link" href="https://leaf-preprod.va.gov/launchpad/report.php?a=Coaches" data-nav-external target="_blank" rel="noopener noreferrer">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.co_present}</span>
    </span>
    <span class="dd-link-text">
      <strong>Coaches</strong>
      <span class="dd-link-desc">Get help from a LEAF coach</span>
      <span class="lp-sr-only">(opens in new tab)</span>
    </span>
  </a>
</li>

<li class="lp-internal-mobile-item">
  <button class="dd-link" data-href="/launchpad/report.php?a=lp_team">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.groups}</span>
    </span>
    <span class="dd-link-text">
      <strong>Team</strong>
      <span class="dd-link-desc">Meet the LEAF platform team</span>
    </span>
  </button>
</li>

<li class="lp-internal-mobile-item">
  <button class="dd-link" data-href="/launchpad/report.php?a=lp_leadership">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.groups}</span>
    </span>
    <span class="dd-link-text">
      <strong>Leadership</strong>
      <span class="dd-link-desc">Platform leadership dashboard</span>
    </span>
  </button>
</li>

<li class="lp-internal-mobile-item">
  <button class="dd-link" data-href="/launchpad/admin" data-nav-fullpage>
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.groups}</span>
    </span>
    <span class="dd-link-text">
      <strong>Admin</strong>
      <span class="dd-link-desc">Launchpad admin tools</span>
    </span>
  </button>
</li>

<!-- Users Online: same live count as the desktop badge above (shares
     .lp-internal-online-count), rendered here as a non-interactive
     status row matching the Coaches/Team/Leadership row shape. -->
<li class="lp-internal-mobile-item lp-internal-online">
  <span class="dd-link">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.groups}</span>
    </span>
    <span class="dd-link-text">
      <strong>Users Online</strong>
      <span class="dd-link-desc">Currently active on LEAF: <span class="lp-internal-online-count" aria-live="polite" aria-atomic="true">0</span></span>
    </span>
  </span>
</li>`;

    return { desktop: desktopInternal, mobile: mobileInternal };
  }

  /* ─────────────────────────────────────────────────────────────
     BRAND / LOGO
     Plain inline-flex link, no padded/bordered container — sits
     flush at the header's left edge alongside the nav. Fill color
     is set in leaf_header_preprod.css (.lp-brand-logo path), not inline,
     so it stays themeable in one place.
  ───────────────────────────────────────────────────────────── */
  function buildBrandHTML() {
    return `
<a class="lp-brand" href="${HOME_HREF}" aria-label="LEAF Launchpad home">
  <svg class="lp-brand-logo" viewBox="0 0 1058 280" role="img" aria-hidden="true" focusable="false">
    <g>
      <path d="M429.2,260.8L476,15.8h51.3l-46.8,245h-51.3Z"/>
      <path d="M667.3,250.5c-21,10.9-48.6,14.4-67.3,14.4-50,0-77.3-26.9-77.3-73.4,0-51.3,40.4-102,102.9-102,35.4,0,63,17.8,63,51.5,0,41.3-43.1,56.3-117,54.3.2,4.8,2.3,11.9,5.7,16.7,7.5,8.9,19.8,13,35.1,13,19.2,0,37-4.3,50.9-11.2l4,36.7ZM639.5,139.4c0-7.5-7.8-13.2-20.1-13.2-26,0-39.9,19.8-42.7,32.2,43.3.2,63-3.6,63-18.5v-.5h-.2Z"/>
      <path d="M49.4,260.8L19.3,18.8h53.4l10.7,115.2c2.5,25.5,4.3,49.3,5.7,74.4h.7c8.9-23.7,20.5-49.5,32.4-74.6l54.3-115h57.7l-125,242h-59.8Z"/>
      <path d="M237.8,198l-28.7,62.7h-55L271.8,18.7h66.4l28.5,242h-54.3l-5-62.7h-69.6ZM305.3,158.6l-4.6-52c-1.1-13.2-2.5-32.6-3.6-47.4h-.7c-6.2,14.8-13,33.3-19.4,47.4l-24,52h52.3Z"/>
      <path d="M904.1,260.8l24-127.3h-21.4l7.5-39.9h21.4l1.8-9.1c3.4-19.8,11.4-41.7,29.2-56.1,14.6-12.3,33.5-16.4,49.7-16.4,11.9,0,21.2,2.1,26.7,4.8l-8.2,41.1c-4.6-2.1-10-3.2-16.4-3.2-16.4,0-26.2,13-29.7,30.3l-1.8,8.4h33.1l-7.5,39.9h-32.8l-24.2,127.5h-51.4Z"/>
    </g>
    <g>
      <path d="M749.6,215.1s0,.1-.1.1c.2.2.5.5.9.8q-.1-.1-.2-.2c-.2-.1-.4-.4-.6-.7Z"/>
      <path d="M888.3,97.9c-15.1-4.5-38.3-8.2-59.6-8.2-88.6,0-128.7,60.3-128.7,116.9,0,35,22.1,58.3,54.4,58.3,21,0,43.8-9.3,60.3-37h1.1c-1.1,12-2.2,23.3-2.6,33.2h48.9c-.7-20.9,2.6-53.8,7-75.4l19.2-87.8ZM811.7,210.4c-18.2,16.8-40.7,18.5-55.3,9.8,2.6-5.3,5.8-11.1,9.3-16.9,8.7.9,15.6,1.5,24.2.8,15.4-1.3,25.6-11.6,25.6-11.6,0,0-11.3,6.1-24.7,6.8-10.8.6-15.3-.3-21.8-1.5,5.6-9.2,11.7-18.1,17-25,.6-.8,1.3-1.6,2-2.5,5.7.6,9.6,1.1,16.7.8,13.6-.5,21.9-9,21.9-9,0,0-9.8,5.5-22.2,5.2-8.1-.2-10-.9-12.5-1.5,16.7-20.4,43.3-40.5,48.4-44.7.1-.1,0-.1-.1-.1-5.5,3.5-33.3,20-50.8,40.4h0c0-2.8.1-6.4.8-9.5,2.7-13.1,6.5-17.9,6.5-17.9,0,0-7.8,5.2-10.8,18.9-1.2,5.8-1.3,10.1-1.2,13.6-.4.5-.9,1-1.3,1.5-5.2,6.1-12.5,15.1-19.6,24.7-1-4.1-1.4-7.8-1.7-16.2-.5-12.3,4.9-23.8,4.9-23.8,0,0-8.4,7.8-9.6,25.7-.6,9.2.9,16.7,2,20.3-3.7,5.2-7.1,10.5-10.1,15.5-12.9-14.8-13.7-40.3,7-59.4,21.1-19.5,65.5-41.2,91.9-37.8-22.7,19-15.4,73.9-36.5,93.4Z"/>
    </g>
  </svg>
</a>`;
  }

  /* ─────────────────────────────────────────────────────────────
     REQUEST SUPPORT (nav-level CTA)
     Single-click form-modal trigger, not a NAV_SECTIONS dropdown — no
     .dd-panel/children, so it's built and placed separately from
     desktopSectionHTML()/mobileSectionHTML() rather than folded into
     that loop. <button>, not <a>, same no-status-bar-preview rationale
     as .dd-link. data-action="form-modal" already flows through the
     shared branch in wireLinkIntercept() — no click-handler changes
     needed. Desktop: last item in .lp-nav-links, right after Knowledge
     Center. Mobile: pinned at the very top of .lp-accordion so it
     isn't buried inside a collapsible section.
  ───────────────────────────────────────────────────────────── */
  /* &iframe=1 tells the LEAF support app to suppress its own
     header/nav — without it, the fetched form renders a second full
     LEAF header inside this modal's iframe, stacked on top of the
     launchpad's own header behind it. */
  var SUPPORT_FORM_URL =
    "https://leaf.va.gov/platform/support/report.php?a=LEAF_Start_Request&id=form_ba7de&title=Consultation+Request+from+Help+Library&iframe=1";

  function buildSupportButtonHTML() {
    return `
        <button class="lp-nav-support-btn" data-action="form-modal" data-modal-src="${SUPPORT_FORM_URL}" data-modal-title="Request Support">
          <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.support}</span>
          Request Support
        </button>`;
  }

  function buildSupportNavHTML() {
    return {
      desktop: `<li>${buildSupportButtonHTML()}</li>`,
      mobile: `<li class="lp-mobile-support-item">${buildSupportButtonHTML()}</li>`,
    };
  }

  function buildNavHTML() {
    var desktopItems = NAV_SECTIONS.map(desktopSectionHTML).join("");
    var mobileItems = NAV_SECTIONS.map(mobileSectionHTML).join("");
    var internal = buildInternalNavHTML();
    var support = buildSupportNavHTML();
    return `
<nav class="lp-nav" id="lpNav" aria-label="Launchpad navigation">
  <div class="lp-nav-in">

    <!-- Left: public nav sections -->
    <ul class="lp-nav-links" role="list">
      ${desktopItems}
      ${support.desktop}
    </ul>

    <!-- Right: internal group (margin-left:auto pushes it to the edge) -->
    ${internal.desktop}

    <!-- Mobile hamburger toggle -->
    <button class="lp-nav-toggle" id="lpNavToggle" type="button"
            aria-expanded="false" aria-controls="lpMobilePanel" aria-label="Open menu">
      <span class="lp-nav-toggle-icon" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>
    </button>

    <!-- Mobile panel -->
    <div class="lp-mobile-panel" id="lpMobilePanel" hidden>
      <ul class="lp-accordion" role="list">
        ${support.mobile}
        ${mobileItems}
        ${internal.mobile}
      </ul>
    </div>

  </div>
</nav>`;
  }

  /* ─────────────────────────────────────────────────────────────
     HEADER
     Branding, nav, and breadcrumb as one sticky unit. The
     breadcrumb row is always present in the DOM (hidden by
     default) so updateBreadcrumb() only ever toggles/fills it —
     it never has to re-create or relocate it.
  ───────────────────────────────────────────────────────────── */
  function buildHeaderHTML() {
    return `
<header class="lp-header" id="lpHeader">
  <div class="lp-header-bar">
    ${buildBrandHTML()}
    ${buildNavHTML()}
  </div>
  <nav class="lp-breadcrumb" id="lpBreadcrumb" aria-label="Breadcrumb" hidden></nav>
</header>`;
  }

  /* ─────────────────────────────────────────────────────────────
     SKIP NAVIGATION LINK
     Injected as the very first child of <body>. Visually hidden
     until focused. Targets #main-content (which we reassign
     depending on current view state in the router).
  ───────────────────────────────────────────────────────────── */
  function ensureSkipLink() {
    if (document.getElementById("lp-skip-nav")) return;
    var skip = document.createElement("a");
    skip.id = "lp-skip-nav";
    skip.className = "lp-skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to main content";
    document.body.insertBefore(skip, document.body.firstChild);
  }

  function ensureMainContentTarget() {
    if (document.getElementById("main-content")) return;
    var main = document.querySelector("main");
    if (main) {
      main.id = "main-content";
      return;
    }
    var header = document.getElementById("lpHeader");
    if (header && header.nextElementSibling) {
      header.nextElementSibling.id = "main-content";
    }
  }

  /* ─────────────────────────────────────────────────────────────
     SELF-MOUNT: STYLESHEET
  ───────────────────────────────────────────────────────────── */
  /* Hardcoded path — pinned to the header's own CSS filename so
     this JS always loads the right stylesheet. Preprod's filename
     (leaf_header_preprod.css) differs from the live header's
     (leaf_header.css) — pointing this at the wrong one 404s and
     leaves the header completely unstyled. */
  var LEAF_HEADER_CSS_HREF = "/launchpad/files/leaf_header_preprod.css";

  function ensureStylesheet() {
    if (
      document.querySelector(
        'link[href*="leaf_header_preprod.css"], link[href*="leaf_header.css"], link[href*="leaf-header.css"]',
      )
    )
      return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAF_HEADER_CSS_HREF;
    document.head.appendChild(link);
  }
  ensureStylesheet();

  /* ─────────────────────────────────────────────────────────────
     SELF-MOUNT: HOST ELEMENT
  ───────────────────────────────────────────────────────────── */
  function ensureHost() {
    var host = document.getElementById("lp-header-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "lp-header-host";
    /* Insert right after the skip link (not at body.firstChild) so the
       skip link — inserted moments earlier by ensureSkipLink(), which
       itself targets body.firstChild — stays the true first child and
       first Tab stop. Inserting at body.firstChild here would instead
       land the header (full of focusable nav buttons) ahead of the
       skip link, defeating its purpose. */
    var skip = document.getElementById("lp-skip-nav");
    document.body.insertBefore(host, skip ? skip.nextSibling : document.body.firstChild);
    return host;
  }

  /* ─────────────────────────────────────────────────────────────
     SELF-MOUNT: SWAP HOST
     The persistent container that receives fetched page content.
     Only injected on the launchpad page. Hidden by default.
  ───────────────────────────────────────────────────────────── */
  function ensureSwapHost() {
    /* Mark existing element with stable attribute if present */
    var existing = document.getElementById("lpSwapHost");
    if (existing) {
      existing.setAttribute("data-lp-swap-host", "");
      return;
    }
    var host = document.createElement("div");
    host.id = "lpSwapHost";
    host.setAttribute("data-lp-swap-host", ""); /* stable lookup anchor */
    host.setAttribute("hidden", "");
    host.setAttribute("tabindex", "-1");
    host.setAttribute("aria-label", "Page content");
    /* Insert after header, before everything else */
    var header = document.getElementById("lpHeader");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(host, header.nextSibling);
    } else {
      document.body.appendChild(host);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     SELF-MOUNT: LIVE REGION
     Announces view changes to screen readers without moving focus.
     aria-live="polite" waits for current speech to finish.
  ───────────────────────────────────────────────────────────── */
  function ensureLiveRegion() {
    if (document.getElementById("lp-live-region")) return;
    var region = document.createElement("div");
    region.id = "lp-live-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.className = "lp-sr-only";
    document.body.appendChild(region);
  }

  function announce(msg) {
    var region = document.getElementById("lp-live-region");
    if (!region) return;
    /* Clear then set to ensure re-announcement of same text */
    region.textContent = "";
    setTimeout(function () {
      region.textContent = msg;
    }, 50);
  }

  /* ─────────────────────────────────────────────────────────────
     INJECT
  ───────────────────────────────────────────────────────────── */
  function inject() {
    ensureSkipLink();
    var host = ensureHost();
    host.outerHTML = buildHeaderHTML();
    ensureMainContentTarget();

    /* Needed on every page now, not just the launchpad — static
       pages use it to auto-detect their own breadcrumb (see
       resolveCurrentRoute()), the launchpad uses it for hash routing. */
    buildRouteMap();

    if (isLaunchpad()) {
      ensureSwapHost();
      ensureLiveRegion();
      wireRouter();
    } else {
      var current = resolveCurrentRoute();
      if (current && current !== "home") {
        updateNavCurrent(current.section);
        updateBreadcrumb(current);
      } else {
        updateBreadcrumb(null);
      }
    }

    /* Wired on every page, not just the launchpad — wireLinkIntercept()
       itself branches on isLaunchpad() to either hash-route (launchpad)
       or navigate normally (everywhere else). Without this, nav dropdown
       links — deliberately <button data-href>, not <a href>, so the
       status bar never previews them — would have no click handler at
       all on non-launchpad pages. */
    wireLinkIntercept();

    wire();
    ensureJumpToTop();

    /* Available on every page, not just the launchpad — the nav's
       "Watch a Demo" item (About LEAF dropdown) can be clicked from
       anywhere. */
    ensureDemoModal();
    wireDemoModal();

    wireUsersOnlineBadge();

    /* Global announcement banner — async; only mounts above the nav
       once/if the sourced indicator resolves to real content. No-ops
       until ANNOUNCEMENT_* constants are filled in with real values. */
    initAnnouncementBanner();
  }

  /* ─────────────────────────────────────────────────────────────
     CHROME SUPPRESSION LIST
     Applied to the parsed DOMParser document before extraction.
     Covers both old Smarty template (DIV#header, DIV#footer) and
     new template (HEADER#header, FOOTER#footer.noprint).
  ───────────────────────────────────────────────────────────── */
  var CHROME_SELECTORS = [
    "#header",
    "#footer",
    ".noprint",
    "#lp-skip-nav",
    "#nav-skip-link",
    /* USWDS's own skip-link component class — LEAF pages follow USWDS
       conventions elsewhere (.usa-button, .usa-table, etc.), so a real
       platform page's native skip link (e.g. Leadership, fetch+spliced
       rather than iframed — see mountContent()) most likely uses this,
       not one of the two IDs above. Left un-stripped, it renders inside
       #lpSwapHost with none of its own site's CSS (that stylesheet was
       never fetched), which is what was overlapping the header. */
    ".usa-skipnav",
    "#LeafSession_dialog",
    "#lpInlinePanel",
    "#lpSwapHost",
    ".lp-header",
    "#lp-header-host",
    "#lp-live-region",
  ];

  /* ─────────────────────────────────────────────────────────────
     CONTENT EXTRACTION
     Priority order:
       1. [data-lp-content]  — explicit opt-in (add to pages over time)
       2. #content            — stable Smarty template contract
       3. #bodyarea           — one level deeper, safety net
       4. <main>              — generic semantic fallback
       5. body minus chrome   — last resort
  ───────────────────────────────────────────────────────────── */
  function suppressChrome(doc) {
    CHROME_SELECTORS.forEach(function (sel) {
      var els = doc.querySelectorAll(sel);
      els.forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    });
  }

  function extractContent(doc) {
    /* 1. Explicit opt-in */
    var el = doc.querySelector("[data-lp-content]");
    if (el) return el;

    /* 2. Smarty #content div — consistent across both template generations */
    el = doc.getElementById("content");
    if (el && el.innerHTML.trim().length > 0) return el;

    /* 3. #bodyarea — one level deeper */
    el = doc.getElementById("bodyarea");
    if (el && el.innerHTML.trim().length > 0) return el;

    /* 4. <main> — semantic fallback */
    el = doc.querySelector("main");
    if (el && el.innerHTML.trim().length > 0) return el;

    /* 5. Body minus chrome — last resort: return body itself
       (chrome already stripped by suppressChrome) */
    return doc.body;
  }

  /* ─────────────────────────────────────────────────────────────
     SAFE SCRIPT RE-EXECUTION
     Inline scripts: wrapped in new Function() to avoid top-level
     var declarations stomping outer window globals.
     External scripts: re-appended to <head> with a new node so
     the browser fetches and executes them.
     Guards: document.write calls are skipped (they'd overwrite
     the outer page). Scripts already loaded by src are tracked
     in a seen-set to avoid duplicate execution across navigations.
  ───────────────────────────────────────────────────────────── */
  var _seenExternalScripts = {};

  /* Guard: tracks dep URLs already injected so ensureLeafUIDeps
     never logs or re-injects on repeated mountContent calls. */
  var _loadedDepSrcs = new Set();

  /* Guard: URL currently being fetched — prevents stacked concurrent
     loadView calls for the same or a rapid-fire different route. */
  var _currentLoadUrl = null;

  /* Guard: suppresses the hashchange → router() path while deferred
     init functions are draining, preventing any hash side-effect
     inside those inits from re-triggering a full navigation. */
  var _routerSuppressed = false;

  /* Scripts that must never re-execute inside a fetched page context.
     Shell-level scripts (this header, plus any legacy nav/breadcrumb
     script a fetched page might still reference) manage the outer
     document — re-running them injects duplicate elements and undoes
     router state. */
  var SCRIPT_BLOCKLIST = [
    "leaf_header",
    "leaf-header",
    "leaf_nav",
    "leaf_breadcrumb",
    "leaf-nav",
    "leaf-breadcrumb",
  ];

  function isBlocklistedScript(src) {
    return SCRIPT_BLOCKLIST.some(function (term) {
      return src.indexOf(term) > -1;
    });
  }

  /* ─────────────────────────────────────────────────────────────
     DEPENDENCY LAZY-LOADER
     Some fetched pages (Help Library, Form Library) require jQuery
     UI and dialogController.js which aren't on the launchpad page.
     loadScriptSequential() injects them into <head> in order,
     waiting for each load event before proceeding.
     ensureLeafUIDeps() scans the fetched document's <script> tags,
     detects which deps are needed, and loads only what's missing.
  ───────────────────────────────────────────────────────────── */
  function loadScriptSequential(srcs) {
    /* Returns a promise that resolves after all srcs are loaded in order */
    return srcs.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (resolve, reject) {
          /* Already in DOM — skip */
          if (document.querySelector('script[src="' + src + '"]')) {
            resolve();
            return;
          }
          var s = document.createElement("script");
          s.src = src;
          s.async = false;
          s.onload = resolve;
          s.onerror = function () {
            console.warn("[LP] Failed to load dependency:", src);
            resolve(); /* resolve anyway so remaining scripts still run */
          };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve());
  }

  /* Known external dependencies that fetched-page inline scripts may
     assume are already loaded and executed. Each entry's `test` regex
     is matched against every external <script src> found in the fetched
     document. Add new deps here — do NOT rely on reExecuteScripts()'s
     generic script loop for anything an inline script calls synchronously;
     that loop appends external <script src> tags to <head> but does not
     await their load/execution before running the next script, so any
     inline script depending on one can race it. */
  var LEAF_UI_DEP_PATTERNS = [
    { name: "jquery-ui", test: /jquery-ui/i },
    { name: "dialogController", test: /dialogController/i },
    /* Matches both VAFacilityHelper.js and lp_find_site.html's actual
       ./files/visnFacilityHelper.js — "VAFacilityHelper" alone doesn't
       match the real filename. */
    { name: "FacilityHelper", test: /facilityhelper/i },
  ];

  /* Scans a document for known dependency <script src> tags and returns
     the matched, absolute URLs. Must be called BEFORE suppressChrome()
     strips #header/#footer/.noprint — those regions are exactly where
     LEAF's shared global helpers (e.g. VAFacilityHelper.js) tend to be
     included from, and once suppressChrome removes those nodes the
     script is gone for good, so this has to run first. */
  function collectLeafUIDepSrcs(doc) {
    var scriptSrcs = Array.prototype.map.call(
      doc.querySelectorAll("script[src]"),
      function (s) {
        return s.src;
      } /* already absolute after DOMParser */,
    );

    var found = [];
    LEAF_UI_DEP_PATTERNS.forEach(function (dep) {
      var src = scriptSrcs.find(function (s) {
        return dep.test.test(s);
      });
      if (src) found.push(src);
    });
    return found;
  }

  function ensureLeafUIDeps(depScriptSrcs) {
    var toLoad = (depScriptSrcs || []).filter(function (src) {
      return !_loadedDepSrcs.has(src);
    });

    if (!toLoad.length) return Promise.resolve();

    console.warn("[LP] Lazy-loading LEAF UI deps for fetched page:", toLoad);
    return loadScriptSequential(toLoad).then(function () {
      toLoad.forEach(function (src) {
        _loadedDepSrcs.add(src);
      });
    });
  }

  function reExecuteScripts(container) {
    /* Runs after ensureLeafUIDeps() resolves, so jQuery UI is
       guaranteed available when inline scripts that call
       $(...).dialog() run. */
    var scripts = Array.prototype.slice.call(
      container.querySelectorAll("script"),
    );

    scripts.forEach(function (oldScript) {
      if (
        oldScript.textContent &&
        oldScript.textContent.indexOf("document.write") > -1
      ) {
        console.warn("[LP] Skipped script containing document.write");
        return;
      }

      if (oldScript.src) {
        var src = oldScript.src;
        if (isBlocklistedScript(src)) return;
        if (_seenExternalScripts[src]) return;
        _seenExternalScripts[src] = true;

        var newScript = document.createElement("script");
        newScript.src = src;
        newScript.async = false;
        if (oldScript.type) newScript.type = oldScript.type;
        document.head.appendChild(newScript);
      } else if (oldScript.textContent && oldScript.textContent.trim()) {
        try {
          /* Pass a mock location reflecting the route URL so any
             script that reads location.search, location.href, or
             location.pathname gets the fetched page's URL rather
             than the launchpad's URL. This prevents "undefined"
             appearing in search fields that initialise from URL params.

             Also pass a mock document that overrides readyState to
             "loading" so fetched pages that gate their init on
             readyState (e.g. ideas_v2.js) take the DOMContentLoaded
             listener path rather than calling initPortal() immediately
             before the content is in the DOM.

             DOMContentLoaded listeners registered on mockDoc are
             captured in window.__lpDeferredInits and drained after
             mount — NOT dispatched as a real DOMContentLoaded event,
             which would retrigger the header's own init and cause an
             infinite re-mount loop. */
          window.__lpDeferredInits = window.__lpDeferredInits || [];

          var mockDoc = new Proxy(document, {
            get: function (target, prop, receiver) {
              if (prop === "readyState") return "loading";
              if (prop === "addEventListener") {
                return function (type, fn, opts) {
                  if (type === "DOMContentLoaded") {
                    /* Capture for deferred drain — never register on real document */
                    window.__lpDeferredInits.push(fn);
                  } else {
                    document.addEventListener(type, fn, opts);
                  }
                };
              }
              var value = target[prop];
              /* Native methods must stay bound to the real document —
                 returning them unbound through the Proxy's receiver
                 reintroduces the same "Illegal invocation" failure. */
              if (typeof value === "function") {
                return value.bind(target);
              }
              return value;
            },
          });

          /* mockLocation: intercepts navigation calls from re-executed inline
             scripts so that links/buttons using location.href = url,
             location.assign(url), or location.replace(url) inside fetched
             pages hash-route to known routes instead of navigating away.
             Unknown URLs (external links, non-LEAF pages) fall through to
             the real window.location so normal navigation still works.
             NOTE: scripts that use window.location.href (not the local
             location binding) bypass this mock and navigate normally — that
             is intentional; only inline scripts using the location parameter
             are intercepted. */
          function _lpNavigate(url) {
            if (!url) return;
            var key = hrefToHashKey(url);
            if (key && ROUTE_MAP[key]) {
              /* Known route → hash-route it (triggers router via hashchange) */
              var newHash = "#" + key;
              if (window.location.hash === newHash) {
                /* Same hash already set — fire router manually */
                router();
              } else {
                window.location.hash = newHash;
              }
            } else {
              /* Unknown route → let the browser navigate normally */
              window.location.href = url;
            }
          }

          var _mockLocationHref = window.__lpRouteHref || window.location.href;
          var mockLocation = {
            search: window.__lpRouteSearch || "",
            pathname: window.__lpRouteHref
              ? window.__lpRouteHref.split("?")[0]
              : window.location.pathname,
            hash: "",
            origin: window.location.origin,
            host: window.location.host,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            reload: function () {
              window.location.reload();
            },
            assign: function (url) {
              _lpNavigate(url);
            },
            replace: function (url) {
              _lpNavigate(url);
            },
            toString: function () {
              return _mockLocationHref;
            },
          };
          Object.defineProperty(mockLocation, "href", {
            get: function () {
              return _mockLocationHref;
            },
            set: function (url) {
              _lpNavigate(url);
            },
            enumerable: true,
            configurable: true,
          });
          /* Wrap the real window so that window.location.href = url
             and window.location.assign/replace() in re-executed scripts
             are also intercepted — not just the local `location` binding.
             All other window properties fall through to the real window. */
          var mockWindow = new Proxy(window, {
            get: function (target, prop) {
              if (prop === "location") return mockLocation;
              var val = target[prop];
              return typeof val === "function" ? val.bind(target) : val;
            },
            set: function (target, prop, value) {
              if (prop === "location") {
                _lpNavigate(String(value));
                return true;
              }
              target[prop] = value;
              return true;
            },
          });

          var fn = new Function(
            "document",
            "window",
            "location",
            oldScript.textContent,
          );
          fn(mockDoc, mockWindow, mockLocation);
        } catch (err) {
          console.warn("[LP] Inline script execution error:", err.message);
        }
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     SWAP HOST: LOADING / ERROR / CONTENT STATES
  ───────────────────────────────────────────────────────────── */
  /* Helper: find swap host by stable data attribute regardless of
     what id it currently holds (it temporarily holds "main-content") */
  function getSwapHost() {
    /* Primary: stable data attribute — survives any id reassignment */
    return (
      document.querySelector("[data-lp-swap-host]") ||
      document.getElementById("lpSwapHost")
    );
  }

  function showSwapLoading() {
    var host = getSwapHost();
    if (!host) return;
    host.innerHTML =
      '<div class="lp-swap-loading" aria-hidden="true">' +
      '<span class="lp-swap-spinner"></span>' +
      "</div>";
    host.removeAttribute("hidden");
  }

  /* ── Suggested links for the "missing route" error state ────────
     One item per top-level NAV_SECTIONS group (the first non-"#" href
     in each), so the list stays in sync with NAV_SECTIONS automatically
     rather than needing a second hand-maintained list. Rendered as
     .dd-link buttons with data-href so wireLinkIntercept() (already
     listens for .dd-link clicks) hash-routes them with no extra wiring. */
  function buildErrorSuggestedLinksHTML() {
    var items = NAV_SECTIONS.map(function (section) {
      return section.items.find(function (item) {
        return item.href && item.href !== "#" && !item.hidden;
      });
    }).filter(Boolean);

    return items
      .map(function (item) {
        return (
          '<button class="dd-link lp-error-suggest-link" data-href="' +
          item.href +
          '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #d9e8f6;border-radius:5px;font-size:13px;">' +
          '<span class="material-symbols-outlined lp-error-suggest-ico" aria-hidden="true">' +
          (ICON_SVG[item.icon] || "") +
          "</span>" +
          "<span>" +
          item.title +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  /* ── Error state ──────────────────────────────────────────────
     Two distinct causes get two distinct messages + recovery paths:
       "missing" — hash has no ROUTE_MAP entry (a true 404, e.g. an
                   old bookmark to a since-renamed hash key). No
                   retry makes sense here; offer a way out instead.
       "fetch"   — route exists but the request failed (network
                   error, non-2xx, empty content). Likely transient;
                   offer retry + open-in-new-tab.
     `url` is the route's href — used for the retry/new-tab actions
     on the "fetch" state; unused (may be null) for "missing". */
  function showSwapError(url, reason) {
    var host = getSwapHost();
    if (!host) return;

    /* showSwapLoading() normally clears the hidden attribute, but the
       "missing route" path never calls it — clear unconditionally
       here so this function is correct regardless of what ran before
       it. */
    host.removeAttribute("hidden");

    if (reason === "missing") {
      host.innerHTML =
        '<div class="lp-swap-error lp-swap-error--missing" role="alert" style="text-align:center;padding:2rem 1.5rem;">' +
        '<span class="material-symbols-outlined lp-swap-error-ico" aria-hidden="true" style="color:#6b7280;">' + ICON_SVG.wrong_location + '</span>' +
        '<p class="lp-swap-error-msg" style="font-weight:600;font-size:16px;margin:12px 0 4px;">This page doesn\'t exist</p>' +
        '<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">It may have moved or the link is outdated.</p>' +
        '<div style="display:flex;justify-content:center;margin-bottom:24px;">' +
        '<button class="lp-panel-link btn btn-primary" data-href="report.php?a=lp_home">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' + ICON_SVG.home + '</span> Back to Launchpad' +
        "</button>" +
        "</div>" +
        '<div style="border-top:1px solid #d9e8f6;padding-top:16px;text-align:left;max-width:420px;margin:0 auto;">' +
        '<p style="font-size:12px;color:#9ca3af;margin:0 0 8px;">Try one of these instead</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        buildErrorSuggestedLinksHTML() +
        "</div>" +
        "</div>" +
        "</div>";
      return;
    }

    /* "fetch" (default/fallback) */
    host.innerHTML =
      '<div class="lp-swap-error lp-swap-error--fetch" role="alert" style="text-align:center;padding:2rem 1.5rem;">' +
      '<span class="material-symbols-outlined lp-swap-error-ico" aria-hidden="true" style="color:#b45309;">' + ICON_SVG.cloud_off + '</span>' +
      '<p class="lp-swap-error-msg" style="font-weight:600;font-size:16px;margin:12px 0 4px;">This page is temporarily unavailable</p>' +
      '<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">We reached the site but couldn\'t load the content. This is usually temporary.</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button class="lp-panel-link btn btn-primary" data-href="' +
      url +
      '">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' + ICON_SVG.refresh + '</span> Try again' +
      "</button>" +
      '<a class="lp-swap-error-link btn btn-sec" href="' +
      url +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' + ICON_SVG.open_in_new + '</span>' +
      "Open in a new tab" +
      "</a>" +
      "</div>" +
      "</div>";
  }

  /* ─────────────────────────────────────────────────────────────
     ELEMENT CACHE
     Resolved once at router init. Using cached references means
     show/hide never relies on getElementById — so ID reassignment
     can never break visibility toggling. IDs never change after init.
  ───────────────────────────────────────────────────────────── */
  var _lpMain = null; /* launchpad home <main id="lp-main"> */
  var _swapHost = null; /* swap container [data-lp-swap-host] */

  function initElementCache() {
    /* ensureMainContentTarget() (called earlier in inject()) renames
       the home <main id="lp-main"> to id="main-content" for the skip
       link, so "lp-main" is already gone by the time this runs. Fall
       back to the bare tag selector — it's still the same element,
       just under its new id — so _lpMain never ends up null and
       showSwapView()/showLaunchpadHome() can actually hide/show it. */
    _lpMain = document.getElementById("lp-main") || document.querySelector("main");
    _swapHost =
      document.querySelector("[data-lp-swap-host]") ||
      document.getElementById("lpSwapHost");
  }

  /* ─────────────────────────────────────────────────────────────
     SHOW / HIDE
     Explicit inline display style beats any stylesheet rule,
     including LEAF's own overrides. IDs never change — the skip
     link always targets #lp-main (home) or #lpSwapHost (fetched).
  ───────────────────────────────────────────────────────────── */
  function showLaunchpadHome() {
    if (_lpMain) _lpMain.style.display = "";
    if (_swapHost) {
      _swapHost.style.display = "none";
      _swapHost.innerHTML = "";
    }

    /* Remove the route base tag so the launchpad's own relative
       paths aren't affected when returning to the home view */
    var routeBase = document.getElementById("lp-route-base");
    if (routeBase) routeBase.remove();
    window.__lpRouteHref = "";
    window.__lpRouteSearch = "";

    /* Skip link → home */
    var skip = document.getElementById("lp-skip-nav");
    if (skip) skip.href = "#lp-main";

    document.title = "LEAF Launchpad";
    updateBreadcrumb(null);
    announce("Returned to Launchpad home");
    updateNavCurrent(null);
  }

  function showSwapView() {
    if (_lpMain) _lpMain.style.display = "none";
    if (_swapHost) _swapHost.style.display = "";

    /* Skip link → fetched content */
    var skip = document.getElementById("lp-skip-nav");
    if (skip) skip.href = "#lpSwapHost";
  }

  /* ─────────────────────────────────────────────────────────────
     BREADCRUMB
     Trail: LEAF Launchpad → [Section] → [Page Title]
     buildTrailHTML() returns just the crumb spans/links —
     updateBreadcrumb() owns the persistent #lpBreadcrumb element
     itself (part of the header, built once by buildHeaderHTML),
     filling it in or hiding it as the active route changes.
  ───────────────────────────────────────────────────────────── */
  function buildTrailHTML(route) {
    var trail = [{ label: "Launchpad", href: HOME_HREF }];
    if (route.section) trail.push({ label: route.section, href: null });
    if (route.parent)
      trail.push({ label: route.parent.label, href: route.parent.href });
    trail.push({ label: route.title, href: null, current: true });

    return trail
      .map(function (crumb, i) {
        var isLast = i === trail.length - 1;
        var sep =
          i > 0 ? '<span class="lp-bc-sep" aria-hidden="true">/</span>' : "";
        var node =
          isLast || !crumb.href
            ? '<span class="lp-bc-current" aria-current="page">' +
              crumb.label +
              "</span>"
            : '<a href="' + crumb.href + '">' + crumb.label + "</a>";
        return sep + node;
      })
      .join("");
  }

  function updateBreadcrumb(route) {
    var host = document.getElementById("lpBreadcrumb");
    if (!host) return;
    if (!route) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    host.innerHTML = buildTrailHTML(route);
  }

  /* Tracks the ResizeObserver watching the currently-mounted iframe's
     content, so a fresh mountIframe() call can disconnect the previous
     one instead of leaking an observer on a detached document. */
  var _iframeResizeObserver = null;

  /* ─────────────────────────────────────────────────────────────
     MOUNT IFRAME
     For full separate LEAF apps (route.iframe === true). Skips
     fetch/DOMParser/chrome-suppression/script-splicing entirely —
     the embedded page loads and runs as its own real document, so
     the base-href and script-re-execution concerns mountContent()
     has to handle don't apply here.
  ───────────────────────────────────────────────────────────── */
  function mountIframe(route) {
    var host = _swapHost;
    if (!host) {
      console.error("[LP] mountIframe: swap host not found");
      return;
    }

    if (_iframeResizeObserver) {
      _iframeResizeObserver.disconnect();
      _iframeResizeObserver = null;
    }

    /* Remove any <base> left over from a previous non-iframe route —
       iframe content doesn't use it, and it must not leak into the
       launchpad's own relative paths. */
    var existingBase = document.getElementById("lp-route-base");
    if (existingBase) existingBase.remove();
    window.__lpRouteHref = route.href;
    window.__lpRouteSearch =
      route.href.indexOf("?") > -1 ? "?" + route.href.split("?")[1] : "";

    var frame = document.createElement("iframe");
    frame.className = "lp-swap-iframe";
    frame.src = route.href;
    frame.title = route.title || "Embedded page";
    /* min-height is just the pre-load placeholder — the load handler
       below grows the frame to its content's real height so the iframe
       itself never needs to scroll; the outer page scrolls instead.
       visibility:hidden (not display:none) keeps it participating in
       layout so the spinner below sits where the frame will end up,
       and so the frame's own load event still fires normally. */
    frame.style.cssText =
      "width:100%;min-height:75vh;border:0;display:block;overflow:hidden;visibility:hidden;";

    /* Embedded pages (any iframe: true route) are
       real, separately-rendered LEAF pages — their native #header/#footer
       chrome is server-rendered directly into the HTML, so it paints
       before that page's own client-side script has run to hide it.
       leaf_header_preprod.css's hide rule can't reach across the iframe boundary
       to stop that. Keeping the frame hidden until "load" (and showing
       our own spinner in its place) hides that flash from the user
       instead of trying to prevent it inside a document we don't own. */
    var spinner = document.createElement("div");
    spinner.className = "lp-swap-loading lp-iframe-loading";
    spinner.setAttribute("aria-hidden", "true");
    spinner.innerHTML = '<span class="lp-swap-spinner"></span>';

    frame.addEventListener("load", function () {
      frame.style.visibility = "visible";
      if (spinner.parentNode) spinner.remove();

      var doc;
      try {
        doc = frame.contentDocument;
      } catch (e) {
        return;
      }
      if (!doc || !doc.documentElement) return;

      var fit = function () {
        var h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0,
        );
        if (h > 0) frame.style.height = h + "px";
      };
      fit();

      /* Re-fit if the embedded app's own content changes height after
         load (async data, expanding sections, etc). */
      if (window.ResizeObserver) {
        _iframeResizeObserver = new ResizeObserver(fit);
        _iframeResizeObserver.observe(doc.documentElement);
      }
    });

    host.innerHTML = "";
    host.appendChild(spinner);
    host.appendChild(frame);

    document.title = route.title
      ? route.title + " – LEAF Launchpad"
      : document.title;
    announce((route.title || "Page") + " loaded");
    host.focus();
  }

  /* ─────────────────────────────────────────────────────────────
     MOUNT CONTENT
  ───────────────────────────────────────────────────────────── */
  function mountContent(el, sourceDoc, route, depScriptSrcs) {
    var host = _swapHost;
    if (!host) {
      console.error("[LP] mountContent: swap host not found");
      return;
    }

    /* ── Base URL injection ───────────────────────────────────────
       Fetched pages (Ideas, Help Library, etc.) make relative API
       calls like ./api/form/query. When their scripts re-execute
       inside the launchpad document, those relative URLs would
       resolve against the launchpad's own URL instead of the fetched
       page's origin — causing 404s and empty data — so a <base href>
       pointing to the fetched page's directory is injected into
       <head> BEFORE reExecuteScripts() runs, so all relative
       fetch/XHR calls inside injected scripts resolve correctly. A
       <base> inside a <div> is invalid and ignored by browsers — it
       must be in <head>.

       We remove the previous route's <base> first, then add the new
       one. On return to launchpad home the base is removed entirely
       so the launchpad's own relative paths aren't affected.

       Derived from route.href:
         /platform/projects/report.php?a=ideas
         → base href: https://leaf.va.gov/platform/projects/
    ───────────────────────────────────────────────────────────── */
    var existingBase = document.getElementById("lp-route-base");
    if (existingBase) existingBase.remove();

    if (route && route.href) {
      var routeHref = route.href;
      var dir;
      if (/^https?:\/\//i.test(routeHref)) {
        /* Already absolute — strip filename+query to get directory.
           e.g. https://leaf.va.gov/platform/help_library/report.php?a=x
                → https://leaf.va.gov/platform/help_library/           */
        dir = routeHref.replace(/[^/]*(\?.*)?$/, "") || "/";
      } else {
        /* Relative path — prepend origin.
           e.g. /platform/projects/report.php?a=ideas
                → https://leaf.va.gov/platform/projects/               */
        var relDir = routeHref.replace(/[^/]*(\?.*)?$/, "") || "/";
        dir = window.location.origin + relDir;
      }
      var newBase = document.createElement("base");
      newBase.id = "lp-route-base";
      newBase.href = dir;
      document.head.insertBefore(newBase, document.head.firstChild);
    }

    /* Expose the route's original URL on window so fetched page scripts
       that read window.location.search or URL params get the right values
       instead of the launchpad's own URL params (which would be empty or
       wrong, causing "undefined" to appear in search fields). */
    window.__lpRouteHref = route ? route.href : "";
    window.__lpRouteSearch =
      route && route.href.indexOf("?") > -1
        ? "?" + route.href.split("?")[1]
        : "";

    /* Content wrapper */
    var wrapper = document.createElement("div");
    wrapper.className = "lp-swap-content";
    while (el.firstChild) {
      wrapper.appendChild(el.firstChild);
    }

    host.innerHTML = "";
    host.appendChild(wrapper);

    /* Lazy-load any LEAF UI dependencies the fetched page needs
       (e.g. jquery-ui, dialogController, VAFacilityHelper) before
       re-executing its inline scripts. depScriptSrcs was scanned in
       loadView() BEFORE chrome suppression, so deps that live inside
       #header/#footer/.noprint are still caught. reExecuteScripts
       runs only after all deps load. */
    ensureLeafUIDeps(depScriptSrcs).then(function () {
      reExecuteScripts(wrapper);

      /* After scripts run, call any deferred page init functions.
         Fetched pages that gate on readyState (e.g. ideas_v2.js) have
         their inline scripts executed with mockDoc.readyState="loading"
         so they register their init as a DOMContentLoaded listener on
         the real document instead of calling it immediately.

         We do NOT dispatch a synthetic DOMContentLoaded — that would
         retrigger the header's own DOMContentLoaded listener and cause
         an infinite re-mount loop.

         Instead, we maintain a registry: each fetched page's inline
         script can push to window.__lpDeferredInits, and we drain
         that queue here after mount. ideas_v2.js and similar pages
         register via document.addEventListener('DOMContentLoaded', fn)
         which we intercept via the mockDoc proxy. */
      setTimeout(function () {
        if (window.__lpDeferredInits && window.__lpDeferredInits.length) {
          _routerSuppressed = true;
          var inits = window.__lpDeferredInits.splice(0);
          inits.forEach(function (fn) {
            try {
              fn();
            } catch (e) {
              console.warn("[LP] Deferred init error:", e.message);
            }
          });
          /* Re-enable router after any sync hash side-effects settle */
          setTimeout(function () {
            _routerSuppressed = false;
          }, 0);
        }
      }, 0);
    });

    /* Update document title */
    var fetchedTitle = sourceDoc.title;
    if (fetchedTitle) document.title = fetchedTitle;

    /* Announce view change to screen readers */
    announce(
      (route && route.title ? route.title : fetchedTitle || "Page") + " loaded",
    );

    /* Move focus to swap host */
    host.focus();
  }

  /* ─────────────────────────────────────────────────────────────
     NAV CURRENT STATE
     Marks the active section's trigger with aria-current.
  ───────────────────────────────────────────────────────────── */
  function updateNavCurrent(sectionLabel) {
    document.querySelectorAll(".dd-trigger").forEach(function (btn) {
      btn.removeAttribute("aria-current");
    });
    if (!sectionLabel) return;
    document.querySelectorAll(".dd-trigger").forEach(function (btn) {
      if (
        btn.textContent
          .trim()
          .toLowerCase()
          .indexOf(sectionLabel.trim().toLowerCase()) === 0
      ) {
        btn.setAttribute("aria-current", "true");
      }
    });
    window.LEAF_NAV_CURRENT = sectionLabel;
  }

  /* ─────────────────────────────────────────────────────────────
     FETCH + INJECT
     Core router action. Fetches url, parses, suppresses chrome,
     extracts #content, mounts into swap host.
  ───────────────────────────────────────────────────────────── */
  function loadView(hash, route) {
    if (!route) {
      console.warn("[LP Router] No route found for hash:", hash);
      showSwapView();
      updateBreadcrumb(null);
      showSwapError(null, "missing");
      announce("This page doesn't exist.");
      return;
    }

    var url = route.href;

    /* Prevent stacked fetches: if this URL is already in-flight, bail. */
    if (_currentLoadUrl === url) return;
    _currentLoadUrl = url;

    showSwapView();
    updateNavCurrent(route.section);
    updateBreadcrumb(route);

    /* A full separate LEAF app (iframe: true route) can't survive being
       fetched+spliced into this document — wrong document, wrong
       scripts, wrong DOM. Mount them in an iframe instead: same
       hash-routed shell (header stays visible, back-to-launchpad
       still works), but the embedded page runs in its own real
       document. */
    if (route.iframe) {
      mountIframe(route);
      _currentLoadUrl = null;
      var iframeHost = getSwapHost();
      if (iframeHost) iframeHost.scrollTop = 0;
      window.scrollTo(0, 0);
      return;
    }

    showSwapLoading();

    fetch(url, {
      credentials: "include",
      headers: {
        /* Tell LEAF this is a normal browser navigation, not an AJAX
           call. Without Accept: text/html some LEAF pages detect the
           fetch and serve a stripped / read-only response. */
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "HTTP " + response.status + " " + response.statusText,
          );
        }
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");

        /* Scan for known external UI/helper dependencies BEFORE chrome
           suppression runs. Some LEAF pages (e.g. lp_find_site) load
           helpers like VAFacilityHelper.js from inside the header
           include — suppressChrome() deletes #header/#footer/.noprint
           wholesale, so scanning after that would miss the dependency
           entirely and leave content scripts throwing
           "X is not defined". */
        var depScriptSrcs = collectLeafUIDepSrcs(doc);

        /* Suppress chrome elements in the parsed document */
        suppressChrome(doc);

        /* Extract content zone */
        var contentEl = extractContent(doc);

        if (!contentEl || contentEl.innerHTML.trim().length === 0) {
          throw new Error("Content extraction returned empty result");
        }

        /* Mount into swap host */
        mountContent(contentEl, doc, route, depScriptSrcs);
        _currentLoadUrl = null;

        /* Scroll swap host to top */
        var host = getSwapHost();
        if (host) host.scrollTop = 0;
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        _currentLoadUrl = null;
        console.error("[LP Router] Fetch failed for", url, ":", err.message);
        showSwapError(url, "fetch");
        announce(
          "This page is temporarily unavailable. Try again or open it in a new tab.",
        );
      });
  }

  /* ─────────────────────────────────────────────────────────────
     ROUTER
     Reads window.location.hash and dispatches to the right view.
     Called on init and on every hashchange event.
  ───────────────────────────────────────────────────────────── */
  function router() {
    /* Bail if suppressed during deferred-init drain to prevent
       hash side-effects inside init functions re-triggering navigation. */
    if (_routerSuppressed) return;

    var raw = window.location.hash; /* e.g. "#lp_find_site" or "" */
    var key = raw.replace(/^#/, "").toLowerCase();

    if (!key || key === "home" || key === "lp_home") {
      showLaunchpadHome();
      return;
    }

    var route = ROUTE_MAP[key];
    loadView(key, route);
  }

  /* ─────────────────────────────────────────────────────────────
     LINK INTERCEPT
     Left-clicking a .dd-link or .lp-panel-link pushes a hash instead
     of navigating. Modifier-key and middle-clicks fall through to
     the browser.
  ───────────────────────────────────────────────────────────── */
  function wireLinkIntercept() {
    document.addEventListener("click", function (e) {
      /* ── Plain <a href> links inside fetched page content ───────────
         Nav buttons (.dd-link etc.) use data-href and are caught below.
         Links inside loaded pages are regular <a> tags — they bypass
         the nav-button check entirely and trigger full page navigation.
         Intercept them here: if the href maps to a known ROUTE_MAP entry,
         push the hash. Unknown hrefs (external, in-page anchors, API
         paths) fall through and the browser handles them normally. */
      var contentLink = e.target.closest("[data-lp-swap-host] a[href]");
      if (contentLink && !contentLink.hasAttribute("data-nav-external")) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
          /* modifier-key clicks open a real tab — don't intercept */
        } else {
          var contentHref = contentLink.getAttribute("href");
          if (contentHref && contentHref !== "#") {
            /* ── Pure in-page anchor (e.g. lp_brand_guide's scrollspy
               nav, or any page's own #lp-main skip link) ──
               mountContent() injects a <base href> pointing at the
               route's directory so relative API calls in a fetched
               page's scripts resolve correctly (see mountContent()) —
               untouched here, still needed for that. But the same
               <base> also gets applied to native anchor resolution,
               so an unhandled href="#section-id" click no longer
               resolves against the current document; the browser
               navigates to {base}/#section-id instead — a real,
               wrong page. Checked before the ROUTE_MAP lookup below
               so a genuine same-document element always wins over the
               (very unlikely) case of a section id colliding with a
               route key. */
            if (contentHref.charAt(0) === "#") {
              var anchorId = contentHref.slice(1);
              var anchorTarget = anchorId
                ? document.getElementById(anchorId)
                : null;
              if (anchorTarget) {
                e.preventDefault();
                try {
                  anchorTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                } catch (err) {}
                /* history.replaceState, not location.hash — location.hash
                   fires hashchange, which router() listens for and would
                   try to treat the section id as a route key, fail to
                   find it in ROUTE_MAP, and replace the currently-loaded
                   page with the "page doesn't exist" error state.
                   replaceState never fires hashchange, so router() never
                   sees this. Trade-off: reloading the page while a
                   section anchor is the active hash won't restore the
                   loaded route — a limitation most hash-routed SPAs with
                   in-page anchors accept; reloading the bare route URL
                   still always works correctly. */
                try {
                  history.replaceState(
                    null,
                    "",
                    window.location.pathname +
                      window.location.search +
                      "#" +
                      anchorId,
                  );
                } catch (err) {}
                /* Move focus to the target, matching standard in-page-
                   anchor accessibility practice — this is fixing a
                   skip-link/scrollspy pattern, so focus needs to land
                   here for keyboard/AT users, not just scroll past it.
                   preventScroll avoids fighting the smooth scroll above
                   with the browser's own default instant-jump-on-focus. */
                if (!anchorTarget.hasAttribute("tabindex")) {
                  anchorTarget.setAttribute("tabindex", "-1");
                }
                anchorTarget.focus({ preventScroll: true });
                return;
              }
            }
            var contentKey = hrefToHashKey(contentHref);
            if (contentKey && ROUTE_MAP[contentKey]) {
              e.preventDefault();
              var contentHash = "#" + contentKey;
              if (window.location.hash === contentHash) {
                router();
              } else {
                window.location.hash = contentHash;
              }
              return;
            }
            /* Not a known route — let browser navigate normally */
          }
        }
      }

      /* Match nav dropdown links, internal buttons, footer quick-resource
         links, breadcrumb links, and any [data-action] trigger — the
         last covers modal triggers wherever they live, nav-generated
         (Request Support, Watch a Demo) or page-specific markup (e.g. a
         footer's "Nominate a Spotlight" link), so any page can opt into
         the demo/form modal system with plain data attributes and no JS
         of its own.
         .dd-link elements are now <button data-href> — no href attribute —
         so the browser status bar never previews the destination URL on hover.
         .lp-internal-btn elements (Leadership) also use data-href.
         .lp-breadcrumb a and .lp-brand elements (the "Launchpad" crumb and
         the header logo) are real <a href> — the data-href fallback below
         reads their href attribute directly, same as any other real anchor
         caught here. .lp-brand was missing from this list entirely, so its
         click fell through to the browser: since HOME_HREF carries no
         fragment, clicking it while a route hash is already set (e.g.
         "#lp_impact") isn't the same-document "fragment-only" navigation
         it looks like — browsers treat the missing fragment as a real
         navigation and reload the page instead of just clearing the hash,
         which is slow at best and, depending on how the page got here (a
         fetch+spliced or iframe-mounted route), can drop the user out of
         the SPA context entirely instead of landing back on the launchpad.
         Adding it here routes it through the same hash-push path
         .lp-breadcrumb a already used, avoiding that inconsistent native
         behavior instead of just hoping the browser does the right thing.
         [data-nav-external] marks real <a target="_blank"> tags (e.g.
         Coaches) that should navigate away natively — left alone. */
      var link = e.target.closest(
        ".dd-link, .lp-panel-link, .lp-internal-btn, .lp-breadcrumb a, .lp-brand, [data-action]",
      );
      if (!link) return;

      /* External-flagged <a> links navigate away normally, respecting
         their own target="_blank" instead of being hash-routed */
      if (link.hasAttribute("data-nav-external")) return;

      /* Modifier-key / middle-click → real new tab, no intercept */
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
        return;
      }

      /* "Watch a Demo" opens the cinematic video-only modal instead of
         navigating. Its href is deliberately "#" (no route to push), so
         this must run before the href==="#" early-return just below. */
      if (link.dataset.action === "demo-modal") {
        e.preventDefault();
        closeAllDropdowns(null);
        openDemoModal(link);
        return;
      }

      /* Generic form modal (Request Support, Nominate a Spotlight, and
         any future iframe-form trigger) — src/title come from data
         attributes on the trigger element itself, so no per-form JS is
         needed anywhere else. */
      if (link.dataset.action === "form-modal") {
        e.preventDefault();
        closeAllDropdowns(null);
        openFormModal(
          link.dataset.modalSrc,
          link.dataset.modalTitle || "",
          link,
        );
        return;
      }

      /* Read href from data-href (buttons) or href attribute (plain <a> fallback) */
      var href = link.getAttribute("data-href") || link.getAttribute("href");
      if (!href || href === "#") return;

      e.preventDefault();
      closeAllDropdowns(null);

      /* data-nav-fullpage: this destination is a real, standalone page
         (e.g. Admin) that should never be folded into the SPA — unlike
         Team/Leadership, which are meant to fetch+splice into the
         launchpad shell so the URL bar shows "#team"/"#leadership".
         Skip the hash-router entirely, even while on the launchpad, so
         the browser always lands on the destination's own real URL
         instead of "{launchpad url}#admin". */
      if (link.hasAttribute("data-nav-fullpage")) {
        window.location.href = href;
        return;
      }

      /* Off the launchpad there's no router wired (no hashchange
         listener, no swap host) — pushing a hash here would just leave
         a dead #fragment in the URL bar and do nothing. Navigate for
         real instead, same as clicking any other link. */
      if (!isLaunchpad()) {
        window.location.href = href;
        return;
      }

      /* Derive hash key from href */
      var key = hrefToHashKey(href);
      if (!key) {
        /* Unrecognised href — fall back to direct navigation */
        window.location.href = href;
        return;
      }

      /* Push hash → triggers hashchange → router() */
      var newHash = "#" + key;
      if (window.location.hash === newHash) {
        /* Same hash clicked again — re-run router manually
           (hashchange won't fire if hash hasn't changed) */
        router();
      } else {
        window.location.hash = newHash;
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     WIRE ROUTER
     Called only on the launchpad page.
  ───────────────────────────────────────────────────────────── */
  function wireRouter() {
    /* Cache element references once — used by show/hide throughout */
    initElementCache();

    /* hashchange drives back/forward navigation */
    window.addEventListener("hashchange", function () {
      router();
    });

    /* Run router on init to handle deep-linked URLs */
    router();
  }

  /* ─────────────────────────────────────────────────────────────
     MODAL COORDINATION
     Demo modal and form modal are independent singletons that don't
     know about each other, but share the same fixed inset:0
     z-index:1000 overlay — opening one without closing the other
     would stack both visibly. Both open*Modal() functions call this
     first. Add any future modal's close function here too. */
  function closeAnyOpenModal() {
    closeDemoModal();
    closeFormModal();
  }

  /* ─────────────────────────────────────────────────────────────
     DEMO MODAL
     Injected once by the header so the "Watch a Demo" item in the
     About LEAF dropdown (desktop + mobile) can open it from any page.
     The iframe's data-src is only copied into src on open (and
     cleared on close) so the embed doesn't load/keep playing in the
     background.
  ───────────────────────────────────────────────────────────── */
  var DEMO_VIDEO_SRC =
    "https://dvagov.sharepoint.com/sites/vhaleaf/_layouts/15/embed.aspx?UniqueId=4326d1e5-57b3-4138-92e5-f16bdce8fdb2&embed=%7B%22ust%22%3Afalse%2C%22hv%22%3A%22CopyEmbedCode%22%7D&referrer=StreamWebApp&referrerScenario=EmbedDialog.Create";

  var demoModalTrigger = null;

  function ensureDemoModal() {
    if (document.getElementById("lpDemoModal")) return;
    var modal = document.createElement("div");
    modal.id = "lpDemoModal";
    modal.className = "lp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "lpDemoTitle");
    modal.setAttribute("hidden", "");
    modal.innerHTML =
      '<div class="modal-box">' +
      '<p id="lpDemoTitle" class="lp-sr-only">LEAF Platform Demo Video</p>' +
      '<button class="modal-close" id="lpDemoClose" aria-label="Close demo video">&times;</button>' +
      '<div class="modal-vid">' +
      '<iframe id="lpDemoFrame" src="" data-src="' +
      DEMO_VIDEO_SRC +
      '" title="LEAF Platform Demo" allowfullscreen frameborder="0"></iframe>' +
      "</div>" +
      "</div>";
    document.body.appendChild(modal);
  }

  function openDemoModal(trigger) {
    var modal = document.getElementById("lpDemoModal");
    var frame = document.getElementById("lpDemoFrame");
    var closeBtn = document.getElementById("lpDemoClose");
    if (!modal || !frame || !closeBtn) return;
    closeAnyOpenModal();
    demoModalTrigger = trigger || document.activeElement;
    frame.src = frame.getAttribute("data-src");
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeDemoModal() {
    var modal = document.getElementById("lpDemoModal");
    var frame = document.getElementById("lpDemoFrame");
    if (!modal || !frame || modal.hasAttribute("hidden")) return;
    frame.src = "";
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (demoModalTrigger) {
      demoModalTrigger.focus();
      demoModalTrigger = null;
    }
  }

  function wireDemoModal() {
    var modal = document.getElementById("lpDemoModal");
    var closeBtn = document.getElementById("lpDemoClose");
    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", closeDemoModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeDemoModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
        closeDemoModal();
      }
    });
    /* Simple focus trap: while open, Tab always returns to the close
       button — the only focusable element in the modal. */
    modal.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !modal.hasAttribute("hidden")) {
        e.preventDefault();
        closeBtn.focus();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FORM MODAL (generic, reusable)
     Same open/close/focus-trap mechanics as the demo modal above, but
     with a visible header bar + title instead of the demo modal's
     cinematic video-only style, and re-populated per use (src/title)
     instead of one hardcoded video — Request Support (nav button, this
     file) and Nominate a Spotlight (footer link, this file) both open
     the same modal element with different content. One shared
     instance, lazily built on first use.
  ───────────────────────────────────────────────────────────── */
  var formModalTrigger = null;

  function ensureFormModal() {
    if (document.getElementById("lpFormModal")) return;
    var modal = document.createElement("div");
    modal.id = "lpFormModal";
    modal.className = "lp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "lpFormModalTitle");
    modal.setAttribute("hidden", "");
    modal.innerHTML =
      '<div class="modal-box modal-box--form">' +
      '<div class="modal-hd">' +
      '<p class="modal-hd-title" id="lpFormModalTitle"></p>' +
      '<button class="modal-close modal-close--inline" id="lpFormModalClose" aria-label="Close">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.close +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="modal-frame-wrap">' +
      '<iframe id="lpFormModalFrame" src="" data-src="" title=""></iframe>' +
      "</div>" +
      "</div>";
    document.body.appendChild(modal);

    /* Wired once, at build time, rather than per-open like the rest of
       openFormModal() — the modal element only ever gets created once. */
    var closeBtn = document.getElementById("lpFormModalClose");
    closeBtn.addEventListener("click", closeFormModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeFormModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
        closeFormModal();
      }
    });
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || modal.hasAttribute("hidden")) return;
      var focusable = getFocusableElements(modal);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function openFormModal(src, title, trigger) {
    if (!src) {
      console.warn("[LP] openFormModal called with no src");
      return;
    }
    ensureFormModal();
    var modal = document.getElementById("lpFormModal");
    var frame = document.getElementById("lpFormModalFrame");
    var titleEl = document.getElementById("lpFormModalTitle");
    if (!modal || !frame || !titleEl) return;
    closeAnyOpenModal();
    formModalTrigger = trigger || document.activeElement;
    titleEl.textContent = title;
    frame.title = title || "Form";
    frame.setAttribute("data-src", src);
    frame.src = src;
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    var closeBtn = document.getElementById("lpFormModalClose");
    if (closeBtn) closeBtn.focus();
  }

  function closeFormModal() {
    var modal = document.getElementById("lpFormModal");
    var frame = document.getElementById("lpFormModalFrame");
    if (!modal || !frame || modal.hasAttribute("hidden")) return;
    frame.src = "";
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (formModalTrigger) {
      formModalTrigger.focus();
      formModalTrigger = null;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     USERS ONLINE BADGE
     Live count via Server-Sent Events (online-users/getonlineusers.php,
     which pushes the count as plain-text messages). Plain JS, no jQuery
     — matches every other feature in this file.
  ───────────────────────────────────────────────────────────── */
  var USERS_ONLINE_SSE_URL = "/online-users/getonlineusers.php";

  function wireUsersOnlineBadge() {
    var badges = document.querySelectorAll(".lp-internal-online");
    if (!badges.length) return;

    if (typeof EventSource === "undefined") {
      /* No SSE support — drop the badge entirely rather than leaving a
         count that will never update. */
      badges.forEach(function (el) {
        el.remove();
      });
      return;
    }

    var source = new EventSource(USERS_ONLINE_SSE_URL);
    source.onmessage = function (event) {
      document.querySelectorAll(".lp-internal-online-count").forEach(function (el) {
        el.textContent = event.data;
      });
    };
    /* No onerror handling needed — EventSource auto-reconnects per
       spec, and the last known count staying visible in the meantime
       is the right behavior (better than blanking to 0 or an error
       state on a transient network blip). */
  }

  /* ─────────────────────────────────────────────────────────────
     ANNOUNCEMENT BANNER
     Global, site-wide notice sourced from a LEAF indicator record
     (see the ANNOUNCEMENT_* constants near the top of this file).
     Only ever inserted into the DOM when the record resolves to real,
     non-empty content — never rendered empty or hidden-but-present,
     so a page with no active announcement pays zero layout cost.

     Dismissal is session-only: the close button just removes the DOM
     node (removeAnnouncementBanner) — nothing is written to a cookie
     or storage key, so the banner returns on the next full page load.
     This project's environment restricts browser storage APIs, so no
     persistence layer is wired up here — flag if a cross-reload "stay
     dismissed" behavior turns out to be wanted; it would need a
     mechanism the environment can actually use (e.g. a server-side
     per-user flag), not localStorage/cookies.
  ───────────────────────────────────────────────────────────── */
  var DOMPURIFY_SRC =
    "https://leaf.va.gov/app/libs/js/dompurify/dompurify.min.js";

  /* Reuses the exact script reference lp_form_library.html already
     loads DOMPurify from — a confirmed in-domain dependency — rather
     than adding a second source for the same library. If some other
     page already has this exact <script src> in the document (e.g.
     lp_form_library.html itself), waits on that tag's load instead of
     injecting a duplicate. */
  function ensureDompurify() {
    if (window.DOMPurify) return Promise.resolve();
    var existing = document.querySelector('script[src="' + DOMPURIFY_SRC + '"]');
    if (existing) {
      return new Promise(function (resolve) {
        if (window.DOMPurify) {
          resolve();
          return;
        }
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", function () {
          console.warn("[LP] DOMPurify failed to load — announcement banner will not render");
          resolve();
        });
      });
    }
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = DOMPURIFY_SRC;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        console.warn("[LP] DOMPurify failed to load — announcement banner will not render");
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  function buildAnnouncementURL() {
    return (
      ANNOUNCEMENT_ROOT_URL +
      "api/form/" +
      encodeURIComponent(ANNOUNCEMENT_RECORD_ID) +
      "/rawIndicator/" +
      encodeURIComponent(ANNOUNCEMENT_INDICATOR_ID) +
      "/" +
      encodeURIComponent(ANNOUNCEMENT_SERIES)
    );
  }

  /* Tracks the ResizeObserver watching the banner so the header's
     top offset (--lp-announcement-h, see leaf_header_preprod.css .lp-header)
     stays in sync if rich-text content reflows (window resize,
     multi-line wrapping, etc). */
  var _announcementResizeObserver = null;

  function setAnnouncementHeightVar(px) {
    document.documentElement.style.setProperty("--lp-announcement-h", px + "px");
  }

  function removeAnnouncementBanner() {
    var el = document.getElementById("lpAnnouncement");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (_announcementResizeObserver) {
      _announcementResizeObserver.disconnect();
      _announcementResizeObserver = null;
    }
    setAnnouncementHeightVar(0);
  }

  /* sanitizedHTML must already be DOMPurify-sanitized — this function
     just mounts it, it does not sanitize. */
  function renderAnnouncementBanner(sanitizedHTML) {
    if (document.getElementById("lpAnnouncement")) return;

    var banner = document.createElement("div");
    banner.id = "lpAnnouncement";
    banner.className = "lp-announcement";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Site announcement");
    banner.innerHTML =
      '<div class="lp-announcement-in">' +
      '<div class="lp-announcement-body">' +
      sanitizedHTML +
      "</div>" +
      '<button type="button" class="lp-announcement-close" aria-label="Dismiss announcement">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.close +
      "</span>" +
      "</button>" +
      "</div>";

    /* Inserted immediately before the header element itself (not at
       body.firstChild) so it lands directly above the nav regardless
       of exactly where the header ended up mounting — see ensureHost(). */
    var header = document.getElementById("lpHeader");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }

    var rect = banner.getBoundingClientRect();
    setAnnouncementHeightVar(rect.height);
    if (window.ResizeObserver) {
      _announcementResizeObserver = new ResizeObserver(function () {
        setAnnouncementHeightVar(banner.getBoundingClientRect().height);
      });
      _announcementResizeObserver.observe(banner);
    }

    var closeBtn = banner.querySelector(".lp-announcement-close");
    closeBtn.addEventListener("click", removeAnnouncementBanner);
  }

  function initAnnouncementBanner() {
    /* Placeholders not yet filled in — skip the fetch entirely rather
       than requesting a URL built from literal "REPLACE_ME_..." text. */
    if (
      ANNOUNCEMENT_ROOT_URL.indexOf("REPLACE_ME") === 0 ||
      ANNOUNCEMENT_RECORD_ID.indexOf("REPLACE_ME") === 0 ||
      ANNOUNCEMENT_INDICATOR_ID.indexOf("REPLACE_ME") === 0
    ) {
      return;
    }

    fetch(buildAnnouncementURL())
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var rec = data && data[ANNOUNCEMENT_INDICATOR_ID];
        if (!rec) return null;
        var displayed =
          typeof rec.displayedValue === "string" ? rec.displayedValue.trim() : "";
        var raw = displayed || rec.value;
        return raw && String(raw).trim() ? String(raw) : null;
      })
      .then(function (html) {
        if (!html) return;
        return ensureDompurify().then(function () {
          if (!window.DOMPurify) return; /* load failed — already warned */
          var clean = window.DOMPurify.sanitize(html);
          var textOnly = clean.replace(/<[^>]*>/g, "").trim();
          if (!textOnly) return; /* e.g. "<p></p>" — nothing to show */
          renderAnnouncementBanner(clean);
        });
      })
      .catch(function (err) {
        console.warn("[LP] Announcement banner not shown:", err.message);
      });
  }

  /* ─────────────────────────────────────────────────────────────
     FOCUS TRAP HELPERS
  ───────────────────────────────────────────────────────────── */
  function getFocusableElements(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  /* ─────────────────────────────────────────────────────────────
     JUMP TO TOP
     Injected once by the header so every page that loads
     leaf_header.js gets the button automatically — no per-page
     markup needed.

     Scroll container: window is ALWAYS used. #lpSwapHost has no
     overflow set in launchpad.css, so fetched content scrolls the
     window — not the element itself. Calling swapHost.scrollTo()
     on an element without overflow silently no-ops, which was the
     original bug.

     Click handler uses belt-and-suspenders scrolling so it works in
     VA iframe contexts and browsers that silently ignore
     { behavior: "smooth" }:
       1. document.documentElement.scrollTop = 0  (immediate, universal)
       2. document.body.scrollTop = 0             (Safari fallback)
       3. window.scrollTo({ top:0, behavior:'smooth' })  (progressive)
  ───────────────────────────────────────────────────────────── */
  function ensureJumpToTop() {
    if (document.getElementById("leaf-jump-top")) return;

    var btn = document.createElement("button");
    btn.id = "leaf-jump-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    btn.innerHTML =
      '<span class="material-symbols-outlined" aria-hidden="true">' + ICON_SVG.arrow_upward + '</span>';
    document.body.appendChild(btn);

    function update() {
      var top =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      var vis = top > 120;
      btn.classList.toggle("lp-jump-vis", vis);
      btn.setAttribute("aria-hidden", String(!vis));
      btn.tabIndex = vis ? 0 : -1;
    }

    btn.addEventListener("click", function () {
      /* Direct assignment first — works in all environments including
         VA iframe contexts where window.scrollTo may be silently ignored. */
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {}
    });

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* closeAllDropdowns is referenced by wireLinkIntercept above,
     so it's declared here at module scope and assigned in wire() */
  var closeAllDropdowns = function () {};

  /* ─────────────────────────────────────────────────────────────
     WIRE INTERACTIONS
     Desktop dropdowns, mobile accordion, scroll shadow, Escape.
  ───────────────────────────────────────────────────────────── */
  function wire() {
    var header = document.getElementById("lpHeader");
    var navToggle = document.getElementById("lpNavToggle");
    var mobilePanel = document.getElementById("lpMobilePanel");
    var lastFocusedTrigger = null;

    /* Scroll shadow — toggled on the header (the sticky element),
       not the inner nav, since the header is what owns the sticky
       border/shadow now that branding + breadcrumb share it. */
    if (header) {
      var onScroll = function () {
        header.classList.toggle(
          "scrolled",
          (window.pageYOffset || document.documentElement.scrollTop) > 4,
        );
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    /* ── Desktop dropdowns (disclosure pattern) ── */
    closeAllDropdowns = function (except) {
      document.querySelectorAll(".dd-item.open").forEach(function (item) {
        if (item === except) return;
        item.classList.remove("open");
        var btn = item.querySelector(".dd-trigger");
        var panel = item.querySelector(".dd-panel");
        if (btn) btn.setAttribute("aria-expanded", "false");
        if (panel) panel.setAttribute("hidden", "");
      });
    };

    document.querySelectorAll(".dd-trigger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".dd-item");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var isOpen = item.classList.contains("open");
        closeAllDropdowns(null);
        if (!isOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
          if (panel) panel.removeAttribute("hidden");
          lastFocusedTrigger = btn;
        }
      });
    });

    /* ── Mobile accordion ── */
    function closeAllAccordions() {
      document.querySelectorAll(".acc-item.open").forEach(function (item) {
        item.classList.remove("open");
        var btn = item.querySelector(".acc-trigger");
        var panel = item.querySelector(".acc-panel");
        if (btn) btn.setAttribute("aria-expanded", "false");
        if (panel) panel.setAttribute("hidden", "");
      });
    }

    document.querySelectorAll(".acc-trigger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".acc-item");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var isOpen = item.classList.contains("open");
        if (isOpen) {
          item.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
          if (panel) panel.setAttribute("hidden", "");
        } else {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
          if (panel) panel.removeAttribute("hidden");
        }
      });
    });

    /* ── Mobile menu open/close ── */
    function openMobileMenu() {
      if (!navToggle || !mobilePanel) return;
      navToggle.classList.add("open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
      mobilePanel.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      var focusable = getFocusableElements(mobilePanel);
      if (focusable.length) focusable[0].focus();
    }

    function closeMobileMenu(returnFocus) {
      if (!navToggle || !mobilePanel) return;
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      mobilePanel.setAttribute("hidden", "");
      document.body.style.overflow = "";
      closeAllAccordions();
      if (returnFocus) navToggle.focus();
    }

    if (navToggle) {
      navToggle.addEventListener("click", function () {
        if (navToggle.classList.contains("open")) {
          closeMobileMenu(false);
        } else {
          closeAllDropdowns(null);
          openMobileMenu();
        }
      });
    }

    /* ── Focus trap for mobile panel ── */
    if (mobilePanel) {
      mobilePanel.addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;
        if (mobilePanel.hasAttribute("hidden")) return;
        var focusable = getFocusableElements(mobilePanel);
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
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
      });
    }

    /* Close mobile menu after a link inside it is followed */
    if (mobilePanel) {
      mobilePanel.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeMobileMenu(false);
      });
    }

    /* Auto-close mobile menu if viewport grows past breakpoint */
    window.addEventListener("resize", function () {
      if (
        window.innerWidth > 640 &&
        navToggle &&
        navToggle.classList.contains("open")
      ) {
        closeMobileMenu(false);
      }
    });

    /* Close on outside click */
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".dd-item")) closeAllDropdowns(null);
      if (
        navToggle &&
        navToggle.classList.contains("open") &&
        !e.target.closest(".lp-mobile-panel") &&
        !e.target.closest(".lp-nav-toggle")
      ) {
        closeMobileMenu(false);
      }
    });

    /* Close on Escape, returning focus to whatever trigger was open */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeAllDropdowns(null);
      if (lastFocusedTrigger) {
        lastFocusedTrigger.focus();
        lastFocusedTrigger = null;
      }
      if (navToggle && navToggle.classList.contains("open")) {
        closeMobileMenu(true);
      }
    });
  }

  /* ── Run on DOM ready ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();