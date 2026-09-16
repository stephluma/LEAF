/*
 * MULTI-SITE LEAF GRID -- multigrid.js
 *
 * Host on the LEAF server and embed with:
 *   <div id="mst-root"></div>
 *   <script src="/custom/multigrid.js"
 *           data-user-id="<!--{$userID}-->" data-mount="mst-root"></script>
 *
 * data-user-id carries the Smarty-rendered value from the embedding .tpl --
 * Smarty placeholders don't render inside this external .js file, so it
 * must be passed in via the attribute. Omit data-mount to append to <body>.
 *
 * ASCII-only: non-ASCII bytes here have previously been corrupted by
 * deploy pipelines, silently breaking strings/comments. Keep it ASCII.
 *
 * All four tabs render through the single renderDataTable() below rather
 * than mixing a third-party grid widget with hand-rolled HTML, so chrome
 * and sort behavior stay identical across tabs, including the merged ones
 * (which combine rows from more than one LEAF site).
 */
(function () {
  "use strict";

  // Smarty here uses plain { / } delimiters, not the <!--{ / }-->
  // convention data-user-id was written assuming (meant to degrade to
  // an HTML comment if ever served unprocessed) -- so <!-- and -->
  // render as literal static text around the real value, e.g. userID 42
  // renders as "<!---->42<!---->", not "42". Strips those markers
  // before the value is used.
  function stripSmartyCommentWrapper(raw) {
    return typeof raw === "string" ? raw.replace(/<!--|-->/g, "").trim() : raw;
  }

  // -- Resolve config from the embedding <script> tag's data-attributes --
  var thisScript = document.currentScript;
  var cfg = {
    userID: stripSmartyCommentWrapper(
      thisScript ? thisScript.dataset.userId : undefined,
    ),
    mountId: thisScript ? thisScript.dataset.mount : undefined,
    triggerId: thisScript ? thisScript.dataset.trigger : undefined,
  };

  /*
   * SOURCE_SITES -- one entry per fetchable LEAF site (own recordID
   * sequence, own fetchSiteData() call). allRequestsLabel is this source's
   * "Site" value in the All Requests table; isLaunchpad:true switches to
   * the Date/Project/Status (Site Ready) column layout.
   */
  var SOURCE_SITES = {
    siteCreations: {
      url: "https://leaf.va.gov/launchpad/",
      name: "Site Creations",
      description: "LEAF sites you've requested",
      isLaunchpad: true,
      allRequestsLabel: "Site Creations",
    },
    serviceRequests: {
      url: "https://leaf.va.gov/platform/service_requests_launchpad/",
      name: "Service Requests",
      description:
        "your case studies, spotlight nominations, training requests, and feedback submissions",
      allRequestsLabel: "National Support",
    },
    support: {
      url: "https://leaf.va.gov/platform/support/",
      name: "Support",
      description: "your LEAF National consultation requests",
      allRequestsLabel: "National Support",
    },
    ideas: {
      url: "https://leaf.va.gov/platform/ideas/",
      name: "Ideas",
      description: "ideas you've submitted to improve LEAF",
      isIdeas: true,
      allRequestsLabel: "Ideas",
    },
    // Add more sources here
  };

  /*
   * TABS -- kind "all" aggregates every source into one table, "merged"
   * combines >1 source into one table (no per-row Source column), "single"
   * is one source/one table. Order here is tab display order.
   */
  var TABS = [
    {
      id: "all",
      name: "All Requests",
      kind: "all",
      sourceKeys: ["siteCreations", "serviceRequests", "support", "ideas"],
      description: "LEAF National requests",
    },
    {
      id: "siteCreations",
      name: "Site Creations",
      kind: "single",
      sourceKeys: ["siteCreations"],
    },
    {
      id: "nationalSupport",
      name: "National Support",
      kind: "merged",
      sourceKeys: ["serviceRequests", "support"],
      description: "support requests and consultations",
    },
    {
      id: "ideas",
      name: "Ideas",
      kind: "single",
      sourceKeys: ["ideas"],
    },
  ];

  // Prefer data-user-id (Smarty-rendered server-side, comment-wrapper
  // already stripped above); fall back to a `session` global if
  // present. A leftover "{$"/"{if" substring means Smarty never ran at
  // all (a different failure mode than the comment-wrapper one) --
  // still treated as invalid.
  var CURRENT_USER_ID =
    cfg.userID &&
    cfg.userID.indexOf("{$") === -1 &&
    cfg.userID.indexOf("{if") === -1
      ? cfg.userID
      : typeof session !== "undefined" && session && session.userID
        ? session.userID
        : cfg.userID;

  // Site Creations needs getData 17/21/22 (server/dir/site name) for the
  // Site Ready link. Ideas needs getData 12 (custom status field) and
  // excludes categoryID form_57e89 submissions, which shouldn't appear here.
  function myRecordsQuery(site) {
    var query = {
      terms: [
        { id: "userID", operator: "=", match: CURRENT_USER_ID, gate: "AND" },
        { id: "deleted", operator: "=", match: 0, gate: "AND" },
      ],
      joins: ["service", "status"],
      sort: { column: "recordID", direction: "DESC" },
      limit: 500,
      extraParams:
        "&x-filterData=recordID,userID,title,service,date,lastStatus,stepTitle,stepID,blockingStepID,submitted,deleted",
    };

    if (site && site.isLaunchpad) {
      query.getData = [17, 21, 22];
    }
    if (site && site.isIdeas) {
      query.getData = [12];
      query.terms.push({
        id: "categoryID",
        operator: "!=",
        match: "form_57e89",
        gate: "AND",
      });
    }

    return query;
  }

  // Shared MM/DD/YYYY formatter for all tabs (replaces old locale-dependent
  // toLocaleDateString() calls, so every tab's Date column matches).
  function formatDateMDY(epochSeconds) {
    if (!epochSeconds) return "";
    var d = new Date(epochSeconds * 1000);
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return mm + "/" + dd + "/" + String(d.getFullYear());
  }

  // Status helpers: all per-origin Status logic lives here once and is
  // reused by every column builder, which is what keeps merged tabs safe.

  // Plain-text status -> HTML, with red-italic styling for "Not Submitted".
  function statusHTMLFor(text) {
    if (text === "Not Submitted") {
      return '<span class="mst-status-not-submitted">' + text + "</span>";
    }
    return "<span>" + text + "</span>";
  }

  // Ideas uses its custom id12 status field; Service Requests/Support share
  // lastStatus. FLAG: this can't tell those two apart once merged -- if
  // either ever needs its own status field, add a per-source branch here.
  function statusTextForSource(sourceKey, rec) {
    var source = SOURCE_SITES[sourceKey];
    if (source.isIdeas) {
      var v =
        rec && rec.s1 && rec.s1.id12 !== undefined && rec.s1.id12 !== null
          ? rec.s1.id12
          : "";
      return v || "Not Submitted";
    }
    return rec && rec.lastStatus ? rec.lastStatus : "Not Submitted";
  }

  // Site Ready link once s1.id17/id21/id22 are populated, else a dash.
  // Returns HTML directly (not via statusHTMLFor) since this is a button.
  function launchpadStatusHTML(rec) {
    rec = rec || {};
    if (
      rec.s1 !== undefined &&
      rec.s1.id17 !== undefined &&
      rec.s1.id22 !== undefined &&
      rec.s1.id21 !== undefined &&
      rec.s1.id21 !== ""
    ) {
      var siteURL =
        "https://" + rec.s1.id17 + "/" + rec.s1.id22 + "/" + rec.s1.id21;
      return (
        '<a href="' +
        siteURL +
        '" class="mst-site-ready-btn" target="_blank">Site Ready</a>'
      );
    }
    return "-";
  }

  // All Requests' Status column: routes to launchpadStatusHTML for Site
  // Creations rows, the generic/Ideas text logic for everything else.
  function allRequestsStatusHTML(sourceKey, rec) {
    var source = SOURCE_SITES[sourceKey];
    if (source.isLaunchpad) return launchpadStatusHTML(rec);
    return statusHTMLFor(statusTextForSource(sourceKey, rec));
  }

  // Sort key for Launchpad Status: no numeric/text value exists, just
  // "has a Site Ready link" or not.
  function launchpadStatusSortValue(rec) {
    return launchpadStatusHTML(rec) === "-" ? "-" : "Site Ready";
  }

  // Shared "badge recordID + title link" cell -- used by Site Creations'
  // Project column and by the All Requests Request column.
  function requestCellHTML(link, recordID, title) {
    return (
      '<span class="mst-lp-recid">' +
      '<a href="' +
      link +
      '" tabindex="-1" target="_blank">' +
      recordID +
      "</a>" +
      "</span> " +
      '<a href="' +
      link +
      '" target="_blank">' +
      title +
      "</a>"
    );
  }

  // Material Symbols arrow icons, inlined per this codebase's convention
  // (bare svg, sized via CSS on the containing .mst-sort-btn class).
  var SORT_ASC_SVG =
    '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>';
  var SORT_DESC_SVG =
    '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"/></svg>';

  // -- Column definitions: one builder per table shape --
  // Each column has getValue(row) (plain value, for sorting) and
  // render(row) (cell HTML) -- split so richly-marked-up cells can still
  // sort on plain text.

  // Shared 3-column layout (Date Initiated, Request, Status) for National
  // Support and Ideas, using requestCellHTML() so all four tabs match.
  function buildGenericColumns() {
    return [
      {
        name: "Date Initiated",
        getValue: function (row) {
          return row.dateEpoch;
        },
        render: function (row) {
          return formatDateMDY(row.rec.date);
        },
      },
      {
        name: "Request",
        // Sorts by title, not recordID -- recordIDs are independent per
        // site, so a numeric sort is meaningless once sources are merged.
        getValue: function (row) {
          return (row.rec.title || "").toLowerCase();
        },
        render: function (row) {
          return requestCellHTML(row.link, row.recordID, row.rec.title || "");
        },
      },
      {
        name: "Status",
        getValue: function (row) {
          return statusTextForSource(row.sourceKey, row.rec);
        },
        render: function (row) {
          return statusHTMLFor(statusTextForSource(row.sourceKey, row.rec));
        },
      },
    ];
  }

  // Site Creations layout: Date, Project, Status. FLAG: Status here is a
  // "Site Ready" link/dash, not status text -- the one cell that
  // legitimately differs in content from the other tabs' Status column.
  function buildLaunchpadColumns() {
    return [
      {
        name: "Date",
        getValue: function (row) {
          return row.dateEpoch;
        },
        render: function (row) {
          return formatDateMDY(row.rec.date);
        },
      },
      {
        name: "Project",
        getValue: function (row) {
          return (row.rec.title || "").toLowerCase();
        },
        render: function (row) {
          return requestCellHTML(row.link, row.recordID, row.rec.title || "");
        },
      },
      {
        name: "Status",
        getValue: function (row) {
          return launchpadStatusSortValue(row.rec);
        },
        render: function (row) {
          return launchpadStatusHTML(row.rec);
        },
      },
    ];
  }

  // All Requests layout: Date, Site, Request, Status -- Status routes by
  // source origin via allRequestsStatusHTML() rather than re-deriving logic here.
  function buildAllRequestsColumns() {
    return [
      {
        name: "Date",
        getValue: function (row) {
          return row.dateEpoch;
        },
        render: function (row) {
          return formatDateMDY(row.rec.date);
        },
      },
      {
        name: "Site",
        getValue: function (row) {
          return row.site.allRequestsLabel;
        },
        render: function (row) {
          return row.site.allRequestsLabel;
        },
      },
      {
        name: "Request",
        getValue: function (row) {
          return (row.rec.title || "").toLowerCase();
        },
        render: function (row) {
          return requestCellHTML(row.link, row.recordID, row.rec.title || "");
        },
      },
      {
        name: "Status",
        getValue: function (row) {
          var source = SOURCE_SITES[row.sourceKey];
          return source.isLaunchpad
            ? launchpadStatusSortValue(row.rec)
            : statusTextForSource(row.sourceKey, row.rec);
        },
        render: function (row) {
          return allRequestsStatusHTML(row.sourceKey, row.rec);
        },
      },
    ];
  }

  // -- Runtime --

  var siteState = {}; // keyed by source.url -- { data, rendered, error }
  var mstRootEl = null; // set by buildShell -- the container passed to buildAndLoadGrid
  var sortState = {}; // keyed by tab.id -- { columnIndex, direction }

  function stateKey(source) {
    return source.url;
  }

  function isSourcePending(key) {
    var s = siteState[stateKey(SOURCE_SITES[key])];
    return !s || (!s.data && !s.error);
  }
  function isSourceErrored(key) {
    var s = siteState[stateKey(SOURCE_SITES[key])];
    return !!(s && s.error);
  }

  async function fetchSiteData(site) {
    var rawQuery = myRecordsQuery(site);
    var extraParams = rawQuery.extraParams || "";
    var query = Object.assign({}, rawQuery);
    delete query.extraParams;

    if (typeof LeafFormQuery !== "undefined") {
      var q = new LeafFormQuery();
      q.setRootURL(site.url);
      q.importQuery(query);
      // importQuery() drops `sort` -- apply it explicitly or results come back unordered.
      if (query.sort && query.sort.column) {
        q.sort(query.sort.column, query.sort.direction || "DESC");
      }
      // `limit` is also dropped by importQuery(), but that's fine -- execute()
      // falls through to getBulkData(), which paginates internally (batchSize 500).
      if (extraParams) {
        q.setExtraParams(extraParams);
      }
      return q.execute();
    }

    // Raw fetch fallback with pagination.
    var results = {};
    var batchSize = query.limit || 500;
    var offset = 0;

    while (true) {
      var pagedQuery = Object.assign({}, query, {
        limit: batchSize,
        limitOffset: offset,
      });
      var resp = await fetch(
        site.url +
          "api/form/query?q=" +
          encodeURIComponent(JSON.stringify(pagedQuery)) +
          extraParams,
        { credentials: "include" },
      );
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status + " from " + site.url);
      }

      var batch = await resp.json();

      if (batch && typeof batch === "object" && !Array.isArray(batch)) {
        Object.assign(results, batch);
      }

      var leafHeader =
        resp.headers.get("LEAF-Query") || resp.headers.get("leaf-query") || "";
      var batchCount =
        batch && typeof batch === "object" && !Array.isArray(batch)
          ? Object.keys(batch).length
          : 0;

      if (batchCount < batchSize && leafHeader !== "continue") {
        break;
      }
      offset += batchSize;
    }

    return results;
  }

  // Row key is `${site.url}__${recordID}` -- recordIDs aren't globally
  // unique since each LEAF site has its own independent sequence.
  function rowsForSource(sourceKey) {
    var source = SOURCE_SITES[sourceKey];
    var state = siteState[stateKey(source)];
    if (!state || !state.data) return [];
    return Object.keys(state.data).map(function (recordID) {
      var rec = state.data[recordID] || {};
      return {
        key: source.url + "__" + recordID,
        recordID: recordID,
        sourceKey: sourceKey,
        site: source,
        rec: rec,
        dateEpoch: rec.date || 0,
        link: source.url + "index.php?a=printview&recordID=" + recordID,
      };
    });
  }

  function rowsForSources(sourceKeys) {
    var rows = [];
    sourceKeys.forEach(function (k) {
      rows = rows.concat(rowsForSource(k));
    });
    return rows;
  }

  // Shared table renderer used by all four tabs. Header is a real <button>
  // (Enter/Space work without extra keyboard handling); aria-sort on the
  // <th> tracks state. Sort state persists per tab.id so switching tabs
  // doesn't reset the user's chosen sort.
  function renderDataTable(bodyEl, tableId, columns, rows, opts) {
    opts = opts || {};
    var state = sortState[tableId];
    if (!state) {
      state = {
        columnIndex: opts.defaultSortIndex != null ? opts.defaultSortIndex : 0,
        direction: opts.defaultSortDir || "desc",
      };
      sortState[tableId] = state;
    }

    function sortedRows() {
      var col = columns[state.columnIndex];
      if (!col) return rows;
      var copy = rows.slice();
      copy.sort(function (a, b) {
        var va = col.getValue(a);
        var vb = col.getValue(b);
        var cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return state.direction === "asc" ? cmp : -cmp;
      });
      return copy;
    }

    function draw() {
      var sorted = sortedRows();

      var headHTML = columns
        .map(function (col, i) {
          var dir = i === state.columnIndex ? state.direction : null;
          var ariaSort =
            dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
          // No icon for unsorted state -- aria-sort on the <th> is the
          // source of truth for AT users; the icon is sighted-user only.
          var iconHTML = "";
          if (dir === "asc") {
            iconHTML =
              '<span class="material-symbols-outlined" aria-hidden="true">' +
              SORT_ASC_SVG +
              "</span>";
          } else if (dir === "desc") {
            iconHTML =
              '<span class="material-symbols-outlined" aria-hidden="true">' +
              SORT_DESC_SVG +
              "</span>";
          }
          return (
            '<th scope="col" aria-sort="' +
            ariaSort +
            '">' +
            '<button type="button" class="mst-sort-btn" data-col-index="' +
            i +
            '">' +
            col.name +
            iconHTML +
            "</button></th>"
          );
        })
        .join("");

      var rowsHTML = sorted
        .map(function (row) {
          return (
            '<tr data-rowkey="' +
            row.key +
            '">' +
            columns
              .map(function (col) {
                return "<td>" + col.render(row) + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("");

      if (!sorted.length) {
        rowsHTML =
          '<tr><td colspan="' +
          columns.length +
          '" class="mst-empty">No records found.</td></tr>';
      }

      var tableClass = "ip-table" + (opts.extraTableClass ? " " + opts.extraTableClass : "");
      var tableHTML =
        '<div class="ip-tableWrap"><table class="' +
        tableClass +
        '"><thead><tr>' +
        headHTML +
        "</tr></thead><tbody>" +
        rowsHTML +
        "</tbody></table></div>";

      bodyEl.innerHTML = (opts.beforeHTML || "") + tableHTML + (opts.afterHTML || "");

      bodyEl.querySelectorAll(".mst-sort-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-col-index"), 10);
          if (state.columnIndex === idx) {
            state.direction = state.direction === "asc" ? "desc" : "asc";
          } else {
            state.columnIndex = idx;
            state.direction = "asc";
          }
          draw();
          var refocus = bodyEl.querySelectorAll(".mst-sort-btn")[idx];
          if (refocus) refocus.focus();
        });
      });
    }

    draw();
  }

  // -- Single-source tab (Site Creations, Ideas) ---------------------------
  function renderSingleSourceTab(tab, bodyEl) {
    var sourceKey = tab.sourceKeys[0];
    var source = SOURCE_SITES[sourceKey];
    var state = siteState[stateKey(source)];
    if (!state) return;

    if (state.error) {
      bodyEl.innerHTML =
        '<p class="ip-error">Error loading data from ' +
        source.url +
        ". Check your network access and permissions.</p>";
      return;
    }
    if (!state.data) return;

    var rows = rowsForSource(sourceKey);
    var columns = source.isLaunchpad
      ? buildLaunchpadColumns()
      : buildGenericColumns();
    renderDataTable(bodyEl, tab.id, columns, rows, {
      defaultSortIndex: 0,
      defaultSortDir: "desc",
    });
  }

  // Renders whatever's already resolved per source and appends a
  // pending/error banner, rather than blocking on the slowest fetch.
  function renderMergedTab(tab, bodyEl, columns) {
    var rows = rowsForSources(tab.sourceKeys);
    var erroredKeys = tab.sourceKeys.filter(isSourceErrored);
    var pending = tab.sourceKeys.some(isSourcePending);

    var beforeHTML = erroredKeys
      .map(function (k) {
        return (
          '<p class="ip-error">Error loading data from ' +
          SOURCE_SITES[k].url +
          ". Check your network access and permissions.</p>"
        );
      })
      .join("");
    var afterHTML = pending
      ? '<p class="mst-loading-more" role="status">Loading more requests&hellip;</p>'
      : "";

    renderDataTable(bodyEl, tab.id, columns, rows, {
      defaultSortIndex: 0,
      defaultSortDir: "desc",
      beforeHTML: beforeHTML,
      afterHTML: afterHTML,
      extraTableClass: tab.kind === "all" ? "mst-table-all" : "",
    });
  }

  // -- Tab dispatch ----------------------------------------------------------
  function renderTabContent(tabIndex) {
    var tab = TABS[tabIndex];
    var bodyEl = document.getElementById("mst-body-" + tabIndex);
    if (!tab || !bodyEl) return;

    if (tab.kind === "single") {
      renderSingleSourceTab(tab, bodyEl);
    } else if (tab.kind === "merged") {
      renderMergedTab(tab, bodyEl, buildGenericColumns());
    } else if (tab.kind === "all") {
      renderMergedTab(tab, bodyEl, buildAllRequestsColumns());
    }
  }

  function getActiveTabIndex() {
    var activeBtn = mstRootEl && mstRootEl.querySelector(".ip-tab.is-active");
    if (!activeBtn) return 0;
    var idx = parseInt(activeBtn.id.replace("mst-tab-", ""), 10);
    return isNaN(idx) ? 0 : idx;
  }

  function activateTab(idx) {
    document.querySelectorAll(".ip-tab").forEach(function (btn, i) {
      var active = i === idx;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
      btn.setAttribute("tabindex", active ? "0" : "-1");
    });
    document.querySelectorAll(".ip-panel").forEach(function (panel, i) {
      panel.classList.toggle("is-active", i === idx);
    });
    updateSiteSummaryForTab(idx);
    renderTabContent(idx);
  }

  // Summary line: "<Tab Name> -- Showing N <description>". Single-source
  // tabs show an exact count; merged/all tabs show a running total with a
  // "+" suffix while sources are still pending.
  function updateSiteSummaryForTab(idx) {
    var el = mstRootEl && mstRootEl.querySelector("#mst-site-summary");
    if (!el) return;
    var tab = TABS[idx];
    if (!tab) return;

    var name, description, countText;

    if (tab.kind === "single") {
      var source = SOURCE_SITES[tab.sourceKeys[0]];
      var state = siteState[stateKey(source)];
      name = source.name;
      description = source.description;
      countText =
        state && state.data ? String(Object.keys(state.data).length) : "...";
    } else {
      name = tab.name;
      description = tab.description;
      var loadedCount = 0;
      var anyLoaded = false;
      tab.sourceKeys.forEach(function (k) {
        var s = siteState[stateKey(SOURCE_SITES[k])];
        if (s && s.data) {
          loadedCount += Object.keys(s.data).length;
          anyLoaded = true;
        }
      });
      var pending = tab.sourceKeys.some(isSourcePending);
      countText = anyLoaded
        ? String(loadedCount) + (pending ? "+" : "")
        : "...";
    }

    el.innerHTML =
      '<span class="mst-site-summary-name">' +
      name +
      "</span>" +
      '<span class="mst-site-summary-sep"> -- </span>' +
      '<span class="mst-site-summary-desc">Showing ' +
      countText +
      " " +
      (description || "") +
      "</span>";
  }

  function buildShell(rootEl) {
    mstRootEl = rootEl;
    rootEl.innerHTML =
      '<div class="smarty-root">' +
      '<div class="ip-wrap">' +
      '<p class="mst-help-text mst-help-sites">Select a tab to view your LEAF National requests.</p>' +
      '<div class="ip-tabsRow"><ul class="ip-tabs" id="mst-tablist" role="tablist" aria-label="LEAF Sites" style="list-style:none; margin:0;"></ul></div>' +
      '<p class="mst-site-summary" id="mst-site-summary"></p>' +
      '<div id="mst-panels"></div>' +
      "</div>" +
      "</div>";

    var tabList = rootEl.querySelector("#mst-tablist");
    var panelsRoot = rootEl.querySelector("#mst-panels");

    TABS.forEach(function (tab, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "presentation");
      li.style.margin = "0";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ip-tab" + (i === 0 ? " is-active" : "");
      btn.id = "mst-tab-" + i;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.setAttribute("aria-controls", "mst-panel-" + i);
      btn.setAttribute("tabindex", i === 0 ? "0" : "-1");
      btn.textContent = tab.name;

      btn.addEventListener(
        "click",
        (function (idx) {
          return function () {
            activateTab(idx);
          };
        })(i),
      );

      btn.addEventListener(
        "keydown",
        (function (idx) {
          return function (e) {
            var next = idx;
            if (e.key === "ArrowRight") {
              next = (idx + 1) % TABS.length;
            } else if (e.key === "ArrowLeft") {
              next = (idx - 1 + TABS.length) % TABS.length;
            } else {
              return;
            }
            e.preventDefault();
            activateTab(next);
            document.getElementById("mst-tab-" + next).focus();
          };
        })(i),
      );

      li.appendChild(btn);
      tabList.appendChild(li);
    });

    TABS.forEach(function (tab, i) {
      var panel = document.createElement("div");
      panel.className = "ip-panel" + (i === 0 ? " is-active" : "");
      panel.id = "mst-panel-" + i;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "mst-tab-" + i);

      panel.innerHTML = '<div id="mst-body-' + i + '"></div>';
      panelsRoot.appendChild(panel);
    });
  }

  // -- Modal shell: overlay, focus trap, Escape-to-close, focus return --------
  var modalState = {
    overlay: null,
    bodyEl: null,
    lastFocused: null,
    built: false, // grid shell + data fetch kicked off
    keydownHandler: null,
  };

  function buildModalShell() {
    var overlay = document.createElement("div");
    overlay.className = "mst-modal-overlay";
    overlay.id = "mst-modal-overlay";
    overlay.hidden = true;

    overlay.innerHTML =
      '<div class="mst-modal" role="dialog" aria-modal="true" aria-labelledby="mst-modal-title">' +
      '<div class="mst-modal-hd">' +
      '<h2 class="mst-modal-title" id="mst-modal-title">View My Requests (LEAF National Requests)</h2>' +
      '<button type="button" class="mst-modal-close" id="mst-modal-close" aria-label="Close dialog">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="mst-modal-body" id="mst-modal-body"></div>' +
      "</div>";

    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay
      .querySelector("#mst-modal-close")
      .addEventListener("click", closeModal);

    modalState.overlay = overlay;
    modalState.bodyEl = overlay.querySelector("#mst-modal-body");
    modalState.bodyEl.classList.add("mst-container");
  }

  function getFocusable(container) {
    return Array.prototype.slice
      .call(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      )
      .filter(function (el) {
        return el.offsetParent !== null;
      });
  }

  function trapFocus(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;

    var focusable = getFocusable(modalState.overlay);
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function openModal() {
    if (!modalState.overlay) buildModalShell();

    modalState.lastFocused = document.activeElement;
    modalState.overlay.hidden = false;
    document.body.style.overflow = "hidden";

    modalState.keydownHandler = trapFocus;
    document.addEventListener("keydown", modalState.keydownHandler);

    if (!modalState.built) {
      modalState.built = true;
      await buildAndLoadGrid(modalState.bodyEl);
    }

    var focusable = getFocusable(modalState.overlay);
    (
      focusable[0] || modalState.overlay.querySelector(".mst-modal-close")
    ).focus();
  }

  function closeModal() {
    if (!modalState.overlay || modalState.overlay.hidden) return;
    modalState.overlay.hidden = true;
    document.body.style.overflow = "";
    if (modalState.keydownHandler) {
      document.removeEventListener("keydown", modalState.keydownHandler);
    }
    if (
      modalState.lastFocused &&
      typeof modalState.lastFocused.focus === "function"
    ) {
      modalState.lastFocused.focus();
    }
  }

  // -- Inject scoped stylesheet once -------------------------------------------
  function injectStyles() {
    if (document.getElementById("mst-styles")) return;
    var style = document.createElement("style");
    style.id = "mst-styles";
    style.textContent = [
      ".mst-container{color-scheme:light;}",
      ".mst-container *{box-sizing:border-box;}",
      '.mst-container .ip-wrap{max-width:var(--max,1200px);margin:0 auto;padding:0 8px;font-family:"Source Sans 3","Source Sans Pro",sans-serif;color:var(--c-text,#1b1b1b);}',
      ".mst-container .ip-header{display:none;}",
      ".mst-container .ip-panelDesc{font-size:0.875rem;color:var(--c-muted,#3d4551);margin:0 0 0.5rem 0;line-height:1.5;}",
      ".mst-container .ip-tab:focus-visible,.mst-container .ip-table td a:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}",
      ".mst-container .ip-tabs{display:inline-flex;gap:6px;padding:6px;background:var(--lp-bg-alt,#eff6fb);border-radius:999px;border:1px solid var(--c-blue10,#d9e8f6);}",
      ".mst-container .ip-tabsRow{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:6px;flex-wrap:wrap;}",
      '.mst-container .ip-tab{border:0;background:transparent;padding:8px 16px;border-radius:999px;font-family:"Public Sans",sans-serif;font-weight:700;font-size:16px;cursor:pointer;color:var(--c-muted,#3d4551);border-bottom:3px solid transparent;transition:border-color .2s,color .2s;}',
      ".mst-container .ip-tab.is-active{background:var(--lp-bg,#fff);color:var(--lp-accent,#005ea2);box-shadow:0 2px 8px rgba(0,10,40,.06);border-bottom:3px solid var(--lp-accent,#005ea2);}",
      ".mst-container .ip-tab:hover:not(.is-active){border-bottom:3px solid var(--c-blue20,#aacdec);color:var(--lp-hl,#1a4480);}",
      ".mst-container .ip-panel{display:none;}",
      ".mst-container .ip-panel.is-active{display:block;}",
      ".mst-container .ip-tableWrap{background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px);padding:20px;box-shadow:0 2px 8px rgba(0,10,40,.06);border:1px solid var(--c-blue10,#d9e8f6);overflow-x:auto;width:100%;}",

      // Shared table chrome -- identical header, borders, padding, striping across tabs.
      ".mst-container .ip-table{width:100%;border-collapse:collapse;table-layout:auto;background:#fff;min-width:840px;font-size:16px;}",
      ".mst-container .ip-table td{border:1px solid var(--c-gray20,#c9c9c9);padding:10px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;text-align:left;}",
      '.mst-container .ip-table th{border:1px solid var(--c-gray20,#c9c9c9);padding:0;vertical-align:top;text-align:left;background:var(--c-blue10,#d9e8f6);font-family:"Public Sans",sans-serif;font-weight:700;color:var(--lp-hl,#1a4480);user-select:none;}',
      ".mst-container .ip-table tbody tr:nth-child(even){background:var(--c-gray5,#f0f0f0);}",
      ".mst-container .ip-table tbody tr:hover{background:var(--lp-bg-alt,#eff6fb);}",
      ".mst-container .ip-table td a{color:var(--lp-accent,#005ea2);text-decoration:none;}",
      ".mst-container .ip-table td a:hover{text-decoration:underline;}",
      ".mst-container .ip-error{color:#b91c1c;font-size:14px;font-weight:600;}",
      ".mst-container .mst-status-not-submitted{color:#b91c1c;font-style:italic;font-size:0.875em;}",
      ".mst-container .mst-empty{text-align:center;color:var(--c-muted,#3d4551);}",

      // Real <button> header controls handle Enter/Space activation natively.
      '.mst-container .mst-sort-btn{display:flex;align-items:center;gap:4px;width:100%;border:0;background:transparent;color:inherit;font:inherit;font-weight:700;text-align:left;cursor:pointer;padding:10px;}',
      ".mst-container .mst-sort-btn:hover{background:var(--c-blue20,#aacdec);}",
      ".mst-container .mst-sort-btn:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:-3px;}",
      // Sized via the containing .mst-sort-btn class (same technique as
      // .hero-kicker/.btn/.feat-ico icons in view_homepage.tpl).
      ".mst-container .mst-sort-btn .material-symbols-outlined svg{width:1rem;height:1rem;}",

      /* -- Launchpad-specific column styling -- */
      ".mst-container .mst-lp-recid a{display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;background:var(--c-text,#1b1b1b);color:#fff !important;border-radius:var(--r,5px);font-weight:900;font-size:1em;line-height:1;text-decoration:none;text-align:center;}",
      ".mst-container .mst-lp-recid a:hover,.mst-container .mst-lp-recid a:focus{background:var(--c-muted,#3d4551);color:#fff !important;}",
      ".mst-container .mst-site-ready-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--r,5px);border:1px solid var(--c-blue20,#aacdec);background:var(--lp-bg-alt,#eff6fb);color:var(--lp-accent,#005ea2);font-weight:700;text-decoration:none;}",
      ".mst-container .mst-site-ready-btn:hover{background:var(--c-blue10,#d9e8f6);text-decoration:none;}",
      ".mst-container .mst-site-ready-btn:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}",

      // Date/Site/Status fixed-width & non-wrapping, Request flexible & wraps --
      // same nth-child + width/white-space technique used elsewhere in .ip-table.
      ".mst-container .mst-table-all th:nth-child(1),.mst-container .mst-table-all td:nth-child(1){width:110px;white-space:nowrap;}",
      ".mst-container .mst-table-all th:nth-child(2),.mst-container .mst-table-all td:nth-child(2){width:140px;white-space:nowrap;}",
      ".mst-container .mst-table-all th:nth-child(3),.mst-container .mst-table-all td:nth-child(3){width:auto;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;}",
      ".mst-container .mst-table-all th:nth-child(4),.mst-container .mst-table-all td:nth-child(4){width:130px;white-space:nowrap;}",

      /* -- Partial-loading indicator (All Requests / National Support) -- */
      ".mst-container .mst-loading-more{margin:10px 0 0;font-size:0.875rem;font-style:italic;color:var(--c-muted,#3d4551);}",

      "@media (max-width:780px){.mst-container .ip-tabs{width:100%;flex-wrap:wrap;justify-content:center;}.mst-container .ip-tabsRow{justify-content:center;}.mst-container .ip-table{display:block;overflow-x:auto;white-space:nowrap;}}",

      /* -- Modal shell -- */
      ".mst-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:1000;}",
      ".mst-modal-overlay[hidden]{display:none;}",
      ".mst-modal{background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px);max-width:1200px;width:100%;max-height:calc(100vh - 80px);box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto 0;display:flex;flex-direction:column;overflow:hidden;}",
      ".mst-modal-hd{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;border-bottom:1px solid var(--c-blue10,#d9e8f6);background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px) var(--r-lg,8px) 0 0;flex:0 0 auto;}",
      '.mst-modal-title{margin:0;font-family:"Public Sans",sans-serif;font-size:1.35rem;font-weight:800;color:var(--lp-hl,#1a4480);}',
      ".mst-modal-close{border:0;background:transparent;cursor:pointer;color:var(--c-muted,#3d4551);padding:8px;border-radius:999px;line-height:0;flex:0 0 auto;}",
      ".mst-modal-close:hover{background:var(--lp-bg-alt,#eff6fb);}",
      ".mst-modal-close:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}",
      // Sized via .mst-modal-close (not the <svg> itself); px not rem so it
      // can't shift with a different root font-size.
      ".mst-modal-close svg{width:24px;height:24px;}",
      ".mst-modal-body{padding:20px 24px 28px;overflow-y:auto;flex:1 1 auto;position:relative;}",
      /* Defensive: if a page embedding this modal also loads LeafFormGrid's
         CSS elsewhere, its thead sticky positioning would otherwise leak in. */
      ".mst-modal-body table thead,",
      ".mst-modal-body table thead tr,",
      ".mst-modal-body table thead th,",
      ".mst-modal-body .ip-table thead,",
      ".mst-modal-body .ip-table thead tr,",
      ".mst-modal-body .ip-table thead th{",
      "position:static !important;",
      "top:auto !important;",
      "inset:auto !important;",
      "z-index:auto !important;",
      "}",
      "@media (prefers-reduced-motion: no-preference){.mst-modal-overlay{animation:mst-fade .15s ease-out;}}",
      "@keyframes mst-fade{from{opacity:0;}to{opacity:1;}}",

      /* -- Helper text -- */
      ".mst-help-text{font-size:0.8125rem;color:var(--c-muted,#3d4551);margin:0 0 10px 0;line-height:1.4;}",
      ".mst-help-text.mst-help-sites{margin-bottom:6px;}",

      /* -- Site summary heading: "<Tab Name> -- Showing N <description>" -- */
      ".mst-site-summary{margin:0 0 18px 0;padding:10px 0 14px 0;border-bottom:1px solid var(--c-blue10,#d9e8f6);font-size:1rem;line-height:1.4;}",
      '.mst-site-summary-name{font-family:"Public Sans",sans-serif;font-weight:800;color:var(--lp-hl,#1a4480);font-size:1.05rem;}',
      ".mst-site-summary-sep{color:var(--c-gray20,#c9c9c9);}",
      ".mst-site-summary-desc{color:var(--c-muted,#3d4551);}",
    ].join("\n");
    document.head.appendChild(style);
  }

  // -- Entry point --------------------------------------------------------------
  function onSourceSettled(sourceKey) {
    var activeIdx = getActiveTabIndex();
    var tab = TABS[activeIdx];
    if (!tab || tab.sourceKeys.indexOf(sourceKey) === -1) return;
    updateSiteSummaryForTab(activeIdx);
    renderTabContent(activeIdx);
  }

  async function buildAndLoadGrid(rootEl) {
    buildShell(rootEl);

    var sourceKeys = Object.keys(SOURCE_SITES);
    sourceKeys.forEach(function (key) {
      siteState[stateKey(SOURCE_SITES[key])] = {
        data: null,
        rendered: false,
        error: null,
      };
    });

    // Paint whatever's already known (covers modal re-entry) before
    // kicking off the fetches below.
    updateSiteSummaryForTab(getActiveTabIndex());
    renderTabContent(getActiveTabIndex());

    var fetches = sourceKeys.map(function (key) {
      var source = SOURCE_SITES[key];
      return fetchSiteData(source)
        .then(function (data) {
          siteState[stateKey(source)].data = data;
          onSourceSettled(key);
        })
        .catch(function (err) {
          siteState[stateKey(source)].error = err;
          console.error("[MultiSiteGrid] failed:", source.url, err);
          onSourceSettled(key);
        });
    });

    await Promise.allSettled(fetches);
  }

  function init() {
    injectStyles();

    var trigger = cfg.triggerId ? document.getElementById(cfg.triggerId) : null;

    if (trigger) {
      // Modal mode: build the overlay lazily, load grid data on first open only.
      trigger.addEventListener("click", openModal);
      return;
    }

    // Fallback: no trigger configured -- mount inline at data-mount (or
    // append to body).
    var rootEl = cfg.mountId ? document.getElementById(cfg.mountId) : null;
    if (!rootEl) {
      rootEl = document.createElement("div");
      document.body.appendChild(rootEl);
    }
    rootEl.classList.add("mst-container");
    buildAndLoadGrid(rootEl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();