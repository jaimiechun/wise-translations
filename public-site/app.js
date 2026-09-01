(function () {
  "use strict";

  var state = { all: [], q: "", sourceLanguage: "", targetLanguage: "", fileType: "" };

  var els = {
    q: document.getElementById("q"),
    sourceLanguage: document.getElementById("sourceLanguage"),
    targetLanguage: document.getElementById("targetLanguage"),
    fileType: document.getElementById("fileType"),
    results: document.getElementById("results"),
    empty: document.getElementById("empty"),
    sourceList: document.getElementById("source-languages"),
    targetList: document.getElementById("target-languages"),
  };

  var FILE_TYPE_BADGE_CLASS = { pdf: "badge-pdf", doc: "badge-doc", docx: "badge-doc" };

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function matches(t) {
    var q = state.q.trim().toLowerCase();
    if (q) {
      var haystack = [t.title, t.translatorName, t.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    if (state.sourceLanguage && t.sourceLanguage !== state.sourceLanguage) return false;
    if (state.targetLanguage && t.targetLanguage !== state.targetLanguage) return false;
    if (state.fileType) {
      var normalized = state.fileType === "doc" ? ["doc", "docx"] : [state.fileType];
      if (normalized.indexOf(t.fileType) === -1) return false;
    }
    return true;
  }

  function render() {
    var filtered = state.all.filter(matches);
    els.results.innerHTML = "";
    els.empty.hidden = filtered.length !== 0;

    filtered.forEach(function (t) {
      var card = document.createElement("div");
      card.className = "card";

      var metaParts = [t.sourceLanguage + " → " + t.targetLanguage];
      if (t.translatorName) metaParts.push("translated by " + t.translatorName);
      if (t.category) metaParts.push(t.category);

      var fileLabel = [
        t.fileName,
        " (",
        t.fileSize != null ? formatBytes(t.fileSize) : "",
        ")",
        t.submittedAt ? " · added " + t.submittedAt : "",
      ].join("");

      var badgeClass = FILE_TYPE_BADGE_CLASS[t.fileType] || "badge-file";

      card.innerHTML =
        '<div class="card-body">' +
        '<div class="card-title-row">' +
        '<span class="badge ' + badgeClass + '">' + escapeHtml((t.fileType || "").toUpperCase()) + "</span>" +
        "<h3>" + escapeHtml(t.title) + "</h3>" +
        "</div>" +
        '<p class="card-meta">' + escapeHtml(metaParts.join(" · ")) + "</p>" +
        '<p class="card-file">' + escapeHtml(fileLabel) + "</p>" +
        (t.notes ? '<p class="card-notes">' + escapeHtml(t.notes) + "</p>" : "") +
        "</div>" +
        '<a class="download-btn" href="' + escapeHtml(t.filePath) + '" target="_blank" rel="noopener noreferrer">View / download</a>';

      els.results.appendChild(card);
    });
  }

  function populateLanguageOptions() {
    var sources = new Set();
    var targets = new Set();
    state.all.forEach(function (t) {
      if (t.sourceLanguage) sources.add(t.sourceLanguage);
      if (t.targetLanguage) targets.add(t.targetLanguage);
    });
    els.sourceList.innerHTML = Array.from(sources)
      .sort()
      .map(function (l) { return '<option value="' + escapeHtml(l) + '"></option>'; })
      .join("");
    els.targetList.innerHTML = Array.from(targets)
      .sort()
      .map(function (l) { return '<option value="' + escapeHtml(l) + '"></option>'; })
      .join("");
  }

  ["q", "sourceLanguage", "targetLanguage", "fileType"].forEach(function (key) {
    var handler = function (e) {
      state[key] = e.target.value;
      render();
    };
    els[key].addEventListener("input", handler);
    els[key].addEventListener("change", handler);
  });

  fetch("data/translations.json")
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    })
    .then(function (data) {
      state.all = Array.isArray(data) ? data : [];
      populateLanguageOptions();
      render();
    })
    .catch(function () {
      els.results.innerHTML = "";
      els.empty.hidden = false;
      els.empty.textContent = "Couldn't load the catalog. Please try again later.";
    });
})();
