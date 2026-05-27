import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { pantryExpiryWarnDays } from "@/platform/config/pantry-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getPantrySummary } from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      total_count: 0,
      expiring_count: 0,
      expired_count: 0,
      by_category: {},
    });
  }
  const summary = await getPantrySummary(
    DEFAULT_TENANT_ID,
    userId,
    pantryExpiryWarnDays(),
  );
  return NextResponse.json(summary);
}
