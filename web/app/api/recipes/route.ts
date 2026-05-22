import { NextResponse } from "next/server";
import { generateRecipe } from "@/lib/ai/generate-recipe";
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
    const { recipe, raw } = await generateRecipe(message, userId);
    return NextResponse.json({ ok: true, recipe, raw });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("recipe generation failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
