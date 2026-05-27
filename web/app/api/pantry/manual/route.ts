import { NextResponse } from "next/server";
import {
  formatManualSummary,
  parseManualPantryText,
} from "@/application/pantry/vision/manual-entry";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isPantryEnabled } from "@/platform/config/pantry-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { bulkAddPantryItems } from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";

export async function POST(request: Request) {
  if (!isPantryEnabled()) {
    return NextResponse.json({ error: "Pantry disabled" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "請輸入食材" }, { status: 400 });
  }

  const { items, invalid } = parseManualPantryText(text);
  if (!items.length) {
    return NextResponse.json({
      error: "無法解析，請用格式：名稱 數量 單位，多項用頓號分隔",
      invalid,
    }, { status: 400 });
  }

  await bulkAddPantryItems(DEFAULT_TENANT_ID, userId, items);
  return NextResponse.json({
    ok: true,
    count: items.length,
    summary: formatManualSummary(items),
    invalid,
  });
}
