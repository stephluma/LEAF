(function () {
  // ===== Generic snippet usage =====
  // Replace EXCLUDE with the indicator IDs you want hidden in print view.
  // Example: new Set([123, 456]) will hide indicators 123 and 456.
  // =================================
  const EXCLUDE = new Set([123, 456]);

  function parseIndicatorID(url) {
    if (!url) return null;
    const m = url.match(/[?&]indicatorID=(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function shouldBlock(url) {
    if (!url) return false;
    if (url.indexOf("ajaxIndex.php?a=getprintindicator") === -1) return false;
    const id = parseIndicatorID(url);
    return id !== null && EXCLUDE.has(id);
  }

  function hideIndicator(indicatorID) {
    const seriesAny = [
      `[id^="subIndicator_${indicatorID}_"]`,
      `[id^="PHindicator_${indicatorID}_"]`,
      `[id^="xhrIndicator_${indicatorID}_"]`,
    ];

    // Strongest: hide the wrapper block
    seriesAny.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.display = "none";
      });
    });

    // Extra cleanup for the exact nodes you reported
    document
      .querySelectorAll(`#xhrIndicator_${indicatorID}_1`)
      .forEach((el) => {
        el.innerHTML = "";
        el.style.display = "none";
      });

    document
      .querySelectorAll(`#subIndicator_${indicatorID}_1`)
      .forEach((el) => {
        el.style.display = "none";
      });

    // Hide any nearby printed sublabel elements inside that subIndicator block
    document
      .querySelectorAll(
        `#subIndicator_${indicatorID}_1 .printssublabel, #subIndicator_${indicatorID}_1 .printssublabel *`,
      )
      .forEach((el) => {
        el.style.display = "none";
      });
  }

  // Global XHR interception
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__leaf_url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    const url = this.__leaf_url;
    if (shouldBlock(url)) {
      const indicatorID = parseIndicatorID(url);

      // Simulate successful empty response so downstream code doesn't freak out
      const xhr = this;
      setTimeout(function () {
        try {
          Object.defineProperty(xhr, "readyState", { value: 4 });
          Object.defineProperty(xhr, "status", { value: 200 });
          Object.defineProperty(xhr, "responseText", { value: "" });
          Object.defineProperty(xhr, "response", { value: "" });
        } catch (e) {}

        if (indicatorID !== null) hideIndicator(indicatorID);
        if (typeof xhr.onreadystatechange === "function")
          xhr.onreadystatechange();
        if (typeof xhr.onload === "function") xhr.onload();
      }, 0);

      return;
    }

    return origSend.apply(this, arguments);
  };

  // DOM sweep + observer for late inserts
  function sweep() {
    EXCLUDE.forEach((id) => hideIndicator(id));
  }

  sweep();
  window.addEventListener("load", sweep);
  setTimeout(sweep, 50);
  setTimeout(sweep, 250);
  setTimeout(sweep, 1000);

  const obs = new MutationObserver(sweep);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
