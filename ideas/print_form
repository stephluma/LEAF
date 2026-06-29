<!--{if $deleted > 0}-->
    <div style="font-size: 36px"><img src="dynicons/?img=emblem-unreadable.svg&amp;w=96" alt=""
            style="float: left" /> Notice: This request has been marked as cancelled and will be permanently deleted.<br />
        <span class="buttonNorm" onclick="restoreRequest(<!--{$recordID|strip_tags}-->)"><img
                src="dynicons/?img=document-open.svg&amp;w=32" /> Restore request</span>
    </div><br style="clear: both" />
    <hr />
<!--{/if}-->

<!-- Public view for all users -->

<!--{if $empMembership['groupID'][226]}--><div class="pv-layout-row"><!--{/if}-->
<div id="public-view">
<a href="#pv-main" class="pv-skip-link">Skip to main content</a>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,1,0" />

<style>
#public-view *, #public-view *::before, #public-view *::after { box-sizing: border-box; }
.pv-skip-link { position: absolute; top: -9999px; left: 0; z-index: 9999; background: #1f2937; color: #fff; padding: 10px 16px; font-size: 15px; font-weight: 600; border-radius: 0 0 8px 0; text-decoration: none; }
.pv-skip-link:focus { top: 0; outline: 3px solid #005ea2; outline-offset: 2px; }
#public-view { font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif; color: #0f172a; padding: 0 0 64px; }
.pv-layout-row { display: flex; align-items: flex-start; min-height: 100vh; }
.pv-layout-row #public-view { flex: 1 1 0; min-width: 0; padding-bottom: 64px; }
.pv-layout-row #toolbar226 { flex: 0 0 220px; width: 220px; align-self: flex-start; }
@media (max-width: 700px) { .pv-layout-row { flex-direction: column; } .pv-layout-row #toolbar226 { position: static; width: 100%; max-height: none; } }
.pv-topbar { border-bottom: 1px solid #cfd7e3; padding: 10px 20px; }
.pv-back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: #005ea2; text-decoration: none; border-radius: 6px; padding: 4px 2px; }
.pv-back-link:hover, .pv-back-link:focus { color: #004a82; text-decoration: underline; }
.pv-back-link:focus-visible { outline: 3px solid #005ea2; outline-offset: 2px; text-decoration: none; }
.pv-back-link svg { width: 16px; height: 16px; flex-shrink: 0; }
.pv-main { max-width: 820px; margin: 32px auto 0; padding: 0 20px; box-sizing: border-box; }

/* ── Record ID row ── */
.pv-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.pv-cancel-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
.pv-cancel-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #b91c1c; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; line-height: 1.4; }
.pv-cancel-btn:hover, .pv-cancel-btn:focus { background: #b91c1c; color: #fff; outline: none; }
.pv-cancel-btn:focus-visible { outline: 3px solid #b91c1c; outline-offset: 2px; }
.pv-id-badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 12px; background: #1f1f1f; color: #fff; border-radius: 4px; font-size: 22px; font-weight: 700; letter-spacing: 0.01em; line-height: 1.25; flex-shrink: 0; }

/* ── Info row: Status · Votes ── */
.pv-info-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; }
.pv-info-item { display: inline-flex; align-items: center; gap: 5px; }
.pv-info-label { font-size: 0.75rem; font-weight: 700; color: #475569; font-family: 'Public Sans', 'Source Sans 3', sans-serif; letter-spacing: 0.05em; text-transform: uppercase; }
.pv-info-val { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; font-family: 'Public Sans', 'Source Sans 3', sans-serif; font-weight: 600; line-height: 1.5; }
.pv-info-val--status { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
.pv-info-val--votes { background: #d9e8f6; color: #004a82; border: 1px solid #aacdec; gap: 3px; }
.pv-info-val--votes .material-symbols-outlined { font-size: 0.8rem; line-height: 1; font-variation-settings: 'FILL' 1, 'wght' 400, 'opsz' 20, 'GRAD' 0; }
.pv-info-sep { color: #cbd5e1; font-size: 0.9rem; user-select: none; }
@media (max-width: 560px) { .pv-info-row { gap: 6px; } .pv-info-sep { display: none; } .pv-info-item { flex-direction: column; gap: 2px; } }

/* ── Title ── */
.pv-title { font-size: 26px; font-weight: 700; line-height: 1.25; margin: 0; color: #0f172a; font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif; flex: 1 1 0; min-width: 0; word-break: break-word; display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }

/* ── Cards ── */
.pv-card { background: #fff; border: 1px solid #cfd7e3; border-radius: 14px; padding: 22px 24px; margin-bottom: 14px; }
.pv-card-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; margin: 0 0 10px; display: block; }
.pv-card-body { font-size: 16px; line-height: 1.7; color: #0f172a; margin: 0; font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif; }
.pv-card-body p { margin: 0 0 0.75em; }
.pv-card-body p:last-child { margin-bottom: 0; }
.pv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
@media (max-width: 560px) { .pv-two-col { grid-template-columns: 1fr; } .pv-title { font-size: 20px; } }
.pv-card-divider { border: none; border-top: 1px solid #cfd7e3; margin: 14px 0; }
.pv-sub-card { background: #f8fafc; border: 1px solid #cfd7e3; border-radius: 10px; padding: 14px 16px; margin-top: 10px; }
.pv-sub-card .pv-card-label { color: #64748b; }
.pv-empty { font-size: 15px; color: #64748b; font-style: italic; }

/* ── Attachments ── */
.pv-attach-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
.pv-attach-figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.pv-attach-btn { display: block; padding: 0; background: none; border: 2px solid #cfd7e3; border-radius: 10px; cursor: pointer; transition: border-color 0.15s ease; line-height: 0; width: 130px; }
.pv-attach-btn:hover, .pv-attach-btn:focus { border-color: #005ea2; }
.pv-attach-btn:focus-visible { outline: 3px solid #005ea2; outline-offset: 2px; }
.pv-attach-thumb { width: 126px; height: 96px; object-fit: cover; border-radius: 8px; display: block; }
.pv-attach-caption { font-size: 12px; color: #475569; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.pv-file-list { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 8px; }
.pv-file-item { display: flex; align-items: center; gap: 10px; }
.pv-file-icon { flex-shrink: 0; width: 32px; height: 32px; background: #d9e8f6; border: 1px solid #aacdec; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.pv-file-icon svg { width: 16px; height: 16px; color: #004a82; }
.pv-file-link { font-size: 15px; font-weight: 600; color: #005ea2; text-decoration: underline; text-underline-offset: 2px; word-break: break-word; }
.pv-file-link:hover, .pv-file-link:focus { color: #004a82; }
.pv-file-link:focus-visible { outline: 3px solid #005ea2; outline-offset: 2px; border-radius: 2px; }

/* ── PM Transfer ── */
.pm-transfer-wrap { padding-bottom: 12px; }
.pm-transfer-btn { background: #c5ee93 !important; color: #000 !important; cursor: pointer; }
.pm-transfer-btn:hover, .pm-transfer-btn:focus { background: #7fb135 !important; color: #fff !important; }
.pm-transferOverlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;}
.pm-transferOverlay[hidden]{display:none!important;}
.pm-transferBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);}
.pm-transferDialog{position:relative;width:min(92vw,440px);background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,.12);box-shadow:0 6px 16px rgba(15,23,42,.12);display:flex;flex-direction:column;animation:pmFadeIn .15s ease;}
@keyframes pmFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.pm-transferHeader{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #dbe1e8;border-radius:16px 16px 0 0;}
.pm-transferTitle{font-weight:900;font-size:1rem;color:#1f2933;margin:0;}
.pm-transferClose{border:0;background:transparent;font-size:18px;cursor:pointer;min-width:36px;min-height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;color:#3f4a57;line-height:1;}
.pm-transferClose:hover{background:#dbe1e8;color:#1f2933;}
.pm-transferBody{padding:16px;}
.pm-transferPrompt{margin:0 0 12px;color:#3f4a57;font-size:.95rem;}
.pm-transferChoices{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.pm-transferChoice{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;border:2px solid #dbe1e8;border-radius:12px;background:#fff;cursor:pointer;font-weight:700;font-size:.95rem;color:#1f2933;text-align:center;transition:border-color .15s,background .15s,box-shadow .15s;box-shadow:0 1px 2px rgba(16,24,40,.08);}
.pm-transferChoice:hover{border-color:#2563eb;background:#e7efff;color:#1d4ed8;box-shadow:0 4px 12px rgba(37,99,235,.15);}
.pm-transferChoice:focus-visible{outline:2px solid #0b5cab;outline-offset:2px;}
.pm-transferChoice:active{transform:translateY(1px);}
.pm-transferChoiceIcon{font-size:28px;line-height:1;}
.pm-transferChoiceLabel{font-weight:800;font-size:1rem;}
.pm-transferChoiceDesc{font-weight:400;font-size:.82rem;color:#3f4a57;line-height:1.35;}
.pm-transferChoice:hover .pm-transferChoiceDesc{color:#1d4ed8;}

/* ── Internal banner ── */
.pv-internal-banner { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 40px; padding: 10px 20px; background: #fef3c7; border-top: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b; color: #78350f; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-align: center; }

/* ── Votes sidebar button ── */
.pv-votes-btn { background: #f1f5f9 !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; border-radius: 6px !important; font-weight: 400 !important; margin-top: 6px; width: 100%; text-align: center; justify-content: center; padding: 6px 8px !important; display: flex !important; align-items: center; transition: background 0.15s ease !important; }
.pv-votes-btn:hover, .pv-votes-btn:focus { background: #e2e8f0 !important; color: #1e293b !important; }
.pv-votes-btn[aria-expanded="true"] { background: #e2e8f0 !important; color: #1e293b !important; border-color: #94a3b8 !important; }
#pv-votes-panel { font-size: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; overflow: hidden; }
#pv-votes-panel .pv-votes-table-wrap { max-height: 300px; overflow-y: auto; }
#pv-votes-panel table { width: 100%; border-collapse: collapse; font-size: 14px; }
#pv-votes-panel thead tr { background: #f8fafc; position: sticky; top: 0; }
#pv-votes-panel th { padding: 7px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
#pv-votes-panel td { padding: 7px 10px; border-top: 1px solid #f1f5f9; color: #0f172a; }
#pv-votes-panel .pv-votes-footer { padding: 7px 10px; border-top: 1px solid #e2e8f0; background: #f8fafc; text-align: center; }
#pv-votes-panel .pv-votes-showall { font-size: 13px; font-weight: 600; color: #475569; background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }
#pv-votes-panel .pv-votes-showall:hover { color: #1e293b; }
#pv-votes-panel .pv-votes-empty { padding: 12px 10px; color: #64748b; font-style: italic; }

/* ── Edit button ── */
.pv-edit-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; font-size: 0.82rem; font-weight: 700; font-family: 'Public Sans', 'Source Sans 3', sans-serif; color: #005ea2; background: transparent; border: 1.5px solid #cce4f5; border-radius: 6px; cursor: pointer; line-height: 1; transition: all 0.15s; flex-shrink: 0; }
.pv-edit-btn:hover, .pv-edit-btn:focus { background: #eef4fb; border-color: #005ea2; color: #005ea2; outline: none; }
.pv-edit-btn:focus-visible { outline: 2px solid #005ea2; outline-offset: 2px; }
.pv-edit-btn svg { width: 13px; height: 13px; flex-shrink: 0; }


/* ── Actions bar (flat, matching modal) ── */
.pv-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
.pv-actions-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; flex-shrink: 0; }
.pv-actions-divider { width: 1px; height: 24px; background: #cbd5e1; flex-shrink: 0; }
.pv-upvote { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 10px; border: 1.5px solid #cce4f5; border-radius: 6px; background: #fff; color: #1e293b; font-size: 0.8rem; font-weight: 700; font-family: 'Public Sans', 'Source Sans 3', sans-serif; cursor: pointer; transition: all 0.15s; box-sizing: border-box; }
.pv-upvote:hover:not(:disabled) { background: #005ea2; color: #fff; border-color: #005ea2; }
.pv-upvote:hover:not(:disabled) .material-symbols-outlined { color: #fff !important; }
.pv-upvote.is-voted { background: #e8e8e8; color: #666; border-color: #ccc; cursor: default; opacity: 1; }
.pv-upvote.is-voted .material-symbols-outlined { color: #666 !important; }
.pv-upvote.is-voted:focus-visible { outline: 2px solid #000; outline-offset: 3px; }
.pv-upvote:disabled { opacity: 0.65; }
.pv-upvote:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
.pv-upvote .material-symbols-outlined { font-size: 0.9rem; line-height: 1; font-variation-settings: 'FILL' 1, 'wght' 400, 'opsz' 24, 'GRAD' 0; }
.pv-share { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 10px; font-size: 0.8rem; background: transparent; border: 1.5px solid #cce4f5; border-radius: 6px; color: #475569; cursor: pointer; font-family: 'Public Sans', 'Source Sans 3', sans-serif; font-weight: 600; transition: all 0.15s; box-sizing: border-box; }
.pv-share:hover { background: #005ea2; border-color: #005ea2; color: #fff; }
.pv-share:hover .material-symbols-outlined { color: #fff !important; }
.pv-share:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
.pv-share .material-symbols-outlined { font-size: 0.9rem; line-height: 1; font-variation-settings: 'FILL' 1, 'wght' 400, 'opsz' 24, 'GRAD' 0; }
#pvToast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(12px); background: #1e293b; color: #fff; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; z-index: 9999; white-space: nowrap; }
#pvToast.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
#pvToast.is-error { background: #b91c1c; }
</style>

<!-- ── Back nav ── -->
<div class="pv-topbar" role="navigation" aria-label="Breadcrumb">
    <a href="https://leaf.va.gov/platform/ideas/" class="pv-back-link">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M10 12L6 8l4-4"/></svg>
        All Ideas
    </a>
</div>

<!-- ── Main ── -->
<main class="pv-main" id="pv-main" tabindex="-1">

    <!-- ── Row 0: Cancel button (right-aligned, own row) ── -->
    <!--{if $submitted == 0 || $is_admin}-->
    <div class="pv-cancel-row noprint">
        <button type="button"
                class="pv-cancel-btn"
                onclick="cancelRequest()"
                aria-label="Cancel this request"
                title="Cancel Request">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false" style="width:14px;height:14px;flex-shrink:0"><circle cx="8" cy="8" r="6"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>
            Cancel Request
        </button>
    </div>
    <!--{/if}-->

    <!-- ── Row 1: ID badge · Title (with inline edit button) ── -->
    <div class="pv-meta" role="group" aria-label="Idea metadata">
        <span class="pv-id-badge" aria-label="Idea number <!--{$recordID|strip_tags}-->">#<!--{$recordID|strip_tags}--></span>
        <h1 class="pv-title" id="pv-heading-5">
            <span id="pv-value-5" aria-live="polite"><span class="pv-empty">Loading&hellip;</span></span>
            <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
            <button type="button" class="pv-edit-btn noprint" data-ind="5" onclick="pvOpenEdit(5)" aria-label="Edit title">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                Edit
            </button>
            <!--{/if}-->
        </h1>
    </div>

    <!-- ── Row 2: Status · Votes ── -->
    <div class="pv-info-row" role="group" aria-label="Idea status and votes">
        <span class="pv-info-item" id="pv-status-item" hidden>
            <span class="pv-info-label">Status</span>
            <span class="pv-info-val pv-info-val--status" id="pv-status-pill" aria-live="polite"></span>
        </span>
        <span class="pv-info-sep" aria-hidden="true" id="pv-info-sep" hidden>·</span>
        <span class="pv-info-item">
            <span class="pv-info-label">Votes</span>
            <span class="pv-info-val pv-info-val--votes" id="pv-votes-pill" aria-live="polite">
                <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
                <span id="pv-votes-count">—</span>
            </span>
        </span>
    </div>

    <!-- ── indicatorID 6: Detailed Summary ── -->
    <section class="pv-card" aria-labelledby="pv-label-6">
        <span class="pv-card-label" id="pv-label-6">
            Detailed Summary
            <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
            <button type="button" class="pv-edit-btn noprint" data-ind="6" onclick="pvOpenEdit(6)" aria-label="Edit detailed summary">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                Edit
            </button>
            <!--{/if}-->
        </span>
        <div class="pv-card-body" id="pv-value-6" aria-live="polite"><span class="pv-empty">Loading&hellip;</span></div>
    </section>

    <!-- ── Two-column: Benefit (7) + Category/Impact (8, 9) ── -->
    <div class="pv-two-col">

        <!-- Benefit -->
        <section class="pv-card" aria-labelledby="pv-label-7">
            <span class="pv-card-label" id="pv-label-7">
                Benefit
                <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
                <button type="button" class="pv-edit-btn noprint" data-ind="7" onclick="pvOpenEdit(7)" aria-label="Edit benefit">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                    Edit
                </button>
                <!--{/if}-->
            </span>
            <div class="pv-card-body" id="pv-value-7" aria-live="polite"><span class="pv-empty">Loading&hellip;</span></div>
        </section>

        <!-- Category + Impact -->
        <section class="pv-card" aria-labelledby="pv-label-8">
            <span class="pv-card-label" id="pv-label-8">
                Category
                <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
                <button type="button" class="pv-edit-btn noprint" data-ind="8" onclick="pvOpenEdit(8)" aria-label="Edit category">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                    Edit
                </button>
                <!--{/if}-->
            </span>
            <div class="pv-card-body" id="pv-value-8" aria-live="polite"><span class="pv-empty">Loading&hellip;</span></div>

            <!-- Sub-question: indicatorID 13 (only if category = Other) -->
            <div id="pv-subq-13" hidden>
                <div class="pv-sub-card" aria-labelledby="pv-label-13">
                    <span class="pv-card-label" id="pv-label-13">
                        Please specify category
                        <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
                        <button type="button" class="pv-edit-btn noprint" data-ind="13" onclick="pvOpenEdit(13)" aria-label="Edit category specification">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                            Edit
                        </button>
                        <!--{/if}-->
                    </span>
                    <div class="pv-card-body" id="pv-value-13" aria-live="polite"></div>
                </div>
            </div>

            <hr class="pv-card-divider" role="separator" />

            <span class="pv-card-label" id="pv-label-9">
                Impact
                <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
                <button type="button" class="pv-edit-btn noprint" data-ind="9" onclick="pvOpenEdit(9)" aria-label="Edit impact">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                    Edit
                </button>
                <!--{/if}-->
            </span>
            <div class="pv-card-body" id="pv-value-9" aria-live="polite"><span class="pv-empty">Loading&hellip;</span></div>
        </section>

    </div><!-- /.pv-two-col -->

    <!-- ── indicatorID 10: Attachments ── -->
    <section class="pv-card" aria-labelledby="pv-label-10">
        <span class="pv-card-label" id="pv-label-10">
            Attachments
            <!--{if $canWrite && ($is_admin || $submitted == 0)}-->
            <button type="button" class="pv-edit-btn noprint" data-ind="10" onclick="pvOpenEdit(10)" aria-label="Edit attachments">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                Edit
            </button>
            <!--{/if}-->
        </span>
        <div id="pv-value-10" aria-live="polite" aria-label="Attachments loading"><span class="pv-empty">Loading&hellip;</span></div>
    </section>

    <!-- ── Actions bar: Vote + Share ── -->
    <div class="pv-actions" role="group" aria-label="Idea actions">
        <span class="pv-actions-label">Actions</span>
        <div class="pv-actions-divider" role="separator" aria-hidden="true"></div>
        <button type="button"
                class="pv-upvote"
                id="pv-vote-btn"
                data-record-id="<!--{$recordID|strip_tags}-->"
                aria-label="Vote for this idea"
                title="Vote for this idea">
            <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
            Vote for this idea
        </button>
        <button type="button"
                class="pv-share"
                id="pv-share-btn"
                data-record-link="https://leaf.va.gov/platform/ideas/index.php?a=printview&recordID=<!--{$recordID|strip_tags}-->"
                aria-label="Copy shareable link for this idea"
                title="Copy shareable link">
            <span class="material-symbols-outlined" aria-hidden="true">share</span>
            Share
        </button>
    </div>

</main>

<!-- Toast -->
<div id="pvToast" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- ── Data loader ── -->
<script>
var pvCanEdit = <!--{if $canWrite && ($is_admin || $submitted == 0)}-->true<!--{else}-->false<!--{/if}-->;

(function() {
    var recordID  = <!--{$recordID|strip_tags|escape:'javascript'}-->;
    var portalURL = '<!--{$portal_url|escape:'javascript'}-->';

    var fields = [
        { id: 5,  target: 'pv-value-5' },
        { id: 6,  target: 'pv-value-6' },
        { id: 7,  target: 'pv-value-7' },
        { id: 8,  target: 'pv-value-8',
          onValue: function(text) {
              if (text.trim().toLowerCase() === 'other') {
                  var subq = document.getElementById('pv-subq-13');
                  if (subq) { subq.removeAttribute('hidden'); }
                  loadIndicator(13);
              }
          }
        },
        { id: 9,  target: 'pv-value-9' },
        { id: 10, target: 'pv-value-10', isAttachment: true },
        { id: 12, target: null,
          onValue: function(text) {
              var val = text.trim();
              if (!val || val === 'N/A') { return; }
              var pill = document.getElementById('pv-status-pill');
              var item = document.getElementById('pv-status-item');
              var sep  = document.getElementById('pv-info-sep');
              if (pill) { pill.textContent = val; }
              if (item) { item.removeAttribute('hidden'); }
              if (sep)  { sep.removeAttribute('hidden'); }
          }
        }
    ];

    function extractCleanValue(html, indicatorID) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var span = tmp.querySelector('[id^="data_' + indicatorID + '_"]');
        if (span) { return (span.textContent || span.innerText || '').trim(); }
        var scripts = tmp.querySelectorAll('script, input, button, textarea, select');
        scripts.forEach(function(s) { s.remove(); });
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    function renderText(el, html, indicatorID) {
        var value = extractCleanValue(html, indicatorID);
        if (value === '' || value === 'N/A') {
            el.innerHTML = '<span class="pv-empty">Not provided</span>';
        } else {
            el.textContent = value;
        }
    }

    function extractText(html, indicatorID) {
        return extractCleanValue(html, indicatorID);
    }

    function renderAttachments(el, html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var imgs  = tmp.querySelectorAll('img[src*="image.php"]');
        var links = tmp.querySelectorAll('a[href*="file.php"]');
        if (imgs.length === 0 && links.length === 0) {
            el.innerHTML = '<span class="pv-empty">No attachments provided.</span>';
            return;
        }
        var out = '<div class="pv-attach-grid">';
        imgs.forEach(function(img, i) {
            var src      = img.getAttribute('src') || '';
            var altRaw   = img.getAttribute('alt') || '';
            var filename = altRaw.replace(/^image upload:\s*/i, '').trim() || ('Image ' + (i + 1));
            out += '<figure class="pv-attach-figure">';
            out +=   '<button type="button" class="pv-attach-btn"'
                  +        ' onclick="window.open(\'' + src.replace(/'/g, "\\'") + '\',\'pv_img_' + i + '\',\'width=750,height=750,resizable=yes,scrollbars=yes\')"'
                  +        ' aria-label="View full size: ' + filename.replace(/"/g, '&quot;') + '">';
            out +=     '<img src="' + src + '" alt="' + filename.replace(/"/g, '&quot;') + '" class="pv-attach-thumb"'
                  +         ' onerror="this.closest(\'.pv-attach-btn\').setAttribute(\'aria-label\',\'Image could not load: ' + filename.replace(/"/g, '&quot;') + '\')" />';
            out +=   '</button>';
            out +=   '<span class="pv-attach-caption" aria-hidden="true" title="' + filename.replace(/"/g, '&quot;') + '">' + filename + '</span>';
            out += '</figure>';
        });
        if (links.length > 0) {
            out += '<ul class="pv-file-list" aria-label="Downloadable files">';
            links.forEach(function(a) {
                var href     = a.getAttribute('href') || '#';
                var filename = (a.textContent || '').trim() || 'Download file';
                out += '<li class="pv-file-item">'
                    +    '<span class="pv-file-icon" aria-hidden="true">'
                    +      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">'
                    +        '<path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z"/>'
                    +        '<path d="M9 2v4h4"/>'
                    +      '</svg>'
                    +    '</span>'
                    +    '<a href="' + href + '" target="_blank" rel="noopener noreferrer" class="pv-file-link"'
                    +       ' aria-label="Download ' + filename.replace(/"/g, '&quot;') + ' (opens in new tab)"'
                    +    '>' + filename + '</a>'
                    +  '</li>';
            });
            out += '</ul>';
        }
        out += '</div>';
        el.innerHTML = out;
    }

    function loadIndicator(indicatorID, cfg) {
        cfg = cfg || { target: 'pv-value-' + indicatorID, isAttachment: false };
        var el = cfg.target ? document.getElementById(cfg.target) : null;
        $.ajax({
            type: 'GET',
            url: 'ajaxIndex.php?a=getprintindicator'
                + '&recordID='     + encodeURIComponent(recordID)
                + '&indicatorID='  + encodeURIComponent(indicatorID)
                + '&series=1',
            dataType: 'text',
            cache: false,
            success: function(html) {
                if (cfg.isAttachment && el) {
                    renderAttachments(el, html);
                } else {
                    if (el) { renderText(el, html, indicatorID); }
                    if (typeof cfg.onValue === 'function') {
                        cfg.onValue(extractText(html, indicatorID));
                    }
                }
            },
            error: function() {
                if (el) { el.innerHTML = '<span class="pv-empty">Could not load this field.</span>'; }
            }
        });
    }

    /* ── Live vote count pill (all users) ── */
    function pvFetchVoteCount() {
        var ideaKey = String(recordID);
        var q = {
            terms: [
                { id: 'categoryID', operator: '=', match: 'form_57e89', gate: 'AND' },
                { id: 'deleted',    operator: '=', match: 0,             gate: 'AND' }
            ],
            joins: [],
            getData: ['2']
        };
        $.ajax({
            type: 'GET',
            url: './api/form/query',
            data: { q: JSON.stringify(q), 'x-filterData': 'recordID,s1' },
            dataType: 'json',
            cache: false,
            success: function(res) {
                var count = 0;
                $.each(res, function(_, vote) {
                    if (String((vote.s1 && vote.s1['id2']) || '') === ideaKey) { count++; }
                });
                var countEl = document.getElementById('pv-votes-count');
                if (countEl) { countEl.textContent = count + ' ' + (count === 1 ? 'vote' : 'votes'); }
                /* Keep admin sidebar label in sync */
                var lbl = document.getElementById('btn-votes-label');
                if (lbl) { lbl.textContent = 'Votes (' + count + ')'; }
                window._pvVoteCount = count;
            },
            error: function() {
                var countEl = document.getElementById('pv-votes-count');
                if (countEl) { countEl.textContent = '—'; }
            }
        });
    }

    $(function() {
        fields.forEach(function(cfg) { loadIndicator(cfg.id, cfg); });
        pvFetchVoteCount();
    });

    window._pvLoadIndicator  = loadIndicator;
    window._pvFields         = fields;
    window._pvFetchVoteCount = pvFetchVoteCount;

}());

/* ── Vote + Share IIFE ── */
(function() {
    var PV_RECORD_ID     = <!--{$recordID|strip_tags|escape:'javascript'}-->;
    var PV_USER_ID       = '<!--{$userID|strip_tags|escape:'javascript'}-->';
    var PV_FORM_KEY      = '57e89';
    var PV_VOTE_IND_IDEA = 2;
    var PV_VOTE_IND_USER = 3;
    var _pvToastTimer       = null;
    var _pvVotingInProgress = false;
    var _pvResolvedEmail    = '';
    var _pvEmailResolved    = false;

    function pvIsRealEmail(str) {
        return typeof str === 'string' && str.includes('@') && !str.includes('<!--');
    }

    function pvResolveEmail() {
        return new Promise(function(resolve) {
            if (!PV_USER_ID) { resolve(''); return; }
            var url = '/platform/orgchart/api/employee/search'
                + '?q=userName:' + encodeURIComponent(PV_USER_ID)
                + '&noLimit=0&_=' + Date.now();
            fetch(url, { credentials: 'same-origin' })
                .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
                .then(function(data) {
                    var employees = Array.isArray(data) ? data : Object.values(data || {});
                    var match = employees.find(function(e) {
                        return e && (e.userName === PV_USER_ID || e.userName === PV_USER_ID.split('\\').pop());
                    });
                    var email = (match && (match.Email || match.email)) || '';
                    _pvResolvedEmail = pvIsRealEmail(email) ? email : PV_USER_ID;
                    _pvEmailResolved = true;
                    resolve(_pvResolvedEmail);
                })
                .catch(function(err) {
                    console.warn('[pvResolveEmail] orgchart API failed:', err);
                    _pvResolvedEmail = PV_USER_ID;
                    _pvEmailResolved = true;
                    resolve(_pvResolvedEmail);
                });
        });
    }

    function pvShowToast(msg, isError) {
        var toast = document.getElementById('pvToast');
        if (!toast) { return; }
        toast.textContent = msg || '';
        toast.classList.toggle('is-error', !!isError);
        toast.classList.add('is-visible');
        if (_pvToastTimer) { clearTimeout(_pvToastTimer); }
        _pvToastTimer = setTimeout(function() { toast.classList.remove('is-visible'); }, 4000);
    }

    function pvCopyFallback(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            pvShowToast(ok ? 'Idea link copied to clipboard.' : 'Could not copy — please copy the URL manually.', !ok);
        } catch(e) {
            pvShowToast('Could not copy — please copy the URL manually.', true);
        }
    }

    function pvSetVoted(isVoted) {
        var btn = document.getElementById('pv-vote-btn');
        if (!btn) { return; }
        btn.disabled = isVoted;
        btn.setAttribute('aria-disabled', isVoted ? 'true' : 'false');
        btn.classList.toggle('is-voted', isVoted);
        btn.setAttribute('aria-label', isVoted ? "You've already voted for this idea" : 'Vote for this idea');
        btn.title = isVoted ? "You've already voted for this idea" : 'Vote for this idea';
    }

    function pvCheckVoted() {
        if (!PV_USER_ID) { return; }
        var q = {
            terms: [
                { id: 'categoryID', operator: '=', match: 'form_57e89', gate: 'AND' },
                { id: 'deleted',    operator: '=', match: 0,             gate: 'AND' }
            ],
            joins: [],
            getData: [String(PV_VOTE_IND_IDEA), String(PV_VOTE_IND_USER)]
        };
        $.ajax({
            type: 'GET',
            url: './api/form/query',
            data: { q: JSON.stringify(q), 'x-filterData': 'recordID,s1' },
            dataType: 'json',
            cache: false,
            success: function(res) {
                var ideaKey  = String(PV_RECORD_ID);
                var emailKey = _pvResolvedEmail ? _pvResolvedEmail.toLowerCase() : '';
                var userKey  = PV_USER_ID.toLowerCase();
                var hasVoted = false;
                $.each(res, function(_, vote) {
                    var linkedIdea = String((vote.s1 && vote.s1['id' + PV_VOTE_IND_IDEA]) || '');
                    var voter      = String((vote.s1 && vote.s1['id' + PV_VOTE_IND_USER]) || '').toLowerCase();
                    if (linkedIdea === ideaKey && (voter === emailKey || voter === userKey)) {
                        hasVoted = true;
                        return false;
                    }
                });
                if (hasVoted) { pvSetVoted(true); }
            },
            error: function() { /* silently fail */ }
        });
    }

    function pvIdeaVotes() {
        if (_pvVotingInProgress) { return; }
        var btn = document.getElementById('pv-vote-btn');
        if (btn && btn.disabled) { pvShowToast('You already voted on this idea.', true); return; }
        _pvVotingInProgress = true;
        pvSetVoted(true);

        var doSubmit = function(voterIdentity) {
            var payload = new URLSearchParams();
            payload.append('service', '');
            payload.append('title', 'Idea #' + PV_RECORD_ID);
            payload.append('priority', '0');
            payload.append('CSRFToken', CSRFToken);
            payload.append('numform_' + PV_FORM_KEY, '1');
            payload.append(String(PV_VOTE_IND_USER), voterIdentity);
            payload.append(String(PV_VOTE_IND_IDEA), String(PV_RECORD_ID));
            fetch('./api/?a=form/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString()
            })
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var newID = parseFloat(text.replace(/^"|"$/g, ''));
                if (!isNaN(newID) && isFinite(newID) && newID !== 0) {
                    pvShowToast('Thanks for voting!');
                    /* Refresh votes pill after successful vote */
                    if (typeof window._pvFetchVoteCount === 'function') { window._pvFetchVoteCount(); }
                } else {
                    throw new Error('Unexpected response: ' + text);
                }
            })
            .catch(function(err) {
                console.error('[pvIdeaVotes] error:', err);
                pvShowToast('Error processing vote. Please try again.', true);
                pvSetVoted(false);
            })
            .finally(function() { _pvVotingInProgress = false; });
        };

        if (_pvEmailResolved) {
            doSubmit(_pvResolvedEmail);
        } else {
            pvResolveEmail().then(function(identity) { doSubmit(identity); });
        }
    }

    function pvShare() {
        var btn  = document.getElementById('pv-share-btn');
        var link = btn ? btn.getAttribute('data-record-link') : window.location.href;
        if (!link) { return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link)
                .then(function()  { pvShowToast('Idea link copied to clipboard.'); })
                .catch(function() { pvCopyFallback(link); });
        } else {
            pvCopyFallback(link);
        }
    }

    $(function() {
        var voteBtn  = document.getElementById('pv-vote-btn');
        var shareBtn = document.getElementById('pv-share-btn');
        if (voteBtn)  { voteBtn.addEventListener('click',  pvIdeaVotes); }
        if (shareBtn) { shareBtn.addEventListener('click', pvShare); }
        pvResolveEmail().then(function() { pvCheckVoted(); });
    });

}());

/* ── Edit handler ── */
function pvOpenEdit(indicatorID) {
    if (!pvCanEdit) { return; }
    if (typeof form === 'undefined') { console.warn('pvOpenEdit: LeafForm not ready yet'); return; }
    form.setPostModifyCallback(function() {
        var fields = window._pvFields || [];
        var loadFn = window._pvLoadIndicator;
        var cfg    = null;
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].id === indicatorID) { cfg = fields[i]; break; }
        }
        if (!cfg) { cfg = { id: indicatorID, target: 'pv-value-' + indicatorID }; }
        if (typeof loadFn === 'function') { loadFn(indicatorID, cfg); }
        form.dialog().hide();
    });
    form.dialog().show();
    form.getForm(indicatorID, 1);
}
</script>

</div>

<!-- Group 226 toolbar -->
<!--{if $empMembership['groupID'][226]}-->
<div id="toolbar226" class="toolbar_right toolbar noprint">

    <div class="pm-transfer-wrap">
        <button type="button" class="tools pm-transfer-btn" onclick="transferToPMDashboard()" title="Transfer to LEAF Projects">
            <img src="dynicons/?img=go-next.svg&amp;w=32" alt="" aria-hidden="true" style="vertical-align: middle" /> Transfer to LEAF Projects
        </button>
    </div>

    <div id="tools226" class="tools">
        <h1>Idea Tools</h1>
        <!--{if $submitted == 0}-->
            <button type="button" class="tools" onclick="window.location='?a=view&amp;recordID=<!--{$recordID|strip_tags}-->'">
                <img src="dynicons/?img=edit-find-replace.svg&amp;w=32" alt="" aria-hidden="true" style="vertical-align: middle" />
                Edit this form
            </button><br /><br />
        <!--{/if}-->
        <button type="button" class="tools" onclick="viewHistory()">
            <img src="dynicons/?img=appointment.svg&amp;w=32" alt="" aria-hidden="true" style="vertical-align: middle" />
            View History
        </button>
        <button type="button" class="tools"
            onclick="window.location='mailto:?subject=FW:%20Request%20%23<!--{$recordID|strip_tags}-->%20-%20<!--{$title|escape:'url'}-->&amp;body=Request%20URL:%20<!--{if $smarty.server.HTTPS == on}-->https<!--{else}-->http<!--{/if}-->://<!--{$smarty.server.SERVER_NAME}--><!--{$smarty.server.REQUEST_URI|escape:'url'}-->%0A%0A'">
            <img src="dynicons/?img=internet-mail.svg&amp;w=32" alt="" aria-hidden="true" style="vertical-align: middle" />
            Write Email
        </button>
        <button type="button" class="tools" id="btn_printForm" title="Print this Form">
            <img src="dynicons/?img=printer.svg&amp;w=32" alt="" style="vertical-align: middle" />
            Print to PDF
            <span style="font-style: italic; background-color: white; color: #d00; border: 1px solid black; padding: 4px">BETA</span>
        </button>
        <input type='hidden' id='abs_portal_path' value='<!--{$abs_portal_path}-->' />
        <!--{if $bookmarked == ''}-->
            <button type="button" class="tools" onclick="toggleBookmark()" id="tool_bookmarkText" title="Add Bookmark">
                <img src="dynicons/?img=bookmark-new.svg&amp;w=32" alt="" style="vertical-align: middle" />
                <span role="status" aria-live="polite">Add Bookmark</span>
            </button>
        <!--{else}-->
            <button type="button" class="tools" onclick="toggleBookmark()" id="tool_bookmarkText" title="Delete Bookmark">
                <img src="dynicons/?img=bookmark-new.svg&amp;w=32" alt="" style="vertical-align: middle" />
                <span role="status" aria-live="polite">Delete Bookmark</span>
            </button>
        <!--{/if}-->
        <button type="button" class="tools" onclick="copyRequest()" title="Copy Request"
            style="background-image: url(dynicons/?img=edit-copy.svg&amp;w=32); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 35px; height: 38px">
            Copy Request
        </button>
        <br /><br />
        <!--{if $submitted == 0 || $is_admin}-->
            <button type="button" class="tools" id="btn_cancelRequest" title="Cancel Request" onclick="cancelRequest()">
                <img src="dynicons/?img=process-stop.svg&amp;w=16" alt="" style="vertical-align: middle" />
                Cancel Request
            </button>
        <!--{/if}-->
    </div>

    <div id="comments" style="display: none">
        <h1 id='comment_header'><label for="note">Comments</label></h1>
        <div id="notes">
            <form id='note_form'>
                <input type='hidden' name='userID' value='<!--{$userID|strip_tags}-->' />
                <input type='text' id='note' name='note' placeholder='Enter a note!' />
                <button type="button" id='add_note' class='button' onclick="submitNote(<!--{$recordID|strip_tags}-->)">Post</button>
            </form>
        </div>
        <!--{section name=i loop=$comments}-->
            <div class='comment_block'>
                <span class="comments_time"><!--{$comments[i].time|date_format:' %b %e'|escape}--></span>
                <span class="comments_name">
                    <!--{$comments[i].actionTextPasttense|sanitize}-->
                    <!--{if $comments[i].name != ''}--> by <!--{/if}-->
                    <!--{$comments[i].name}-->
                </span>
                <div class="comments_message"><!--{$comments[i].comment|sanitize}--></div>
            </div>
        <!--{/section}-->
    </div>

    <div id="category_list">
        <h1>Internal Use</h1>
        <button class="IUbutton"
            onclick="scrollPage('formcontent');openContent('ajaxIndex.php?a=printview&amp;recordID=<!--{$recordID|strip_tags}-->');"
            style="background-image: url(dynicons/?img=text-x-generic.svg&amp;w=16); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 20px;">
            Main Request
        </button>
        <!--{section name=i loop=$childforms}-->
            <button class="IUbutton"
                onclick="scrollPage('formcontent');openContent('ajaxIndex.php?a=internalonlyview&amp;recordID=<!--{$recordID|strip_tags}-->&amp;childCategoryID=<!--{$childforms[i].childCategoryID|strip_tags}-->');"
                style="background-image: url(dynicons/?img=text-x-generic.svg&amp;w=16); background-repeat: no-repeat; background-position: left; text-align: center">
                <!--{$childforms[i].childCategoryName|sanitize}-->
            </button>
        <!--{/section}-->
        <!--{if $is_admin}-->
        <button class="IUbutton pv-votes-btn" id="btn-votes"
            onclick="toggleVotes(<!--{$recordID|strip_tags|escape}-->);"
            aria-expanded="false"
            aria-controls="formcontent">
            <img src="dynicons/?img=award-ribbon.svg&amp;w=16" alt="" aria-hidden="true" style="vertical-align:middle;margin-right:5px;" />
            <span id="btn-votes-label">Votes</span>
        </button>
        <!--{/if}-->
    </div>

    <div id="metaContainer" style="display: none">
        <div id="metaLabel"></div>
        <div id="metaContent"></div>
    </div>

    <!--{if $is_admin}-->
        <div id="adminTools" class="tools">
            <h1>Administrative Tools</h1>
            <!--{if $submitted != 0}-->
                <button class="AdminButton" onclick="admin_changeStep()" title="Change Current Step"
                    style="background-image: url(dynicons/?img=go-jump.svg&w=32); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 35px; height: 38px">
                    Change Current Step
                </button>
            <!--{/if}-->
            <button class="AdminButton" onclick="changeService()" title="Change Service"
                style="background-image: url(dynicons/?img=user-home.svg&amp;w=32); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 35px; height: 38px">
                Change Service
            </button>
            <button class="AdminButton" onclick="admin_changeForm()" title="Change Forms"
                style="background-image: url(dynicons/?img=system-file-manager.svg&amp;w=32); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 35px; height: 38px">
                Change Form(s)
            </button>
            <button class="AdminButton" onclick="admin_changeInitiator()" title="Change Initiator"
                style="background-image: url(dynicons/?img=gnome-stock-person.svg&amp;w=32); background-repeat: no-repeat; background-position: left; text-align: left; text-indent: 35px; height: 38px">
                Change Initiator
            </button>
        </div>
    <!--{/if}-->

    <div class="toolbar_security">
        <h1 role="heading">Security Permissions</h1>
        <button class="buttonPermission" onclick="viewAccessLogsRead()">
            <!--{if $canRead}-->
                <img src="dynicons/?img=edit-find.svg&amp;w=32" alt="" style="vertical-align: middle" /> You have read access
            <!--{else}-->
                <img src="dynicons/?img=emblem-readonly.svg&amp;w=32" alt="" style="vertical-align: middle" /> You do not have read access
            <!--{/if}-->
        </button>
        <button class="buttonPermission" onclick="viewAccessLogsWrite()">
            <!--{if $canWrite}-->
                <img src="dynicons/?img=accessories-text-editor.svg&amp;w=32" alt="" style="vertical-align: middle" /> You have write access
            <!--{else}-->
                <img src="dynicons/?img=emblem-readonly.svg&amp;w=32" alt="" style="vertical-align: middle" /> You do not have write access
            <!--{/if}-->
        </button>
    </div>

</div>
<!--{/if}-->
<!--{if $empMembership['groupID'][226]}--></div><!--{/if}-->

<!--{if $empMembership['groupID'][226]}-->
<div class="pv-internal-banner noprint" role="note" aria-label="Internal view notice">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false" style="width:15px;height:15px;flex-shrink:0;"><path d="M8 1L1 14h14L8 1z"/><path d="M8 6v4M8 11.5v.5"/></svg>
    LEAF TEAM — INTERNAL VIEW ONLY
</div>
<!--{/if}-->
<div id="formcontent" style="margin-top: 0;"></div>

<!-- DIALOG BOXES -->
<div id="formContainer"></div>
<!--{include file="site_elements/generic_xhrDialog.tpl"}-->
<!--{include file="site_elements/generic_confirm_xhrDialog.tpl"}-->
<!--{include file="site_elements/generic_dialog.tpl"}-->
<!--{include file="site_elements/generic_OkDialog.tpl"}-->

<script type="text/javascript" src="js/functions/toggleZoom.js"></script>
<script type="text/javascript" src="<!--{$app_js_path}-->/LEAF/sensitiveIndicator.js"></script>
<script type="text/javascript">

    $(document).ready(function() {
        let step = parseInt(<!--{$stepID|strip_tags}-->);

        $(window).keydown(function(event) {
            if (event.keyCode == 13 && ($('#note').is(":focus") || $('#add_note').is(":focus"))) {
                event.preventDefault();
                submitNote(<!--{$recordID|strip_tags}-->);
                return false;
            }
        });

        if (step > 0) {
            $('#comments').css({'display': "block"});
            $('#notes').css({'display': "block"});
        } else if (step == 0 && $(".comment_block")[0]) {
            $('#comments').css({'display': "block"});
            $('#notes').css({'display': "none"});
        } else {
            $('#comments').css({'display': "none"});
            $('#notes').css({'display': "none"});
        }
    });

    var currIndicatorID;
    var currSeries;
    var recordID  = <!--{$recordID|strip_tags}-->;
    var serviceID = <!--{$serviceID|strip_tags}-->;
    var CSRFToken = '<!--{$CSRFToken}-->';
    var formPrintConditions = {};

    function doSubmit(recordID) {
        $('#submitControl').empty().html('<img alt="" src="./images/indicator.gif" />Submitting...');
        $.ajax({
            type: 'POST',
            url: "./api/form/" + recordID + "/submit",
            data: {CSRFToken: '<!--{$CSRFToken}-->'},
            success: function(response) {
                if(response?.errors?.length === 0) {
                    $('#submitStatus').text('Request submmited');
                    $('#submitControl').empty().html('Submitted');
                    $('#submitContent').hide('blind', 500);
                    $('#comments').css({'display': "block"});
                    $('#notes').css({'display': "block"});
                    const isAdmin = '<!--{$is_admin}-->';
                    if (isAdmin !== "1") { $('#btn_cancelRequest').hide(); }
                    workflow.setExtraParams('masquerade=nonAdmin');
                    workflow.getWorkflow(recordID);
                } else {
                    let errors = '';
                    for(let i in response.errors) { errors += response.errors[i] + '<br />'; }
                    $('#submitControl').empty().html('Error: ' + errors);
                    $('#submitStatus').text('Request can not be submmited');
                }
            },
            error: function(res) { console.log(res); }
        });
    }

    function submitNote(recordID) {
        const noteEl = document.getElementById('note');

        if (noteEl.value.trim() !== '') {
            const postData = new URLSearchParams();
            postData.append('note', noteEl.value);
            postData.append('CSRFToken', '<!--{$CSRFToken}-->');

            fetch("./api/note/" + recordID, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: postData
            }).then(function(response) {
                if (response.ok) {
                    return response.json();
                }
                return response.text().then(function(error) {
                    throw new Error(error);
                });
            }).then(function(response) {
                noteEl.value = '';
                addNote(response);
                dialog_ok.setTitle('Note Posted Successfully');
                dialog_ok.setContent(
                    'Your note has been posted. <b style="color: red">Please keep in mind this does not send notifications.</b>'
                );
                dialog_ok.setSaveHandler(function() {
                    dialog_ok.clearDialog();
                    dialog_ok.hide();
                });
                dialog_ok.show();
            }).catch(function(error) {
                console.log(error);
            });
        }
    }

    function addNote(response) {
        if (typeof response === 'object' && response !== null) {
            let new_note = '<div class="comment_block"> <span class="comments_time"> ' + response.date +
                '</span> <span class="comments_name">Note Added by ' + response.user_name +
                '</span> <div class="comments_message">' + response.note + '</div> </div>';
            $(new_note).insertAfter("#notes");
        } else {
            console.log('An object was not returned');
        }
    }

    function updateTags() {
        $('#tags').fadeOut(250);
        $.ajax({
            type: 'GET',
            url: "./api/form/<!--{$recordID|strip_tags}-->/tags",
            success: function(res) {
                let buffer = '';
                if (res.length > 0) { buffer = res.length + ' Bookmarks'; }
                let tags = $('#tags');
                tags.empty().html(buffer);
                tags.fadeIn(250);
            },
            cache: false
        });
    }

    function getForm(indicatorID, series) {
        form.dialog().show();
        form.setPostModifyCallback(function() {
            getIndicator(indicatorID, series);
            updateProgress();
            form.dialog().hide();
        });
        form.getForm(indicatorID, series);
    }

    function getIndicatorLog(indicatorID, series) {
        dialog_message.setContent(
            'Modifications made to this field:<table class="agenda" style="background-color: white"><thead><tr><th>Date/Author</th><th>Data</th></tr></thead><tbody id="history_' + indicatorID + '"></tbody></table>');
        dialog_message.indicateBusy();
        dialog_message.show();
        $.ajax({
            type: 'GET',
            url: "api/form/<!--{$recordID|strip_tags}-->/" + indicatorID + "/" + series + '/history',
            success: function(res) {
                let numChanges = res.length;
                let prev = '';
                for (let i = 0; i < numChanges; i++) {
                    curr = res.pop();
                    date = new Date(curr.timestamp * 1000);
                    data = curr.data;
                    if (i != 0) { data = diffString(prev, data); }
                    $('#history_' + indicatorID).prepend('<tr><td>' + date.toString() + '<br /><b>' + curr.name + '</b></td><td><span class="printResponse" style="font-size: 16px">' + data + '</span></td></tr>');
                    prev = curr.data;
                }
                dialog_message.indicateIdle();
            },
            error: function(res) { dialog_message.setContent(res); dialog_message.indicateIdle(); },
            cache: false
        });
    }

    function getIndicator(indicatorID, series) {
        $.ajax({
            type: 'GET',
            url: "ajaxIndex.php?a=getprintindicator&recordID=<!--{$recordID|strip_tags}-->&indicatorID=" + indicatorID + "&series=" + series,
            dataType: 'text',
            success: function(response) {
                let currentPHindicator = $("#PHindicator_" + indicatorID + "_" + series);
                if (currentPHindicator.hasClass("printheading_missing")) {
                    currentPHindicator.removeClass("printheading_missing");
                    currentPHindicator.addClass("printheading");
                }
                let xhrIndicator = $("#xhrIndicator_" + indicatorID + "_" + series);
                xhrIndicator.empty().html(response);
                xhrIndicator.fadeOut(250, function() { xhrIndicator.fadeIn(250); });
                handlePrintConditionalIndicators(formPrintConditions);
            },
            error: function() { console.log('There was an error getting the indicator!'); },
            cache: false
        });
    }

    function updateProgress() {
        $.ajax({
            type: 'GET',
            url: "./api/form/<!--{$recordID|strip_tags}-->/progress",
            dataType: 'json',
            success: function(response) {
                if (response < 100) {
                    $('#progressBar').progressbar('option', 'value', response);
                    $('#progressLabel').text(response + '%');
                } else if('<!--{$submitted}-->' == '0') {
                    $('#progressBar').progressbar('option', 'value', response);
                    $('#progressLabel').text(response + '%');
                    $('#progressSidebar').slideUp(500);
                    $.ajax({
                        type: 'GET',
                        url: "ajaxIndex.php?a=getsubmitcontrol&recordID=<!--{$recordID|strip_tags}-->",
                        dataType: 'text',
                        success: function(response) {
                            let submitContent = $("#submitContent");
                            submitContent.empty().html(response);
                            submitContent.css({'border': '1px solid black', 'text-align': 'center', 'background-color': '#ffaeae'});
                            $("#workflowcontent").css({'font-size': "80%", 'padding-top': "8px"});
                        },
                        error: function(response) { $("#xhr").html("Error: " + response); },
                        cache: false
                    });
                }
            },
            error: function() { console.log('There was an error getting the progress!'); },
            cache: false
        });
    }

    function hideForm() { dialog.hide(); }

    function restoreRequest() {
        $.ajax({
            type: 'POST',
            url: "ajaxIndex.php?a=restore",
            data: { restore: <!--{$recordID|strip_tags|escape}-->, CSRFToken: '<!--{$CSRFToken}-->' },
            success: function(response) {
                if (response > 0) { window.location.href="index.php?a=printview&recordID=<!--{$recordID|strip_tags}-->"; }
            },
            error: function() { console.log('There was an error restoring the request!'); }
        });
    }

    <!--{if $bookmarked == ''}-->
        var bookmarkStatus = 0;
    <!--{else}-->
        var bookmarkStatus = 1;
    <!--{/if}-->

    function toggleBookmark() {
        if (bookmarkStatus == 0) {
            addBookmark(); bookmarkStatus = 1; $('#tool_bookmarkText span').empty().html('Delete Bookmark');
        } else {
            removeBookmark(); bookmarkStatus = 0; $('#tool_bookmarkText span').empty().html('Add Bookmark');
        }
    }

    function addBookmark() {
        $.ajax({
            type: 'POST',
            url: "ajaxIndex.php?a=addbookmark&recordID=<!--{$recordID|strip_tags}-->",
            data: { CSRFToken: '<!--{$CSRFToken}-->' },
            success: function() { updateTags(); },
            error: function() { console.log('There was an error adding the bookmark!'); }
        });
    }

    function removeBookmark() {
        $.ajax({
            type: 'POST',
            url: "ajaxIndex.php?a=removebookmark&recordID=<!--{$recordID|strip_tags}-->",
            data: {CSRFToken: '<!--{$CSRFToken}-->'},
            success: function() { updateTags(); },
            error: function() { console.log('There was an error removing the bookmark!'); }
        });
    }

    const valIncludesMultiselOption = (values = [], arrOptions = []) => {
        let result = false;
        let vals = values.map(v => v.replaceAll('\r', '').trim());
        vals.forEach(v => { if (arrOptions.includes(v)) { result = true; } });
        return result;
    }

    function handlePrintConditionalIndicators(formPrintConditions = {}) {
        const multiChoiceFormats = ['multiselect', 'checkboxes'];
        for (let c in formPrintConditions) {
            const childFormat = formPrintConditions[c].format;
            const childFormatIsEnabled = childFormat !== 'raw_data';
            const conditions = formPrintConditions[c].conditions;
            let comparison = false;
            for (let i in conditions) {
                let outcomes = [];
                if (conditions.some(c => c.selectedOutcome.toLowerCase() === "hide")) outcomes.push("hide");
                if (conditions.some(c => c.selectedOutcome.toLowerCase() === "show")) outcomes.push("show");
                if (outcomes.length > 1) { console.warn("Conflicting display conditions: check setup for", c); }
                if (outcomes.length < 1) { continue; }
                const outcome = outcomes[0];
                const parentFormat = conditions[i].parentFormat.toLowerCase();
                const elParentInd = document.getElementById('data_' + conditions[i].parentIndID + '_1');
                const selectedParentOptionsLI = Array.from(document.querySelectorAll(`#xhrIndicator_${conditions[i].parentIndID}_1 > span > ul > li`));
                let arrParVals = [];
                selectedParentOptionsLI.forEach(li => arrParVals.push(li.textContent.trim()));
                const elChildInd = document.getElementById('subIndicator_' + conditions[i].childIndID + '_1');
                if (childFormatIsEnabled && (elParentInd !== null || selectedParentOptionsLI !== null)) {
                    if (comparison !== true) {
                        let val = multiChoiceFormats.includes(parentFormat) ? arrParVals : [(elParentInd?.textContent || '').trim()];
                        val = val.filter(v => v !== '');
                        let compVal = $('<div/>').html(conditions[i].selectedParentValue).text().trim().split('\n');
                        compVal = compVal.map(v => v.trim());
                        const op = conditions[i].selectedOp;
                        switch (op) {
                            case '==': comparison = valIncludesMultiselOption(val, compVal); break;
                            case '!=': comparison = !valIncludesMultiselOption(val, compVal); break;
                            case 'lt': case 'lte': case 'gt': case 'gte':
                                const arrNumVals = val.filter(v => !isNaN(v)).map(v => +v);
                                const arrNumComp = compVal.filter(v => !isNaN(v)).map(v => +v);
                                const orEq = op.includes('e');
                                const gtr = op.includes('g');
                                if(arrNumComp.length > 0) {
                                    for (let i = 0; i < arrNumVals.length; i++) {
                                        const currVal = arrNumVals[i];
                                        comparison = gtr === true
                                            ? (orEq ? currVal >= Math.max(...arrNumComp) : currVal > Math.max(...arrNumComp))
                                            : (orEq ? currVal <= Math.min(...arrNumComp) : currVal < Math.min(...arrNumComp));
                                        if(comparison === true) { break; }
                                    }
                                }
                                break;
                            default: console.log(conditions[i].selectedOp); break;
                        }
                    }
                    switch (outcome) {
                        case 'hide': if (elChildInd !== null) { elChildInd.style.display = comparison === true ? 'none' : 'block'; } break;
                        case 'show': if (elChildInd !== null) { elChildInd.style.display = comparison === true ? 'block' : 'none'; } break;
                        default: console.log(conditions[i].selectedOutcome); break;
                    }
                }
            }
        }
    }

    function openContent(url) {
        $("#formcontent").html('<div style="border: 2px solid black; text-align: center; font-size: 24px; font-weight: bold; background: white; padding: 16px; width: 95%">Loading... <img src="images/largespinner.gif" alt="" /></div>');
        $.ajax({
            type: 'GET', url: url, dataType: 'text',
            success: function(res) {
                $('#formcontent').empty().html(res);
                $('.printmainblock').each(function() {
                    let boxSizer = {};
                    $(this).find('.printsubheading').each(function() {
                        layer = $(this).position().top;
                        if (boxSizer[layer] == undefined) { boxSizer[layer] = $(this).height(); }
                        if ($(this).height() > boxSizer[layer]) { boxSizer[layer] = $(this).height(); }
                    });
                    $(this).find('.printsubheading').each(function() {
                        layer = $(this).position().top;
                        if (boxSizer[layer] != undefined) { $(this).height(boxSizer[layer]); }
                    });
                });
                handlePrintConditionalIndicators(formPrintConditions);
            },
            error: function(res) { $('#formcontent').empty().html(res); },
            cache: false,
        });
    }

    var _pvVotesLoaded   = false;
    var _pvAllVoters     = [];
    var _pvVotesExpanded = false;
    var _pvShowAll       = false;
    var PV_VOTE_CAP      = 20;

    function toggleVotes(ideaRecordID) {
        var btn = document.getElementById('btn-votes');
        var fc  = document.getElementById('formcontent');
        if (!btn || !fc) { return; }
        _pvVotesExpanded = !_pvVotesExpanded;
        btn.setAttribute('aria-expanded', _pvVotesExpanded ? 'true' : 'false');
        if (!_pvVotesExpanded) { fc.innerHTML = ''; return; }
        if (_pvVotesLoaded) { _pvRenderVotes(fc); return; }
        fc.innerHTML = '<div style="padding:16px;font-size:15px;color:#475569;">Loading votes&hellip;</div>';
        var q = {
            terms: [
                { id: 'categoryID', operator: '=', match: 'form_57e89', gate: 'AND' },
                { id: 'deleted',    operator: '=', match: 0,             gate: 'AND' }
            ],
            joins: [], getData: ['2', '3']
        };
        $.ajax({
            type: 'GET', url: './api/form/query',
            data: { q: JSON.stringify(q), 'x-filterData': 'recordID,s1' },
            dataType: 'json', cache: false,
            success: function(res) {
                var ideaKey = String(ideaRecordID);
                _pvAllVoters = [];
                $.each(res, function(_, vote) {
                    if (String((vote.s1 && vote.s1['id2']) || '') === ideaKey) {
                        var v = (vote.s1 && vote.s1['id3']) || '';
                        if (v) { _pvAllVoters.push(v); }
                    }
                });
                _pvVotesLoaded = true;
                _pvRenderVotes(fc);
            },
            error: function() { fc.innerHTML = '<div style="padding:16px;color:#b91c1c;">Could not load votes.</div>'; }
        });
    }

    function _pvRenderVotes(fc) {
        if (_pvAllVoters.length === 0) {
            fc.innerHTML = '<div style="padding:16px;font-size:15px;color:#64748b;font-style:italic;">No votes recorded for this idea.</div>';
            return;
        }
        var total    = _pvAllVoters.length;
        var showList = _pvShowAll ? _pvAllVoters : _pvAllVoters.slice(0, PV_VOTE_CAP);
        var rows     = showList.map(function(v, i) {
            return '<tr>'
                + '<td style="width:32px;color:#94a3b8;padding:7px 10px;border-top:1px solid #f1f5f9;">' + (i + 1) + '</td>'
                + '<td style="padding:7px 10px;border-top:1px solid #f1f5f9;color:#0f172a;">' + $('<div/>').text(v).html() + '</td>'
                + '</tr>';
        }).join('');
        var footer = '';
        if (!_pvShowAll && total > PV_VOTE_CAP) {
            footer = '<div class="pv-votes-footer"><button type="button" class="pv-votes-showall" onclick="_pvShowAll=true;_pvRenderVotes(document.getElementById(\'formcontent\'));">Show all ' + total + ' votes</button></div>';
        } else if (_pvShowAll && total > PV_VOTE_CAP) {
            footer = '<div class="pv-votes-footer"><button type="button" class="pv-votes-showall" onclick="_pvShowAll=false;_pvRenderVotes(document.getElementById(\'formcontent\'));">Show fewer</button></div>';
        }
        fc.innerHTML = '<div class="pv-votes-table-wrap"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#f8fafc;position:sticky;top:0;"><th style="padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;width:32px;">#</th><th style="padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Voter</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + footer;
    }

    function openContentForPrint(){
        $('#formcontent').empty().html('');
        $.ajax({
            type: 'GET', url: 'ajaxIndex.php?a=printview&recordID=<!--{$recordID|strip_tags}-->', dataType: 'text',
            success: function(res) {
                $('#formcontent').append(res);
                $('.printmainblock').each(function() {
                    let boxSizer = {};
                    $(this).find('.printsubheading').each(function() {
                        layer = $(this).position().top;
                        if (boxSizer[layer] == undefined) { boxSizer[layer] = $(this).height(); }
                        if ($(this).height() > boxSizer[layer]) { boxSizer[layer] = $(this).height(); }
                    });
                    $(this).find('.printsubheading').each(function() {
                        layer = $(this).position().top;
                        if (boxSizer[layer] != undefined) { $(this).height(boxSizer[layer]); }
                    });
                });
                handlePrintConditionalIndicators(formPrintConditions);
            },
            error: function(res) { $('#formcontent').empty().html(res); },
            cache: false, async: false,
        });
        <!--{section name=i loop=$childforms}-->
            $.ajax({
                type: 'GET', url: 'ajaxIndex.php?a=internalonlyview&recordID=<!--{$recordID|strip_tags}-->&childCategoryID=<!--{$childforms[i].childCategoryID|strip_tags}-->', dataType: 'text',
                success: function(res) {
                    $('#formcontent').append(res);
                    $('.printmainblock').each(function() {
                        let boxSizer = {};
                        $(this).find('.printsubheading').each(function() {
                            layer = $(this).position().top;
                            if (boxSizer[layer] == undefined) { boxSizer[layer] = $(this).height(); }
                            if ($(this).height() > boxSizer[layer]) { boxSizer[layer] = $(this).height(); }
                        });
                        $(this).find('.printsubheading').each(function() {
                            layer = $(this).position().top;
                            if (boxSizer[layer] != undefined) { $(this).height(boxSizer[layer]); }
                        });
                    });
                    handlePrintConditionalIndicators(formPrintConditions);
                },
                error: function() {},
                cache: false, async: false,
            });
        <!--{/section}-->
    }

    function viewAccessLogsRead() {
        let viewAccessLogsRead = '<!--{foreach from=$accessLogs["read"] item=log}--> <li><!--{$log}--></li> <!--{/foreach}-->';
        dialog_message.setTitle('Security Permissions');
        dialog_message.setContent(viewAccessLogsRead);
        dialog_message.show(); dialog_message.indicateIdle();
        $('div[role="dialog"]').css('height', '20%');
    }

    function viewAccessLogsWrite() {
        let viewAccessLogsWrite = '<!--{foreach from=$accessLogs["write"] item=log}--> <li><!--{$log}--></li> <!--{/foreach}-->';
        dialog_message.setTitle('Access Logs');
        dialog_message.setContent(viewAccessLogsWrite);
        dialog_message.show(); dialog_message.indicateIdle();
        $('div[role="dialog"]').css('height', '20%');
    }

    const recordHistoryState = {
        page: 1,
        pageSize: 20,
        types: ['workflow'],
        items: [],
        requestID: 0,
        isLoadingMore: false,
        sortKey: 'timestampText',
        sortOrder: 'asc'
    };
    let recordHistoryGrid = null;
    let recordHistoryGridColumnCount = 0;

    function buildRecordHistoryDialogContent() {
        return `
            <div id="record-history-dialog">
                <style>
                    #record-history-dialog {
                        box-sizing: border-box;
                        font-family: verdana;
                        max-width: calc(100vw - 4rem);
                        width: 620px;
                    }
                    #record-history-summary {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 1rem;
                        margin-bottom: 0.75rem;
                    }
                    #record-history-summary .history-request-summary { flex: 1 1 auto; }
                    #record-history-summary .history-print-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.35rem;
                        margin-top: 0.15rem;
                        white-space: nowrap;
                    }
                    #record-history-summary .history-request-meta {
                        font-size: 14px;
                        line-height: 1.35;
                    }
                    #record-history-filters {
                        margin: 0 0 0.75rem 0;
                        padding: 0;
                        border: 0;
                    }
                    #record-history-filters legend {
                        font-size: 15px;
                        font-weight: bold;
                        padding: 0;
                        margin: 0 0 0.45rem 0;
                    }
                    #record-history-filters .history-filter-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.65rem 1.5rem;
                    }
                    #record-history-filters .history-filter {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.35rem;
                        font-size: 14px;
                        font-weight: normal;
                    }
                    #record-history-status {
                        margin: 0 0 0.5rem 0;
                        padding: 0;
                        font-size: 14px;
                    }
                    #record-history-table-wrapper {
                        max-height: none;
                        overflow-y: visible;
                        padding: 0;
                    }
                    #record-history-table-wrapper table.leaf_grid {
                        border: 1px solid #666;
                        border-collapse: collapse;
                        border-spacing: 0;
                        margin: 0;
                        width: 100%;
                    }
                    #record-history-table-wrapper table.leaf_grid th {
                        background-color: #d7e3ff;
                        border: 1px solid #666;
                        font-weight: bold;
                        padding: 6px 8px;
                    }
                    #record-history-table-wrapper table.leaf_grid th:hover,
                    #record-history-table-wrapper table.leaf_grid th:focus {
                        background-color: #d7e3ff;
                    }
                    #record-history-table-wrapper table.leaf_grid td {
                        border: 1px solid #666;
                        padding: 8px 10px;
                        vertical-align: top;
                    }
                </style>
                <div id="record-history-summary">
                    <div class="history-request-summary">
                        <div class="history-request-meta">Service: <!--{$service|sanitize}--></div>
                        <div class="history-request-meta">Title of Request: <a href="?a=printview&amp;recordID=<!--{$recordID|strip_tags|escape}-->"><!--{$title|sanitize}--></a></div>
                    </div>
                    <a class="buttonNorm history-print-button" href="?a=status&amp;recordID=<!--{$recordID|strip_tags}-->">
                        <img src="dynicons/?img=printer.svg&amp;w=16" alt="" /> Print
                    </a>
                </div>
                <fieldset id="record-history-filters" aria-label="Record history filters">
                    <legend>Request Data</legend>
                    <div class="history-filter-list">
                        <label class="history-filter"><input type="checkbox" class="history-filter-input" data-history-type="workflow" checked="checked" />Action</label>
                        <label class="history-filter"><input type="checkbox" class="history-filter-input" data-history-type="notes" />Notes</label>
                        <label class="history-filter"><input type="checkbox" class="history-filter-input" data-history-type="email" />Email Delivery</label>
                    </div>
                </fieldset>
                <div id="record-history-status"></div>
                <div id="record-history-table-wrapper">
                    <div id="record-history-grid"></div>
                </div>
            </div>
        `;
    }

    function escapeHistoryHTML(value) {
        if (value == null || value === '') { return ''; }
        return DOMPurify.sanitize(String(value), {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
            ALLOWED_ATTR: ['href', 'target']
        });
    }

    function formatHistoryTimestamp(timestamp) {
        const date = new Date(timestamp * 1000);
        const monthName = date.toLocaleString(undefined, {month: 'long'});
        const day = date.getDate();
        const year = date.getFullYear();
        let hour = date.getHours();
        const minute = String(date.getMinutes()).padStart(2, '0');
        const meridiem = hour >= 12 ? 'PM' : 'AM';
        const tz = Intl.DateTimeFormat(undefined, {timeZoneName: 'short'})
            .formatToParts(new Date())
            .find(part => part.type === 'timeZoneName').value;
        hour = hour % 12 || 12;
        return `${monthName} ${day}, ${year}. ${hour}:${minute} ${meridiem} ${tz}`;
    }

    function getRecordHistoryTimestampMinute(timestamp) {
        return Math.floor((Number(timestamp) || 0) / 60);
    }

    function renderHistoryComment(item) {
        if (!item.comment) { return ''; }
        const escapedComment = escapeHistoryHTML(item.comment).replace(/\n/g, '<br />');
        if (item.historyType === 'email') {
            return `<div style="margin-top:0.35rem;">${escapedComment}</div>`;
        }
        return `<div style="margin-top:0.35rem;">Comment: ${escapedComment}</div>`;
    }

    function getRecordHistoryItemTypeLabel(item) {
        if (item.historyType === 'email') { return 'Email Delivery'; }
        if (item.historyType === 'notes') { return 'Notes'; }
        return 'Action';
    }

    function getRecordHistoryGridHeaders() {
        const headers = [
            {
                name: 'Timestamp',
                indicatorID: 'timestampText',
                editable: false,
                callback: function(data, blob) {
                    $('#' + data.cellContainerID).text(blob[data.recordID].timestampDisplay);
                }
            }
        ];
        if (recordHistoryState.types.length > 1) {
            headers.push({
                name: 'Type',
                indicatorID: 'typeLabel',
                editable: false,
                callback: function(data, blob) {
                    $('#' + data.cellContainerID).text(blob[data.recordID].typeLabel);
                }
            });
        }
        headers.push({
            name: 'Action Taken',
            indicatorID: 'actionDisplay',
            editable: false,
            callback: function(data, blob) {
                $('#' + data.cellContainerID).html(blob[data.recordID].actionDisplay);
            }
        });
        return headers;
    }

    function setRecordHistoryGridMessage(message) {
        if (!recordHistoryGrid) { return; }
        const tbody = document.getElementById(recordHistoryGrid.getPrefixID() + 'tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${recordHistoryGrid.headers().length}" style="text-align:center;">${escapeHistoryHTML(message)}</td></tr>`;
        }
    }

    function sortRecordHistoryItems(items) {
        if (!Array.isArray(items)) { return []; }
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        const sortKey   = recordHistoryState.sortKey || 'timestampText';
        const sortOrder = recordHistoryState.sortOrder === 'asc' ? 'asc' : 'desc';
        return items.slice().sort(function(a, b) {
            let comparison = 0;
            if (sortKey === 'timestampText') {
                comparison = getRecordHistoryTimestampMinute(a.timestamp) - getRecordHistoryTimestampMinute(b.timestamp);
                if (comparison === 0) {
                    const sortOrderComparison = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
                    const timestampComparison = (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
                    const fallbackComparison  = sortOrderComparison !== 0 ? sortOrderComparison : timestampComparison;
                    return sortOrder === 'asc' ? fallbackComparison : fallbackComparison * -1;
                }
            } else if (sortKey === 'typeLabel') {
                comparison = collator.compare(getRecordHistoryItemTypeLabel(a), getRecordHistoryItemTypeLabel(b));
            } else {
                const actionA = `${a.description || ''} ${a.comment || ''}`;
                const actionB = `${b.description || ''} ${b.comment || ''}`;
                comparison = collator.compare(actionA, actionB);
            }
            return sortOrder === 'asc' ? comparison : comparison * -1;
        });
    }

    function sortRecordHistoryGridRows(rows, key, order) {
        if (!Array.isArray(rows) || key !== 'timestampText') { return rows; }
        const sortOrder = order === 'asc' ? 'asc' : 'desc';
        return rows.slice().sort(function(a, b) {
            const comparison = getRecordHistoryTimestampMinute(a.timestampText) - getRecordHistoryTimestampMinute(b.timestampText);
            if (comparison === 0) {
                const sortOrderComparison = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
                const timestampComparison = (Number(a.timestampText) || 0) - (Number(b.timestampText) || 0);
                const fallbackComparison  = sortOrderComparison !== 0 ? sortOrderComparison : timestampComparison;
                return sortOrder === 'asc' ? fallbackComparison : fallbackComparison * -1;
            }
            return sortOrder === 'asc' ? comparison : comparison * -1;
        });
    }

    function renderRecordHistoryGrid(items) {
        const nextColumnCount = recordHistoryState.types.length > 1 ? 3 : 2;
        const gridData  = {};
        const sortedItems = sortRecordHistoryItems(items);
        const gridRows  = sortedItems.map(function(item, index) {
            const recID           = index + 1;
            const userText        = item.userName ? ` by ${escapeHistoryHTML(item.userName)}` : '';
            const timestampText   = formatHistoryTimestamp(item.timestamp);
            const descriptionText = escapeHistoryHTML(item.description);
            gridData[recID] = {
                recordID:         recID,
                timestampText:    item.timestamp,
                timestampDisplay: timestampText,
                typeLabel:        getRecordHistoryItemTypeLabel(item),
                actionDisplay:    `<div><b>${descriptionText}</b>${userText}</div>${renderHistoryComment(item)}`
            };
            return {
                recordID:      recID,
                timestampText: item.timestamp,
                sortOrder:     item.sortOrder,
                typeLabel:     gridData[recID].typeLabel,
                actionDisplay: gridData[recID].actionDisplay
            };
        });

        document.getElementById('record-history-grid').innerHTML = '';
        recordHistoryGrid = new LeafFormGrid('record-history-grid', {readOnly: true});
        recordHistoryGrid.hideIndex();
        recordHistoryGrid.setPostSortRequestFunc(function(key, order) {
            recordHistoryState.sortKey   = key;
            recordHistoryState.sortOrder = order;
            recordHistoryGrid.setData(sortRecordHistoryGridRows(recordHistoryGrid.getCurrentData(), key, order));
        });
        recordHistoryGridColumnCount = nextColumnCount;
        recordHistoryGrid.setHeaders(getRecordHistoryGridHeaders());
        recordHistoryGrid.setDataBlob(gridData);
        recordHistoryGrid.setData(gridRows);
        if (recordHistoryState.sortKey) {
            recordHistoryGrid.sort(recordHistoryState.sortKey, recordHistoryState.sortOrder);
            recordHistoryGrid.setData(sortRecordHistoryGridRows(recordHistoryGrid.getCurrentData(), recordHistoryState.sortKey, recordHistoryState.sortOrder));
        }
        recordHistoryGrid.renderBody(0, Infinity);
        $('#' + recordHistoryGrid.getPrefixID() + 'table').css('width', '100%');
        if (gridRows.length === 0) {
            setRecordHistoryGridMessage('No history to show.');
        }
    }

    function getRecordHistoryTypeLabel(types) {
        if (!Array.isArray(types) || types.length === 0) { return 'Action'; }
        if (types.length === 3) { return 'All'; }
        return types.map(function(type) {
            if (type === 'email') { return 'Email Delivery'; }
            if (type === 'notes') { return 'Notes'; }
            return 'Action';
        }).join(', ');
    }

    function updateRecordHistoryFilterSelection() {
        document.querySelectorAll('#record-history-filters .history-filter-input').forEach(function(input) {
            input.checked = recordHistoryState.types.includes(input.dataset.historyType);
        });
        const dialog = document.getElementById('record-history-dialog');
        if (dialog) {
            dialog.classList.toggle('multi-type-history', recordHistoryState.types.length > 1);
        }
    }

    function updateRecordHistoryStatus() {
        const status = document.getElementById('record-history-status');
        if (status) {
            const typeLabel     = getRecordHistoryTypeLabel(recordHistoryState.types);
            const loadingSuffix = recordHistoryState.isLoadingMore ? ' Loading more...' : '';
            status.textContent  = `Showing ${typeLabel} History: ${recordHistoryState.items.length} Loaded${loadingSuffix}`;
        }
    }

    async function fetchRecordHistoryPage(page) {
        const params = new URLSearchParams({
            types:    recordHistoryState.types.join(','),
            page:     page,
            pageSize: recordHistoryState.pageSize
        });
        const response = await fetch(`api/form/<!--{$recordID|strip_tags}-->/history?${params.toString()}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`History request failed with status ${response.status}`);
        }
        return response.json();
    }

    async function loadRemainingRecordHistoryPages(requestID, startPage) {
        let nextPage = startPage;
        while (recordHistoryState.requestID === requestID && recordHistoryState.isLoadingMore) {
            const res = await fetchRecordHistoryPage(nextPage);
            if (recordHistoryState.requestID !== requestID) { return; }
            recordHistoryState.items = recordHistoryState.items.concat(res.items || []);
            renderRecordHistoryGrid(recordHistoryState.items);
            updateRecordHistoryFilterSelection();
            updateRecordHistoryStatus();
            if (!res.hasNext) {
                recordHistoryState.isLoadingMore = false;
                updateRecordHistoryStatus();
                return;
            }
            nextPage += 1;
        }
    }

    async function loadRecordHistoryPage() {
        const gridContainer = document.getElementById('record-history-grid');
        if (!gridContainer) { return; }
        recordHistoryState.requestID += 1;
        const requestID = recordHistoryState.requestID;
        recordHistoryState.items         = [];
        recordHistoryState.page          = 1;
        recordHistoryState.isLoadingMore = false;
        renderRecordHistoryGrid([]);
        setRecordHistoryGridMessage('Loading history...');
        dialog_message.indicateBusy();
        try {
            const res = await fetchRecordHistoryPage(1);
            if (recordHistoryState.requestID !== requestID) { return; }
            recordHistoryState.items         = res.items || [];
            renderRecordHistoryGrid(recordHistoryState.items);
            updateRecordHistoryFilterSelection();
            recordHistoryState.isLoadingMore = res.hasNext;
            updateRecordHistoryStatus();
            if (res.hasNext) {
                loadRemainingRecordHistoryPages(requestID, 2).catch(function(error) {
                    if (recordHistoryState.requestID !== requestID) { return; }
                    console.error('There was an error collecting the remaining history!', error);
                    recordHistoryState.isLoadingMore = false;
                    updateRecordHistoryStatus();
                });
            }
        } catch (error) {
            console.error('There was an error collecting the history!', error);
            renderRecordHistoryGrid([]);
            setRecordHistoryGridMessage('There was an error collecting the history.');
        } finally {
            dialog_message.indicateIdle();
        }
    }

    function initializeRecordHistoryDialog() {
        document.querySelectorAll('#record-history-filters .history-filter-input').forEach(function(input) {
            input.addEventListener('change', function() {
                const historyType = input.dataset.historyType || 'workflow';
                const nextTypes = recordHistoryState.types.filter(function(type) {
                    return type !== historyType;
                });
                if (input.checked) { nextTypes.push(historyType); }
                if (nextTypes.length === 0) { input.checked = true; return; }
                recordHistoryState.types = ['workflow', 'notes', 'email'].filter(function(type) {
                    return nextTypes.includes(type);
                });
                loadRecordHistoryPage();
            });
        });
        updateRecordHistoryFilterSelection();
        loadRecordHistoryPage();
    }

    function viewHistory() {
        recordHistoryState.page          = 1;
        recordHistoryState.types         = ['workflow'];
        recordHistoryGrid                = null;
        recordHistoryGridColumnCount     = 0;
        dialog_message.setTitle(`View History of Request ID#: <!--{$recordID|sanitize}-->`);
        dialog_message.setContent(buildRecordHistoryDialogContent());
        dialog_message.show();
        initializeRecordHistoryDialog();
    }

    function cancelRequest() {
        const admin       = '<!--{$is_admin}-->';
        const submitted   = '<!--{$submitted}-->';
        const allowCancel = '<!--{$allowCancel}-->';
        const requireComment = admin != '1' && +submitted > 0 && allowCancel == '1';

        const requiredAttr = requireComment === true ? ' required' : '';
        const requiredHTML = requireComment === true
            ? ' <span id="cancel_comment_required" style="color:#b00;font-weight:bold;"> (*required)</span>'
            : '';

        dialog_confirm.setContent(
            `<div style="margin-left:-0.75rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <img src="dynicons/?img=process-stop.svg&amp;w=48" alt="">
                    Are you sure you want to cancel this request?
                </div>
                <br>
                <label for="cancel_comment" style="font-size:14px;">Comments${requiredHTML}:</label><br>
                <textarea id="cancel_comment" cols=30 rows=3 placeholder="Enter Comment"
                    style="width:100%;resize: vertical;" ${requiredAttr}></textarea>
            </div>`
        );

        const handleCancel = () => {
            let comment = $('#cancel_comment').val();
            if (comment.trim() === '' && requireComment === true) {
                let errEl = document.getElementById('cancel_comment_required');
                if (errEl !== null) {
                    errEl.style.backgroundColor = '#b00';
                    errEl.style.color = '#fff';
                }
                setTimeout(() => {
                    dialog_confirm?.setSaveHandler(handleCancel);
                });
            } else {
                $.ajax({
                    type: 'POST',
                    url: 'api/form/<!--{$recordID|strip_tags|escape}-->/cancel',
                    data: { CSRFToken: '<!--{$CSRFToken}-->', comment: comment },
                    success: function(response) {
                        if (response == 1) {
                            window.location.href = "index.php?a=cancelled_request&cancelled=<!--{$recordID|strip_tags}-->";
                        } else {
                            alert(response);
                        }
                    },
                    error: function() { console.log('There was an error canceling the request!'); },
                    cache: false
                });
            }
        };

        dialog_confirm.setSaveHandler(handleCancel);
        dialog_confirm.show();
        $('#cancel_comment').focus();
    }

    function changeTitle() {
        dialog.setContent('<label for="title">Title:</label><br><input type="text" id="title" style="width: 300px" name="title" value="<!--{$title|escape:'quotes'}-->" /><input type="hidden" id="CSRFToken" name="CSRFToken" value="<!--{$CSRFToken}-->" />');
        dialog.show();
        dialog.setSaveHandler(function() {
            $.ajax({
                type: 'POST', url: 'api/form/<!--{$recordID|strip_tags}-->/title',
                data: {title: $('#title').val(), CSRFToken: '<!--{$CSRFToken}-->'},
                success: function(res) { if (res != null) { $('#requestTitle').empty().html(res); } dialog.hide(); },
                error: function() { console.log('There was an error changing the title!'); }
            });
        });
    }

    function getChildrenIndicatorIDs(indicators) {
        let children = [];
        if (indicators !== null && typeof indicators === 'object') {
            Object.values(indicators).forEach(function(indicator) {
                if (indicator.indicatorID !== undefined) { children.push(indicator.indicatorID); }
                if (indicator.child !== undefined) { children = children.concat(getChildrenIndicatorIDs(indicator.child)); }
            });
        }
        return children;
    }

    function copyRequest() {
        $('body').on('click', '.pickAndChooseAll', function(event) {
            $(".pickAndChoose").prop("checked", event.target.checked);
        }).on('click', '.pickAndChoose', function() {
            $(".pickAndChooseAll").prop("checked", $(".pickAndChoose").length === $(".pickAndChoose:checked").length);
        });
        dialog.setTitle('Copy Request <!--{$title|escape:'quotes'}-->');
        dialog.show(); dialog.indicateBusy();
        let serviceOptions = '', series = 1, pickAndChoose = [];
        let pickAndChooseOptions = '<label class="checkable leaf_check" style="float: none"> <input class="ischecked leaf_check pickAndChooseAll" checked="checked" type="checkbox"> <span class="leaf_check"> </span>All</label>';
        let createData = { CSRFToken: '<!--{$CSRFToken}-->' };
        const requestInformation = [
            $.ajax({ type: 'GET', url: 'api/service', CSRFToken: '<!--{$CSRFToken}-->',
                success: function(res) {
                    Object.values(res).forEach(function(resultValue) {
                        let selected = (parseInt(resultValue.serviceID) === parseInt(serviceID)) ? 'selected="selected"' : '';
                        serviceOptions += '<option value="' + resultValue.serviceID + '" ' + selected + '>' + resultValue.service + '</option>';
                    });
                }, error: function() { console.log('Failed to gather services for dropdown!'); }
            }),
            $.ajax({ type: 'GET', url: 'api/form/<!--{$recordID|strip_tags}-->/recordinfo', CSRFToken: '<!--{$CSRFToken}-->',
                success: function(res) {
                    const categories = Object.values(res.categories);
                    categories.forEach(c => createData['num' + c] = 'num' + c);
                }, error: function() { console.log('Failed to gather categories before creating new form'); }
            }),
            $.ajax({ type: 'GET', url: 'api/form/<!--{$recordID|strip_tags}-->/data/tree', CSRFToken: '<!--{$CSRFToken}-->',
                success: function(res) {
                    Object.values(res).forEach(function(resultValue) {
                        let children = getChildrenIndicatorIDs(resultValue.child);
                        pickAndChoose.push({'name': resultValue.name, 'children': children.concat(resultValue.indicatorID)});
                    });
                }, error: function() { console.log('Failed to gather data to copy as well as make dropdowns'); }
            }),
        ];
        Promise.all(requestInformation).then(res => {
            if (pickAndChoose.length > 0) {
                pickAndChoose.forEach(function(option) {
                    let doc = new DOMParser().parseFromString(option.name, 'text/html');
                    let finalName = XSSHelpers.stripAllTags(doc.body.textContent || "");
                    pickAndChooseOptions += '<label class="checkable leaf_check" style="float: none"> <input checked="checked" class="ischecked leaf_check pickAndChoose" name="pickAndChoose[]" type="checkbox" value="' + JSON.stringify(option.children) + '"> <span class="leaf_check"> </span>' + finalName + '</label>';
                });
            }
            dialog.setContent(
                '<div id="copy_request_error" style="display:none;margin:0.5rem 0;padding:0.5rem;background-color:#ffc;line-height:1.5"></div>'
                + '<label for="title">Title:</label><br /><input id="title" name="title" type="text" value="<!--{$title|escape:'quotes'}-->" style="width:200px;"/><br /><br />'
                + '<div id="serviceWrapper"><label for="service">Service:</label><br /><select class="chosen" id="service" name="service">' + serviceOptions + '</select><br /><br /></div>'
                + '<label for="priority">Priority:</label><br /><select class="chosen" id="priority" name="priority"><option value="-10">EMERGENCY</option><option value="0" selected="selected">Normal</option></select><br /><br />'
                + '<fieldset><legend>Sections to Copy:</legend>' + pickAndChooseOptions + '</fieldset><br /><br />'
            );
            dialog.indicateIdle();
            if (!(serviceOptions.length > 0)) { $('#serviceWrapper').hide(); }
            $('.chosen').chosen({ disable_search_threshold: 6 });
            dialog.setSaveHandler(function() {
                createData = { ...createData, title: $('#title').val(), service: $('#service').val(), priority: $('#priority').val() };
                let updateData = { series: series, CSRFToken: '<!--{$CSRFToken}-->' };
                let chosenSections = [];
                let pickAndChooseValues = $("input[name='pickAndChoose[]']:checked").map(function(el) { return chosenSections.concat(JSON.parse($(this).val())); }).get();
                $.ajax({
                    type: 'POST', url: './api/form/new', data: createData,
                    success: function(res) {
                        let newRecordID = +res;
                        if (newRecordID > 0) {
                            if (pickAndChooseValues.length > 0) {
                                let fileData = [];
                                $.ajax({ type: 'GET', url: 'api/form/<!--{$recordID|strip_tags}-->/data', CSRFToken: '<!--{$CSRFToken}-->', async: false,
                                    success: function(res) {
                                        Object.values(res).forEach(function(resultValue) {
                                            if (pickAndChooseValues.includes(resultValue[series].indicatorID)) {
                                                if ((resultValue[series].format == 'fileupload' || resultValue[series].format == 'image') && Array.isArray(resultValue[series].value)) {
                                                    resultValue[series].value.forEach(function(currentFile) { fileData.push({ fileName: currentFile, series: series, indicatorID: resultValue[series].indicatorID }); });
                                                    updateData[resultValue[series].indicatorID] = resultValue[series].value.join('\r\n');
                                                } else { updateData[resultValue[series].indicatorID] = resultValue[series].value; }
                                            }
                                        });
                                    }, error: function() { console.log('Failed to gather data to copy as well as make dropdowns'); }
                                });
                                $.ajax({ type: 'POST', url: './api/form/' + newRecordID, data: updateData, async: false,
                                    success: function() { console.log('Questions copied over to new record.'); },
                                    error: function() { console.log('Failed to copy data to new form!'); }
                                });
                                if (fileData.length > 0) {
                                    fileData.forEach(function(theFile) {
                                        $.ajax({ type: 'POST', url: './api/form/files/copy',
                                            data: { CSRFToken: '<!--{$CSRFToken}-->', recordID: <!--{$recordID|strip_tags}-->, newRecordID: newRecordID, indicatorID: theFile.indicatorID, fileName: theFile.fileName, series: theFile.series },
                                            async: false,
                                            success: function() { console.log('Files copied over to new record.'); },
                                            error: function() { console.log('Failed to copy data to new form!'); }
                                        });
                                    });
                                }
                            }
                            window.location = "index.php?a=view&recordID=" + newRecordID;
                            dialog.hide();
                        } else {
                            let elError = document.getElementById('copy_request_error');
                            if(elError !== null) { elError.style.display = 'block'; elError.innerHTML = '<b>Request could not be copied:</b><br>' + res; }
                        }
                    },
                    error: function() { console.log('Failed to create new form!'); }
                });
            });
        }).catch(err => console.log('an error has occurred', err));
    }

    function changeService() {
        dialog.setTitle('Change Service');
        dialog.setContent('<label id="newService_label" for="newService">Select new service: </label><br><div id="changeService"></div>');
        dialog.show(); dialog.indicateBusy();
        dialog.setSaveHandler(function() { alert('Please wait for service list to load.'); });
        $.ajax({
            type: 'GET', url: './api/system/services', dataType: 'json',
            success: function(res) {
                let services = '<select id="newService" class="chosen" style="width: 250px">';
                for (let i in res) { services += '<option value="' + res[i].groupID + '">' + res[i].groupTitle + '</option>'; }
                services += '</select>';
                $('#changeService').html(services);
                $('.chosen').chosen({ disable_search_threshold: 6 });
                $(`#newService_chosen input.chosen-search-input`).attr('role', 'combobox').attr('aria-labelledby', 'newService_label');
                dialog.indicateIdle();
                dialog.setSaveHandler(function() {
                    $.ajax({
                        type: 'POST', url: 'api/form/<!--{$recordID|strip_tags}-->/service',
                        data: { serviceID: $('#newService').val(), CSRFToken: CSRFToken },
                        success: function() { window.location.href="index.php?a=printview&recordID=<!--{$recordID|strip_tags}-->"; },
                        error: function() { console.log('Failed to gather services!'); }
                    });
                    dialog.hide();
                });
            },
            error: function() { console.log('There was an error changing the service!'); },
            cache: false
        });
    }

    <!--{if $is_admin}-->
        var currentRecordID = <!--{$recordID|strip_tags}-->;

        async function admin_changeStep() {
            dialog.setTitle('Change Step');
            dialog.setContent('<label id="newStep_label" for="newStep">Set to this step:</label> <br /><div id="changeStep"></div><br /><br />Comments:<br /><textarea id="changeStep_comment" type="text" style="width: 90%; padding: 4px" aria-label="Comments"></textarea><br /><br /><fieldset><legend>Advanced Options</legend><input id="showAllSteps" type="checkbox" /><label for="showAllSteps">Show steps from other workflows</label></fieldset>');
            dialog.show(); dialog.indicateBusy();
            let currentStepData = await $.ajax({ type: 'GET', url: `api/formWorkflow/${currentRecordID}/currentStep`, dataType: 'json', error: function() { console.log('There was an error getting the current step!'); }, cache: false });
            let workflows = {};
            for (let i in currentStepData) { workflows[currentStepData[i].workflowID] = 1; }
            if(Object.keys(workflows).length == 0) {
                let lastAction = await $.ajax({ type: 'GET', url: `api/formWorkflow/${currentRecordID}/lastAction`, dataType: 'json', error: function() { console.log('There was an error getting the last action!'); }, cache: false });
                if(lastAction != null) { workflows[lastAction.workflowID] = 1; }
            }
            $.ajax({
                type: 'GET', url: 'api/workflow/steps', dataType: 'json',
                success: function(res) {
                    let steps = '<select id="newStep" class="chosen">', steps2 = '', stepCounter = 0;
                    for (let i in res) {
                        if (Object.keys(workflows).length == 0 || workflows[res[i].workflowID] != undefined) {
                            steps += `<option value="${res[i].stepID}">${res[i].description}: ${res[i].stepTitle}</option>`;
                            stepCounter++;
                        }
                        steps2 += `<option value="${res[i].stepID}">${res[i].description} - ${res[i].stepTitle}</option>`;
                    }
                    if (stepCounter == 0) { steps += steps2; }
                    steps += '</select>';
                    $('#changeStep').html(steps);
                    $('#showAllSteps').on('click', function() {
                        let newstep = $('#newStep');
                        newstep.html($('#showAllSteps').is(':checked') ? steps2 : steps);
                        newstep.trigger('chosen:updated');
                    });
                    $('.chosen').chosen({ width: '100%', disable_search_threshold: 6 });
                    $(`#newStep_chosen input.chosen-search-input`).attr('role', 'combobox').attr('aria-labelledby', 'newStep_label');
                    dialog.indicateIdle();
                    dialog.setSaveHandler(function() {
                        $.ajax({
                            type: 'POST', url: `api/formWorkflow/${currentRecordID}/step`,
                            data: { stepID: $('#newStep').val(), comment: $('#changeStep_comment').val(), CSRFToken: CSRFToken },
                            success: function() { window.location.href = `index.php?a=printview&recordID=${currentRecordID}`; },
                            error: function() { console.log('There was an error saving the workflow step!'); }
                        });
                        dialog.hide();
                    });
                },
                error: function() { console.log('There was an error getting workflow steps!'); },
                cache: false
            });
        }

        function admin_changeForm() {
            dialog.setTitle('Change Form(s)');
            dialog.setContent('Select Forms: <br /><div id="changeForm"></div>');
            dialog.show(); dialog.indicateBusy();
            dialog.setSaveHandler(function() { alert('Please wait for service list to load.'); });
            $.ajax({
                type: 'GET', url: './api/workflow/categoriesUnabridged', dataType: 'json',
                success: function(res) {
                    let categories = '', adminUnpublishedWarn = '';
                    for (let i in res) {
                        adminUnpublishedWarn = res[i].visible === -1 ? '<span style="color:#c00;">&nbsp;(This form is unpublished)</span>' : '';
                        categories += '<label class="checkable leaf_check" for="category_' + res[i].categoryID + '">'
                            + '<input type="checkbox" class="icheck admin_changeForm leaf_check" id="category_' + res[i].categoryID + '" name="categories[]" value="' + res[i].categoryID + '" />'
                            + '<span class="leaf_check"></span>' + res[i].categoryName + adminUnpublishedWarn + '</label>';
                    }
                    $('#changeForm').html(categories);
                    dialog.indicateIdle();
                    dialog.setSaveHandler(function() {
                        let data = { 'categories[]': [], CSRFToken: CSRFToken };
                        $('.admin_changeForm:checked').each(function() { data['categories[]'].push($(this).val()); });
                        $.ajax({ type: 'POST', url: 'api/form/<!--{$recordID|strip_tags}-->/types', data: data,
                            success: function() { window.location.href="index.php?a=printview&recordID=<!--{$recordID|strip_tags}-->"; }
                        });
                        dialog.hide();
                    });
                    let query = {terms: [{id: 'recordID', operator: '=', match: '<!--{$recordID|strip_tags}-->'}], joins: ['categoryNameUnabridged']};
                    $.ajax({
                        type: 'GET', url: './api/form/query', data: { q: JSON.stringify(query) }, dataType: 'json',
                        success: function(res) {
                            let arrCatIDs = res[<!--{$recordID|strip_tags|escape}-->].categoryIDsUnabridged;
                            $('label.checkable input').each(function(idx, input) { $('#' + input?.id).prop('checked', arrCatIDs.some(id => id === input.value)); });
                        },
                        error: function() { console.log('There was an error getting the form via query!'); },
                        cache: false
                    });
                },
                error: function() { console.log('There was an error getting the categories!'); },
                cache: false
            });
        }

        function admin_changeInitiator() {
            dialog.setTitle('Change Initiator');
            dialog.setContent('Select employee to be set as this request\'s initiator: <br /><div id="empSel_changeInitiator"></div><input type="hidden" id="changeInitiator" />');
            dialog.show(); dialog.indicateBusy();
            dialog.setSaveHandler(function() {
                let changeInitiator = $('#changeInitiator');
                if (changeInitiator.val() != '') {
                    $.ajax({ type: 'POST', url: './api/form/<!--{$recordID|strip_tags}-->/initiator',
                        data: { CSRFToken: CSRFToken, initiator: changeInitiator.val() },
                        success: function() { location.reload(); },
                        error: function() { console.log('There was an error saving the initiator!'); }
                    });
                } else { alert('An employee needs to be selected'); }
            });
            let empSel;
            function init_empSel() {
                empSel = new employeeSelector('empSel_changeInitiator');
                empSel.apiPath  = '<!--{$orgchartPath}-->/api/';
                empSel.rootPath = '<!--{$orgchartPath}-->/';
                empSel.setSelectHandler(function() { if (empSel.selectionData[empSel.selection] != undefined) { $('#changeInitiator').val(empSel.selectionData[empSel.selection].userName); } });
                empSel.setResultHandler(function()  { if (empSel.selectionData[empSel.selection] != undefined) { $('#changeInitiator').val(empSel.selectionData[empSel.selection].userName); } });
                empSel.initialize();
                dialog.indicateIdle();
            }
            if (typeof employeeSelector == 'undefined') {
                $('head').append('<link type="text/css" rel="stylesheet" href="<!--{$orgchartPath}-->/css/employeeSelector.css" />');
                $.ajax({ type: 'GET', url: "<!--{$orgchartPath}-->/js/employeeSelector.js", dataType: 'script',
                    success: function() { init_empSel(); },
                    error: function() { console.log('There was an error getting the employee selector!'); }
                });
            } else { init_empSel(); }
        }
    <!--{/if}-->

    function scrollPage(id) {
        if ($(document).height() < $('#' + id).offset().top + 100) {
            $('html, body').animate({scrollTop: $('#'+id).offset().top}, 500);
        }
    }

    // Layout is handled by CSS flexbox (.pv-layout-row) — no JS sideBar needed

    this.portalAPI = LEAFRequestPortalAPI();
    this.portalAPI.setBaseURL('api/?a=');
    this.portalAPI.setCSRFToken('<!--{$CSRFToken}-->');

    function transferToPMDashboard() {
        var params = new URLSearchParams(window.location.search || "");
        var id = params.get("recordID");
        if (!id) return;
        var modal = document.getElementById('pmTransferModal');
        if (!modal) return;
        modal.dataset.recordId = id;
        modal.hidden = false;
        document.getElementById('pmTransferChoiceTask').focus();
    }

    function doTransferAs(type) {
        var modal = document.getElementById('pmTransferModal');
        var id = modal ? modal.dataset.recordId : '';
        if (!id) return;
        modal.hidden = true;
        var param = type === 'project' ? 'transferProjectFromIdea' : 'transferFromIdea';
        window.location.href = 'https://leaf.va.gov/platform/projects/?tab=' + (type === 'project' ? 'projects' : 'tasks') + '&' + param + '=' + encodeURIComponent(id);
    }

    function closeTransferModal() {
        var modal = document.getElementById('pmTransferModal');
        if (modal) modal.hidden = true;
    }

    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeTransferModal(); });

    $(function() {
        $('#progressBar').progressbar({max: 100});
        form  = new LeafForm('formContainer');
        print = new printer();
        $('#btn_printForm').on('click', function() { openContentForPrint(); print.printForm(recordID); });
        form.setRecordID(<!--{$recordID|strip_tags|escape}-->);
        workflow = new LeafWorkflow('workflowcontent', '<!--{$CSRFToken}-->');
        <!--{if $submitted > 0}-->
            workflow.getWorkflow(<!--{$recordID|strip_tags|escape}-->);
        <!--{/if}-->
        dialog         = new dialogController('xhrDialog',         'xhr',               'loadIndicator',              'button_save',          'button_cancelchange');
        dialog_message = new dialogController('genericDialog',      'genericDialogxhr',  'genericDialogloadIndicator', 'genericDialogbutton_save', 'genericDialogbutton_cancelchange');
        dialog_ok      = new dialogController('ok_xhrDialog',      'ok_xhr',            'ok_loadIndicator',           'confirm_button_ok',    'confirm_button_cancelchange');
        dialog_confirm = new dialogController('confirm_xhrDialog',  'confirm_xhr',       'confirm_loadIndicator',      'confirm_button_save',  'confirm_button_cancelchange');
        <!--{if $empMembership['groupID'][226]}-->
        <!--{if $childCategoryID == ''}-->
            openContent('ajaxIndex.php?a=printview&recordID=<!--{$recordID|strip_tags}-->');
        <!--{else}-->
            openContent('ajaxIndex.php?a=internalonlyview&recordID=<!--{$recordID|strip_tags}-->&childCategoryID=<!--{$childCategoryID|strip_tags}-->');
        <!--{/if}-->
        <!--{/if}-->
        <!--{if $submitted == 0}-->
            updateProgress();
        <!--{/if}-->
        let elParentForm = document.querySelector('[id^="LeafForm"][id$="_record"]');
        let elFormMenu   = document.getElementById('form-xhr-cancel-save-menu');
        window.addEventListener('scroll', function() {
            if (elParentForm && elFormMenu) {
                let parent_Y = elParentForm.getBoundingClientRect().y;
                elFormMenu.style.top = parent_Y > 0 ? 0 : (-1 * parent_Y) + "px";
            }
        });
    });
</script>

<!-- Transfer to LEAF Projects modal -->
<div id="pmTransferModal" class="pm-transferOverlay" role="dialog" aria-modal="true"
     aria-labelledby="pmTransferModalTitle" hidden>
    <div class="pm-transferBackdrop" onclick="closeTransferModal()" aria-hidden="true"></div>
    <div class="pm-transferDialog">
        <div class="pm-transferHeader">
            <h2 class="pm-transferTitle" id="pmTransferModalTitle">Transfer to LEAF Projects</h2>
            <button type="button" class="pm-transferClose" onclick="closeTransferModal()" aria-label="Close">&times;</button>
        </div>
        <div class="pm-transferBody">
            <p class="pm-transferPrompt">How would you like to transfer this record?</p>
            <div class="pm-transferChoices">
                <button type="button" class="pm-transferChoice" id="pmTransferChoiceTask" onclick="doTransferAs('task')">
                    <span class="pm-transferChoiceIcon" aria-hidden="true">&#9989;</span>
                    <span class="pm-transferChoiceLabel">As a Task</span>
                    <span class="pm-transferChoiceDesc">Add to the Tasks table with ticket reference</span>
                </button>
                <button type="button" class="pm-transferChoice" id="pmTransferChoiceProject" onclick="doTransferAs('project')">
                    <span class="pm-transferChoiceIcon" aria-hidden="true">&#128193;</span>
                    <span class="pm-transferChoiceLabel">As a Project</span>
                    <span class="pm-transferChoiceDesc">Create a new Project with ticket reference</span>
                </button>
            </div>
        </div>
    </div>
</div>
