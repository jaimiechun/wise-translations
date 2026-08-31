import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db, uploadsPath, TranslationRow } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// GET /api/translations?q=&sourceLanguage=&targetLanguage=&status=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceLanguage = searchParams.get("sourceLanguage")?.trim() ?? "";
  const targetLanguage = searchParams.get("targetLanguage")?.trim() ?? "";
  const statusParam = searchParams.get("status")?.trim() ?? "approved";

  // Only an authenticated admin may view non-approved translations.
  const admin = await isAdminAuthed();
  if (statusParam !== "approved" && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = statusParam;

  const clauses: string[] = ["status = @status"];
  const params: Record<string, string> = { status };

  if (q) {
    clauses.push(
      "(title LIKE @q OR translator_name LIKE @q OR category LIKE @q)"
    );
    params.q = `%${q}%`;
  }
  if (sourceLanguage) {
    clauses.push("source_language = @sourceLanguage");
    params.sourceLanguage = sourceLanguage;
  }
  if (targetLanguage) {
    clauses.push("target_language = @targetLanguage");
    params.targetLanguage = targetLanguage;
  }

  const rows = db
    .prepare(
      `SELECT * FROM translations WHERE ${clauses.join(" AND ")} ORDER BY submitted_at DESC`
    )
    .all(params) as TranslationRow[];

  return NextResponse.json({ translations: rows });
}

// POST /api/translations  (multipart/form-data)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const title = (form.get("title") as string | null)?.trim();
    const sourceLanguage = (form.get("sourceLanguage") as string | null)?.trim();
    const targetLanguage = (form.get("targetLanguage") as string | null)?.trim();
    const translatorName = (form.get("translatorName") as string | null)?.trim() || null;
    const category = (form.get("category") as string | null)?.trim() || null;
    const notes = (form.get("notes") as string | null)?.trim() || null;
    const file = form.get("file") as File | null;

    if (!title || !sourceLanguage || !targetLanguage || !file) {
      return NextResponse.json(
        { error: "title, sourceLanguage, targetLanguage, and file are required." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || (file.type && !ALLOWED_MIME_TYPES.has(file.type))) {
      return NextResponse.json(
        { error: "Only PDF and Word (.doc, .docx) files are accepted." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    const storedFileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const destPath = path.join(uploadsPath, storedFileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destPath, bytes);

    const result = db
      .prepare(
        `INSERT INTO translations
          (title, source_language, target_language, translator_name, category, notes,
           file_name, stored_file_name, file_type, file_size, status)
         VALUES
          (@title, @sourceLanguage, @targetLanguage, @translatorName, @category, @notes,
           @fileName, @storedFileName, @fileType, @fileSize, 'pending')`
      )
      .run({
        title,
        sourceLanguage,
        targetLanguage,
        translatorName,
        category,
        notes,
        fileName: file.name,
        storedFileName,
        fileType: ext.replace(".", ""),
        fileSize: file.size,
      });

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    console.error("Failed to submit translation:", err);
    return NextResponse.json({ error: "Something went wrong submitting the translation." }, { status: 500 });
  }
}
