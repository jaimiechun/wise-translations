import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db, uploadsPath, TranslationRow } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = db
    .prepare("SELECT * FROM translations WHERE id = ?")
    .get(id) as TranslationRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pending/rejected files are only downloadable by an authenticated admin.
  if (row.status !== "approved" && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(uploadsPath, row.stored_file_name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const contentType = CONTENT_TYPES[row.file_type] || "application/octet-stream";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.file_name)}"`,
    },
  });
}
