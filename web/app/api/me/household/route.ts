import { NextResponse } from "next/server";
import { HouseholdCreateSchema } from "@/domain/personalization/personalization-api-schemas";
import { addHouseholdMember } from "@/platform/db/personalization";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

export async function POST(request: Request) {
  const session = await requireApiSession({
    databaseError: "DATABASE_URL required",
  });
  if (session instanceof NextResponse) return session;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = HouseholdCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await addHouseholdMember(
    session.tenantId,
    session.userId,
    parsed.data,
  );
  return NextResponse.json({ ok: true, member });
}
