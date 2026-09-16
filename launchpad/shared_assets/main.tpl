{strip}<!DOCTYPE html>
<html lang="en">
<head>
    <script>
        if(navigator.userAgent.indexOf("Trident") != -1) {
            alert('Please use Microsoft Edge or Google Chrome to access this site.');
        }
    </script>
    {if $tabText != ''}
    <title>{$tabText|sanitize} - {$title|sanitize}, {$city|sanitize}</title>
    {else}
    <title>{$title|sanitize}, {$city|sanitize}</title>
    {/if}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css" media="screen">
        @import "{$app_js_path}/jquery/css/dcvamc/jquery-ui.custom.min.css";
{section name=i loop=$stylesheets}
        @import "{$stylesheets[i]}";
{/section}
        @import "css/style.css";
        @import "{$app_js_path}/jquery/chosen/chosen.min.css";
        @import "{$app_js_path}/jquery/trumbowyg/ui/trumbowyg.min.css";
        /* backwards compat */
        @import "{$app_js_path}/jquery/icheck/skins/square/blue.css";
    </style>
    <style type="text/css" media="print">
        @import "css/printer.css";
        #qrcode-js {
            display: block !important;
        }
        #qrcode-js * {
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    </style>
    <script type="text/javascript" src="{$app_js_path}/jquery/jquery.min.js"></script>
    {if $useUI == true}
    <script type="text/javascript" src="{$app_js_path}/jquery/jquery-ui.custom.min.js"></script>
    <script type="text/javascript" src="js/dialogController.js"></script>
    <script type="text/javascript" src="{$app_js_path}/jquery/chosen/chosen.jquery.min.js"></script>
    <script type="text/javascript" src="{$app_js_path}/jquery/trumbowyg/trumbowyg.min.js"></script>
    <!--backwards compat -->
    <script type="text/javascript" src="{$app_js_path}/jquery/icheck/icheck.js"></script>
    {else if $useLiteUI == true}
    <script type="text/javascript" src="js/dialogController.js"></script>
    <script type="text/javascript" src="{$app_js_path}/jquery/chosen/chosen.jquery.min.js"></script>
    <script type="text/javascript" src="{$app_js_path}/jquery/trumbowyg/trumbowyg.min.js"></script>
    <!--backwards compat -->
    <script type="text/javascript" src="{$app_js_path}/jquery/icheck/icheck.js"></script>
    {/if}
    {if !$logout}
        {if $leafSecure >= 1}
        <script type="text/javascript" src="{$app_js_path}/LEAF/sessionTimeout.js"></script>
        {else}
        <script type="text/javascript" src="{$app_js_path}/LEAF/sessionAnnounce.js"></script>
        {/if}
    {/if}
{section name=i loop=$javascripts}
    <script type="text/javascript" src="{$javascripts[i]}"></script>
{/section}
{if $qrcodeURL != ''}
    <script type="text/javascript">
        window.onload = function() {
            new QRCode(document.getElementById("qrcode-js"), {
                text: "{$qrcodeURL}",
                width: 72,
                height: 72,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        };
    </script>
    {/if}

    {* Universal header (site-wide) — replaces the legacy #header/#footer/menu.tpl chrome; see leaf_header.js/.css. *}
    <link rel="stylesheet" href="./files/leaf_header.css" />
    <script
      src="./files/leaf_header.js"
      data-is-sysadmin="<!--{if $empMembership['groupID'][1]}-->1<!--{else}-->0<!--{/if}-->"
      data-csrf-token="<!--{$CSRFToken}-->"
    ></script>

    {* TODO: launchpad.css is linked from view_homepage.tpl's body content (non-standard, can cause a FOUC) — move it here when header is revisited. *}

    <link rel="icon" href="vafavicon.ico" type="image/x-icon" />
</head>
<body>
{if $smarty.get.a == ''}
    <a href="#lp-main" id="nav-skip-link">Skip to main content</a>
{else}
    <a href="#bodyarea" id="nav-skip-link">Skip to main content</a>
{/if}

{if $smarty.server.HTTP_HOST === 'leaf.apps.vapo-aws-ppd.va.gov'}
    <div style="position: fixed; z-index: 9999; width: 100%; background-color: rgba(255,255,100,0.75); text-align: center;">VAPO TESTING</div>
{/if}
{* $login and #qrcode-js were previously inside the (now-removed) legacy header: $login drives session/logout state, #qrcode-js is the mount point the QRCode script in <head> targets. *}
{if $login != ''}
<div id="lp-login-slot" class="noprint">{$login}</div>
{/if}
{if $qrcodeURL != ''}
<div id="qrcode-js" style="width: 72px; display: none;"></div>
{/if}

<main id="body">
    <div id="content">
        {if $status != ''}
        <div class="alert"><span>{$status}</span></div>
        {/if}
        <div id="bodyarea">
            {$body}
        </div>
    </div>
</main>
</body>
</html>{/strip}