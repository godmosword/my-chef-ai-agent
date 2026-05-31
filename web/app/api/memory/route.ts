import { NextResponse } from "next/server";
import { clearUserMemory, memoryAvailable } from "@/platform/db/memory";
import { requireApiSession } from "@/lib/api/route-helpers";

export async function DELETE() {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;

  if (!memoryAvailable()) {
    return NextResponse.json({
      ok: true,
      cleared: false,
      message: "未設定 DATABASE_URL，無需清除。",
    });
  }
  await clearUserMemory(session.userId, session.tenantId);
  return NextResponse.json({ ok: true, cleared: true });
}
