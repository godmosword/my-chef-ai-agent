import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrCreateNotificationPreferences,
  touchLastInteraction,
  updateNotificationPreferences,
} from "@/platform/db/notification-prefs";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

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
    daily_meal_push_enabled: z.boolean().optional(),
    daily_meal_morning_hour: z.number().int().min(0).max(23).optional(),
    daily_meal_evening_hour: z.number().int().min(0).max(23).optional(),
    daily_meal_morning_enabled: z.boolean().optional(),
    daily_meal_evening_enabled: z.boolean().optional(),
    shopping_reminder_enabled: z.boolean().optional(),
    shopping_reminder_day: z.number().int().min(0).max(6).optional(),
    shopping_reminder_hour: z.number().int().min(0).max(23).optional(),
    weekly_review_enabled: z.boolean().optional(),
    weekly_review_day: z.number().int().min(0).max(6).optional(),
    weekly_review_hour: z.number().int().min(0).max(23).optional(),
  })
  .strict();

export async function GET() {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;

  const prefs = await getOrCreateNotificationPreferences(
    session.tenantId,
    session.userId,
  );
  return NextResponse.json({ ok: true, preferences: prefs });
}

export async function PATCH(request: Request) {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const prefs = await updateNotificationPreferences(
    session.tenantId,
    session.userId,
    parsed.data,
  );
  await touchLastInteraction(session.tenantId, session.userId);
  return NextResponse.json({ ok: true, preferences: prefs });
}
