(function () {
  "use strict";

  var NO_GROUP = "General materials";

  // Fixed display orders; anything unlisted falls to the end, alphabetically.
  var REGION_ORDER = [
    "West Africa", "Central Africa", "East Africa", "Southern Africa", "North Africa",
    "South Asia", "East & Southeast Asia", "Central Asia", "Latin America & Caribbean",
  ];
  var CATEGORY_ORDER = [
    "IWISE Manual", "IWISE Worksheets", "IWISE Survey Instrument",
    "HWISE Worksheet", "HWISE-4 (short form)",
  ];

  var GROUP_LABELS = {
    targetLanguage: "language",
    region: "region",
    country: "country",
    category: "document type",
  };

  // Above this many groups, sections start collapsed so the page reads as an
  // index rather than a wall of cards.
  var COLLAPSE_THRESHOLD = 12;

  var FILE_TYPE_BADGE_CLASS = { pdf: "badge-pdf", doc: "badge-doc", docx: "badge-doc" };

  var state = {
    docs: [],
    q: "",
    sourceLanguage: "",
    targetLanguage: "",
    fileType: "",
    groupBy: "targetLanguage",
    collapsed: {}, // group name -> bool; unset means "use the default"
  };

  var els = {
    q: document.getElementById("q"),
    sourceLanguage: document.getElementById("sourceLanguage"),
    targetLanguage: document.getElementById("targetLanguage"),
    fileType: document.getElementById("fileType"),
    groupBy: document.getElementById("groupBy"),
    results: document.getElementById("results"),
    empty: document.getElementById("empty"),
    stats: document.getElementById("catalog-stats"),
    resultCount: document.getElementById("result-count"),
    expandAll: document.getElementById("expandAll"),
    collapseAll: document.getElementById("collapseAll"),
    sourceList: document.getElementById("source-languages"),
    targetList: document.getElementById("target-languages"),
  };

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

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  /**
   * Collapse the raw file rows into documents: one entry per translation, with
   * its available formats (Word / PDF) as variants. The same document listed in
   * two formats used to render as two separate cards.
   */
  function toDocuments(rows) {
    var byKey = {};
    var order = [];

    rows.forEach(function (row) {
      var key = [row.title, row.targetLanguage, row.category].join("|");
      if (!byKey[key]) {
        byKey[key] = {
          title: row.title,
          sourceLanguage: row.sourceLanguage,
          targetLanguage: row.targetLanguage,
          country: row.country || null,
          region: row.region || null,
          category: row.category || null,
          translatorName: row.translatorName || null,
          notes: row.notes || null,
          sourceOrg: row.sourceOrg || null,
          submittedAt: row.submittedAt || null,
          variants: [],
        };
        order.push(key);
      }
      byKey[key].variants.push({
        fileType: row.fileType,
        filePath: row.filePath,
        fileName: row.fileName,
        fileSize: row.fileSize,
        note: row.notes || null,
      });
    });

    return order.map(function (key) {
      var doc = byKey[key];
      // Word first, then PDF — matches how the source pages list them.
      doc.variants.sort(function (a, b) {
        var rank = { docx: 0, doc: 0, pdf: 1 };
        return (rank[a.fileType] ?? 2) - (rank[b.fileType] ?? 2);
      });
      return doc;
    });
  }

  function variantMatchesTypeFilter(variant) {
    if (!state.fileType) return true;
    var allowed = state.fileType === "doc" ? ["doc", "docx"] : [state.fileType];
    return allowed.indexOf(variant.fileType) !== -1;
  }

  function matches(doc) {
    var q = state.q.trim().toLowerCase();
    if (q) {
      var haystack = [
        doc.title, doc.translatorName, doc.category,
        doc.targetLanguage, doc.sourceLanguage, doc.country, doc.region,
      ].filter(Boolean).join(" ").toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    if (state.sourceLanguage && doc.sourceLanguage !== state.sourceLanguage) return false;
    if (state.targetLanguage && doc.targetLanguage !== state.targetLanguage) return false;
    return true;
  }

  /** Apply filters, dropping variants (and then docs) that the type filter excludes. */
  function visibleDocuments() {
    var out = [];
    state.docs.forEach(function (doc) {
      if (!matches(doc)) return;
      var variants = doc.variants.filter(variantMatchesTypeFilter);
      if (!variants.length) return;
      out.push(Object.assign({}, doc, { variants: variants }));
    });
    return out;
  }

  function groupKeyFor(doc) {
    return doc[state.groupBy] || NO_GROUP;
  }

  function sortGroupNames(names) {
    var fixed = state.groupBy === "region" ? REGION_ORDER
      : state.groupBy === "category" ? CATEGORY_ORDER
      : null;

    return names.sort(function (a, b) {
      // The catch-all group always sorts last.
      if (a === NO_GROUP) return 1;
      if (b === NO_GROUP) return -1;
      if (fixed) {
        var ia = fixed.indexOf(a);
        var ib = fixed.indexOf(b);
        if (ia !== -1 || ib !== -1) {
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        }
      }
      return a.localeCompare(b);
    });
  }

  function groupDocuments(docs) {
    var byName = {};
    docs.forEach(function (doc) {
      var name = groupKeyFor(doc);
      (byName[name] = byName[name] || []).push(doc);
    });

    return sortGroupNames(Object.keys(byName)).map(function (name) {
      return { name: name, docs: byName[name].sort(function (a, b) { return a.title.localeCompare(b.title); }) };
    });
  }

  function isCollapsed(groupName, groupCount) {
    if (state.q.trim()) return false; // always reveal search hits
    if (Object.prototype.hasOwnProperty.call(state.collapsed, groupName)) {
      return state.collapsed[groupName];
    }
    return groupCount > COLLAPSE_THRESHOLD;
  }

  /** A short summary of what's inside a collapsed group, e.g. "Kenya, Tanzania". */
  function groupSummary(group) {
    var field = state.groupBy === "targetLanguage" ? "country" : "targetLanguage";
    var values = [];
    group.docs.forEach(function (doc) {
      var value = doc[field];
      if (value && values.indexOf(value) === -1) values.push(value);
    });
    if (!values.length) return "";
    values.sort();
    if (values.length > 4) return values.slice(0, 4).join(", ") + " +" + (values.length - 4) + " more";
    return values.join(", ");
  }

  function variantButton(variant) {
    var isExternal = /^https?:\/\//i.test(variant.filePath);
    var label = (variant.fileType || "file").toUpperCase();
    var badgeClass = FILE_TYPE_BADGE_CLASS[variant.fileType] || "badge-file";
    var size = !isExternal && variant.fileSize != null ? " · " + formatBytes(variant.fileSize) : "";
    return (
      '<a class="variant-btn ' + badgeClass + '" href="' + escapeHtml(variant.filePath) + '"' +
      ' target="_blank" rel="noopener noreferrer"' +
      ' title="' + escapeHtml(variant.fileName || "") + '">' +
      escapeHtml(label) + escapeHtml(size) + (isExternal ? " ↗" : " ↓") +
      "</a>"
    );
  }

  function cardHtml(doc) {
    var metaParts = [];
    if (doc.country) metaParts.push(doc.country);
    // An original-language document (e.g. the English manual) isn't a
    // translation pair, so don't render it as "English → English".
    metaParts.push(
      doc.sourceLanguage === doc.targetLanguage
        ? doc.targetLanguage
        : doc.sourceLanguage + " → " + doc.targetLanguage
    );
    if (doc.translatorName) metaParts.push("translated by " + doc.translatorName);
    if (doc.category) metaParts.push(doc.category);

    return (
      '<div class="card">' +
      '<div class="card-body">' +
      "<h3>" + escapeHtml(doc.title) + "</h3>" +
      '<p class="card-meta">' + escapeHtml(metaParts.join(" · ")) + "</p>" +
      (doc.sourceOrg ? '<p class="card-source">Hosted by ' + escapeHtml(doc.sourceOrg) + "</p>" : "") +
      (doc.notes ? '<p class="card-notes">' + escapeHtml(doc.notes) + "</p>" : "") +
      "</div>" +
      '<div class="card-actions">' + doc.variants.map(variantButton).join("") + "</div>" +
      "</div>"
    );
  }

  function groupHtml(group, collapsed) {
    var fileCount = group.docs.reduce(function (n, d) { return n + d.variants.length; }, 0);
    var summary = groupSummary(group);

    return (
      '<section class="group' + (collapsed ? " is-collapsed" : "") + '">' +
      '<button type="button" class="group-header" data-group="' + escapeHtml(group.name) + '"' +
      ' aria-expanded="' + (collapsed ? "false" : "true") + '">' +
      '<span class="group-caret" aria-hidden="true">▶</span>' +
      '<span class="group-name">' + escapeHtml(group.name) + "</span>" +
      '<span class="group-count">' + plural(group.docs.length, "document") + " · " + plural(fileCount, "file") + "</span>" +
      (summary ? '<span class="group-summary">' + escapeHtml(summary) + "</span>" : "") +
      "</button>" +
      '<div class="group-body">' + group.docs.map(cardHtml).join("") + "</div>" +
      "</section>"
    );
  }

  function render() {
    var docs = visibleDocuments();
    var groups = groupDocuments(docs);

    els.empty.hidden = docs.length !== 0;
    els.results.innerHTML = groups.map(function (group) {
      return groupHtml(group, isCollapsed(group.name, groups.length));
    }).join("");

    var fileCount = docs.reduce(function (n, d) { return n + d.variants.length; }, 0);
    els.resultCount.textContent = docs.length
      ? plural(docs.length, "document") + " · " + plural(fileCount, "file") +
        " in " + plural(groups.length, GROUP_LABELS[state.groupBy] || "group")
      : "";
  }

  function renderStats(rows, docs) {
    var languages = new Set();
    var countries = new Set();
    docs.forEach(function (doc) {
      if (doc.targetLanguage) languages.add(doc.targetLanguage);
      if (doc.country) countries.add(doc.country);
    });
    els.stats.textContent =
      plural(docs.length, "document") + " · " + plural(rows.length, "file") + " · " +
      plural(languages.size, "language") + " · " + plural(countries.size, "country").replace("countrys", "countries");
  }

  function populateLanguageOptions() {
    var sources = new Set();
    var targets = new Set();
    state.docs.forEach(function (doc) {
      if (doc.sourceLanguage) sources.add(doc.sourceLanguage);
      if (doc.targetLanguage) targets.add(doc.targetLanguage);
    });

    function options(values) {
      return Array.from(values).sort().map(function (v) {
        return '<option value="' + escapeHtml(v) + '"></option>';
      }).join("");
    }
    els.sourceList.innerHTML = options(sources);
    els.targetList.innerHTML = options(targets);
    // A filter with a single possible value is just clutter — every entry
    // matches it. Show it only once the catalog actually has a choice to make.
    els.sourceLanguage.hidden = sources.size < 2;
    els.targetLanguage.hidden = targets.size < 2;
  }

  ["q", "sourceLanguage", "targetLanguage", "fileType", "groupBy"].forEach(function (key) {
    var handler = function (e) {
      state[key] = e.target.value;
      if (key === "groupBy") state.collapsed = {}; // new grouping, fresh defaults
      render();
    };
    els[key].addEventListener("input", handler);
    els[key].addEventListener("change", handler);
  });

  els.results.addEventListener("click", function (e) {
    var header = e.target.closest(".group-header");
    if (!header) return;
    var name = header.getAttribute("data-group");
    var section = header.parentNode;
    var nowCollapsed = !section.classList.contains("is-collapsed");
    section.classList.toggle("is-collapsed", nowCollapsed);
    header.setAttribute("aria-expanded", nowCollapsed ? "false" : "true");
    state.collapsed[name] = nowCollapsed;
  });

  function setAllCollapsed(collapsed) {
    groupDocuments(visibleDocuments()).forEach(function (group) {
      state.collapsed[group.name] = collapsed;
    });
    render();
  }
  els.expandAll.addEventListener("click", function () { setAllCollapsed(false); });
  els.collapseAll.addEventListener("click", function () { setAllCollapsed(true); });

  fetch("data/translations.json")
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    })
    .then(function (rows) {
      rows = Array.isArray(rows) ? rows : [];
      state.docs = toDocuments(rows);
      renderStats(rows, state.docs);
      populateLanguageOptions();
      render();
    })
    .catch(function () {
      els.results.innerHTML = "";
      els.resultCount.textContent = "";
      els.empty.hidden = false;
      els.empty.textContent = "Couldn't load the catalog. Please try again later.";
    });
})();
