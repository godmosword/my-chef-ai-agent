import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { deleteAllUserData } from "@/lib/db/queries/account";
import { SESSION_COOKIE } from "@/lib/session";

export async function DELETE() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  if (isDatabaseConfigured()) {
    await deleteAllUserData(userId, DEFAULT_TENANT_ID);
  }

  const response = NextResponse.json({ ok: true, deleted: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
