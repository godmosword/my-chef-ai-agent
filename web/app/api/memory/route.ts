import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { clearUserMemory, memoryAvailable } from "@/lib/db/memory";
import { getSessionUserId } from "@/lib/session";

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!memoryAvailable()) {
    return NextResponse.json({
      ok: true,
      cleared: false,
      message: "未設定 DATABASE_URL，無需清除。",
    });
  }
  await clearUserMemory(userId, DEFAULT_TENANT_ID);
  return NextResponse.json({ ok: true, cleared: true });
}
