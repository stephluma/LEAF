/* LEAF Universal Header — leaf_header.js
   Lives at /launchpad/files/leaf_header.js — every page should point
   here directly so there's exactly one copy to edit.

   Renders branding/logo, nav menu, and breadcrumb row as one sticky
   unit, and hides LEAF's native #header/#footer chrome (see
   leaf_header.css).

   Self-mounting: auto-injects its own stylesheet and header host div.
   A new page only needs one line, right before </head> or </body>:

       <script src="/launchpad/files/leaf_header.js"
               data-is-sysadmin="<!--{if $empMembership['groupID'][1]}-->1<!--{else}-->0<!--{/if}-->"
               data-csrf-token="<!--{$CSRFToken}-->">
       </script>

   data-is-sysadmin gates the Internal nav bar (Coaches/Team/Leadership/
   Admin/Users Online/Feedback) — see IS_SYSADMIN below. Separate from
   $is_admin; requires Sysadmin group (groupID 1). Omitting it is safe
   (bar stays hidden).

   data-csrf-token is required for the Feedback button's writes (see
   FEEDBACK_* below) — one LEAF session token, valid platform-wide,
   posted with every api/form/* call regardless of which LEAF site
   owns the target form. Omitting it is safe (Feedback button still
   renders, but every submission fails with a clear inline error).

   Breadcrumb is auto-detected, no per-page flag: on load,
   resolveCurrentRoute() matches this page's URL against NAV_SECTIONS/
   SUBROUTES — home hides it, a known route shows a trail built from
   that route, an unknown page hides it.

   On the launchpad (report.php?a=lp_home), nav clicks push a hash
   instead of navigating: fetch the target URL, strip its chrome,
   extract #content, and splice it into #lpSwapHost — header and
   breadcrumb stay put, back/forward works via hash history. A full
   separate LEAF app can instead be mounted in an <iframe> (iframe: true
   in NAV_SECTIONS) when fetch+splice isn't viable for it.

   ── Accessibility (WCAG 2.1 AA / Section 508) ───────────────
   • Skip navigation link auto-injected at top of <body>
   • Disclosure navigation pattern (aria-expanded only, no aria-haspopup)
   • External links announce "(opens in new tab)" to screen readers
   • Mobile panel traps focus while open; Escape returns focus
   • SPA view changes announced via #lp-live-region (aria-live)
   • prefers-reduced-motion: all animations suppressed in CSS
   ============================================================ */

(function () {
  "use strict";

  /* Smarty here is configured with plain { / } delimiters, not the
     <!--{ / }--> convention this tag was written assuming (meant to
     degrade to an HTML comment if ever served unprocessed) — so <!--
     and --> render as literal static text around the real value
     regardless of which branch fires, e.g. true renders as the string
     "<!---->1<!---->", not "1". Strips those literal markers before
     any attribute using this pattern gets used. */
  function stripSmartyCommentWrapper(raw) {
    return typeof raw === "string" ? raw.replace(/<!--|-->/g, "").trim() : raw;
  }

  /* document.currentScript is only valid synchronously during this
     script's first execution, so it's captured immediately. Reads
     data-is-sysadmin off this same <script> tag (from Smarty's
     $empMembership['groupID'][1], not the broader $is_admin flag).
     Anything but "1"/"true"/"yes" fails hidden, never fails open. */
  var HEADER_SCRIPT_EL = document.currentScript;
  var IS_SYSADMIN = (function () {
    var raw =
      HEADER_SCRIPT_EL && HEADER_SCRIPT_EL.getAttribute("data-is-sysadmin");
    raw = stripSmartyCommentWrapper(raw);
    return !!raw && /^(1|true|yes)$/i.test(raw);
  })();

  /* Read the same way as IS_SYSADMIN, off the same <script> tag. Used only
     by the Feedback button's writes (see FEEDBACK_* below) — one token,
     valid for api/form/* calls to any LEAF site regardless of which site
     leaf_header.js happens to be running on. */
  var CSRF_TOKEN = (function () {
    var raw =
      HEADER_SCRIPT_EL && HEADER_SCRIPT_EL.getAttribute("data-csrf-token");
    return stripSmartyCommentWrapper(raw) || "";
  })();

  /* ── Announcement banner config ──
     Placeholder IDs — search "REPLACE_ME" to find these before
     promoting to production. Sourced from a LEAF form's rawIndicator
     endpoint: GET {ROOT_URL}api/form/{RECORD_ID}/rawIndicator/
     {INDICATOR_ID}/{SERIES}. SERIES is the record's series number
     (1 unless it uses a different one). */
  var ANNOUNCEMENT_ROOT_URL = "REPLACE_ME_ANNOUNCEMENT_ROOT_URL";
  var ANNOUNCEMENT_RECORD_ID = "REPLACE_ME_ANNOUNCEMENT_RECORD_ID";
  var ANNOUNCEMENT_INDICATOR_ID = "REPLACE_ME_ANNOUNCEMENT_INDICATOR_ID";
  var ANNOUNCEMENT_SERIES = 1;

  /* ── Feedback button config ──
     Internal-nav-only (IS_SYSADMIN) button that lets an admin file
     quick feedback from any page. Each submission: creates a new
     record on FEEDBACK_FORM_ID, writes the admin's text to
     FEEDBACK_INDICATOR_ID, then advances it straight to
     FEEDBACK_STEP_ID. Same 3-call pattern as an existing, working
     implementation on the Team Command Center calendar app
     (calendar.js — createRecord/writeIndicators/submitRecord), just
     pointed at this form/indicator/step and running from the shared
     header instead of a single page's own script. */
  var FEEDBACK_ROOT_URL =
    "https://leaf.va.gov/platform/service_requests_launchpad/";
  var FEEDBACK_FORM_ID = "form_6ecbe";
  var FEEDBACK_INDICATOR_ID = "488";
  var FEEDBACK_STEP_ID = "105";

  /* Home route for the brand logo link and breadcrumb auto-detect's
     "hide breadcrumb here" match. Absolute since the header is
     site-wide. Keep in sync with the matching entry in
     HREF_HASH_KEY_OVERRIDES below. */
  var HOME_HREF = "https://leaf.va.gov/launchpad";

  /* Single source of truth for desktop + mobile nav. href values are
     also matched against a static page's own URL for breadcrumb
     auto-detect. Placeholder hrefs (#) are skipped by the router. */
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
          desc: "Ready-to-use forms shared by other VA teams",
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
              desc: "Connect with LEAF site admins VA-wide",
              href: "/launchpad/report.php?a=lp_cop",
            },
          ],
        },
        {
          icon: "lightbulb",
          title: "Submit an Idea",
          desc: "Suggest a feature or improvement for LEAF",
          href: "https://leaf.va.gov/platform/ideas/",
        },
        {
          icon: "privacy_tip",
          title: "Privacy Resources",
          desc: "Guidance for protecting PHI/PII on your site",
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
          desc: "Find answers and how-to guides for LEAF",
          /* iframe: true — Help Library has its own internal hash routing
             (e.g. #article-162), which needs its own real window/document
             to not collide with the launchpad's router(). Ideas has no
             internal routing, so it stays fetch+splice.
             fixedHeight: true — its contentDocument can't be measured
             reliably for the auto-grow strategy other iframe routes use,
             so it gets a viewport-relative height instead (mountIframe()). */
          href: "https://leaf.va.gov/platform/help_library/report.php?a=homepage",
          iframe: true,
          fixedHeight: true,
        },
        {
          icon: "article",
          title: "Blog",
          desc: "Integration and innovation stories, shared with LEAF collaborators and contributors",
          href: "/launchpad/report.php?a=lp_blog",
          hidden: true,
        },
        {
          icon: "school",
          title: "Learn",
          desc: "Self-paced courses and live training for LEAF",
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

  /* Pages nested under a nav item but not shown in its dropdown —
     registered in ROUTE_MAP at init for hash routing + breadcrumbs,
     and matched against a static page's own URL for auto-detect. */
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

  /* Hash key → { href, title, section } lookup, built once at init
     from NAV_SECTIONS. Also doubles as the breadcrumb auto-detect
     table for static pages (see resolveCurrentRoute()). */
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
       nested children. External items (real target="_blank" links) are
       skipped. parentItem (nested children only) fills in route.parent
       so buildTrailHTML() renders the full 3-level breadcrumb. */
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
          fixedHeight: !!item.fixedHeight,
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

  /* Derive a hash key from any href, e.g.
     "/launchpad/report.php?a=lp_find_site" → "find_site" (via override below)
     "report.php?a=Find_my_site" → "find_my_site" (lowercased). */
  /* Explicit overrides for hrefs whose derived key would otherwise be
     wrong. Checked first so every caller agrees on the same key. */
  var HREF_HASH_KEY_OVERRIDES = {
    /* HOME_HREF has no ?a= param, so the derived key ("launchpad")
       isn't recognized as home — pin it to "home" so the brand logo
       and breadcrumb links land on the actual homepage. Relies on the
       web server treating report.php as the directory index for
       /launchpad — flag if the bare URL doesn't resolve. */
    "https://leaf.va.gov/launchpad": "home",
    /* Relative form, needed since window.location.pathname/search
       never include the origin — keeps resolveCurrentRoute()'s
       comparison against HOME_HREF consistent. */
    "/launchpad": "home",
    /* lp_* → short-key rename: hrefs (and the ?a= values actually
       fetched) are untouched — only the hash key used for in-app
       routing drops the lp_ prefix. Old #lp_* hashes still resolve via
       LEGACY_HASH_KEY_ALIASES in router(). */
    "/launchpad/report.php?a=lp_impact": "impact",
    "/launchpad/report.php?a=lp_roadmap": "roadmap",
    "/launchpad/report.php?a=lp_form_library": "form_library",
    "/launchpad/report.php?a=lp_use_case": "use_case",
    "/launchpad/report.php?a=lp_integrations": "integrations",
    "/launchpad/report.php?a=lp_find_site": "find_site",
    "/launchpad/report.php?a=lp_voc": "voc",
    "/launchpad/report.php?a=lp_cop": "cop",
    "/launchpad/report.php?a=lp_ideas": "ideas",
    "/launchpad/report.php?a=lp_privacy": "privacy",
    "/launchpad/report.php?a=lp_blog": "blog",
    "/launchpad/report.php?a=lp_learn": "learn",
    "/launchpad/report.php?a=lp_brand_guide": "brand_guide",
    "/launchpad/report.php?a=lp_leadership": "leadership",
    "/launchpad/report.php?a=lp_team": "team",
    /* showSwapError()'s hardcoded "Back to Launchpad" button keeps
       ?a=lp_home text but should still push "#home", not "#lp_home". */
    "report.php?a=lp_home": "home",
    /* Help Library's ?a=homepage param would otherwise derive "homepage" —
       pinned to match its nav item's own name instead (see NAV_SECTIONS). */
    "https://leaf.va.gov/platform/help_library/report.php?a=homepage":
      "help_library",
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

  /* Matches this page's own URL against ROUTE_MAP/HOME_HREF using the
     same key-derivation the router uses for hashes. Returns "home"
     (hidden), a route (trail shown), or null (unknown page, hidden). */
  function resolveCurrentRoute() {
    var here = window.location.pathname + window.location.search;
    var key = hrefToHashKey(here);
    if (!key) return null;
    if (key === hrefToHashKey(HOME_HREF)) return "home";
    return ROUTE_MAP[key] || null;
  }

  /* The router only activates on report.php?a=lp_home; all other pages
     get the header only. Detected via URL, not a DOM marker — every
     lp_*.html page shares the #lp-main id on its own <main>. */
  function isLaunchpad() {
    /* Native swap host in the page's own markup — checked before
       buildRouteMap() could have created one via ensureSwapHost(). */
    if (document.getElementById("lpSwapHost")) return true;
    return resolveCurrentRoute() === "home";
  }

  /* ─────────────────────────────────────────────────────────────
     ICON LIBRARY
     Inline Material Symbols, sourced once and reused everywhere below —
     full markup per occurrence, no <use>/sprite, no per-icon request.
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
    quiz: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M560-360q17 0 29.5-12.5T602-402q0-17-12.5-29.5T560-444q-17 0-29.5 12.5T518-402q0 17 12.5 29.5T560-360Zm-30-128h60q0-29 6-42.5t28-35.5q30-30 40-48.5t10-43.5q0-45-31.5-73.5T560-760q-41 0-71.5 23T446-676l54 22q9-25 24.5-37.5T560-704q24 0 39 13.5t15 36.5q0 14-8 26.5T578-596q-33 29-40.5 45.5T530-488ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>',
    arrow_drop_down:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-360 280-560h400L480-360Z"/></svg>',
    lock: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/></svg>',
    sync: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160v-80h110l-16-14q-49-49-71.5-106.5T160-478q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z"/></svg>',
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
    home: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>',
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
    /* Material Symbols (Filled) "add_comment" — download/upload this
       exact icon in the icon library if it isn't there yet. */
    add_comment:
      '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M800-680v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80ZM620-520q25 0 42.5-17.5T680-580q0-25-17.5-42.5T620-640q-25 0-42.5 17.5T560-580q0 25 17.5 42.5T620-520Zm-280 0q25 0 42.5-17.5T400-580q0-25-17.5-42.5T340-640q-25 0-42.5 17.5T280-580q0 25 17.5 42.5T340-520Zm263.5 221.5Q659-337 684-400H276q25 63 80.5 101.5T480-260q68 0 123.5-38.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q43 0 83 8.5t77 24.5v167h80v80h142q9 29 13.5 58.5T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>',
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

  /* Renders one <button class="dd-link">, shared by plain items and
     nested rows. <button data-href>, not <a href>, so the status bar
     never previews the destination on hover — wireLinkIntercept()
     reads data-href for navigation. */
  function linkRowHTML(item, extraClass) {
    var badgeHTML = item.badge
      ? `<span class="dd-badge">${item.badge}</span>`
      : "";
    /* Flags items that trigger in-page behavior (e.g. opening the demo
       modal) instead of navigating — read by wireLinkIntercept(). */
    var actionAttr = item.action ? ` data-action="${item.action}"` : "";
    var cls = extraClass ? `dd-link ${extraClass}` : "dd-link";
    /* Submenu items (dd-link--sub) render text-only — an icon would
       crowd the already-indented title/description. */
    var iconHTML =
      extraClass === "dd-link--sub"
        ? ""
        : `
          <span class="dd-link-ico">
            <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG[item.icon] || ""}</span>
          </span>`;
    /* item.external renders a real <a target="_blank"> instead of the
       usual <button data-href>, so wireLinkIntercept() leaves it alone.
       Not used by any current item; kept for a future external link. */
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

  /* Renders a parent item plus its children as a permanently-visible
     indented list — no expand/collapse. Shared by desktop dd-panel and
     mobile acc-panel since both call linkHTML() over NAV_SECTIONS. */
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
     Right-aligned group: [lock] Coaches (new tab) → Team → Leadership
     → Admin → Users Online. Sysadmin-only — gated on IS_SYSADMIN, so
     the section never enters the DOM for non-sysadmins rather than
     being hidden with CSS (the CSS rule is defense in depth only).
  ───────────────────────────────────────────────────────────── */
  function buildInternalNavHTML() {
    if (!IS_SYSADMIN) {
      return { desktop: "", mobile: "" };
    }

    var desktopInternal = `
<div class="lp-nav-internal" data-sysadmin="1" role="navigation" aria-label="Internal team links">

  <!-- Lock icon only — role="img" + aria-label gives it an accessible name. -->
  <span class="lp-internal-label" role="img" aria-label="Internal">
    <span class="material-symbols-outlined lp-internal-label-icon" aria-hidden="true">${ICON_SVG.lock}</span>
  </span>

  <span class="lp-internal-rule" aria-hidden="true"></span>

  <!-- Coaches: external, new tab. data-nav-external tells
       wireLinkIntercept() to leave it alone instead of hash-routing it. -->
  <a class="lp-internal-btn" href="https://leaf.va.gov/launchpad/report.php?a=Coaches" data-nav-external target="_blank" rel="noopener noreferrer">
    Coaches
    <span class="lp-sr-only">(opens in new tab)</span>
  </a>

  <button class="lp-internal-btn" data-href="/launchpad/report.php?a=lp_team">
    Team
  </button>

  <button class="lp-internal-btn" data-href="/launchpad/report.php?a=lp_leadership">
    Leadership
  </button>

  <!-- Admin is a real standalone page — data-nav-fullpage tells
       wireLinkIntercept() to always navigate here for real. -->
  <button class="lp-internal-btn" data-href="/launchpad/admin" data-nav-fullpage>
    Admin
  </button>

  <!-- Users Online: live count via SSE (see wireUsersOnlineBadge()) —
       non-interactive, so <span> not <button>. Class, not id, since
       this also renders in the mobile accordion below. -->
  <span class="lp-internal-btn lp-internal-online">
    <span class="lp-internal-online-dot" aria-hidden="true"></span>
    Users Online:
    <span class="lp-internal-online-count" aria-live="polite" aria-atomic="true">0</span>
  </span>

  <!-- Feedback: icon-only, opens lpFeedbackModal (see wireFeedbackWidget). -->
  <button class="lp-internal-feedback-btn" type="button" data-action="feedback-modal" aria-label="Send feedback">
    <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.add_comment}</span>
  </button>

</div>`;

    var mobileInternal = `

<!-- Mobile separator before Internal section — same lock icon treatment as desktop. -->
<li class="lp-internal-mobile-item" data-sysadmin="1" role="separator">
  <div class="lp-mobile-internal-sep" role="img" aria-label="Internal">
    <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.lock}</span>
  </div>
</li>

<li class="lp-internal-mobile-item" data-sysadmin="1">
  <a class="dd-link" href="https://leaf.va.gov/launchpad/report.php?a=Coaches" data-nav-external target="_blank" rel="noopener noreferrer">
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

<li class="lp-internal-mobile-item" data-sysadmin="1">
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

<li class="lp-internal-mobile-item" data-sysadmin="1">
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

<li class="lp-internal-mobile-item" data-sysadmin="1">
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

<!-- Users Online: same live count as the desktop badge (shares
     .lp-internal-online-count), as a non-interactive status row. -->
<li class="lp-internal-mobile-item lp-internal-online" data-sysadmin="1">
  <span class="dd-link">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.groups}</span>
    </span>
    <span class="dd-link-text">
      <strong>Users Online</strong>
      <span class="dd-link-desc">Currently active on LEAF: <span class="lp-internal-online-count" aria-live="polite" aria-atomic="true">0</span></span>
    </span>
  </span>
</li>

<li class="lp-internal-mobile-item" data-sysadmin="1">
  <button class="dd-link" type="button" data-action="feedback-modal">
    <span class="dd-link-ico">
      <span class="material-symbols-outlined" aria-hidden="true">${ICON_SVG.add_comment}</span>
    </span>
    <span class="dd-link-text">
      <strong>Send Feedback</strong>
      <span class="dd-link-desc">Report an issue or share a quick note</span>
    </span>
  </button>
</li>`;

    return { desktop: desktopInternal, mobile: mobileInternal };
  }

  /* ─────────────────────────────────────────────────────────────
     BRAND / LOGO
     Fill color is set in leaf_header.css (.lp-brand-logo path), not
     inline, so it stays themeable in one place.
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
     Not a NAV_SECTIONS dropdown item, so built/placed separately.
     data-action="form-modal" flows through the shared branch in
     wireLinkIntercept(). Desktop: last item in .lp-nav-links. Mobile:
     pinned above the accordion so it isn't buried in a section.
  ───────────────────────────────────────────────────────────── */
  /* &iframe=1 tells the LEAF support app to suppress its own header/nav
     — without it, the fetched form renders a second header inside this
     modal's iframe. */
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

  /* ─────────────────────────────────────────────────────────────
     ACCOUNT SLOT
     Far-right, mirror of buildInternalNavHTML() above — gated on the
     same IS_SYSADMIN, just inverted, so the two are mutually
     exclusive: sysadmins get the internal group, everyone else gets
     this. Empty markup for sysadmins means the mount point never
     enters the DOM for them, same "fails hidden" reasoning as the
     internal group. When it does render, it's just an empty mount
     point — inject() fills it by moving the real #lp-login-slot node
     (Smarty-rendered by main.tpl, not built here) into place.
  ───────────────────────────────────────────────────────────── */
  function buildAccountSlotHTML() {
    if (IS_SYSADMIN) {
      return { desktop: "", mobile: "" };
    }
    return {
      desktop: `
<div class="lp-nav-account" data-sysadmin="0">
  <div id="lp-login-slot-mount"></div>
</div>`,
      mobile: `
<li class="lp-mobile-account-item" data-sysadmin="0">
  <div id="lp-login-slot-mobile-mount"></div>
</li>`,
    };
  }

  function buildNavHTML() {
    var desktopItems = NAV_SECTIONS.map(desktopSectionHTML).join("");
    var mobileItems = NAV_SECTIONS.map(mobileSectionHTML).join("");
    var internal = buildInternalNavHTML();
    var support = buildSupportNavHTML();
    var account = buildAccountSlotHTML();
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

    <!-- Far right: account slot (login/logout) — non-admin only,
         mirrors the internal group above -->
    ${account.desktop}

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
        ${account.mobile}
      </ul>
    </div>

  </div>
</nav>`;
  }

  /* ─────────────────────────────────────────────────────────────
     HEADER
     Breadcrumb row is always present in the DOM (hidden by default)
     so updateBreadcrumb() only ever toggles/fills it.
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
     Injected as the first child of <body>, visually hidden until
     focused. Targets #main-content.
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
     this JS always loads the right stylesheet. Pointing this at the
     wrong file 404s and leaves the header completely unstyled. */
  var LEAF_HEADER_CSS_HREF = "/launchpad/files/leaf_header.css";

  function ensureStylesheet() {
    if (
      document.querySelector(
        'link[href*="leaf_header.css"], link[href*="leaf-header.css"]',
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
       skip link — inserted moments earlier — stays the true first Tab
       stop; otherwise the header's focusable nav would precede it. */
    var skip = document.getElementById("lp-skip-nav");
    document.body.insertBefore(
      host,
      skip ? skip.nextSibling : document.body.firstChild,
    );
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

    /* #lp-login-slot is real Smarty-rendered content from main.tpl, a
       sibling of #lp-header-host — untouched by the outerHTML replace
       above. The mount points only exist when buildAccountSlotHTML()
       actually rendered them (non-sysadmin) — for a sysadmin neither
       mount is in the DOM, so this whole block is a no-op and
       #lp-login-slot is simply left where main.tpl put it, unmoved.
       When the mounts do exist: it's one DOM node but two mount points
       (desktop + mobile, both exist at once, CSS picks which is
       visible per width) — a node can only live in one place, so it's
       moved into the desktop mount and cloned into the mobile one (id
       reassigned to avoid a duplicate). Only one copy is ever
       visible/focusable at a given width, so nothing doubles up. */
    var loginSlot = document.getElementById("lp-login-slot");
    var loginSlotMount = document.getElementById("lp-login-slot-mount");
    var loginSlotMobileMount = document.getElementById(
      "lp-login-slot-mobile-mount",
    );
    if (loginSlot && loginSlotMount) {
      loginSlotMount.appendChild(loginSlot);
      if (loginSlotMobileMount) {
        var loginSlotMobile = loginSlot.cloneNode(true);
        loginSlotMobile.id = "lp-login-slot-mobile";
        loginSlotMobileMount.appendChild(loginSlotMobile);
      }
    }

    ensureMainContentTarget();

    /* Needed on every page now — static pages use it for breadcrumb
       auto-detect, the launchpad uses it for hash routing. */
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

    /* Wired on every page — wireLinkIntercept() itself branches on
       isLaunchpad() to hash-route or navigate normally. Without this,
       nav <button data-href> links would have no click handler at all. */
    wireLinkIntercept();

    wire();
    ensureJumpToTop();

    /* Available on every page — "Watch a Demo" can be clicked from
       anywhere, not just the launchpad. */
    ensureDemoModal();
    wireDemoModal();

    wireUsersOnlineBadge();

    /* Async; only mounts above the nav once/if the sourced indicator
       resolves to real content. No-ops until ANNOUNCEMENT_* is filled in. */
    initAnnouncementBanner();
  }

  /* ─────────────────────────────────────────────────────────────
     CHROME SUPPRESSION LIST
     Covers both old Smarty template (DIV#header, DIV#footer) and new
     template (HEADER#header, FOOTER#footer.noprint).
  ───────────────────────────────────────────────────────────── */
  var CHROME_SELECTORS = [
    "#header",
    "#footer",
    ".noprint",
    "#lp-skip-nav",
    "#nav-skip-link",
    /* USWDS's own skip-link class — a fetch+spliced platform page
       (e.g. Leadership) likely uses this, not the two IDs above. Left
       un-stripped it renders with none of its own site's CSS, which
       was overlapping the header. */
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
     Inline scripts run via new Function() so top-level vars don't
     stomp outer window globals. External scripts are re-appended to
     <head>. document.write scripts are skipped; already-loaded
     external scripts are tracked to avoid duplicate execution.
  ───────────────────────────────────────────────────────────── */
  var _seenExternalScripts = {};

  /* Guard: tracks dep URLs already injected so ensureLeafUIDeps
     never logs or re-injects on repeated mountContent calls. */
  var _loadedDepSrcs = new Set();

  /* Guard: URL currently being fetched — prevents stacked concurrent
     loadView calls for the same or a rapid-fire different route. */
  var _currentLoadUrl = null;

  /* Guard: suppresses the hashchange → router() path while deferred
     init functions drain, so a hash side-effect inside one can't
     re-trigger navigation. */
  var _routerSuppressed = false;

  /* Scripts that must never re-execute inside a fetched page context —
     shell-level scripts (this header, any legacy nav/breadcrumb script)
     manage the outer document; re-running them duplicates elements and
     undoes router state. */
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
     Some fetched pages (Help Library, Form Library) need jQuery UI /
     dialogController.js, which aren't on the launchpad page.
     ensureLeafUIDeps() scans the fetched doc's scripts and loads only
     what's missing, in order, before continuing.
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

  /* Scans for known dependency <script src> tags. Must run BEFORE
     suppressChrome() strips #header/#footer/.noprint — that's where
     shared helpers like VAFacilityHelper.js tend to live. */
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
    var loadPromises = [];

    scripts.forEach(function (oldScript) {
      /* Match an actual call (the ( is required), not just the words
         "document.write" appearing anywhere — e.g. inside a comment
         explaining that a script deliberately avoids it. */
      if (
        oldScript.textContent &&
        /document\s*\.\s*write(ln)?\s*\(/.test(oldScript.textContent)
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

        /* Track load completion so callers can wait for this script to
           actually run before assuming anything it registers (e.g. a
           DOMContentLoaded-gated init captured into
           window.__lpDeferredInits) is ready to use. Without this,
           draining that queue right after appendChild() races the
           network fetch — the fetch usually wins on a fast/cached
           connection but not always, which is why this bug was
           intermittent. */
        loadPromises.push(
          new Promise(function (resolve) {
            newScript.onload = function () { resolve(); };
            newScript.onerror = function () {
              console.warn("[LP] Failed to load re-executed script:", src);
              resolve();
            };
          }),
        );

        document.head.appendChild(newScript);
      } else if (oldScript.textContent && oldScript.textContent.trim()) {
        try {
          /* Mock location: scripts reading location.search/href/pathname
             get the fetched page's URL, not the launchpad's. Mock
             document: readyState reads "loading" so init-on-readyState
             pages (e.g. ideas_v2.js) register a DOMContentLoaded
             listener instead of running immediately — captured in
             window.__lpDeferredInits and drained after mount, never
             dispatched as a real event (that would loop the header's
             own init). */
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
                 unbound via the Proxy's receiver reintroduces "Illegal invocation". */
              if (typeof value === "function") {
                return value.bind(target);
              }
              return value;
            },
          });

          /* Intercepts navigation from re-executed inline scripts so
             location.href = url / .assign() / .replace() hash-route to
             known routes instead of navigating away. Unknown URLs fall
             through to the real window.location. Only the local
             `location` parameter is intercepted — window.location.href
             bypasses this and navigates normally. */
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
          /* Wraps the real window so window.location.href = url and
             .assign()/.replace() are also intercepted, not just the
             local `location` binding. */
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

    return Promise.all(loadPromises);
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

  /* One item per top-level NAV_SECTIONS group, so the "missing route"
     error's suggested links stay in sync with NAV_SECTIONS automatically. */
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

  /* Two causes, two messages: "missing" — no ROUTE_MAP entry (a true
     404, e.g. a stale bookmark) — offers a way out, no retry. "fetch" —
     route exists but the request failed — offers retry + new tab.
     `url` is used only by the "fetch" state's actions. */
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
        '<span class="material-symbols-outlined lp-swap-error-ico" aria-hidden="true" style="color:#6b7280;">' +
        ICON_SVG.wrong_location +
        "</span>" +
        '<p class="lp-swap-error-msg" style="font-weight:600;font-size:16px;margin:12px 0 4px;">This page doesn\'t exist</p>' +
        '<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">It may have moved or the link is outdated.</p>' +
        '<div style="display:flex;justify-content:center;margin-bottom:24px;">' +
        '<button class="lp-panel-link btn btn-primary" data-href="report.php?a=lp_home">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' +
        ICON_SVG.home +
        "</span> Back to Launchpad" +
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
      '<span class="material-symbols-outlined lp-swap-error-ico" aria-hidden="true" style="color:#b45309;">' +
      ICON_SVG.cloud_off +
      "</span>" +
      '<p class="lp-swap-error-msg" style="font-weight:600;font-size:16px;margin:12px 0 4px;">This page is temporarily unavailable</p>' +
      '<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">We reached the site but couldn\'t load the content. This is usually temporary.</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button class="lp-panel-link btn btn-primary" data-href="' +
      url +
      '">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.refresh +
      "</span> Try again" +
      "</button>" +
      '<a class="lp-swap-error-link btn btn-sec" href="' +
      url +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.open_in_new +
      "</span>" +
      "Open in a new tab" +
      "</a>" +
      "</div>" +
      "</div>";
  }

  /* ─────────────────────────────────────────────────────────────
     ELEMENT CACHE
     Resolved once at router init so show/hide never relies on
     getElementById — safe even if an id gets reassigned later.
  ───────────────────────────────────────────────────────────── */
  var _lpMain = null; /* launchpad home <main id="lp-main"> */
  var _swapHost = null; /* swap container [data-lp-swap-host] */

  function initElementCache() {
    /* ensureMainContentTarget() renames the home <main id="lp-main"> to
       id="main-content" for the skip link, so fall back to the bare tag
       selector — still the same element, just under its new id. */
    _lpMain =
      document.getElementById("lp-main") || document.querySelector("main");
    _swapHost =
      document.querySelector("[data-lp-swap-host]") ||
      document.getElementById("lpSwapHost");
  }

  /* ─────────────────────────────────────────────────────────────
     SHOW / HIDE
     Explicit inline display beats any stylesheet rule. IDs never
     change — the skip link always targets #lp-main or #lpSwapHost.
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
    if (_swapHost) {
      _swapHost.style.display = "";
      /* Every route type funnels through here to reveal the swap
         host — iframe: true routes (e.g. Help Library) never call
         showSwapLoading(), which was the only other place this got
         cleared. Without this, the host's original `hidden` attribute
         keeps winning over the inline display style, so the first
         iframe route visited in a session mounts but stays invisible
         until some other, non-iframe route clears `hidden` first. */
      _swapHost.removeAttribute("hidden");
    }

    /* Skip link → fetched content */
    var skip = document.getElementById("lp-skip-nav");
    if (skip) skip.href = "#lpSwapHost";
  }

  /* ─────────────────────────────────────────────────────────────
     BREADCRUMB
     Trail: LEAF Launchpad → [Section] → [Page Title]. updateBreadcrumb()
     owns the persistent #lpBreadcrumb element, filling or hiding it as
     the active route changes.
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

  /* Same idea for route.fixedHeight routes' window "resize" listener
     (no ResizeObserver involved there — see fitFrameToViewport()). */
  var _iframeFixedHeightResizeFn = null;

  /* ─────────────────────────────────────────────────────────────
     MOUNT IFRAME
     For full separate LEAF apps (route.iframe === true) — skips
     fetch/DOMParser/chrome-suppression/script-splicing entirely since
     the embedded page loads and runs as its own real document.
  ───────────────────────────────────────────────────────────── */
  function mountIframe(route, deepLinkId) {
    var host = _swapHost;
    if (!host) {
      console.error("[LP] mountIframe: swap host not found");
      return;
    }

    if (_iframeResizeObserver) {
      _iframeResizeObserver.disconnect();
      _iframeResizeObserver = null;
    }
    if (_iframeFixedHeightResizeFn) {
      window.removeEventListener("resize", _iframeFixedHeightResizeFn);
      _iframeFixedHeightResizeFn = null;
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
    /* deepLinkId (from a #help_library-article-<id> hash) jumps the
       embedded app straight to that article on load — see router(). */
    frame.src = deepLinkId ? route.href + "#article-" + deepLinkId : route.href;
    frame.title = route.title || "Embedded page";
    /* min-height is just the pre-load placeholder — the load handler
       grows the frame to its real content height. visibility:hidden
       (not display:none) keeps it in layout and its load event firing. */
    frame.style.cssText =
      "width:100%;min-height:75vh;border:0;display:block;overflow:hidden;visibility:hidden;";

    /* iframe: true routes are real LEAF pages whose own #header/#footer
       renders before their client-side script hides it, and CSS can't
       reach across the iframe boundary to stop that. Keep the frame
       hidden until "load" and show our own spinner instead. */
    var spinner = document.createElement("div");
    spinner.className = "lp-swap-loading lp-iframe-loading";
    spinner.setAttribute("aria-hidden", "true");
    spinner.innerHTML = '<span class="lp-swap-spinner"></span>';

    /* route.fixedHeight: size to the viewport below the sticky header
       instead of the contentDocument.scrollHeight strategy below —
       for routes whose contentDocument height can't be read/fit
       reliably, so there's exactly one scrollable region (inside the
       iframe) instead of a stuck placeholder height. */
    function fitFrameToViewport() {
      var header = document.getElementById("lpHeader");
      var offset = header ? header.getBoundingClientRect().bottom : 0;
      frame.style.height = "calc(100vh - " + Math.max(offset, 0) + "px)";
    }

    if (route.fixedHeight) {
      frame.style.overflow = "auto";
      fitFrameToViewport();
    }

    frame.addEventListener("load", function () {
      frame.style.visibility = "visible";
      if (spinner.parentNode) spinner.remove();

      if (route.fixedHeight) {
        fitFrameToViewport();
        window.addEventListener("resize", fitFrameToViewport);
        _iframeFixedHeightResizeFn = fitFrameToViewport;
        return;
      }

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

    /* ── Base URL injection ──
       Fetched pages make relative API calls (e.g. ./api/form/query)
       that would resolve against the launchpad's own URL once their
       scripts re-execute here — so a <base href> pointing at the
       fetched page's directory is injected into <head> before
       reExecuteScripts() runs. Must be in <head>; inside a <div> it's
       ignored. Removed entirely on return to launchpad home.

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

    /* Exposes the route's original URL so fetched-page scripts reading
       window.location.search/params get the right values instead of
       the launchpad's own (empty/wrong) ones. */
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

    /* Lazy-loads any LEAF UI deps the fetched page needs before
       re-executing its inline scripts — depScriptSrcs was scanned
       before chrome suppression, so deps inside #header/#footer are
       still caught. */
    ensureLeafUIDeps(depScriptSrcs).then(function () {
      return reExecuteScripts(wrapper);
    }).then(function () {
      /* After scripts run, drain any deferred page-init functions.
         Pages that gate init on readyState (see mockDoc above) register
         it as a DOMContentLoaded listener, captured into
         window.__lpDeferredInits. We never dispatch a synthetic
         DOMContentLoaded — that would retrigger the header's own init
         and loop — so we call the queued functions directly instead. */
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
  function loadView(hash, route, deepLinkId) {
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

    /* A full separate LEAF app (iframe: true) can't survive being
       fetched+spliced — wrong document, wrong scripts, wrong DOM.
       Mount it in an iframe instead, same hash-routed shell. */
    if (route.iframe) {
      mountIframe(route, deepLinkId);
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

        /* Scan for known dependencies BEFORE chrome suppression — some
           pages (e.g. lp_find_site) load helpers from inside the header
           include, which suppressChrome() deletes wholesale. */
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

  /* Old #lp_* hashes (bookmarks, external links) still resolve to their
     route's new short key. */
  var LEGACY_HASH_KEY_ALIASES = {
    lp_impact: "impact",
    lp_roadmap: "roadmap",
    lp_form_library: "form_library",
    lp_use_case: "use_case",
    lp_integrations: "integrations",
    lp_find_site: "find_site",
    lp_voc: "voc",
    lp_cop: "cop",
    lp_ideas: "ideas",
    lp_privacy: "privacy",
    lp_blog: "blog",
    lp_learn: "learn",
    lp_brand_guide: "brand_guide",
    lp_leadership: "leadership",
    lp_team: "team",
  };

  /* ─────────────────────────────────────────────────────────────
     ROUTER
     Reads window.location.hash and dispatches to the right view.
     Called on init and on every hashchange event.
  ───────────────────────────────────────────────────────────── */
  function router() {
    /* Bail if suppressed during deferred-init drain to prevent
       hash side-effects inside init functions re-triggering navigation. */
    if (_routerSuppressed) return;

    var raw = window.location.hash; /* e.g. "#find_site" or "" */

    /* Help Library deep links carry the article id in the hash itself
       (#help_library-article-162), written by handleHelpLibraryMessage()
       below — jump the iframe straight to that article on load. */
    var articleLink = raw.match(/^#help_library-article-(\d+)$/i);
    if (articleLink) {
      loadView("help_library", ROUTE_MAP.help_library, articleLink[1]);
      return;
    }

    var key = raw.replace(/^#/, "").toLowerCase();
    key = LEGACY_HASH_KEY_ALIASES[key] || key;

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
      /* Nav buttons (.dd-link etc.) use data-href and are caught below.
         Links inside fetched page content are regular <a> tags that
         bypass that check — intercept them here: a known ROUTE_MAP href
         pushes a hash, everything else falls through to the browser. */
      var contentLink = e.target.closest("[data-lp-swap-host] a[href]");
      if (contentLink && !contentLink.hasAttribute("data-nav-external")) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
          /* modifier-key clicks open a real tab — don't intercept */
        } else {
          var contentHref = contentLink.getAttribute("href");
          if (contentHref && contentHref !== "#") {
            /* In-page anchors (e.g. lp_brand_guide's scrollspy nav):
               mountContent()'s injected <base href> makes an unhandled
               href="#section-id" resolve to {base}/#section-id — a real,
               wrong page — instead of the current document. Checked
               before the ROUTE_MAP lookup so a real anchor always wins. */
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
                /* history.replaceState, not location.hash — the latter
                   fires hashchange, which router() would treat as an
                   unknown route key and show the error state. Trade-off:
                   reloading while a section anchor is active won't
                   restore the loaded route (reloading the bare route
                   URL still works). */
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
                   anchor accessibility practice. preventScroll avoids
                   fighting the smooth scroll above. */
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

      /* Matches nav dropdown links, internal buttons, breadcrumb links,
         .lp-brand, and any [data-action] trigger (modal triggers
         anywhere, nav-generated or page-specific). .dd-link/.lp-internal-btn
         use data-href (no href, so hover never previews the URL);
         .lp-breadcrumb a / .lp-brand are real <a href>, read via the
         data-href fallback below. .lp-brand needs to be caught here too:
         since HOME_HREF has no fragment, clicking it while a route hash
         is set triggers a real page reload instead of a same-document
         nav — this routes it through the same hash-push path instead.
         [data-nav-external] (e.g. Coaches) is left alone to navigate
         natively. */
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

      /* "Watch a Demo" opens the video modal instead of navigating. Its
         href is "#", so this must run before the href==="#" check below. */
      if (link.dataset.action === "demo-modal") {
        e.preventDefault();
        closeAllDropdowns(null);
        openDemoModal(link);
        return;
      }

      /* Generic form modal — src/title come from data attributes on the
         trigger, so no per-form JS is needed elsewhere. */
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

      /* Feedback button (internal nav, sysadmin-only) opens a small modal
         with a textarea instead of navigating. */
      if (link.dataset.action === "feedback-modal") {
        e.preventDefault();
        closeAllDropdowns(null);
        openFeedbackModal(link);
        return;
      }

      /* Read href from data-href (buttons) or href attribute (plain <a> fallback) */
      var href = link.getAttribute("data-href") || link.getAttribute("href");
      if (!href || href === "#") return;

      e.preventDefault();
      closeAllDropdowns(null);

      /* data-nav-fullpage: a real standalone page (e.g. Admin) that
         should never fold into the SPA — skip the hash router entirely
         so the browser lands on its own real URL. */
      if (link.hasAttribute("data-nav-fullpage")) {
        window.location.href = href;
        return;
      }

      /* Off the launchpad there's no router wired — pushing a hash
         would just leave a dead #fragment and do nothing. Navigate for
         real instead. */
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

  var HELP_LIBRARY_ORIGIN = "https://leaf.va.gov";

  /* Help Library's iframe posts its current article id here on every
     internal navigation (see help_library.js's open()). Never trust
     the payload until both origin and message type are verified.
     Written via replaceState, not a real hash assignment, so this
     doesn't re-trigger router() through hashchange. */
  function handleHelpLibraryMessage(e) {
    if (e.origin !== HELP_LIBRARY_ORIGIN) return;
    if (!e.data || e.data.type !== "lp-help-library-nav") return;
    var id = String(e.data.articleId || "");
    if (!/^\d+$/.test(id)) return;
    history.replaceState(null, "", "#help_library-article-" + id);
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

    window.addEventListener("message", handleHelpLibraryMessage);

    /* Run router on init to handle deep-linked URLs */
    router();
  }

  /* ─────────────────────────────────────────────────────────────
     MODAL COORDINATION
     Demo modal and form modal are independent singletons sharing the
     same fixed overlay — opening one without closing the other would
     stack both. Both open*Modal() call this first. */
  function closeAnyOpenModal() {
    closeDemoModal();
    closeFormModal();
    closeFeedbackModal();
  }

  /* ─────────────────────────────────────────────────────────────
     DEMO MODAL
     Injected once so "Watch a Demo" can open it from any page. The
     iframe's data-src is only copied into src on open (and cleared on
     close) so the embed doesn't load/play in the background.
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
     Same open/close/focus-trap mechanics as the demo modal, but with a
     visible header bar + title, re-populated per use (src/title) —
     Request Support and Nominate a Spotlight share one lazily-built instance.
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
     FEEDBACK WIDGET (internal nav, sysadmin-only)
     Small modal with a textarea. On submit: creates a record on
     FEEDBACK_FORM_ID, writes the text to FEEDBACK_INDICATOR_ID, then
     advances it to FEEDBACK_STEP_ID. Same 3-call shape as the working
     calendar.js feedback widget (createRecord/writeIndicators/
     submitRecord), reusing CSRF_TOKEN read off this script's own tag
     (see CSRF_TOKEN above) instead of a page-local Smarty config —
     leaf_header.js runs on every page, not just one.
  ───────────────────────────────────────────────────────────── */
  function feedbackEncodeBody(obj) {
    var body = new URLSearchParams();
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v === undefined || v === null) return;
      body.append(String(k), String(v));
    });
    return body.toString();
  }

  function feedbackApiPost(url, dataObj) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
      },
      body: feedbackEncodeBody(dataObj),
    }).then(function (res) {
      if (!res.ok) throw new Error("POST " + url + " → HTTP " + res.status);
      return res.text().then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return text;
        }
      });
    });
  }

  function submitFeedback(text) {
    var createURL = FEEDBACK_ROOT_URL + "api/form/new";
    return feedbackApiPost(createURL, {
      CSRFToken: CSRF_TOKEN,
      title: "Launchpad Feedback",
      ["num" + FEEDBACK_FORM_ID]: "on",
    }).then(function (createRes) {
      var recordID = parseInt(
        String(createRes).trim().replace(/^"|"$/g, ""),
        10,
      );
      if (!recordID || recordID <= 0) {
        throw new Error("Record creation returned no ID: " + createRes);
      }
      var writeURL =
        FEEDBACK_ROOT_URL + "api/form/" + encodeURIComponent(recordID);
      var writePayload = { recordID: recordID, CSRFToken: CSRF_TOKEN };
      writePayload[FEEDBACK_INDICATOR_ID] = text;
      return feedbackApiPost(writeURL, writePayload).then(function () {
        var submitURL =
          FEEDBACK_ROOT_URL +
          "api/form/" +
          encodeURIComponent(recordID) +
          "/submit";
        return feedbackApiPost(submitURL, {
          CSRFToken: CSRF_TOKEN,
          stepID: FEEDBACK_STEP_ID,
        });
      });
    });
  }

  var feedbackModalTrigger = null;

  function ensureFeedbackModal() {
    if (document.getElementById("lpFeedbackModal")) return;
    var modal = document.createElement("div");
    modal.id = "lpFeedbackModal";
    modal.className = "lp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "lpFeedbackModalTitle");
    modal.setAttribute("hidden", "");
    modal.innerHTML =
      '<div class="modal-box modal-box--feedback">' +
      '<div class="modal-hd">' +
      '<p class="modal-hd-title" id="lpFeedbackModalTitle">Send Launchpad v2 Feedback</p>' +
      '<button class="modal-close modal-close--inline" id="lpFeedbackModalClose" aria-label="Close">' +
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.close +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="feedback-body">' +
      '<label class="feedback-label" for="lpFeedbackText">Share your feedback on Launchpad v2</label>' +
      '<textarea class="feedback-textarea" id="lpFeedbackText" rows="5" maxlength="4000"></textarea>' +
      '<p class="feedback-status" id="lpFeedbackStatus" role="status" aria-live="polite"></p>' +
      '<div class="feedback-actions">' +
      '<button class="btn btn-sec" type="button" id="lpFeedbackCancel">Cancel</button>' +
      '<button class="btn btn-primary" type="button" id="lpFeedbackSubmit">Submit</button>' +
      "</div>" +
      "</div>" +
      "</div>";
    document.body.appendChild(modal);

    var closeBtn = document.getElementById("lpFeedbackModalClose");
    var cancelBtn = document.getElementById("lpFeedbackCancel");
    closeBtn.addEventListener("click", closeFeedbackModal);
    cancelBtn.addEventListener("click", closeFeedbackModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeFeedbackModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
        closeFeedbackModal();
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

    var submitBtn = document.getElementById("lpFeedbackSubmit");
    submitBtn.addEventListener("click", function () {
      var textarea = document.getElementById("lpFeedbackText");
      var statusEl = document.getElementById("lpFeedbackStatus");
      var text = textarea.value.trim();
      if (!text) {
        statusEl.textContent = "Please enter some feedback first.";
        statusEl.classList.add("is-error");
        textarea.focus();
        return;
      }
      if (!CSRF_TOKEN) {
        statusEl.textContent =
          "Feedback can't be submitted right now (missing session token). Please try again later.";
        statusEl.classList.add("is-error");
        return;
      }

      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      statusEl.classList.remove("is-error");
      statusEl.textContent = "Submitting…";

      submitFeedback(text)
        .then(function () {
          statusEl.classList.remove("is-error");
          statusEl.textContent = "Thank you for your feedback!";
          textarea.value = "";
          /* Leave submitBtn disabled so the user can't double-submit the
             same feedback while the confirmation is showing. Cancel stays
             enabled as the obvious way to close out; the modal no longer
             auto-closes. */
          cancelBtn.disabled = false;
        })
        .catch(function (err) {
          console.error("[LP] Feedback submission failed:", err.message);
          statusEl.classList.add("is-error");
          statusEl.textContent = "Submission failed. Please try again.";
          submitBtn.disabled = false;
          cancelBtn.disabled = false;
        });
    });
  }

  function openFeedbackModal(trigger) {
    ensureFeedbackModal();
    var modal = document.getElementById("lpFeedbackModal");
    var textarea = document.getElementById("lpFeedbackText");
    var statusEl = document.getElementById("lpFeedbackStatus");
    var submitBtn = document.getElementById("lpFeedbackSubmit");
    var cancelBtn = document.getElementById("lpFeedbackCancel");
    if (!modal || !textarea || !statusEl) return;
    closeAnyOpenModal();
    feedbackModalTrigger = trigger || document.activeElement;
    statusEl.textContent = "";
    statusEl.classList.remove("is-error");
    textarea.value = "";
    /* A prior successful submit leaves Submit disabled (see the click
       handler above) to block double-submits while the confirmation is
       showing. Reset both buttons here so a reopened modal is fresh. */
    if (submitBtn) submitBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    textarea.focus();
  }

  function closeFeedbackModal() {
    var modal = document.getElementById("lpFeedbackModal");
    if (!modal || modal.hasAttribute("hidden")) return;
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (feedbackModalTrigger) {
      feedbackModalTrigger.focus();
      feedbackModalTrigger = null;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     USERS ONLINE BADGE
     Live count via Server-Sent Events (online-users/getonlineusers.php).
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
      document
        .querySelectorAll(".lp-internal-online-count")
        .forEach(function (el) {
          el.textContent = event.data;
        });
    };
    /* No onerror handling needed — EventSource auto-reconnects per
       spec; keeping the last known count visible is the right behavior. */
  }

  /* ─────────────────────────────────────────────────────────────
     ANNOUNCEMENT BANNER
     Global notice sourced from a LEAF indicator record (see
     ANNOUNCEMENT_* constants above). Only inserted when the record
     resolves to real content — never rendered empty/hidden.

     Dismissal is session-only: the close button just removes the DOM
     node — nothing persists, so the banner returns on next page load.
     This environment restricts browser storage, so there's no
     persistence layer; a "stay dismissed" behavior would need a
     server-side flag instead.
  ───────────────────────────────────────────────────────────── */
  var DOMPURIFY_SRC =
    "https://leaf.va.gov/app/libs/js/dompurify/dompurify.min.js";

  /* Reuses the DOMPurify <script src> lp_form_library.html already
     loads, rather than adding a second source. If that tag already
     exists in the document, waits on its load instead of duplicating it. */
  function ensureDompurify() {
    if (window.DOMPurify) return Promise.resolve();
    var existing = document.querySelector(
      'script[src="' + DOMPURIFY_SRC + '"]',
    );
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
          console.warn(
            "[LP] DOMPurify failed to load — announcement banner will not render",
          );
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
        console.warn(
          "[LP] DOMPurify failed to load — announcement banner will not render",
        );
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
     top offset (--lp-announcement-h, see leaf_header.css .lp-header)
     stays in sync if rich-text content reflows (window resize,
     multi-line wrapping, etc). */
  var _announcementResizeObserver = null;

  function setAnnouncementHeightVar(px) {
    document.documentElement.style.setProperty(
      "--lp-announcement-h",
      px + "px",
    );
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
          typeof rec.displayedValue === "string"
            ? rec.displayedValue.trim()
            : "";
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
     Injected once so every page gets the button automatically.

     Scroll container is always window — #lpSwapHost has no overflow
     set in launchpad.css, so fetched content scrolls the window, not
     the element (calling swapHost.scrollTo() silently no-ops).

     Click handler layers three approaches for VA iframe contexts and
     browsers that ignore { behavior: "smooth" }: direct scrollTop
     reset (documentElement, then body for Safari), then smooth scrollTo.
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
      '<span class="material-symbols-outlined" aria-hidden="true">' +
      ICON_SVG.arrow_upward +
      "</span>";
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

    /* Scroll shadow toggles on the header (the sticky element), not
       the inner nav, since it owns the sticky border/shadow. */
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