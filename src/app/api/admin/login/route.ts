import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPassword } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };

  if (!password || password !== getAdminPassword()) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
