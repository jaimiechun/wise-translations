#!/usr/bin/env node
/**
 * Add catalog entries that link to externally-hosted files (not copied into
 * this repo) — for cases where you want to credit/point to translations
 * hosted elsewhere rather than mirror copies of someone else's files.
 *
 * Usage:
 *   node scripts/add-external-links.mjs scripts/sources/<name>.json
 *
 * Input file shape:
 *   {
 *     "sourcePage": "https://...",      // where these links were found
 *     "sourceOrg": "Some Org — Project",// shown on each card as "Hosted by ..."
 *     "links": [{ "text": "...", "href": "https://..." }, ...]
 *   }
 *
 * This APPENDS to public-site/data/translations.json (unlike build-catalog.mjs,
 * which replaces the whole catalog from a manifest of local files) — so running
 * it twice on the same input will duplicate entries. Re-run build-catalog.mjs
 * first if you need to start clean.
 */
import fs from "fs";
import path from "path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/add-external-links.mjs scripts/sources/<name>.json");
  process.exit(1);
}

const projectRoot = process.cwd();
const dataPath = path.join(projectRoot, "public-site", "data", "translations.json");

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const { sourcePage, sourceOrg, links } = input;
if (!Array.isArray(links)) {
  console.error("Input file must have a top-level \"links\" array.");
  process.exit(1);
}

// Country tokens used to split "<Country words><Language> IWISE" style titles.
// Greedily consumed from the front so multi-word countries (Burkina Faso,
// Ivory Coast, Congo Brazzaville, South Africa) are handled correctly.
const COUNTRY_TOKENS = new Set([
  "Guatemala", "Honduras", "Peru", "Benin", "Burkina", "Faso", "Cameroon",
  "Congo", "Brazzaville", "Gabon", "Guinea", "Ivory", "Coast", "Mali",
  "Mauritius", "Senegal", "Togo", "Namibia", "South", "Africa", "African",
  "Ethiopia", "Algeria", "Egypt", "Morocco", "Tunisia", "India", "Uganda",
  "Zambia", "Bangladesh", "China", "Ghana", "Zimbabwe", "Kenya", "Tanzania",
  "Nigeria", "Brazil", "Haiti", "Haitian",
]);

// Manual overrides for entries that don't follow "<Country> <Language> IWISE".
const LANGUAGE_OVERRIDES = {
  "Spanish HWISE": "Spanish",
  "Spanish HWISE-4": "Spanish",
  "Quechua Peruvian Spanish HWISE": "Quechua (Peruvian Spanish)",
  "Arabic HWISE": "Arabic",
  "Indonesian HWISE": "Indonesian",
  "Indonesian HWISE-4": "Indonesian",
  "Haiti Kreyol HWISE": "Haitian Creole",
  "Portuguese HWISE": "Portuguese",
  "Russian Tajik HWISE": "Russian / Tajik",
  "Swahili HWISE": "Swahili",
  "DOWNLOAD THE MANUAL In English": "English",
  "DOWNLOAD THE MANUAL In Spanish": "Spanish",
  "DOWNLOAD THE MANUAL In Portuguese": "Portuguese",
  "DOWNLOAD THE MANUAL In french": "French",
  "Worksheets In English": "English",
  "Worksheets In Spanish": "Spanish",
  "Worksheets In Portuguese": "Portuguese",
  "Worksheets In french": "French",
};

function parseTitleAndType(text) {
  const match = text.match(/^(.*?)\s*\((Word|PDF)\)$/i);
  if (match) {
    const label = match[2].toLowerCase();
    return { base: match[1].trim(), fileType: label === "word" ? "docx" : label };
  }
  return { base: text.trim(), fileType: null };
}

function inferLanguageAndCountry(base) {
  if (LANGUAGE_OVERRIDES[base]) return { language: LANGUAGE_OVERRIDES[base], country: null };

  const words = base.replace(/\bIWISE\b/i, "").trim().split(/\s+/);
  const countryWords = [];
  let i = 0;
  while (i < words.length - 1 && COUNTRY_TOKENS.has(words[i])) {
    countryWords.push(words[i]);
    i++;
  }
  const languageWords = words.slice(i);
  return {
    country: countryWords.length ? countryWords.join(" ") : null,
    language: languageWords.length ? languageWords.join(" ") : base,
  };
}

function fileTypeFromUrl(url) {
  const clean = url.split("?")[0].split("#")[0];
  const ext = path.extname(clean).toLowerCase().replace(".", "");
  return ext || null;
}

function fileNameFromUrl(url, fallbackTitle) {
  const clean = decodeURIComponent(url.split("?")[0].split("#")[0]);
  const base = path.basename(clean);
  return base && base.includes(".") ? base : fallbackTitle;
}

function categoryFor(text) {
  if (/^DOWNLOAD THE MANUAL/i.test(text)) return "IWISE Manual";
  if (/^Worksheets/i.test(text)) return "IWISE Worksheets";
  if (/HWISE-4/i.test(text)) return "HWISE-4 (short form)";
  if (/HWISE/i.test(text)) return "HWISE Worksheet";
  return "IWISE Survey Instrument";
}

const TITLE_OVERRIDES = {
  "DOWNLOAD THE MANUAL In English": "IWISE Implementation Manual",
  "DOWNLOAD THE MANUAL In Spanish": "IWISE Implementation Manual",
  "DOWNLOAD THE MANUAL In Portuguese": "IWISE Implementation Manual",
  "DOWNLOAD THE MANUAL In french": "IWISE Implementation Manual",
  "Worksheets In English": "IWISE Worksheets",
  "Worksheets In Spanish": "IWISE Worksheets",
  "Worksheets In Portuguese": "IWISE Worksheets",
  "Worksheets In french": "IWISE Worksheets",
};

const newEntries = links.map((link) => {
  const { base, fileType: fileTypeFromText } = parseTitleAndType(link.text);
  const { language, country } = inferLanguageAndCountry(base);
  const fileType = fileTypeFromUrl(link.href) || fileTypeFromText || "pdf";
  const title = TITLE_OVERRIDES[base] || base;

  return {
    title,
    sourceLanguage: "English",
    targetLanguage: language,
    translatorName: null,
    category: categoryFor(link.text),
    notes: link.note || null,
    fileName: fileNameFromUrl(link.href, base),
    filePath: link.href,
    fileType,
    fileSize: null,
    submittedAt: new Date().toISOString().slice(0, 10),
    sourceOrg: sourceOrg || null,
    sourcePage: sourcePage || null,
  };
});

let existing = [];
if (fs.existsSync(dataPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
}

const combined = [...existing, ...newEntries].sort((a, b) => a.title.localeCompare(b.title));
fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(combined, null, 2) + "\n");

console.log(`Added ${newEntries.length} external-link entries (catalog now has ${combined.length} total).`);
console.log(`Wrote ${path.relative(projectRoot, dataPath)}`);
