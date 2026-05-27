import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  getOrCreateNotificationPreferences,
  touchLastInteraction,
  updateNotificationPreferences,
} from "@/platform/db/notification-prefs";
import { getSessionUserId } from "@/platform/identity/session";

const PatchSchema = z
  .object({
    expiry_reminders_enabled: z.boolean().optional(),
    expiry_warn_days: z.number().int().min(1).max(14).optional(),
    expiry_reminder_frequency: z
      .enum(["daily", "smart", "weekly_only", "off"])
      .optional(),
    quiet_hours_start: z.number().int().min(0).max(23).optional(),
    quiet_hours_end: z.number().int().min(0).max(23).optional(),
    timezone: z.string().min(1).max(64).optional(),
    weekly_digest_enabled: z.boolean().optional(),
    weekly_digest_day: z.number().int().min(0).max(6).optional(),
    weekly_digest_hour: z.number().int().min(0).max(23).optional(),
  })
  .strict();

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const prefs = await getOrCreateNotificationPreferences(DEFAULT_TENANT_ID, userId);
  return NextResponse.json({ ok: true, preferences: prefs });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const prefs = await updateNotificationPreferences(
    DEFAULT_TENANT_ID,
    userId,
    parsed.data,
  );
  await touchLastInteraction(DEFAULT_TENANT_ID, userId);
  return NextResponse.json({ ok: true, preferences: prefs });
}
