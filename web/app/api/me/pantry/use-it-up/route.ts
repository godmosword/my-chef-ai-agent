import { NextResponse } from "next/server";
import { suggestUseItUpRecipes } from "@/application/pantry/use-it-up";
import { UseItUpBodySchema } from "@/domain/pantry/pantry-api-schemas";
import { isUseItUpEnabled } from "@/platform/config/notification-config";
import {
  findExpiringSoon,
  getPantryItem,
  listPantryItems,
} from "@/platform/db/pantry";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";
import { defaultExpiryWarnDays } from "@/platform/config/notification-config";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

export async function POST(request: Request) {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;
  if (!isUseItUpEnabled()) {
    return NextResponse.json({ ok: false, error: "Feature disabled" }, { status: 503 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = UseItUpBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const warnDays = defaultExpiryWarnDays();
  let priority = await findExpiringSoon(session.tenantId, session.userId, {
    days_ahead: warnDays,
  });
  const today = new Date().toISOString().slice(0, 10);
  priority = priority.filter((i) => i.expires_at && i.expires_at >= today);

  if (parsed.data.priority_item_ids?.length) {
    const picked: typeof priority = [];
    for (const id of parsed.data.priority_item_ids) {
      const row = await getPantryItem(id, session.tenantId, session.userId);
      if (row) picked.push(row);
    }
    if (picked.length) priority = picked;
  }

  const all = await listPantryItems(session.tenantId, session.userId, {
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
    tenant_id: session.tenantId,
    user_id: session.userId,
    priority_ingredients: priority,
    other_available: other,
    max_suggestions: parsed.data.max_suggestions ?? 3,
    trigger: parsed.data.priority_item_ids?.length ? "reminder" : "web",
  });

  await recordUserEngagement(
    session.tenantId,
    session.userId,
    "use_it_up_clicked",
  );

  return NextResponse.json({
    ok: true,
    empty_expiring: false,
    priority_names: priority.map((p) => p.display_name),
    suggestions,
  });
}
