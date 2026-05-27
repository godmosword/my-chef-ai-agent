import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { addHouseholdMember } from "@/platform/db/personalization";
import { getSessionUserId } from "@/platform/identity/session";

const CreateSchema = z.object({
  name: z.string().min(1).max(40),
  relation: z.string().max(20).optional(),
  age_group: z.string().max(20).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  texture_needs: z.array(z.string()).optional(),
  notes: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
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

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await addHouseholdMember(DEFAULT_TENANT_ID, userId, parsed.data);
  return NextResponse.json({ ok: true, member });
}
