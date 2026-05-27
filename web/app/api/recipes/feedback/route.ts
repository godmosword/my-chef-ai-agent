import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isPreferenceExtractionEnabled } from "@/platform/config/preference-extraction-config";
import {
  handleRecipeTasteFeedback,
  handleRegenerateFeedback,
} from "@/application/personalization/preference-feedback";
import { getSessionUserId } from "@/platform/identity/session";

const FeedbackSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("regenerate"),
    recipe_name: z.string().min(1).max(200),
    cuisine: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("taste"),
    text: z.string().min(1).max(50),
  }),
]);

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  if (!isPreferenceExtractionEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
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
