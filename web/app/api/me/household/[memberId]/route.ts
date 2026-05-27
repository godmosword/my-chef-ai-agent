import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  deleteHouseholdMember,
  updateHouseholdMember,
} from "@/platform/db/personalization";
import { checkPersonalizationPatchRateLimit } from "@/platform/db/personalization-rate-limit";
import { getSessionUserId } from "@/platform/identity/session";

const PatchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  relation: z.string().max(20).nullable().optional(),
  age_group: z.string().max(20).nullable().optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  texture_needs: z.array(z.string()).optional(),
  notes: z.string().max(300).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }
  if (!checkPersonalizationPatchRateLimit(userId)) {
    return NextResponse.json({ ok: false, error: "Too many updates" }, { status: 429 });
  }

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ ok: false, error: "Invalid member id" }, { status: 400 });
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

  const member = await updateHouseholdMember(
    memberId,
    DEFAULT_TENANT_ID,
    userId,
    parsed.data,
  );
  if (!member) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, member });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL required" }, { status: 503 });
  }

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ ok: false, error: "Invalid member id" }, { status: 400 });
  }

  const deleted = await deleteHouseholdMember(
    memberId,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: true });
}
