import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { generateStepImageAtIndex } from "@/application/hero/trigger-step-images";
import { getSessionUserId } from "@/platform/identity/session";

type Params = { params: Promise<{ id: string; stepIndex: string }> };

export async function POST(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const { id, stepIndex } = await params;
  const index = parseInt(stepIndex, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ ok: false, error: "Invalid step index" }, { status: 400 });
  }

  const result = await generateStepImageAtIndex({
    recipeId: id,
    userId,
    tenantId: DEFAULT_TENANT_ID,
    stepIndex: index,
  });

  if (!result.ok) {
    const status = result.code === "quota" ? 429 : result.code === "not_found" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, image_url: result.image_url });
}
