import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  db.prepare(
    "UPDATE translations SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?"
  ).run(id);
  return NextResponse.json({ ok: true });
}
