import { NextResponse } from "next/server";
import { RecipeFeedbackSchema } from "@/domain/recipe/recipe-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isPreferenceExtractionEnabled } from "@/platform/config/preference-extraction-config";
import {
  handleRecipeTasteFeedback,
  handleRegenerateFeedback,
} from "@/application/personalization/preference-feedback";
import { getSessionUserId } from "@/platform/identity/session";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  if (!isPreferenceExtractionEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = RecipeFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.action === "regenerate") {
    await handleRegenerateFeedback(
      DEFAULT_TENANT_ID,
      userId,
      parsed.data.recipe_name,
      parsed.data.cuisine,
    );
    return NextResponse.json({ ok: true });
  }

  const applied = await handleRecipeTasteFeedback(
    DEFAULT_TENANT_ID,
    userId,
    parsed.data.text,
  );
  return NextResponse.json({ ok: true, applied });
}
