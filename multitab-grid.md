Here is the clean, front-end-only `.tpl` file — drop it into `LEAF_Request_Portal/templates/reports/` and access it at `report.php?a=multisite_tabbed_grid`.

````smarty name=LEAF_Request_Portal/templates/reports/multisite_tabbed_grid.tpl url=https://va.ghe.com/software/LEAF/blob/56594878c0b7543047ef7d3a555fd66e57510cbe/LEAF_Request_Portal/templates/reports/example.tpl
<style>
/* ── Tab bar ── */
.mst-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    list-style: none;
    margin: 1rem 0 0 0;
    padding: 0;
    border-bottom: 3px solid #1b4f82;
}
.mst-tabs li { margin: 0; }

.mst-tab-btn {
    padding: 8px 22px;
    border: 2px solid #1b4f82;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    background: #f0f4f8;
    color: #1b4f82;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}
.mst-tab-btn:hover { background: #dce6f0; }
.mst-tab-btn[aria-selected="true"] {
    background: #1b4f82;
    color: #fff;
}
.mst-tab-btn:focus-visible { outline: 3px solid #f9c642; outline-offset: 2px; }

.mst-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    background: #71767a;
    color: #fff;
    vertical-align: middle;
}
.mst-tab-btn[aria-selected="true"] .mst-badge {
    background: #f9c642;
    color: #1b4f82;
}

/* ── Panels ── */
.mst-panel { display: none; padding: 0.75rem 0; }
.mst-panel.is-active { display: block; }

.mst-panel-title {
    margin: 0 0 0.4rem 0;
    font-size: 1.2rem;
    font-weight: bold;
}
.mst-status {
    min-height: 1.4em;
    font-style: italic;
    color: #555;
    margin: 0 0 0.5rem 0;
}
.mst-error { color: #e52207; font-weight: bold; font-style: normal; }
</style>

<script>
/*
 * ════════════════════════════════════════════════════════════
 *  MULTI-SITE TABBED GRID  –  Configuration
 *  Accessible at: report.php?a=multisite_tabbed_grid
 * ════════════════════════════════════════════════════════════
 *
 *  Add one object per LEAF site you want to display.
 *
 *  Required:
 *    url   – Full URL to the LEAF_Request_Portal, with trailing slash
 *    name  – Label shown on the tab
 *
 *  Optional:
 *    color    – Accent color for the tab (any CSS color string)
 *    query    – LeafFormQuery-compatible JSON. Defaults to all active records.
 *
 *  COLUMNS are configured in the buildHeaders(site) function below.
 *  You can customise per-site columns by checking site.url inside that function.
 */
const SITES = [
    {
        url:   'https://your-server/SiteOne/',
        name:  'Site One',
        color: '#1b4f82',
    },
    {
        url:   'https://your-server/SiteTwo/',
        name:  'Site Two',
        color: '#2e8540',
    },
    {
        url:   'https://your-server/SiteThree/',
        name:  'Site Three',
        color: '#8b4513',
    },
    // ← Add more sites here
];

/*
 *  Default query – applied to every site unless overridden per-site via `query:`.
 *  To customise: go to Report Builder → build a search → click "JSON" → paste here.
 */
const DEFAULT_QUERY = {
    terms: [
        { id: 'stepID',  operator: '!=', match: 'resolved', gate: 'AND' },
        { id: 'deleted', operator: '=',  match: 0,           gate: 'AND' },
    ],
    joins: ['service'],
    sort: {},
};

/*
 *  Column definitions – these are standard LeafFormGrid header objects.
 *  Check site.url inside this function to return different columns per site.
 */
function buildHeaders(site) {
    return [
        {
            name: 'UID',
            indicatorID: 'uid',
            editable: false,
            callback: function(data, blob) {
                document.getElementById(data.cellContainerID).innerHTML =
                    '<a target="_blank" href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '">' + data.recordID + '</a>';
            }
        },
        {
            name: 'Service',
            indicatorID: 'service',
            editable: false,
            callback: function(data, blob) {
                document.getElementById(data.cellContainerID).textContent =
                    (blob[data.recordID] && blob[data.recordID].service) ? blob[data.recordID].service : '';
            }
        },
        {
            name: 'Title',
            indicatorID: 'title',
            editable: false,
            callback: function(data, blob) {
                var title = (blob[data.recordID] && blob[data.recordID].title) ? blob[data.recordID].title : '';
                document.getElementById(data.cellContainerID).innerHTML =
                    '<a href="' + site.url + 'index.php?a=printview&recordID=' + data.recordID + '" target="_blank">' + title + '</a>';
            }
        },
        {
            name: 'Status',
            indicatorID: 'currentStatus',
            editable: false,
            callback: function(data, blob) {
                var rec = blob[data.recordID];
                var text = '';
                if (rec) {
                    text = rec.stepTitle ? ('Waiting for ' + rec.stepTitle) : (rec.lastStatus || '');
                }
                document.getElementById(data.cellContainerID).textContent = text;
            }
        },
        {
            name: 'Date Initiated',
            indicatorID: 'dateInitiated',
            editable: false,
            callback: function(data, blob) {
                var rec = blob[data.recordID];
                var text = '';
                if (rec && rec.date) {
                    text = new Date(rec.date * 1000).toLocaleDateString();
                }
                document.getElementById(data.cellContainerID).textContent = text;
            }
        },
    ];
}

// ════════════════════════════════════════════════════════════
//  Runtime – no changes needed below this line
// ════════════════════════════════════════════════════════════

var siteState = {}; // url → { data, rendered }

/* Fetch all records from one site */
async function fetchSiteData(site) {
    var query = new LeafFormQuery();
    query.setRootURL(site.url);
    query.importQuery(site.query || DEFAULT_QUERY);
    query.join('service');
    query.join('status');
    return query.execute();
}

/* Build (lazy) the LeafFormGrid for one site panel */
function renderGrid(site, idx) {
    var state = siteState[site.url];
    if (!state || !state.data || state.rendered) { return; }

    var gridID = 'mst-grid-' + idx;
    var body   = document.getElementById('mst-panel-body-' + idx);

    if (!document.getElementById(gridID)) {
        var div = document.createElement('div');
        div.id = gridID;
        body.appendChild(div);
    }

    var grid = new LeafFormGrid(gridID);
    grid.setRootURL(site.url);
    grid.enableToolbar();
    grid.hideIndex();
    grid.setDataBlob(state.data);
    grid.setData(Object.values(state.data));
    grid.setHeaders(buildHeaders(site));
    grid.sort('recordID', 'desc');
    grid.renderBody();

    state.rendered = true;
}

/* Switch active tab / panel */
function activateTab(idx) {
    document.querySelectorAll('.mst-tab-btn').forEach(function(btn, i) {
        var active = (i === idx);
        btn.setAttribute('aria-selected', String(active));
        btn.setAttribute('tabindex', active ? '0' : '-1');
        if (active) {
            btn.style.background = SITES[i].color || '#1b4f82';
            btn.style.color = '#fff';
            btn.style.borderColor = SITES[i].color || '#1b4f82';
        } else {
            btn.style.background = '#f0f4f8';
            btn.style.color = SITES[i].color || '#1b4f82';
            btn.style.borderColor = SITES[i].color || '#1b4f82';
        }
    });

    document.querySelectorAll('.mst-panel').forEach(function(panel, i) {
        panel.classList.toggle('is-active', i === idx);
    });

    renderGrid(SITES[idx], idx);
}

/* Build static HTML shell – tabs + empty panels */
function buildShell() {
    var root = document.getElementById('mst-root');

    // Tab list
    var tabList = document.createElement('ul');
    tabList.className = 'mst-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'LEAF Sites');

    SITES.forEach(function(site, i) {
        var li  = document.createElement('li');
        li.setAttribute('role', 'presentation');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mst-tab-btn';
        btn.id = 'mst-tab-' + i;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-controls', 'mst-panel-' + i);
        btn.setAttribute('tabindex', i === 0 ? '0' : '-1');
        btn.style.borderColor = site.color || '#1b4f82';

        if (i === 0) {
            btn.style.background = site.color || '#1b4f82';
            btn.style.color = '#fff';
        } else {
            btn.style.color = site.color || '#1b4f82';
        }

        btn.innerHTML = site.name + ' <span class="mst-badge" id="mst-badge-' + i + '">…</span>';

        btn.addEventListener('click', (function(idx) {
            return function() { activateTab(idx); };
        })(i));

        // Arrow-key navigation between tabs (ARIA tabs pattern)
        btn.addEventListener('keydown', (function(idx) {
            return function(e) {
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

    root.appendChild(tabList);

    // Panels
    SITES.forEach(function(site, i) {
        var panel = document.createElement('div');
        panel.className = 'mst-panel' + (i === 0 ? ' is-active' : '');
        panel.id = 'mst-panel-' + i;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'mst-tab-' + i);

        panel.innerHTML =
            '<p class="mst-panel-title" style="color:' + (site.color || '#1b4f82') + '">' + site.name + '</p>' +
            '<p class="mst-status" id="mst-status-' + i + '">Loading…</p>' +
            '<div id="mst-panel-body-' + i + '"></div>';

        root.appendChild(panel);
    });
}

/* Main */
async function main() {
    document.querySelector('title').innerText = 'Multi-Site Grid';
    buildShell();

    var fetches = SITES.map(function(site, i) {
        siteState[site.url] = { data: null, rendered: false };

        return fetchSiteData(site).then(function(data) {
            siteState[site.url].data = data;

            var count = Object.keys(data).length;
            document.getElementById('mst-status-' + i).textContent =
                count + ' record' + (count !== 1 ? 's' : '') + ' loaded.';
            document.getElementById('mst-badge-' + i).textContent = count;

            // Render immediately if this tab is already visible
            var activeBtn = document.querySelector('.mst-tab-btn[aria-selected="true"]');
            if (activeBtn && activeBtn.id === 'mst-tab-' + i) {
                renderGrid(site, i);
            }
        }).catch(function(err) {
            document.getElementById('mst-status-' + i).innerHTML =
                '<span class="mst-error">Error loading data from ' + site.url +
                '. Check your network access and permissions.</span>';
            document.getElementById('mst-badge-' + i).textContent = '!';
            console.error('[MultiSiteGrid] Failed:', site.url, err);
        });
    });

    await Promise.allSettled(fetches);
}

document.addEventListener('DOMContentLoaded', main);
</script>

<h1>Multi-Site LEAF Grid</h1>
<div id="mst-root"></div>
````

---

### Setup — 3 steps

**1. Save the file**
```
LEAF_Request_Portal/templates/reports/multisite_tabbed_grid.tpl
```

**2. Configure your sites** — edit the `SITES` array at the top:
```javascript
const SITES = [
    { url: 'https://your-server/PortalA/', name: 'HRM',        color: '#1b4f82' },
    { url: 'https://your-server/PortalB/', name: 'Facilities', color: '#2e8540' },
    { url: 'https://your-server/PortalC/', name: 'IT',         color: '#8b4513' },
];
```

**3. Access it**
```
https://your-server/LEAF_Request_Portal/report.php?a=multisite_tabbed_grid
```

---

### What it does

| Behavior | Detail |
|---|---|
| **One tab per site** | Dynamically built from `SITES[]` — add/remove freely |
| **Parallel fetch** | All sites load at the same time via `Promise.allSettled` |
| **Lazy grid render** | `LeafFormGrid` only initializes when its tab is first clicked |
| **Live badge count** | Each tab shows record count as data arrives |
| **Columns** | Configured in `buildHeaders(site)` — check `site.url` to diverge per-site |
| **Custom query** | Override per-site with a `query:` property, or edit `DEFAULT_QUERY` |
| **Accessible** | ARIA `tablist/tab/tabpanel` roles + arrow-key navigation |
| **Error safe** | A failed site shows an inline error; other tabs are unaffected |