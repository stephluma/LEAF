/*
 * ============================================================
 *  MULTI-SITE LEAF GRID  --  multi-site-grid.js
 * ============================================================
 *
 *  Host this file on your LEAF server (e.g. /custom/multi-site-grid.js)
 *  and embed it on any page with:
 *
 *    <div id="mst-root"></div>
 *    <script src="/custom/multi-site-grid.js"
 *            data-user-id="<!--{$userID}-->"
 *            data-mount="mst-root"></script>
 *
 *  The data-user-id attribute carries the Smarty-rendered value from the
 *  embedding page. Smarty placeholders only render inside .tpl files parsed
 *  by the Smarty engine -- they will NOT render inside this external .js
 *  file, so they must be passed in this way rather than hardcoded here.
 *
 *  If data-mount is omitted, the script appends itself to <body>.
 *
 *  NOTE: This file intentionally uses plain ASCII only (no smart quotes,
 *  em dashes, box-drawing characters, etc.). Non-ASCII bytes in this file
 *  have previously been corrupted by upload/deploy pipelines with
 *  mismatched character encoding, which can silently break string
 *  literals or comment delimiters and cause syntax errors in production
 *  even though the file parses fine in an editor. Keep it ASCII-only.
 * ============================================================
 */
(function () {
  'use strict';

  // -- Resolve config from the embedding <script> tag's data-attributes --
  var thisScript = document.currentScript;
  var cfg = {
    userID: thisScript ? thisScript.dataset.userId : undefined,
    mountId: thisScript ? thisScript.dataset.mount : undefined,
    triggerId: thisScript ? thisScript.dataset.trigger : undefined,
  };

  /*
   *  Add one object per LEAF site you want to display.
   *  Required:
   *    url         - Full URL to the LEAF_Request_Portal, with trailing slash
   *    name        - Label shown on the tab
   *    description - Continuation clause used in the summary heading:
   *                   "<Site Name> -- Showing N <description>"
   *
   *  Set isLaunchpad: true on a site to use the Date/Project/Status
   *  (with Site Ready button) column layout instead of the default
   *  UID/Requestor/Title/Status/Date Initiated layout.
   */
  var SITES = [
    { url: 'https://leaf.va.gov/launchpad/',                           name: 'Launchpad',        description: "the LEAF sites you've created",                                                          isLaunchpad: true },
    { url: 'https://leaf.va.gov/platform/service_requests_launchpad/', name: 'Service Requests', description: 'your case studies, spotlight nominations, training requests, and feedback submissions' },
    { url: 'https://leaf.va.gov/platform/support/',                    name: 'Support',          description: 'your LEAF National consultation requests' },
    { url: 'https://leaf.va.gov/platform/ideas/',                      name: 'Ideas',            description: "the ideas you've submitted to improve LEAF",                                             isIdeas: true },
    // Add more sites here
  ];

  var MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  var REQUESTOR_FIELD_ID = 'userID';

  // -- Current user ---------------------------------------------------------
  // Prefer the value passed via data-attribute (rendered server-side by Smarty
  // on the embedding page). Fall back to a `session` global if present.
  var CURRENT_USER_ID =
    (cfg.userID && cfg.userID.indexOf('{$') === -1 && cfg.userID.indexOf('<!--') === -1)
      ? cfg.userID
      : (typeof session !== 'undefined' && session && session.userID ? session.userID : cfg.userID);

  // -- User display-name cache -----------------------------------------------
  var userNameCache = {};
  async function resolveUserName(userID) {
    if (!userID) return { name: '-', fallback: false };
    if (userNameCache[userID] !== undefined) return userNameCache[userID];
    try {
      // PLACEHOLDER: replace with your actual lookup, e.g.:
      // const resp = await fetch('/api/users/' + encodeURIComponent(userID), { credentials: 'include' });
      // if (!resp.ok) throw new Error('lookup failed');
      // const person = await resp.json();
      // const result = { name: person.displayName || person.name || userID, fallback: false };
      // userNameCache[userID] = result;
      // return result;
      throw new Error('no lookup endpoint configured');
    } catch (e) {
      var result = { name: String(userID), fallback: true };
      userNameCache[userID] = result;
      return result;
    }
  }

  // -- Query ------------------------------------------------------------------
  // For Launchpad specifically, also request data fields 17/21/22 (server,
  // root directory, site name) via getData -- these populate rec.s1.id17/
  // id21/id22, which the Status column uses to build the "Site Ready" link.
  // Mirrors the native Launchpad search widget's query.getData(17/21/22).
  //
  // For Ideas specifically, request data field 12 -- a custom status field
  // defined on that form -- which the Status column uses instead of the
  // generic workflow lastStatus field. Also exclude submissions created
  // from form_57e89 (categoryID), which should never appear in this view.
  function myRecordsQuery(site) {
    var query = {
      terms: [
        { id: 'userID',  operator: '=', match: CURRENT_USER_ID, gate: 'AND' },
        { id: 'deleted', operator: '=', match: 0,               gate: 'AND' },
      ],
      joins: ['service', 'status'],
      sort: { column: 'recordID', direction: 'DESC' },
      limit: 500,
      extraParams: '&x-filterData=recordID,userID,title,service,date,lastStatus,stepTitle,stepID,blockingStepID,submitted,deleted',
    };

    if (site && site.isLaunchpad) {
      query.getData = [17, 21, 22];
    }
    if (site && site.isIdeas) {
      query.getData = [12];
      query.terms.push({ id: 'categoryID', operator: '!=', match: 'form_57e89', gate: 'AND' });
    }

    return query;
  }

  // -- Column header builder ---------------------------------------------------
  function buildHeaders(site) {
    if (site.isLaunchpad) {
      return buildLaunchpadHeaders(site);
    }

    return [
      {
        name: 'Date Initiated',
        indicatorID: 'dateInitiated',
        editable: false,
        callback: function (data, blob) {
          var rec = blob[data.recordID];
          var text = '';
          if (rec && rec.date) {
            text = new Date(rec.date * 1000).toLocaleDateString();
          }
          document.getElementById(data.cellContainerID).textContent = text;
        }
      },
      {
        name: 'UID',
        indicatorID: 'uid',
        editable: false,
        callback: function (data, blob) {
          document.getElementById(data.cellContainerID).innerHTML =
            '<a target="_blank" href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '">' + data.recordID + '</a>';
        }
      },
      {
        name: 'Title',
        indicatorID: 'title',
        editable: false,
        callback: function (data, blob) {
          var title = (blob[data.recordID] && blob[data.recordID].title) ? blob[data.recordID].title : '';
          document.getElementById(data.cellContainerID).innerHTML =
            '<a href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '" target="_blank">' + title + '</a>';
        }
      },
      {
        name: 'Status',
        indicatorID: 'currentStatus',
        editable: false,
        callback: function (data, blob) {
          var rec = blob[data.recordID];
          var el = document.getElementById(data.cellContainerID);
          if (site.isIdeas) {
            // Custom status field (indicatorID 12) defined on the Ideas form,
            // in place of the generic workflow lastStatus.
            var customStatus = (rec && rec.s1 && rec.s1.id12 !== undefined && rec.s1.id12 !== null)
              ? rec.s1.id12
              : '';
            setStatusCellText(el, customStatus || 'Not Submitted');
          } else {
            setStatusCellText(el, (rec && rec.lastStatus) ? rec.lastStatus : 'Not Submitted');
          }
        }
      }
    ];
  }

  // -- Status cell renderer: applies red-italic styling specifically to the
  // "Not Submitted" state, plain text otherwise. Shared by every site's
  // Status column (Launchpad's Status column is a button/action, not text,
  // so it does not use this helper).
  function setStatusCellText(el, text) {
    if (text === 'Not Submitted') {
      el.innerHTML = '<span class="mst-status-not-submitted">' + text + '</span>';
    } else {
      el.textContent = text;
    }
  }

  // -- Launchpad-specific columns: Date, Project, Status (with Site Ready) ----
  // Mirrors the native Launchpad "welcome back" search widget's renderResult():
  //   Date    -- abbreviated month + day (+ year if not current year)
  //   Project -- recordID badge + title link
  //   Status  -- "Pending X" / "Waiting for X" text, OR a "Site Ready" button
  //              once the site's server fields (s1.id17/id21/id22) are
  //              populated, matching the native widget's logic exactly.
  function buildLaunchpadHeaders(site) {
    return [
      {
        name: 'Date',
        indicatorID: 'date',
        editable: false,
        callback: function (data, blob) {
          var rec = blob[data.recordID];
          var text = '';
          if (rec && rec.date) {
            var date = new Date(rec.date * 1000);
            var now = new Date();
            var year = (now.getFullYear() !== date.getFullYear()) ? ' ' + date.getFullYear() : '';
            text = MONTH_ABBR[date.getMonth()] + ' ' + date.getDate() + year;
          }
          document.getElementById(data.cellContainerID).textContent = text;
        }
      },
      {
        name: 'Project',
        indicatorID: 'title',
        editable: false,
        callback: function (data, blob) {
          var rec = blob[data.recordID] || {};
          var title = rec.title || '';
          document.getElementById(data.cellContainerID).innerHTML =
            '<span class="mst-lp-recid">' +
              '<a href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '" tabindex="-1">' + data.recordID + '</a>' +
            '</span> ' +
            '<a href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '">' + title + '</a>';
        }
      },
      {
        name: 'Status',
        indicatorID: 'currentStatus',
        editable: false,
        callback: function (data, blob) {
          var rec = blob[data.recordID] || {};
          var el = document.getElementById(data.cellContainerID);

          if (rec.s1 !== undefined
              && rec.s1.id17 !== undefined
              && rec.s1.id22 !== undefined
              && rec.s1.id21 !== undefined
              && rec.s1.id21 !== '') {
            var siteURL = 'https://' + rec.s1.id17 + '/' + rec.s1.id22 + '/' + rec.s1.id21;
            el.innerHTML = '<a href="' + siteURL + '" class="mst-site-ready-btn" target="_blank">Site Ready</a>';
          } else {
            el.textContent = '-';
          }
        }
      }
    ];
  }

  // ============================================================
  //  Runtime
  // ============================================================

  var siteState = {};
  var siteSummaryCount = {};
  var mstRootEl = null; // set by buildShell -- the container passed to buildAndLoadGrid

  function stateKey(site) {
    return site.url;
  }

  async function fetchSiteData(site) {
    var rawQuery = myRecordsQuery(site);
    var extraParams = rawQuery.extraParams || '';
    var query = Object.assign({}, rawQuery);
    delete query.extraParams;

    if (typeof LeafFormQuery !== 'undefined') {
      var q = new LeafFormQuery();
      q.setRootURL(site.url);
      q.importQuery(query);
      // importQuery() drops `sort` -- apply it explicitly or results come back unordered.
      if (query.sort && query.sort.column) {
        q.sort(query.sort.column, query.sort.direction || 'DESC');
      }
      // `limit` is also dropped by importQuery(), but that's fine: execute()
      // treats limit as undefined and falls through to getBulkData(), which
      // paginates internally using its own batchSize (500).
      if (extraParams) { q.setExtraParams(extraParams); }
      return q.execute();
    }

    // Raw fetch fallback with pagination.
    var results = {};
    var batchSize = query.limit || 500;
    var offset = 0;

    while (true) {
      var pagedQuery = Object.assign({}, query, { limit: batchSize, limitOffset: offset });
      var resp = await fetch(
        site.url + 'api/form/query?q=' + encodeURIComponent(JSON.stringify(pagedQuery)) + extraParams,
        { credentials: 'include' }
      );
      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status + ' from ' + site.url);
      }

      var batch = await resp.json();

      if (batch && typeof batch === 'object' && !Array.isArray(batch)) {
        Object.assign(results, batch);
      }

      var leafHeader = resp.headers.get('LEAF-Query') || resp.headers.get('leaf-query') || '';
      var batchCount = (batch && typeof batch === 'object' && !Array.isArray(batch))
        ? Object.keys(batch).length
        : 0;

      if (batchCount < batchSize && leafHeader !== 'continue') {
        break;
      }
      offset += batchSize;
    }

    return results;
  }

  function renderTable(site, bodyEl, data) {
    var records = Object.keys(data).map(function (id) {
      var rec = data[id] || {};
      return {
        recordID: id,
        rec: rec,
        userID: rec[REQUESTOR_FIELD_ID] || null,
        service: rec.service || '',
        title: rec.title || '',
        statusText: rec.lastStatus || 'Not Submitted',
        date: rec.date ? new Date(rec.date * 1000).toLocaleDateString() : ''
      };
    });

    records.sort(function (a, b) { return b.recordID - a.recordID; });

    var headCells = '<th>Date Initiated</th><th>UID</th><th>Title</th><th>Status</th>';
    var colCount = 4;

    var html = '<div class="ip-tableWrap"><table class="ip-table"><thead><tr>' +
      headCells + '</tr></thead><tbody>';

    if (records.length === 0) {
      html += '<tr><td colspan="' + colCount + '" style="text-align:center; color:var(--c-muted);">No records found.</td></tr>';
    }

    records.forEach(function (r) {
      var link = site.url + 'index.php?a=printview&recordID=' + r.recordID;
      html += '<tr data-recordid="' + r.recordID + '">' +
        '<td>' + r.date + '</td>' +
        '<td><a href="' + link + '" target="_blank">' + r.recordID + '</a></td>' +
        '<td><a href="' + link + '" target="_blank">' + r.title + '</a></td>' +
        '<td>' + (r.statusText === 'Not Submitted' ? '<span class="mst-status-not-submitted">' + r.statusText + '</span>' : '<span>' + r.statusText + '</span>') + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    bodyEl.innerHTML = html;

    records.forEach(function (r) {
      if (!r.userID) return;
      var row = bodyEl.querySelector('tr[data-recordid="' + r.recordID + '"] .mst-requestor-cell');
      if (!row) return;
      resolveUserName(r.userID).then(function (result) {
        row.textContent = result.name;
        if (result.fallback) {
          row.title = 'Directory lookup unavailable';
          row.style.fontStyle = 'italic';
        }
      });
    });
  }

  function renderGrid(site, idx) {
    var key = stateKey(site);
    var state = siteState[key];
    if (!state || !state.data || state.rendered) { return; }

    var bodyEl = document.getElementById('mst-body-' + idx);

    if (typeof LeafFormGrid !== 'undefined') {
      var gridID = 'mst-grid-' + idx;
      if (!document.getElementById(gridID)) {
        var div = document.createElement('div');
        div.id = gridID;
        bodyEl.appendChild(div);
      }
      var grid = new LeafFormGrid(gridID);
      grid.setRootURL(site.url);
      grid.hideIndex();
      grid.setDataBlob(state.data);
      grid.setData(Object.values(state.data));
      grid.setHeaders(buildHeaders(site));
      grid.sort('recordID', 'desc');
      grid.renderBody();
    } else {
      renderTable(site, bodyEl, state.data);
    }

    state.rendered = true;
  }

  function activateTab(idx) {
    document.querySelectorAll('.ip-tab').forEach(function (btn, i) {
      var active = (i === idx);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    document.querySelectorAll('.ip-panel').forEach(function (panel, i) {
      panel.classList.toggle('is-active', i === idx);
    });
    if (mstRootEl) updateSiteSummary(mstRootEl, idx, siteSummaryCount[stateKey(SITES[idx])]);
    renderGrid(SITES[idx], idx);
  }

  // -- Site summary line: "<Site Name> -- Showing N <description>" -----------
  // Renders as a heading-style lead-in (bold site name) followed by a lighter
  // clause with the live record count once known. Count starts as an ellipsis
  // while data is still loading, then updates in place when it resolves.
  function updateSiteSummary(rootEl, siteIdx, count) {
    var el = rootEl.querySelector('#mst-site-summary');
    if (!el) return;
    var site = SITES[siteIdx];
    var countText = (count === null || count === undefined) ? '...' : String(count);
    el.innerHTML =
      '<span class="mst-site-summary-name">' + site.name + '</span>' +
      '<span class="mst-site-summary-sep"> -- </span>' +
      '<span class="mst-site-summary-desc">Showing ' + countText + ' ' + (site.description || '') + '</span>';
  }

  function buildShell(rootEl) {
    mstRootEl = rootEl;
    rootEl.innerHTML =
      '<div class="smarty-root">' +
        '<div class="ip-wrap">' +
          '<p class="mst-help-text mst-help-sites">Select a site below to view your requests there.</p>' +
          '<div class="ip-tabsRow"><ul class="ip-tabs" id="mst-tablist" role="tablist" aria-label="LEAF Sites" style="list-style:none; margin:0;"></ul></div>' +
          '<p class="mst-site-summary" id="mst-site-summary"></p>' +
          '<div id="mst-panels"></div>' +
        '</div>' +
      '</div>';

    updateSiteSummary(rootEl, 0, null);

    var tabList    = rootEl.querySelector('#mst-tablist');
    var panelsRoot = rootEl.querySelector('#mst-panels');

    SITES.forEach(function (site, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      li.style.margin = '0';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ip-tab' + (i === 0 ? ' is-active' : '');
      btn.id = 'mst-tab-' + i;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-controls', 'mst-panel-' + i);
      btn.setAttribute('tabindex', i === 0 ? '0' : '-1');
      btn.textContent = site.name;

      btn.addEventListener('click', (function (idx) {
        return function () { activateTab(idx); };
      })(i));

      btn.addEventListener('keydown', (function (idx) {
        return function (e) {
          var next = idx;
          if (e.key === 'ArrowRight') { next = (idx + 1) % SITES.length; }
          else if (e.key === 'ArrowLeft') { next = (idx - 1 + SITES.length) % SITES.length; }
          else { return; }
          e.preventDefault();
          activateTab(next);
          document.getElementById('mst-tab-' + next).focus();
        };
      })(i));

      li.appendChild(btn);
      tabList.appendChild(li);
    });

    SITES.forEach(function (site, i) {
      var panel = document.createElement('div');
      panel.className = 'ip-panel' + (i === 0 ? ' is-active' : '');
      panel.id = 'mst-panel-' + i;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'mst-tab-' + i);

      panel.innerHTML = '<div id="mst-body-' + i + '"></div>';
      panelsRoot.appendChild(panel);
    });
  }

  // -- Modal shell: overlay, focus trap, Escape-to-close, focus return --------
  var modalState = {
    overlay: null,
    bodyEl: null,
    lastFocused: null,
    built: false,     // grid shell + data fetch kicked off
    keydownHandler: null,
  };

  function buildModalShell() {
    var overlay = document.createElement('div');
    overlay.className = 'mst-modal-overlay';
    overlay.id = 'mst-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML =
      '<div class="mst-modal" role="dialog" aria-modal="true" aria-labelledby="mst-modal-title">' +
        '<div class="mst-modal-hd">' +
          '<h2 class="mst-modal-title" id="mst-modal-title">View My Requests (LEAF National Requests)</h2>' +
          '<button type="button" class="mst-modal-close" id="mst-modal-close" aria-label="Close dialog">' +
            '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="mst-modal-body" id="mst-modal-body"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('#mst-modal-close').addEventListener('click', closeModal);

    modalState.overlay = overlay;
    modalState.bodyEl = overlay.querySelector('#mst-modal-body');
    modalState.bodyEl.classList.add('mst-container');
  }

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function trapFocus(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;

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
    document.body.style.overflow = 'hidden';

    modalState.keydownHandler = trapFocus;
    document.addEventListener('keydown', modalState.keydownHandler);

    if (!modalState.built) {
      modalState.built = true;
      await buildAndLoadGrid(modalState.bodyEl);
    }

    var focusable = getFocusable(modalState.overlay);
    (focusable[0] || modalState.overlay.querySelector('.mst-modal-close')).focus();
  }

  function closeModal() {
    if (!modalState.overlay || modalState.overlay.hidden) return;
    modalState.overlay.hidden = true;
    document.body.style.overflow = '';
    if (modalState.keydownHandler) {
      document.removeEventListener('keydown', modalState.keydownHandler);
    }
    if (modalState.lastFocused && typeof modalState.lastFocused.focus === 'function') {
      modalState.lastFocused.focus();
    }
  }

  // -- Inject scoped stylesheet once -------------------------------------------
  function injectStyles() {
    if (document.getElementById('mst-styles')) return;
    var style = document.createElement('style');
    style.id = 'mst-styles';
    style.textContent = [
      '.mst-container{color-scheme:light;}',
      '.mst-container *{box-sizing:border-box;}',
      '.mst-container .ip-wrap{max-width:var(--max,1200px);margin:0 auto;padding:0 8px;font-family:"Source Sans 3","Source Sans Pro",sans-serif;color:var(--c-text,#1b1b1b);}',
      '.mst-container .ip-header{display:none;}',
      '.mst-container .ip-panelDesc{font-size:0.875rem;color:var(--c-muted,#3d4551);margin:0 0 0.5rem 0;line-height:1.5;}',
      '.mst-container .ip-tab:focus-visible,.mst-container .ip-table td a:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}',
      '.mst-container .ip-tabs{display:inline-flex;gap:6px;padding:6px;background:var(--lp-bg-alt,#eff6fb);border-radius:999px;border:1px solid var(--c-blue10,#d9e8f6);}',
      '.mst-container .ip-tabsRow{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:6px;flex-wrap:wrap;}',
      '.mst-container .ip-tab{border:0;background:transparent;padding:8px 16px;border-radius:999px;font-family:"Public Sans",sans-serif;font-weight:700;font-size:16px;cursor:pointer;color:var(--c-muted,#3d4551);border-bottom:3px solid transparent;transition:border-color .2s,color .2s;}',
      '.mst-container .ip-tab.is-active{background:var(--lp-bg,#fff);color:var(--lp-accent,#005ea2);box-shadow:0 2px 8px rgba(0,10,40,.06);border-bottom:3px solid var(--lp-accent,#005ea2);}',
      '.mst-container .ip-tab:hover:not(.is-active){border-bottom:3px solid var(--c-blue20,#aacdec);color:var(--lp-hl,#1a4480);}',
      '.mst-container .ip-panel{display:none;}',
      '.mst-container .ip-panel.is-active{display:block;}',
      '.mst-container .ip-tableWrap{background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px);padding:20px;box-shadow:0 2px 8px rgba(0,10,40,.06);border:1px solid var(--c-blue10,#d9e8f6);overflow-x:auto;width:100%;}',
      '.mst-container .ip-table{width:100%;border-collapse:collapse;table-layout:auto;background:#fff;min-width:840px;font-size:16px;}',
      '.mst-container .ip-table th,.mst-container .ip-table td{border:1px solid var(--c-gray20,#c9c9c9);padding:10px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;text-align:left;}',
      '.mst-container .ip-table th{background:var(--c-blue10,#d9e8f6);font-family:"Public Sans",sans-serif;font-weight:700;color:var(--lp-hl,#1a4480);user-select:none;}',
      '.mst-container .ip-table tbody tr:hover{background:var(--lp-bg-alt,#eff6fb);}',
      '.mst-container .ip-table td a{color:var(--lp-accent,#005ea2);text-decoration:none;}',
      '.mst-container .ip-table td a:hover{text-decoration:underline;}',
      '.mst-container .ip-error{color:#b91c1c;font-size:14px;font-weight:600;}',
      '.mst-container .mst-status-not-submitted{color:#b91c1c;font-style:italic;font-size:0.875em;}',

      /* -- Launchpad-specific column styling -- */
      '.mst-container .mst-lp-recid a{display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;background:var(--c-text,#1b1b1b);color:#fff !important;border-radius:var(--r,5px);font-weight:900;font-size:1em;line-height:1;text-decoration:none;text-align:center;}',
      '.mst-container .mst-lp-recid a:hover,.mst-container .mst-lp-recid a:focus{background:var(--c-muted,#3d4551);color:#fff !important;}',
      '.mst-container .mst-site-ready-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--r,5px);border:1px solid var(--c-blue20,#aacdec);background:var(--lp-bg-alt,#eff6fb);color:var(--lp-accent,#005ea2);font-weight:700;text-decoration:none;}',
      '.mst-container .mst-site-ready-btn:hover{background:var(--c-blue10,#d9e8f6);text-decoration:none;}',
      '.mst-container .mst-site-ready-btn:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}',

      '@media (max-width:780px){.mst-container .ip-tabs{width:100%;flex-wrap:wrap;justify-content:center;}.mst-container .ip-tabsRow{justify-content:center;}.mst-container .ip-table{display:block;overflow-x:auto;white-space:nowrap;}}',

      /* -- Modal shell -- */
      '.mst-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:1000;}',
      '.mst-modal-overlay[hidden]{display:none;}',
      '.mst-modal{background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px);max-width:1200px;width:100%;max-height:calc(100vh - 80px);box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto 0;display:flex;flex-direction:column;overflow:hidden;}',
      '.mst-modal-hd{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;border-bottom:1px solid var(--c-blue10,#d9e8f6);background:var(--lp-bg,#fff);border-radius:var(--r-lg,8px) var(--r-lg,8px) 0 0;flex:0 0 auto;}',
      '.mst-modal-title{margin:0;font-family:"Public Sans",sans-serif;font-size:1.35rem;font-weight:800;color:var(--lp-hl,#1a4480);}',
      '.mst-modal-close{border:0;background:transparent;cursor:pointer;color:var(--c-muted,#3d4551);padding:8px;border-radius:999px;line-height:0;flex:0 0 auto;}',
      '.mst-modal-close:hover{background:var(--lp-bg-alt,#eff6fb);}',
      '.mst-modal-close:focus-visible{outline:3px solid var(--lp-accent,#005ea2);outline-offset:2px;}',
      '.mst-modal-body{padding:20px 24px 28px;overflow-y:auto;flex:1 1 auto;position:relative;}',
      /* LeafFormGrid's base stylesheet applies position:sticky;top:0 directly
         to its <thead>/<th> elements. Inside our modal's shorter internal
         scroll container that sticks the header mid-table instead of at the
         top, overlapping rows. Override with a selector specific enough to
         beat LEAF's own rule. */
      '.mst-modal-body table thead,',
      '.mst-modal-body table thead tr,',
      '.mst-modal-body table thead th,',
      '.mst-modal-body .ip-table thead,',
      '.mst-modal-body .ip-table thead tr,',
      '.mst-modal-body .ip-table thead th{',
        'position:static !important;',
        'top:auto !important;',
        'inset:auto !important;',
        'z-index:auto !important;',
      '}',
      '@media (prefers-reduced-motion: no-preference){.mst-modal-overlay{animation:mst-fade .15s ease-out;}}',
      '@keyframes mst-fade{from{opacity:0;}to{opacity:1;}}',

      /* -- Helper text -- */
      '.mst-help-text{font-size:0.8125rem;color:var(--c-muted,#3d4551);margin:0 0 10px 0;line-height:1.4;}',
      '.mst-help-text.mst-help-sites{margin-bottom:6px;}',

      /* -- Site summary heading: "<Site Name> -- Showing N <description>" -- */
      '.mst-site-summary{margin:0 0 18px 0;padding:10px 0 14px 0;border-bottom:1px solid var(--c-blue10,#d9e8f6);font-size:1rem;line-height:1.4;}',
      '.mst-site-summary-name{font-family:"Public Sans",sans-serif;font-weight:800;color:var(--lp-hl,#1a4480);font-size:1.05rem;}',
      '.mst-site-summary-sep{color:var(--c-gray20,#c9c9c9);}',
      '.mst-site-summary-desc{color:var(--c-muted,#3d4551);}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // -- Entry point --------------------------------------------------------------
  async function buildAndLoadGrid(rootEl) {
    buildShell(rootEl);

    var fetches = [];
    SITES.forEach(function (site, i) {
      var key = stateKey(site);
      siteState[key] = { data: null, rendered: false, error: null };

      var p = fetchSiteData(site).then(function (data) {
        siteState[key].data = data;
        var count = Object.keys(data).length;
        siteSummaryCount[key] = count;

        var activeBtn = mstRootEl.querySelector('.ip-tab.is-active');
        var isActiveSite = activeBtn && activeBtn.id === 'mst-tab-' + i;
        if (isActiveSite) {
          updateSiteSummary(mstRootEl, i, count);
          renderGrid(site, i);
        }
      }).catch(function (err) {
        siteState[key].error = err;
        var activeBtn2 = mstRootEl.querySelector('.ip-tab.is-active');
        var isActiveSite2 = activeBtn2 && activeBtn2.id === 'mst-tab-' + i;
        if (isActiveSite2) {
          var summaryEl = mstRootEl.querySelector('#mst-site-summary');
          if (summaryEl) {
            summaryEl.innerHTML = '<span class="ip-error">Error loading data from ' + site.url +
              '. Check your network access and permissions.</span>';
          }
        }
        console.error('[MultiSiteGrid] failed:', site.url, err);
      });

      fetches.push(p);
    });

    await Promise.allSettled(fetches);
  }

  function init() {
    injectStyles();

    var trigger = cfg.triggerId ? document.getElementById(cfg.triggerId) : null;

    if (trigger) {
      // Modal mode: build the overlay lazily, load grid data on first open only.
      trigger.addEventListener('click', openModal);
      return;
    }

    // Fallback: no trigger button configured -- mount inline exactly where
    // data-mount points (or append to body), same as before.
    var rootEl = cfg.mountId ? document.getElementById(cfg.mountId) : null;
    if (!rootEl) {
      rootEl = document.createElement('div');
      document.body.appendChild(rootEl);
    }
    rootEl.classList.add('mst-container');
    buildAndLoadGrid(rootEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();