import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isOnboardingFlowEnabled } from "@/platform/config/personalization-ui-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  getOnboardingStatus,
  setOnboardingStatus,
} from "@/platform/db/personalization-onboarding";
import type { OnboardingStatus } from "@/platform/db/personalization-types";
import { getSessionUserId } from "@/platform/identity/session";

const BodySchema = z.object({
  status: z.enum(["pending", "started", "completed", "declined"]),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, status: "pending" as OnboardingStatus });
  }
  const status = await getOnboardingStatus(DEFAULT_TENANT_ID, userId);
  return NextResponse.json({ ok: true, status });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isOnboardingFlowEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await setOnboardingStatus(
    DEFAULT_TENANT_ID,
    userId,
    parsed.data.status,
  );
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
