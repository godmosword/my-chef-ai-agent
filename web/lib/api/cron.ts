import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { notificationCronSecret } from "@/platform/config/notification-config";

type CronSweepResult = Record<string, unknown>;

function authorizeCronRequest(request: Request): boolean {
  const secret = notificationCronSecret();
  if (!secret) return false;
  const cronHeader = request.headers.get("x-cron-secret")?.trim();
  if (cronHeader === secret) return true;
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

export async function handleCronSweep(
  request: Request,
  runSweep: (tenantId: string) => Promise<CronSweepResult>,
) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const start = Date.now();
  const result = await runSweep(DEFAULT_TENANT_ID);
  return NextResponse.json({
    ok: true,
    ...result,
    duration_ms: Date.now() - start,
  });
}
