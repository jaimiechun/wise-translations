#!/usr/bin/env node
/**
 * Bulk-import your existing translation files (Word/PDF) using a CSV manifest.
 *
 * Usage:
 *   node scripts/import-existing.mjs path/to/manifest.csv
 *
 * The CSV needs a header row with these columns (filePath is relative to the
 * CSV's own location, or absolute):
 *   title,sourceLanguage,targetLanguage,translatorName,category,notes,filePath
 *
 * Imported rows are inserted as "approved" so they show up in search right away.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/import-existing.mjs path/to/manifest.csv");
  process.exit(1);
}

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, "data");
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, "translations.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    translator_name TEXT,
    category TEXT,
    notes TEXT,
    file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  );
`);

function parseCsvLine(line) {
  // Minimal CSV parser supporting quoted fields with commas.
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

const insert = db.prepare(`
  INSERT INTO translations
    (title, source_language, target_language, translator_name, category, notes,
     file_name, stored_file_name, file_type, file_size, status)
  VALUES
    (@title, @sourceLanguage, @targetLanguage, @translatorName, @category, @notes,
     @fileName, @storedFileName, @fileType, @fileSize, 'approved')
`);

const csvDir = path.dirname(path.resolve(csvPath));
let imported = 0;
let skipped = 0;

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

  const storedFileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  fs.copyFileSync(filePath, path.join(uploadsDir, storedFileName));

  insert.run({
    title: row.title,
    sourceLanguage: row.sourceLanguage,
    targetLanguage: row.targetLanguage,
    translatorName: row.translatorName || null,
    category: row.category || null,
    notes: row.notes || null,
    fileName: path.basename(filePath),
    storedFileName,
    fileType: ext.replace(".", ""),
    fileSize: fs.statSync(filePath).size,
  });
  imported++;
}

console.log(`Imported ${imported} translation(s), skipped ${skipped}.`);
