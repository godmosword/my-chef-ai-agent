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
  const [textQ, imageQ] = await Promise.all([
    checkQuota(userId, DEFAULT_TENANT_ID, "text"),
    checkQuota(userId, DEFAULT_TENANT_ID, "image"),
  ]);
  return NextResponse.json({
    ok: true,
    db_configured: isDatabaseConfigured(),
    plan_key: textQ.plan_key,
    limit: textQ.limit,
    used: textQ.used,
    remaining: textQ.remaining,
    text: textQ.text,
    image: imageQ.image,
  });
}
