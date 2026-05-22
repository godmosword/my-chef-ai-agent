import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { checkQuota } from "@/lib/db/quota";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  const q = await checkQuota(userId, DEFAULT_TENANT_ID);
  return NextResponse.json({
    ok: true,
    db_configured: isDatabaseConfigured(),
    plan_key: q.plan_key,
    limit: q.limit,
    used: q.used,
    remaining: q.remaining,
  });
}
