import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, "translations.db");

// Reuse a single connection across hot reloads in dev.
declare global {
  var __wiseTranslationsDb: Database.Database | undefined;
}

export const db = global.__wiseTranslationsDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  global.__wiseTranslationsDb = db;
}

db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");

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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_translations_status ON translations(status);
  CREATE INDEX IF NOT EXISTS idx_translations_languages ON translations(source_language, target_language);
`);

export type TranslationStatus = "pending" | "approved" | "rejected";

export interface TranslationRow {
  id: number;
  title: string;
  source_language: string;
  target_language: string;
  translator_name: string | null;
  category: string | null;
  notes: string | null;
  file_name: string;
  stored_file_name: string;
  file_type: string;
  file_size: number;
  status: TranslationStatus;
  submitted_at: string;
  reviewed_at: string | null;
}

export const uploadsPath = uploadsDir;
