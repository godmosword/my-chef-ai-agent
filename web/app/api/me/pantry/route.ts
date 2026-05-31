import { NextResponse } from "next/server";
import { categorizeForDisplay } from "@/domain/pantry/pantry-ui";
import {
  AddPantryItemSchema,
  BulkAddPantrySchema,
} from "@/domain/pantry/pantry-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isPantryEnabled } from "@/platform/config/pantry-config";
import { pantryExpiryWarnDays } from "@/platform/config/pantry-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  addPantryItem,
  bulkAddPantryItems,
  hardDeleteAllPantry,
  listPantryItems,
  type PantryItem,
} from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";
import { recordPantryView } from "@/platform/observability/pantry-metrics";
import { displayDateKey } from "@/lib/locale/datetime";

function toDisplayItem(row: PantryItem) {
  return {
    id: row.id,
    item_key: row.item_key,
    display_name: row.display_name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    quantity_text: row.quantity_text,
    location: row.location,
    expires_at: row.expires_at,
    confidence: row.confidence,
    notes: row.notes,
    purchased_at: row.purchased_at,
    source: row.source,
  };
}

export async function GET(request: Request) {
  if (!isPantryEnabled()) {
    return NextResponse.json({ error: "Pantry disabled" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ items: [], groups: [] });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  const expiringWithin = url.searchParams.get("expiring_within_days");
  const expiredOnly = url.searchParams.get("expired_only") === "1";
  const includeExpired = url.searchParams.get("include_expired") !== "0";

  const items = await listPantryItems(DEFAULT_TENANT_ID, userId, {
    category,
    location,
    include_expired: includeExpired,
    expired_only: expiredOnly,
    expiring_within_days: expiringWithin
      ? parseInt(expiringWithin, 10)
      : undefined,
    min_confidence: 0.5,
  });

  if (expiringWithin) recordPantryView("expiring");
  else if (category) recordPantryView("category");
  else recordPantryView("overview");

  const display = items.map(toDisplayItem);
  const groups = categorizeForDisplay(
    display,
    displayDateKey(),
    pantryExpiryWarnDays(),
  );

  return NextResponse.json({ items: display, groups });
}

export async function POST(request: Request) {
  if (!isPantryEnabled()) {
    return NextResponse.json({ error: "Pantry disabled" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const bulk = BulkAddPantrySchema.safeParse(body);
  if (bulk.success) {
    const rows = await bulkAddPantryItems(
      DEFAULT_TENANT_ID,
      userId,
      bulk.data.items,
    );
    return NextResponse.json({ items: rows.map(toDisplayItem) });
  }

  const single = AddPantryItemSchema.safeParse(body);
  if (!single.success) {
    return NextResponse.json(
      { error: "raw_name or items required", details: single.error.flatten() },
      { status: 400 },
    );
  }

  const row = await addPantryItem(DEFAULT_TENANT_ID, userId, {
    raw_name: single.data.raw_name,
    raw_quantity: single.data.raw_quantity,
    raw_unit: single.data.raw_unit,
    expires_at: single.data.expires_at ?? null,
    location: single.data.location,
    notes: single.data.notes,
    merge_strategy: "merge_if_same_expiry",
  });
  return NextResponse.json({ item: toDisplayItem(row) });
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const count = await hardDeleteAllPantry(DEFAULT_TENANT_ID, userId);
  return NextResponse.json({ ok: true, deleted: count });
}
