#!/usr/bin/env node
/**
 * Build the static catalog for public-site/ (the GitHub Pages site) from a
 * CSV manifest of translations. This is the "publish" step: it copies files
 * into public-site/files/ and (re)writes public-site/data/translations.json.
 *
 * Usage:
 *   node scripts/build-catalog.mjs path/to/manifest.csv
 *
 * The CSV needs a header row with these columns (filePath is relative to the
 * CSV's own location, or absolute):
 *   title,sourceLanguage,targetLanguage,translatorName,category,notes,filePath
 *
 * Re-running this script rebuilds the whole catalog from the manifest, so the
 * manifest is the source of truth — keep it (and your source files) somewhere
 * durable, e.g. checked into a private folder or another repo.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/build-catalog.mjs path/to/manifest.csv");
  process.exit(1);
}

const projectRoot = process.cwd();
const siteDir = path.join(projectRoot, "public-site");
const filesDir = path.join(siteDir, "files");
const dataPath = path.join(siteDir, "data", "translations.json");
fs.mkdirSync(filesDir, { recursive: true });
fs.mkdirSync(path.dirname(dataPath), { recursive: true });

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

const raw = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.length > 0);
const header = parseCsvLine(raw[0]);
const required = ["title", "sourceLanguage", "targetLanguage", "filePath"];
for (const col of required) {
  if (!header.includes(col)) {
    console.error(`Manifest is missing required column: ${col}`);
    process.exit(1);
  }
}

const csvDir = path.dirname(path.resolve(csvPath));
const catalog = [];
let skipped = 0;

// Start fresh each run so removed/renamed rows don't leave stale files behind.
fs.rmSync(filesDir, { recursive: true, force: true });
fs.mkdirSync(filesDir, { recursive: true });

for (const line of raw.slice(1)) {
  const values = parseCsvLine(line);
  const row = Object.fromEntries(header.map((col, i) => [col, values[i] ?? ""]));

  const filePath = path.isAbsolute(row.filePath) ? row.filePath : path.join(csvDir, row.filePath);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping "${row.title}": file not found at ${filePath}`);
    skipped++;
    continue;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (![".pdf", ".doc", ".docx"].includes(ext)) {
    console.warn(`Skipping "${row.title}": unsupported file type ${ext}`);
    skipped++;
    continue;
  }

  const storedFileName = `${crypto.randomUUID()}${ext}`;
  fs.copyFileSync(filePath, path.join(filesDir, storedFileName));

  catalog.push({
    title: row.title,
    sourceLanguage: row.sourceLanguage,
    targetLanguage: row.targetLanguage,
    translatorName: row.translatorName || null,
    category: row.category || null,
    notes: row.notes || null,
    fileName: path.basename(filePath),
    filePath: `files/${storedFileName}`,
    fileType: ext.replace(".", ""),
    fileSize: fs.statSync(filePath).size,
    submittedAt: new Date().toISOString().slice(0, 10),
  });
}

catalog.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(dataPath, JSON.stringify(catalog, null, 2) + "\n");

console.log(`Built catalog: ${catalog.length} translation(s), skipped ${skipped}.`);
console.log(`Wrote ${path.relative(projectRoot, dataPath)}`);
console.log(`Copied files into ${path.relative(projectRoot, filesDir)}/`);
