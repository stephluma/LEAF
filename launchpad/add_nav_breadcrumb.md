# How to add the universal nav + breadcrumb to a new page

No tools or scripts needed — just copy/paste one of the two blocks below into the new page's HTML, then deploy the page the same way you always do.

Both `leaf_nav.js` and `leaf_breadcrumb.js` are self-mounting: they inject their own stylesheet and create their own placeholder div automatically. You do not need to add a `<link>` tag for the CSS, and you do not need to add a `<div id="lp-nav-host">` unless you want control over exactly where the nav lands in the page (it defaults to the very top of `<body>`).

## Option A — Nav only

Use this for a page like Launchpad, the site root, which doesn't need a "you are here" trail.

Paste this once, anywhere in the page (commonly in `<head>`, right before `</head>`, or near the top of `<body>`):

```html
<script src="/platform/designs/files/leaf_nav.js"></script>
```

## Option B — Nav + breadcrumb

Use this for every other page — anything that sits "under" Launchpad.

Paste this once, in the same spot you'd put the nav line:

```html
<script src="/platform/designs/files/leaf_nav.js"></script>
<script>
  window.LEAF_BREADCRUMB = ["resources", { label: "PAGE NAME HERE" }];
</script>
<script src="/platform/designs/files/leaf_breadcrumb.js"></script>
```

Then just replace `"PAGE NAME HERE"` with the actual page title.

The `"resources"` entry is a shared group already defined in `leaf_breadcrumb.js` — using it renders "Launchpad / Resources / [your page]". If a page doesn't belong under an existing group, just write the full crumb in-line instead of a group string, e.g.:

```html
<script>
  window.LEAF_BREADCRUMB = [
    { label: "Training", href: "/platform/?a=Training" },
    { label: "PAGE NAME HERE" },
  ];
</script>
```

"Launchpad" itself is always added automatically at the front of the trail — never include it yourself.

## Adding a new shared group (so it's reusable across pages)

Open `leaf_breadcrumb.js` and add one line to `CRUMB_GROUPS` near the top of the file, e.g.:

```js
var CRUMB_GROUPS = {
  resources: { label: "Resources", href: "/platform/?a=Resources" },
  training: { label: "Training", href: "/platform/?a=Training" },
};
```

Every page that references `"training"` as a string in its own `window.LEAF_BREADCRUMB` array will now pick it up — no other files need to change.
