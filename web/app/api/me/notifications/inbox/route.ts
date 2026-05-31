import { NextResponse } from "next/server";
import { NotificationInboxMarkReadSchema } from "@/domain/notifications/notification-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  listUnreadNotifications,
  markNotificationRead,
} from "@/platform/db/notification-inbox";
import { getSessionUserId } from "@/platform/identity/session";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const items = await listUnreadNotifications(DEFAULT_TENANT_ID, userId, 15);
  return NextResponse.json({ ok: true, items });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = NotificationInboxMarkReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Missing id", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ok = await markNotificationRead(
    parsed.data.id,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (ok) {
    await recordUserEngagement(DEFAULT_TENANT_ID, userId, "opened");
  }
  return NextResponse.json({ ok });
}
