import { NextResponse } from "next/server";
import {
  PersonalizationDeleteSchema,
  TasteProfilePatchSchema,
} from "@/domain/personalization/personalization-api-schemas";
import { isPersonalizationUiEnabled } from "@/platform/config/personalization-ui-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  clearTasteProfile,
  deleteAllPersonalization,
  getTasteProfile,
  listHouseholdMembers,
  upsertTasteProfile,
  type TasteProfileWritable,
} from "@/platform/db/personalization";
import { getOnboardingStatus } from "@/platform/db/personalization-onboarding";
import { checkPersonalizationPatchRateLimit } from "@/platform/db/personalization-rate-limit";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

export async function GET() {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;
  if (!isPersonalizationUiEnabled()) {
    return NextResponse.json({ ok: true, enabled: false, taste_profile: null, household_members: [] });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      db_configured: false,
      taste_profile: null,
      household_members: [],
      onboarding_status: "pending",
    });
  }

  const [taste_profile, household_members, onboarding_status] = await Promise.all([
    getTasteProfile(session.tenantId, session.userId),
    listHouseholdMembers(session.tenantId, session.userId),
    getOnboardingStatus(session.tenantId, session.userId),
  ]);

  return NextResponse.json({
    ok: true,
    db_configured: true,
    taste_profile,
    household_members,
    onboarding_status,
  });
}

export async function PATCH(request: Request) {
  const session = await requireApiSession({
    databaseError: "DATABASE_URL required",
    requireDatabase: false,
  });
  if (session instanceof NextResponse) return session;
  if (!isPersonalizationUiEnabled()) {
    return NextResponse.json({ ok: false, error: "Personalization UI disabled" }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }
  if (!checkPersonalizationPatchRateLimit(session.userId)) {
    return NextResponse.json({ ok: false, error: "Too many updates" }, { status: 429 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = TasteProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const taste_profile = await upsertTasteProfile(
    session.tenantId,
    session.userId,
    parsed.data as TasteProfileWritable,
  );

  return NextResponse.json({ ok: true, taste_profile });
}

export async function DELETE(request: Request) {
  const session = await requireApiSession({
    databaseError: "DATABASE_URL required",
  });
  if (session instanceof NextResponse) return session;

  let scope: "all" | "taste" = "all";
  try {
    const body = await request.json();
    const parsed = PersonalizationDeleteSchema.safeParse(body);
    if (parsed.success) scope = parsed.data.scope;
  } catch {
    /* empty body → all */
  }

  if (scope === "taste") {
    await clearTasteProfile(session.tenantId, session.userId);
  } else {
    await deleteAllPersonalization(session.tenantId, session.userId);
  }

  return NextResponse.json({ ok: true, scope });
}
