import { NextResponse } from "next/server";
import { HouseholdPatchSchema } from "@/domain/personalization/personalization-api-schemas";
import {
  deleteHouseholdMember,
  updateHouseholdMember,
} from "@/platform/db/personalization";
import { checkPersonalizationPatchRateLimit } from "@/platform/db/personalization-rate-limit";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const session = await requireApiSession({
    databaseError: "DATABASE_URL required",
  });
  if (session instanceof NextResponse) return session;
  if (!checkPersonalizationPatchRateLimit(session.userId)) {
    return NextResponse.json({ ok: false, error: "Too many updates" }, { status: 429 });
  }

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ ok: false, error: "Invalid member id" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = HouseholdPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await updateHouseholdMember(
    memberId,
    session.tenantId,
    session.userId,
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
  const session = await requireApiSession({
    databaseError: "DATABASE_URL required",
  });
  if (session instanceof NextResponse) return session;

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ ok: false, error: "Invalid member id" }, { status: 400 });
  }

  const deleted = await deleteHouseholdMember(
    memberId,
    session.tenantId,
    session.userId,
  );
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: true });
}
