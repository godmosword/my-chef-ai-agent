import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { QuotaExceededError, runRecipeFlow } from "@/lib/ai/recipe-flow";
import { getSessionUserId } from "@/lib/session";

export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "message is required" },
      { status: 400 },
    );
  }

  try {
    const result = await runRecipeFlow(userId, message, DEFAULT_TENANT_ID);
    return NextResponse.json({
      ok: true,
      recipe: result.recipe,
      quota: result.quota,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          ok: false,
          error: "今日免費額度已用完，請明天再試。",
          quota: err.quota,
        },
        { status: 429 },
      );
    }
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("recipe generation failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
