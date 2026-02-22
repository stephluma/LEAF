(function () {
  "use strict";

  if (window.__leafAutoReloadAfterSubmitInstalled) return;
  window.__leafAutoReloadAfterSubmitInstalled = true;

  var RELOAD_DELAY_MS = 1200;

  function looksLikeSubmitButton(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (
      tag !== "button" &&
      !(tag === "input" && (el.type === "button" || el.type === "submit"))
    )
      return false;

    var label = (el.innerText || el.value || "").trim().toLowerCase();
    return label.includes("submit") || label.includes("save");
  }

  function hasObviousErrorUI() {
    // Best-effort selectors for common error patterns
    return Boolean(
      document.querySelector(
        ".alert-danger, .alert-error, .error, .has-error, .text-danger",
      ) ||
      Array.from(
        document.querySelectorAll(".alert, .toast, .notification, .message"),
      ).some(function (n) {
        var t = (n.textContent || "").toLowerCase();
        return (
          t.includes("error") || t.includes("failed") || t.includes("invalid")
        );
      }),
    );
  }

  function scheduleReload() {
    var startUrl = String(window.location.href);

    setTimeout(function () {
      try {
        // If navigation already happened, do nothing
        if (String(window.location.href) !== startUrl) return;

        // If an error UI is present, do not reload
        if (hasObviousErrorUI()) return;

        window.location.reload();
      } catch (e) {}
    }, RELOAD_DELAY_MS);
  }

  // Capture very early, before app code runs
  document.addEventListener(
    "pointerdown",
    function (e) {
      var btn =
        e.target && e.target.closest
          ? e.target.closest(
              "button, input[type='button'], input[type='submit']",
            )
          : null;
      if (looksLikeSubmitButton(btn)) scheduleReload();
    },
    true,
  );

  document.addEventListener(
    "click",
    function (e) {
      var btn =
        e.target && e.target.closest
          ? e.target.closest(
              "button, input[type='button'], input[type='submit']",
            )
          : null;
      if (looksLikeSubmitButton(btn)) scheduleReload();
    },
    true,
  );
})();
