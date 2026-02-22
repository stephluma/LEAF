<script>
  (function () {
    "use strict";

    // ===== Generic snippet usage =====
    // Replace START_SEL and EXPIRE_SEL with your field selectors.
    // Example for LEAF indicators: input[name="<indicatorId>"]
    // Date format defaults from datepicker as: MM/DD/YYYY. If your date is formatted differently, you will ened to update parse/format functions.
    // =================================

    var START_SEL = 'input[name="XXX"]';
    var EXPIRE_SEL = 'input[name="XXX"]';
 
    function pad2(n) { return String(n).padStart(2, "0"); }
 
    function parseMMDDYYYY(s) {
      if (!s) return null;
      var m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
 
      var mm = Number(m[1]), dd = Number(m[2]), yyyy = Number(m[3]);
      var d = new Date(yyyy, mm - 1, dd);
      if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
      return d;
    }
 
    function formatMMDDYYYY(d) {
      return pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()) + "/" + d.getFullYear();
    }
 
    function addThreeMonths(d) {
      var y = d.getFullYear();
      var m = d.getMonth() + 3;
      var day = d.getDate();
      var out = new Date(y, m, day);
      if (out.getDate() !== day) out = new Date(y, m + 1, 0);
      return out;
    }
 
    function computeExpireStr() {
      var startEl = document.querySelector(START_SEL);
      if (!startEl) return null;
 
      var start = parseMMDDYYYY(startEl.value);
      if (!start) return null;
 
      return formatMMDDYYYY(addThreeMonths(start));
    }
 
    function notify(el) {
      if (!el) return;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
 
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.datepicker) {
        try { window.jQuery(el).datepicker("setDate", el.value); } catch (e) {}
      }
    }
 
    function fillExpire() {
      var expireEl = document.querySelector(EXPIRE_SEL);
      if (!expireEl) return;
 
      var exp = computeExpireStr();
      if (!exp) return;
 
      expireEl.value = exp;
      notify(expireEl);
    }
 
    function hookStartInput() {
      var startEl = document.querySelector(START_SEL);
      if (!startEl) return;
 
      startEl.addEventListener("change", fillExpire, true);
      startEl.addEventListener("blur", fillExpire, true);
 
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.datepicker) {
        try {
          var $ = window.jQuery;
          var $start = $(startEl);
 
          var existing = null;
          try { existing = $start.datepicker("option", "onSelect"); } catch (e) {}
 
          try {
            $start.datepicker("option", "onSelect", function (dateText, inst) {
              try { if (typeof existing === "function") existing.call(this, dateText, inst); } catch (e) {}
              fillExpire();
            });
          } catch (e) {}
        } catch (e) {}
      }
    }
 
    function isSubmitEndpoint(url) {
      try {
        var u = new URL(url, window.location.origin);
        return /\/api\/form\/\d+\/submit\/?$/.test(u.pathname);
      } catch (e) {
        return /\/api\/form\/\d+\/submit\/?/.test(String(url || ""));
      }
    }
 
    function hookSubmitClicks() {
      document.addEventListener("pointerdown", fillExpire, true);
 
      document.addEventListener("click", function (e) {
        var t = e.target;
        if (!t) return;
        if (t.matches('button, input[type="button"], input[type="submit"]')) {
          var label = (t.innerText || t.value || "").toLowerCase();
          if (label.includes("submit") || label.includes("save")) {
            fillExpire();
          }
        }
      }, true);
    }
 
    function hookFetchAndXHRForRefresh() {
      if (window.fetch && !window.fetch.__leafExpireHooked) {
        var origFetch = window.fetch;
        window.fetch = function (input, init) {
          var url = (typeof input === "string") ? input : (input && input.url);
 
          try { if (url && isSubmitEndpoint(url)) fillExpire(); } catch (e) {}
 
          return origFetch.apply(this, arguments).then(function (resp) {
            try {
              if (url && isSubmitEndpoint(url) && resp && resp.ok) {
                setTimeout(function () {
                  try { window.location.reload(); } catch (e) {}
                }, 250);
              }
            } catch (e) {}
            return resp;
          });
        };
        window.fetch.__leafExpireHooked = true;
      }
 
      if (window.XMLHttpRequest && !window.XMLHttpRequest.__leafExpireHooked) {
        var OriginalXHR = window.XMLHttpRequest;
 
        function WrappedXHR() {
          var xhr = new OriginalXHR();
          var originalOpen = xhr.open;
          var originalSend = xhr.send;
 
          xhr.open = function (method, url) {
            xhr.__leafUrl = url;
            return originalOpen.apply(xhr, arguments);
          };
 
          xhr.send = function (body) {
            try {
              if (xhr.__leafUrl && isSubmitEndpoint(xhr.__leafUrl)) {
                fillExpire();
                xhr.addEventListener("load", function () {
                  try {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      setTimeout(function () {
                        try { window.location.reload(); } catch (e) {}
                      }, 250);
                    }
                  } catch (e) {}
                });
              }
            } catch (e) {}
            return originalSend.apply(xhr, arguments);
          };
 
          return xhr;
        }
 
        WrappedXHR.prototype = OriginalXHR.prototype;
        window.XMLHttpRequest = WrappedXHR;
        window.XMLHttpRequest.__leafExpireHooked = true;
      }
    }
 
    function init() {
      hookStartInput();
      hookSubmitClicks();
      hookFetchAndXHRForRefresh();
      fillExpire();
    }
 
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
</script>
