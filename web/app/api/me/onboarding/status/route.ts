import { NextResponse } from "next/server";
import { OnboardingStatusSchema } from "@/domain/personalization/personalization-api-schemas";
import { isOnboardingFlowEnabled } from "@/platform/config/personalization-ui-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  getOnboardingStatus,
  setOnboardingStatus,
} from "@/platform/db/personalization-onboarding";
import type { OnboardingStatus } from "@/domain/personalization/profile-types";
import {
  readJsonBody,
  rejectMissingDatabase,
  requireApiSession,
} from "@/lib/api/route-helpers";

export async function GET() {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, status: "pending" as OnboardingStatus });
  }
  const status = await getOnboardingStatus(session.tenantId, session.userId);
  return NextResponse.json({ ok: true, status });
}

export async function POST(request: Request) {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;
  if (!isOnboardingFlowEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const missingDatabase = rejectMissingDatabase("DATABASE_URL required");
  if (missingDatabase) return missingDatabase;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = OnboardingStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await setOnboardingStatus(
    session.tenantId,
    session.userId,
    parsed.data.status,
  );
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
