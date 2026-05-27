import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
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
import { getSessionUserId } from "@/platform/identity/session";

const PatchSchema = z
  .object({
    spice_tolerance: z.number().int().min(0).max(4).nullable().optional(),
    sweetness_preference: z.number().int().min(0).max(4).nullable().optional(),
    saltiness_preference: z.number().int().min(0).max(4).nullable().optional(),
    oil_preference: z.number().int().min(0).max(4).nullable().optional(),
    allergies: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    loved_ingredients: z.array(z.string()).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    preferred_cuisines: z.array(z.string()).optional(),
    disliked_cuisines: z.array(z.string()).optional(),
    cooking_skill_level: z.number().int().min(0).max(2).nullable().optional(),
    typical_cooking_time_min: z.number().int().min(5).max(240).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

const DeleteSchema = z.object({
  scope: z.enum(["all", "taste"]).default("all"),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
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
    getTasteProfile(DEFAULT_TENANT_ID, userId),
    listHouseholdMembers(DEFAULT_TENANT_ID, userId),
    getOnboardingStatus(DEFAULT_TENANT_ID, userId),
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
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isPersonalizationUiEnabled()) {
    return NextResponse.json({ ok: false, error: "Personalization UI disabled" }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }
  if (!checkPersonalizationPatchRateLimit(userId)) {
    return NextResponse.json({ ok: false, error: "Too many updates" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const taste_profile = await upsertTasteProfile(
    DEFAULT_TENANT_ID,
    userId,
    parsed.data as TasteProfileWritable,
  );

  return NextResponse.json({ ok: true, taste_profile });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }

  let scope: "all" | "taste" = "all";
  try {
    const body = await request.json();
    const parsed = DeleteSchema.safeParse(body);
    if (parsed.success) scope = parsed.data.scope;
  } catch {
    /* empty body → all */
  }

  if (scope === "taste") {
    await clearTasteProfile(DEFAULT_TENANT_ID, userId);
  } else {
    await deleteAllPersonalization(DEFAULT_TENANT_ID, userId);
  }

  return NextResponse.json({ ok: true, scope });
}
