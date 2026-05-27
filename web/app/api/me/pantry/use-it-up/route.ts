import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestUseItUpRecipes } from "@/application/pantry/use-it-up";
import { isUseItUpEnabled } from "@/platform/config/notification-config";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  findExpiringSoon,
  getPantryItem,
  listPantryItems,
} from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";
import { defaultExpiryWarnDays } from "@/platform/config/notification-config";

const BodySchema = z.object({
  priority_item_ids: z.array(z.number().int().positive()).optional(),
  max_suggestions: z.number().int().min(1).max(5).optional(),
  expand_suggestion_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }
  if (!isUseItUpEnabled()) {
    return NextResponse.json({ ok: false, error: "Feature disabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const warnDays = defaultExpiryWarnDays();
  let priority = await findExpiringSoon(DEFAULT_TENANT_ID, userId, {
    days_ahead: warnDays,
  });
  const today = new Date().toISOString().slice(0, 10);
  priority = priority.filter((i) => i.expires_at && i.expires_at >= today);

  if (parsed.data.priority_item_ids?.length) {
    const picked: typeof priority = [];
    for (const id of parsed.data.priority_item_ids) {
      const row = await getPantryItem(id, DEFAULT_TENANT_ID, userId);
      if (row) picked.push(row);
    }
    if (picked.length) priority = picked;
  }

  const all = await listPantryItems(DEFAULT_TENANT_ID, userId, {
    include_expired: false,
    min_confidence: 0.5,
  });
  const priorityIds = new Set(priority.map((p) => p.id));
  const other = all.filter((i) => !priorityIds.has(i.id));

  if (!priority.length) {
    return NextResponse.json({
      ok: true,
      empty_expiring: true,
      message:
        "你的冰箱沒有快過期的東西，要用全部食材嗎？可以說「清冰箱」或從冰箱頁選擇。",
      suggestions: [],
    });
  }

  const suggestions = await suggestUseItUpRecipes({
    tenant_id: DEFAULT_TENANT_ID,
    user_id: userId,
    priority_ingredients: priority,
    other_available: other,
    max_suggestions: parsed.data.max_suggestions ?? 3,
    trigger: parsed.data.priority_item_ids?.length ? "reminder" : "web",
  });

  await recordUserEngagement(DEFAULT_TENANT_ID, userId, "use_it_up_clicked");

  return NextResponse.json({
    ok: true,
    empty_expiring: false,
    priority_names: priority.map((p) => p.display_name),
    suggestions,
  });
}
