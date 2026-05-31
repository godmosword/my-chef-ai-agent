import { NextResponse } from "next/server";
import { NotificationSnoozeSchema } from "@/domain/notifications/notification-api-schemas";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";
import { snoozeNotifications } from "@/platform/db/notification-prefs";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";

export async function POST(request: Request) {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = NotificationSnoozeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const prefs = await snoozeNotifications(
    session.tenantId,
    session.userId,
    parsed.data.days,
  );
  await recordUserEngagement(session.tenantId, session.userId, "snooze");
  return NextResponse.json({ ok: true, preferences: prefs });
}
