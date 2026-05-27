import { NextResponse } from "next/server";
import { processPantryVisionUpload } from "@/application/pantry/vision/process-vision-upload";
import type { VisionIntentMarker } from "@/application/pantry/vision/process-vision-upload";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isPantryVisionEnabled } from "@/platform/config/pantry-vision-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getSessionUserId } from "@/platform/identity/session";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseMarker(raw: string | null): VisionIntentMarker {
  if (raw === "fridge" || raw === "receipt" || raw === "recipe") return raw;
  return "auto";
}

export async function POST(request: Request) {
  if (!isPantryVisionEnabled()) {
    return NextResponse.json({ error: "Pantry vision disabled" }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("image");
  const marker = parseMarker(form.get("intent")?.toString() ?? null);

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";

  if (bytes.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 });
  }

  const result = await processPantryVisionUpload(
    DEFAULT_TENANT_ID,
    userId,
    bytes,
    mimeType,
    marker,
  );

  return NextResponse.json(result);
}
