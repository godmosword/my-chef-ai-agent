import { NextResponse } from "next/server";
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

  const body = (await request.json()) as { id?: number };
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const ok = await markNotificationRead(
    body.id,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (ok) {
    await recordUserEngagement(DEFAULT_TENANT_ID, userId, "opened");
  }
  return NextResponse.json({ ok });
}
