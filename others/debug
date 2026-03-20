let ideas = [];
let voteCounts = {};
const portalConfig = window.leafIdeaPortal || {};

function sanitizeLeafValue(value) {
  return String(value || "").replace(/<!--|-->/g, "").trim();
}

let userID = sanitizeLeafValue(portalConfig.userID);
let csrfToken = sanitizeLeafValue(portalConfig.csrfToken);
let userVotes = {};
let votingInProgress = false;
let myIdeasCache = [];

const sortState = {
  tblIdeas: { key: "", dir: "asc" },
  tblTopIdeas: { key: "", dir: "desc" },
  tblMyIdeas: { key: "", dir: "asc" },
};

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function bindModalEvents() {
  document.querySelectorAll("[data-ip-open]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.ipOpen));
  });

  document.querySelectorAll("[data-ip-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.ipClose));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".ip-modal.is-open").forEach((modal) => {
      closeModal(modal.id);
    });
  });
}

function bindTabs() {
  $(".ip-tab").on("click", function () {
    const target = $(this).data("ip-tab");

    $(".ip-tab").removeClass("is-active").attr("aria-selected", "false");
    $(this).addClass("is-active").attr("aria-selected", "true");

    $(".ip-panel").removeClass("is-active");
    $(`#panel-${target}`).addClass("is-active");
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openRecordModal(title, url) {
  const modal = document.getElementById("ipRecordModal");
  const frame = document.getElementById("ipRecordModalFrame");
  const titleEl = document.getElementById("ipRecordModalTitle");
  const openTabBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal || !frame || !titleEl) return;
  titleEl.textContent = title || "Idea Details";
  frame.src = url;
  if (openTabBtn) openTabBtn.setAttribute("data-url", url || "");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRecordModal() {
  const modal = document.getElementById("ipRecordModal");
  const frame = document.getElementById("ipRecordModalFrame");
  const openTabBtn = document.getElementById("ipRecordModalOpenTabBtn");
  if (!modal || !frame) return;
  frame.src = "about:blank";
  if (openTabBtn) openTabBtn.setAttribute("data-url", "");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function bindRecordModal() {
  document.addEventListener("click", function (e) {
    const link = e.target.closest("a.ip-recordLink");
    if (!link) return;
    e.preventDefault();
    const url = link.getAttribute("href");
    const title = link.getAttribute("data-title") || "Idea Details";
    if (url) openRecordModal(title, url);
  });

  const closeBtn = document.getElementById("ipRecordModalCloseBtn");
  const openTabBtn = document.getElementById("ipRecordModalOpenTabBtn");
  const modal = document.getElementById("ipRecordModal");

  if (closeBtn) closeBtn.addEventListener("click", closeRecordModal);
  if (openTabBtn)
    openTabBtn.addEventListener("click", function () {
      const url = openTabBtn.getAttribute("data-url") || "";
      if (!url) return;
      window.open(url, "_blank", "noopener");
    });

  if (modal) {
    modal.addEventListener("click", function (e) {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-ip-record-close") === "1")
        closeRecordModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeRecordModal();
  });
}

function wireJumpToTop() {
  var btn = document.getElementById("ipJumpTopBtn");
  if (!btn) return;

  function updateVisibility() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
    var clientHeight =
      window.innerHeight || document.documentElement.clientHeight;
    var needsScroll = scrollHeight - clientHeight > 80;
    btn.classList.toggle("is-visible", needsScroll && scrollTop > 120);
  }

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}

function bindSortHandlers() {
  $(".ip-sortable").off("click").on("click", function () {
    const key = $(this).data("sort");
    const tableId = $(this).closest("table").attr("id");
    if (!tableId || !key) return;

    setSortState(tableId, key);
    applySortClasses(tableId);

    if (tableId === "tblIdeas") {
      populateTables(ideas, voteCounts);
    } else if (tableId === "tblTopIdeas") {
      populateTop10Ideas(voteCounts);
    } else if (tableId === "tblMyIdeas") {
      populateUserSubmissions(myIdeasCache, voteCounts);
    }
  });
}

function IdeaVotes(ideanum) {
  if (votingInProgress) return;
  if (userVotes[ideanum]) {
    alert("You already voted on this idea.");
    return;
  }
  votingInProgress = true;

  userVotes[ideanum] = true;
  setVotedState(ideanum, true);

  $.ajax({
    type: "POST",
    url: "./api/?a=form/new",
    dataType: "json",
    data: {
      service: "",
      title: "Idea #" + ideanum,
      priority: 0,
      numform_7edf3: 1,
      CSRFToken: csrfToken,
      26: userID,
      25: ideanum,
    },
    success: function (response) {
      var recordID = parseFloat(response);
      if (!isNaN(recordID) && isFinite(recordID) && recordID !== 0) {
        alert("Thanks for voting!");
        updateTable();
      } else {
        alert("Error processing vote.");
        userVotes[ideanum] = false;
        setVotedState(ideanum, false);
      }
      votingInProgress = false;
    },
    error: function () {
      alert("Error processing vote.");
      userVotes[ideanum] = false;
      setVotedState(ideanum, false);
      votingInProgress = false;
    },
    cache: false,
  });
}

function attachEventListeners() {
  $(".ip-upvote").off("click");
  $(".ip-share").off("click");

  $(".ip-share").on("click", function () {
    var recordLink = $(this).data("record-link");
    navigator.clipboard.writeText(recordLink).then(
      function () {
        alert("Idea link copied to clipboard.");
      },
      function (err) {
        console.error("Could not copy link: ", err);
      },
    );
  });

  $(".ip-upvote").on("click", function () {
    if ($(this).prop("disabled")) {
      return;
    }
    let ideanum = $(this).data("record-id");
    IdeaVotes(ideanum);
  });
}

function setVotedState(ideanum, isVoted) {
  const buttons = $(`.ip-upvote[data-record-id='${ideanum}']`);
  buttons.prop("disabled", isVoted);
  buttons.toggleClass("is-voted", isVoted);
}

function setSortState(tableId, key) {
  const state = sortState[tableId] || { key: "", dir: "asc" };
  if (state.key === key) {
    state.dir = state.dir === "asc" ? "desc" : "asc";
  } else {
    state.key = key;
    state.dir = "asc";
  }
  sortState[tableId] = state;
}

function applySortClasses(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const state = sortState[tableId];
  table.querySelectorAll(".ip-sortable").forEach((th) => {
    th.classList.remove("is-asc", "is-desc");
    const key = th.getAttribute("data-sort");
    if (state && key === state.key) {
      th.classList.add(state.dir === "asc" ? "is-asc" : "is-desc");
    }
  });
}

function updateTable() {
  $("#results").html("");
  $("#myResults").html("");

  $.ajax({
    url: 'https://leaf.va.gov/VISN20/648/Javascript_Examples/api/form/query/?q={"terms":[{"id":"categoryID","operator":"=","match":"form_a9c92","gate":"AND"},{"id":"deleted","operator":"=","match":0,"gate":"AND"}],"joins":[],"sort":{"id":"created_date","direction":"desc"},"getData":["16","13","20"]}&x-filterData=recordID,title,created_date,userID',
    type: "GET",
    cache: false,
    async: false,
    dataType: "json",
    success: function (data) {
      ideas = Object.values(data);
      fetchVotesData(ideas);
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error: ", status, error);
      $("#results").append("<tr><td colspan='6'>Error loading data</td></tr>");
      $("#myResults").append("<tr><td colspan='5'>Error loading data</td></tr>");
    },
  });
}

function filterIdeasByUser() {
  if (!userID) return [];
  return ideas.filter((idea) => {
    const owner = idea.userID || "";
    return owner === userID;
  });
}

function fetchVotesData(ideas) {
  $.ajax({
    url: 'https://leaf.va.gov/VISN20/648/Javascript_Examples/api/form/query/?q={"terms":[{"id":"categoryID","operator":"=","match":"form_7edf3","gate":"AND"},{"id":"deleted","operator":"=","match":0,"gate":"AND"}],"joins":[],"sort":{},"getData":["25","26"]}&x-filterData=recordID,title',
    type: "GET",
    cache: false,
    async: false,
    dataType: "json",
    success: function (voteData) {
      voteCounts = {};
      userVotes = {};

      Object.values(voteData).forEach((vote) => {
        let ideanum = vote.s1["id25"];
        let voter = vote.s1["id26"];
        if (voteCounts[ideanum]) {
          voteCounts[ideanum]++;
        } else {
          voteCounts[ideanum] = 1;
        }
        if (voter && voter === userID) {
          userVotes[ideanum] = true;
        }
      });

      populateTables(ideas, voteCounts);
      fetchUserSubmissions();
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error: ", status, error);
    },
  });
}

function fetchUserSubmissions() {
  if (!userID) {
    $("#myResults").html("<tr><td colspan='5'>No user ID found</td></tr>");
    return;
  }

  const query = {
    terms: [
      { id: "userID", operator: "=", match: userID, gate: "AND" },
      { id: "categoryID", operator: "=", match: "form_a9c92", gate: "AND" },
      { id: "deleted", operator: "=", match: 0, gate: "AND" },
    ],
    joins: [],
    sort: {},
    getData: ["16", "13", "20"],
  };
  const queryString = encodeURIComponent(JSON.stringify(query));

  $.ajax({
    url: `https://leaf.va.gov/VISN20/648/Javascript_Examples/api/form/query/?q=${queryString}&x-filterData=recordID,title,created_date,userID`,
    type: "GET",
    cache: false,
    async: false,
    dataType: "json",
    success: function (data) {
      let userIdeas = Object.values(data).map((idea) => {
        if (!idea.s1 && idea.recordID) {
          const match = ideas.find((item) => item.recordID === idea.recordID);
          return match ? match : idea;
        }
        return idea;
      });
      if (userIdeas.length === 0) {
        const fallbackIdeas = filterIdeasByUser();
        myIdeasCache = fallbackIdeas;
        populateUserSubmissions(myIdeasCache, voteCounts);
        return;
      }
      myIdeasCache = userIdeas;
      populateUserSubmissions(myIdeasCache, voteCounts);
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error: ", status, error);
      $("#myResults").html(
        "<tr><td colspan='5'>Error loading user ideas</td></tr>",
      );
    },
  });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "New Submission":
      return "ip-badge--new";
    case "Under Review":
      return "ip-badge--review";
    case "In Progress":
      return "ip-badge--progress";
    case "Completed":
      return "ip-badge--done";
    case "Discarded":
      return "ip-badge--discarded";
    default:
      return "";
  }
}

function getIdeaField(idea, s1Key, fallbackKey) {
  if (idea.s1 && idea.s1[s1Key] !== undefined) {
    return idea.s1[s1Key];
  }
  if (fallbackKey && idea[fallbackKey] !== undefined) {
    return idea[fallbackKey];
  }
  return "";
}

function normalizeStatusLabel(status) {
  if (!status) return "";
  if (status.indexOf("(") >= 0 && status.indexOf(")") >= 0) {
    return status.replace("(", "").replace(")", "").trim();
  }
  return status;
}

function getIdeaSortValue(idea, key, votes) {
  if (!idea) return "";
  switch (key) {
    case "id":
      return Number(idea.recordID) || 0;
    case "title":
      return String(getIdeaField(idea, "id13", "title") || "");
    case "category":
      return String(getIdeaField(idea, "id16", "category") || "");
    case "status":
      return String(normalizeStatusLabel(getIdeaField(idea, "id20", "status")));
    case "votes":
      return votes[idea.recordID] || 0;
    default:
      return "";
  }
}

function sortIdeasList(list, votes, state) {
  if (!state || !state.key) return list;
  const direction = state.dir === "desc" ? -1 : 1;
  const safeList = list.filter((item) => item && item.recordID);
  return [...safeList].sort((a, b) => {
    const aVal = getIdeaSortValue(a, state.key, votes);
    const bVal = getIdeaSortValue(b, state.key, votes);
    const aNum = typeof aVal === "number";
    const bNum = typeof bVal === "number";
    if (aNum && bNum) {
      return (aVal - bVal) * direction;
    }
    return (
      String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction
    );
  });
}

function populateUserSubmissions(userIdeas, voteCounts) {
  $("#myResults").html("");
  if (userIdeas.length === 0) {
    $("#myResults").append("<tr><td colspan='6'>No ideas submitted</td></tr>");
    return;
  }

  const sortedIdeas = sortIdeasList(
    userIdeas,
    voteCounts,
    sortState.tblMyIdeas,
  );

  applySortClasses("tblMyIdeas");

  sortedIdeas.forEach((idea) => {
    if (!idea || !idea.recordID) {
      return;
    }
    var recordID = idea.recordID;
    var title = getIdeaField(idea, "id13", "title");
    var safeTitle = escapeHtml(title);
    var category = getIdeaField(idea, "id16", "category");
    var status = normalizeStatusLabel(getIdeaField(idea, "id20", "status"));

    var statusBadgeClass = getStatusBadgeClass(status);
    var votes = voteCounts[recordID] || 0;
    var isVoted = userVotes[recordID] === true;
    var actionsCell = `<td class="ip-actionsCell">
<button class='ip-btn ip-btn--ghost ip-btn--icon ip-upvote${isVoted ? " is-voted" : ""}' data-record-id='${recordID}' ${isVoted ? "disabled" : ""} aria-label='Upvote'>
<span aria-hidden='true'>&#128077;</span>
</button>
<button class='ip-btn ip-btn--ghost ip-share' data-record-link='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>Share</button>
    </td>`;

    $("#myResults").append(`<tr>
<td><a class="ip-recordLink" data-title="${safeTitle}" href='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>${recordID}</a></td>
<td>${safeTitle}</td>
<td>${category}</td>
<td><span class="ip-badge ${statusBadgeClass}">${status}</span></td>
<td>${votes}</td>
${actionsCell}
    </tr>`);
  });
}

function populateTables(ideas, voteCounts) {
  $("#results").html("");
  if (ideas.length === 0) {
    $("#results").append("<tr><td colspan='6'>No data found</td></tr>");
  } else {
    const sortedIdeas = sortIdeasList(
      ideas,
      voteCounts,
      sortState.tblIdeas,
    );

    applySortClasses("tblIdeas");

    sortedIdeas.forEach((idea) => {
      var recordID = idea.recordID;
      var title = idea.s1["id13"];
      var safeTitle = escapeHtml(title);
      var category = idea.s1["id16"];
      var status = normalizeStatusLabel(idea.s1["id20"]);

      var statusBadgeClass = getStatusBadgeClass(status);
      var votes = voteCounts[recordID] || 0;
      var isVoted = userVotes[recordID] === true;
      var actionsCell = `<td class="ip-actionsCell">
<button class='ip-btn ip-btn--ghost ip-btn--icon ip-upvote${isVoted ? " is-voted" : ""}' data-record-id='${recordID}' ${isVoted ? "disabled" : ""} aria-label='Upvote'>
<span aria-hidden='true'>&#128077;</span>
</button>
<button class='ip-btn ip-btn--ghost ip-share' data-record-link='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>Share</button>
    </td>`;

      $("#results").append(`<tr>
<td><a class="ip-recordLink" data-title="${safeTitle}" href='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>${recordID}</a></td>
<td>${safeTitle}</td>
<td>${category}</td>
<td><span class="ip-badge ${statusBadgeClass}">${status}</span></td>
<td>${votes}</td>
${actionsCell}
    </tr>`);
    });
  }

  populateTop10Ideas(voteCounts);
  attachEventListeners();
}

function populateTop10Ideas(voteCounts) {
  $("#topResults").html("");

  let sortedIdeas = [...ideas].sort((a, b) => {
    let aVotes = voteCounts[a.recordID] || 0;
    let bVotes = voteCounts[b.recordID] || 0;
    return bVotes - aVotes;
  });

  let top10 = sortedIdeas.slice(0, 10);
  if (sortState.tblTopIdeas.key) {
    top10 = sortIdeasList(top10, voteCounts, sortState.tblTopIdeas);
  }

  applySortClasses("tblTopIdeas");

  if (top10.length === 0) {
    $("#topResults").append("<tr><td colspan='6'>No data found</td></tr>");
  } else {
    top10.forEach((idea) => {
      var recordID = idea.recordID;
      var title = idea.s1["id13"];
      var safeTitle = escapeHtml(title);
      var category = idea.s1["id16"];
      var status = normalizeStatusLabel(idea.s1["id20"]);

      var statusBadgeClass = getStatusBadgeClass(status);
      var votes = voteCounts[recordID] || 0;
      var isVoted = userVotes[recordID] === true;
      var actionsCell = `<td class="ip-actionsCell">
<button class='ip-btn ip-btn--ghost ip-btn--icon ip-upvote${isVoted ? " is-voted" : ""}' data-record-id='${recordID}' ${isVoted ? "disabled" : ""} aria-label='Upvote'>
<span aria-hidden='true'>&#128077;</span>
</button>
<button class='ip-btn ip-btn--ghost ip-share' data-record-link='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>Share</button>
    </td>`;

      $("#topResults").append(`<tr>
<td><a class="ip-recordLink" data-title="${safeTitle}" href='https://leaf.va.gov/VISN20/648/Javascript_Examples/index.php?a=printview&recordID=${recordID}'>${recordID}</a></td>
<td>${safeTitle}</td>
<td>${category}</td>
<td><span class="ip-badge ${statusBadgeClass}">${status}</span></td>
<td>${votes}</td>
${actionsCell}
    </tr>`);
    });
  }

  attachEventListeners();
}

$(document).ready(function () {
  bindModalEvents();
  bindTabs();
  bindRecordModal();
  bindSortHandlers();
  wireJumpToTop();
  updateTable();

  $("#fileInput").on("change", function () {
    var files = this.files;
    handleFiles(files);
  });

  function handleFiles(files) {
    var fileList = $("#fileList");
    fileList.empty();
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var listItem = $("<li>").text(file.name);
      fileList.append(listItem);
    }
  }

  $("#searchInput").on("input", function () {
    var searchValue = $(this).val().toLowerCase();
    filterIdeas(searchValue);
  });

  function filterIdeas(searchValue) {
    $("#results tr").filter(function () {
      $(this).toggle($(this).text().toLowerCase().indexOf(searchValue) > -1);
    });
  }

  (function () {
    "use strict";

    var forms = document.querySelectorAll(".needs-validation");
    Array.prototype.slice.call(forms).forEach(function (form) {
      form.addEventListener(
        "submit",
        function (event) {
          if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
          } else {
            event.preventDefault();
            if (typeof NewIdea === "function") {
              NewIdea();
            }
          }
          form.classList.add("was-validated");
        },
        false,
      );
    });
  })();
});
