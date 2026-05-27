import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { snoozeNotifications } from "@/platform/db/notification-prefs";
import { getSessionUserId } from "@/platform/identity/session";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";

const BodySchema = z.object({ days: z.number().int().min(1).max(90) });

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const prefs = await snoozeNotifications(
    DEFAULT_TENANT_ID,
    userId,
    parsed.data.days,
  );
  await recordUserEngagement(DEFAULT_TENANT_ID, userId, "snooze");
  return NextResponse.json({ ok: true, preferences: prefs });
}
