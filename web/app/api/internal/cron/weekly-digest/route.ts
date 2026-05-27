import { NextResponse } from "next/server";
import { runWeeklyDigestSweep } from "@/application/notifications/weekly-digest-sweep";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { notificationCronSecret } from "@/platform/config/notification-config";

export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = notificationCronSecret();
  if (!secret) return false;
  const cronHeader = request.headers.get("x-cron-secret")?.trim();
  if (cronHeader === secret) return true;
  const auth = request.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}`) return true;
  return false;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const start = Date.now();
  const result = await runWeeklyDigestSweep(DEFAULT_TENANT_ID);
  return NextResponse.json({
    ok: true,
    ...result,
    duration_ms: Date.now() - start,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
