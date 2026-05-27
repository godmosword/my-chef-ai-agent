import { NextResponse } from "next/server";
import { enrichPantryInput } from "@/application/pantry/vision/map-to-pantry-inputs";
import {
  commitPantryReviewSession,
  itemsEligibleForCommit,
} from "@/application/pantry/vision/review-commit";
import type { PantryReviewSessionPayload } from "@/application/pantry/vision/review-types";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  deletePantryReviewSession,
  getPantryReviewSession,
  savePantryReviewSession,
} from "@/platform/db/pantry-vision-session";
import { getSessionUserId } from "@/platform/identity/session";
import { recordPantryVisionCommitted } from "@/platform/observability/pantry-vision-metrics";

type RouteCtx = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await ctx.params;
  const payload = await getPantryReviewSession(
    sessionId,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (!payload) {
    return NextResponse.json(
      { error: "審核已過期，請重新掃描" },
      { status: 410 },
    );
  }
  return NextResponse.json({
    session_id: sessionId,
    eligible_count: itemsEligibleForCommit(payload.items).length,
    payload,
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await ctx.params;
  const existing = await getPantryReviewSession(
    sessionId,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (!existing) {
    return NextResponse.json({ error: "審核已過期" }, { status: 410 });
  }

  const body = (await request.json()) as {
    items?: PantryReviewSessionPayload["items"];
    toggle_index?: number;
    remove_index?: number;
    edit_index?: number;
    edit_text?: string;
  };

  let payload: PantryReviewSessionPayload = { ...existing };
  let edits = payload.user_edits_count;

  if (body.items) {
    payload.items = body.items;
    edits += 1;
  }

  if (typeof body.toggle_index === "number") {
    const item = payload.items[body.toggle_index];
    if (item) {
      item.selected = item.selected === false;
      edits += 1;
    }
  }

  if (typeof body.remove_index === "number") {
    payload.items = payload.items.filter((_, i) => i !== body.remove_index);
    edits += 1;
  }

  if (typeof body.edit_index === "number" && body.edit_text) {
    const item = enrichPantryInput({
      raw_name: body.edit_text,
      source: "manual",
      confidence: 1,
    });
    item.user_edited = true;
    payload.items[body.edit_index] = {
      ...payload.items[body.edit_index],
      ...item,
      raw_name: body.edit_text,
      user_edited: true,
    };
    edits += 1;
  }

  payload.user_edits_count = edits;
  await savePantryReviewSession(sessionId, DEFAULT_TENANT_ID, userId, payload);
  return NextResponse.json({ ok: true, payload });
}

export async function POST(request: Request, ctx: RouteCtx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { sessionId } = await ctx.params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const payload = await getPantryReviewSession(
    sessionId,
    DEFAULT_TENANT_ID,
    userId,
  );
  if (!payload) {
    return NextResponse.json({ error: "審核已過期，請重新掃描" }, { status: 410 });
  }

  if (action === "cancel") {
    await deletePantryReviewSession(sessionId, DEFAULT_TENANT_ID, userId);
    return NextResponse.json({ ok: true, message: "已取消" });
  }

  if (action === "commit") {
    const { committed } = await commitPantryReviewSession(
      DEFAULT_TENANT_ID,
      userId,
      payload,
    );
    recordPantryVisionCommitted(committed, payload.user_edits_count);
    await deletePantryReviewSession(sessionId, DEFAULT_TENANT_ID, userId);
    return NextResponse.json({
      ok: true,
      committed,
      message: `已加入 ${committed} 項到冰箱。可在口味檔案查看庫存。`,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
