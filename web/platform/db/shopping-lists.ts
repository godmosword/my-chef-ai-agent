/**
 * MP-3 shopping list persistence.
 */
import { randomUUID } from "node:crypto";
import { formatQuantityDisplay } from "@/domain/shopping-list/format-quantity";
import type { MergedItem } from "@/domain/shopping-list/merge-ingredients";
import {
  resolveSection,
  SECTION_DISPLAY_ORDER,
  type ShoppingSection,
} from "@/domain/shopping-list/sections";
import {
  addQuantities,
  normalizeIngredientName,
} from "@/domain/pantry/pantry-normalization";
import { shoppingListMaxItems, shoppingShareTokenTtlDays } from "@/platform/config/shopping-list-config";
import { asRows, getSql } from "./client";

export type ShoppingListStatus = "draft" | "active" | "completed" | "abandoned";
export type ShoppingItemSource = "auto_from_plan" | "manual_added" | "pantry_restock";

export type ShoppingListItemRow = {
  id: number;
  shopping_list_id: number;
  tenant_id: string;
  user_id: string;
  item_key: string;
  display_name: string;
  category: string | null;
  section: string;
  quantity: number | null;
  unit: string | null;
  quantity_display: string;
  estimated_unit_price: number | null;
  estimated_total_price: number | null;
  source: ShoppingItemSource;
  source_slot_ids: number[];
  from_pantry_partial: boolean;
  pantry_coverage_note: string | null;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  is_removed: boolean;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ShoppingListRow = {
  id: number;
  tenant_id: string;
  user_id: string;
  meal_plan_id: number | null;
  name: string | null;
  status: ShoppingListStatus;
  estimated_total_cost: number | null;
  actual_total_cost: number | null;
  share_token: string | null;
  share_token_expires_at: string | null;
  regenerated_count: number;
  last_regenerated_at: string | null;
  pantry_snapshot_at_generation: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items?: ShoppingListItemRow[];
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function itemFromRow(row: Record<string, unknown>): ShoppingListItemRow {
  return {
    id: Number(row.id),
    shopping_list_id: Number(row.shopping_list_id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    item_key: String(row.item_key),
    display_name: String(row.display_name),
    category: row.category == null ? null : String(row.category),
    section: String(row.section),
    quantity: toNum(row.quantity),
    unit: row.unit == null ? null : String(row.unit),
    quantity_display: String(row.quantity_display),
    estimated_unit_price: toNum(row.estimated_unit_price),
    estimated_total_price: toNum(row.estimated_total_price),
    source: String(row.source) as ShoppingItemSource,
    source_slot_ids: parseJson<number[]>(row.source_slot_ids, []),
    from_pantry_partial: Boolean(row.from_pantry_partial),
    pantry_coverage_note:
      row.pantry_coverage_note == null ? null : String(row.pantry_coverage_note),
    is_checked: Boolean(row.is_checked),
    checked_at: toIso(row.checked_at),
    checked_by: row.checked_by == null ? null : String(row.checked_by),
    is_removed: Boolean(row.is_removed),
    notes: row.notes == null ? null : String(row.notes),
    display_order: Number(row.display_order ?? 0),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function listFromRow(
  row: Record<string, unknown>,
  items?: ShoppingListItemRow[],
): ShoppingListRow {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    meal_plan_id: row.meal_plan_id == null ? null : Number(row.meal_plan_id),
    name: row.name == null ? null : String(row.name),
    status: String(row.status) as ShoppingListStatus,
    estimated_total_cost: toNum(row.estimated_total_cost),
    actual_total_cost: toNum(row.actual_total_cost),
    share_token: row.share_token == null ? null : String(row.share_token),
    share_token_expires_at: toIso(row.share_token_expires_at),
    regenerated_count: Number(row.regenerated_count ?? 0),
    last_regenerated_at: toIso(row.last_regenerated_at),
    pantry_snapshot_at_generation: row.pantry_snapshot_at_generation,
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
    completed_at: toIso(row.completed_at),
    items,
  };
}

async function loadItems(
  listId: number,
  includeRemoved: boolean,
): Promise<ShoppingListItemRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = includeRemoved
    ? await sql`
        SELECT * FROM shopping_list_items
        WHERE shopping_list_id = ${listId}
        ORDER BY section ASC, display_order ASC, id ASC
      `
    : await sql`
        SELECT * FROM shopping_list_items
        WHERE shopping_list_id = ${listId} AND is_removed = FALSE
        ORDER BY section ASC, display_order ASC, id ASC
      `;
  return asRows<Record<string, unknown>>(rows).map(itemFromRow);
}

export async function createShoppingList(
  tenantId: string,
  userId: string,
  opts?: {
    meal_plan_id?: number | null;
    name?: string | null;
    status?: ShoppingListStatus;
  },
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const status = opts?.status ?? "draft";
  const rows = await sql`
    INSERT INTO shopping_lists (
      tenant_id, user_id, meal_plan_id, name, status
    ) VALUES (
      ${tenantId}, ${userId}, ${opts?.meal_plan_id ?? null},
      ${opts?.name ?? null}, ${status}
    )
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? listFromRow(row, []) : null;
}

export async function getShoppingList(
  listId: number,
  tenantId: string,
  userId: string,
  opts?: { include_items?: boolean; include_removed?: boolean },
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM shopping_lists
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  const items =
    opts?.include_items === false
      ? undefined
      : await loadItems(listId, opts?.include_removed ?? false);
  return listFromRow(row, items);
}

export async function getActiveListForPlan(
  mealPlanId: number,
  tenantId: string,
  userId: string,
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM shopping_lists
    WHERE meal_plan_id = ${mealPlanId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND status = 'active'
    LIMIT 1
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  const listId = Number(row.id);
  return listFromRow(row, await loadItems(listId, false));
}

export async function listShoppingLists(
  tenantId: string,
  userId: string,
  opts?: { status_filter?: ShoppingListStatus; limit?: number },
): Promise<ShoppingListRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const limit = opts?.limit ?? 20;
  const rows = opts?.status_filter
    ? await sql`
        SELECT * FROM shopping_lists
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
          AND status = ${opts.status_filter}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM shopping_lists
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
  return asRows<Record<string, unknown>>(rows).map((r) => listFromRow(r));
}

export async function activateShoppingList(
  listId: number,
  tenantId: string,
  userId: string,
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const existing = await getShoppingList(listId, tenantId, userId, {
    include_items: false,
  });
  if (!existing) return null;
  if (existing.meal_plan_id != null) {
    await sql`
      UPDATE shopping_lists SET status = 'abandoned', updated_at = now()
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        AND meal_plan_id = ${existing.meal_plan_id}
        AND status = 'active' AND id != ${listId}
    `;
  }
  const rows = await sql`
    UPDATE shopping_lists SET status = 'active', updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? getShoppingList(listId, tenantId, userId) : null;
}

export async function completeShoppingList(
  listId: number,
  tenantId: string,
  userId: string,
  actualTotalCost?: number | null,
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE shopping_lists SET
      status = 'completed',
      actual_total_cost = COALESCE(${actualTotalCost ?? null}, actual_total_cost),
      completed_at = now(),
      updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? getShoppingList(listId, tenantId, userId) : null;
}

export async function abandonShoppingList(
  listId: number,
  tenantId: string,
  userId: string,
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE shopping_lists SET status = 'abandoned', updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? getShoppingList(listId, tenantId, userId) : null;
}

export async function updateShoppingListMeta(
  listId: number,
  tenantId: string,
  userId: string,
  fields: {
    name?: string;
    estimated_total_cost?: number;
    regenerated_count?: number;
    last_regenerated_at?: string;
    pantry_snapshot_at_generation?: unknown;
  },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE shopping_lists SET
      name = COALESCE(${fields.name ?? null}, name),
      estimated_total_cost = COALESCE(${fields.estimated_total_cost ?? null}, estimated_total_cost),
      regenerated_count = COALESCE(${fields.regenerated_count ?? null}, regenerated_count),
      last_regenerated_at = COALESCE(${fields.last_regenerated_at ?? null}::timestamptz, last_regenerated_at),
      pantry_snapshot_at_generation = COALESCE(${JSON.stringify(fields.pantry_snapshot_at_generation ?? null)}::jsonb, pantry_snapshot_at_generation),
      updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

function sectionOrderIndex(section: string): number {
  const idx = SECTION_DISPLAY_ORDER.indexOf(section as ShoppingSection);
  return idx >= 0 ? idx : 999;
}

export async function bulkReplaceAutoItems(
  listId: number,
  tenantId: string,
  userId: string,
  merged: MergedItem[],
  opts?: { preserve_check_state?: boolean },
): Promise<ShoppingListItemRow[]> {
  const sql = getSql();
  if (!sql) return [];

  const existing = await loadItems(listId, false);
  const manual = existing.filter(
    (i) => i.source === "manual_added" || i.source === "pantry_restock",
  );
  const checkedByKey = new Map<string, ShoppingListItemRow>();
  if (opts?.preserve_check_state !== false) {
    for (const i of existing) {
      if (i.is_checked) checkedByKey.set(i.item_key, i);
    }
  }

  await sql`
    UPDATE shopping_list_items SET is_removed = TRUE, updated_at = now()
    WHERE shopping_list_id = ${listId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND source = 'auto_from_plan'
  `;

  const maxItems = shoppingListMaxItems();
  const sorted = [...merged].sort(
    (a, b) => sectionOrderIndex(a.section) - sectionOrderIndex(b.section),
  );

  const inserted: ShoppingListItemRow[] = [];
  let order = 0;
  for (const m of sorted.slice(0, maxItems)) {
    const prev = checkedByKey.get(m.item_key);
    const isChecked = Boolean(prev?.is_checked);
    const rows = await sql`
      INSERT INTO shopping_list_items (
        shopping_list_id, tenant_id, user_id,
        item_key, display_name, category, section,
        quantity, unit, quantity_display,
        estimated_unit_price, estimated_total_price,
        source, source_slot_ids,
        from_pantry_partial, pantry_coverage_note,
        is_checked, checked_at, checked_by,
        display_order
      ) VALUES (
        ${listId}, ${tenantId}, ${userId},
        ${m.item_key}, ${m.display_name}, ${m.category}, ${m.section},
        ${m.quantity}, ${m.unit}, ${m.quantity_display},
        ${m.estimated_unit_price}, ${m.estimated_total_price},
        'auto_from_plan', ${JSON.stringify(m.source_slot_ids)}::jsonb,
        ${m.from_pantry_partial}, ${m.pantry_coverage_note},
        ${isChecked}, ${isChecked ? (prev?.checked_at ?? new Date().toISOString()) : null},
        ${isChecked ? (prev?.checked_by ?? null) : null},
        ${order}
      )
      RETURNING *
    `;
    order += 1;
    const row = asRows<Record<string, unknown>>(rows)[0];
    if (row) inserted.push(itemFromRow(row));
  }

  return [...inserted, ...manual];
}

export async function addShoppingItem(
  listId: number,
  tenantId: string,
  userId: string,
  input: {
    raw_name: string;
    raw_quantity?: string | number | null;
    raw_unit?: string | null;
    section?: ShoppingSection | null;
    notes?: string | null;
    source?: ShoppingItemSource;
  },
): Promise<ShoppingListItemRow | null> {
  const sql = getSql();
  if (!sql) return null;

  const [itemKey, displayName, category] = normalizeIngredientName(input.raw_name);
  const section = input.section ?? resolveSection(itemKey, category);

  const qty =
    typeof input.raw_quantity === "number"
      ? input.raw_quantity
      : input.raw_quantity != null
        ? Number(input.raw_quantity)
        : null;
  const unit = input.raw_unit?.trim() || null;
  const quantity_display = formatQuantityDisplay(
    Number.isFinite(qty as number) ? (qty as number) : null,
    unit,
  );

  const existing = await loadItems(listId, false);
  const match = existing.find(
    (i) => i.item_key === itemKey && !i.is_checked && !i.is_removed,
  );
  if (match && qty != null && unit && match.quantity != null && match.unit) {
    try {
      const summed = addQuantities(match.quantity, match.unit, qty, unit);
      const rows = await sql`
        UPDATE shopping_list_items SET
          quantity = ${summed.quantity},
          unit = ${summed.unit},
          quantity_display = ${formatQuantityDisplay(summed.quantity, summed.unit)},
          updated_at = now()
        WHERE id = ${match.id}
        RETURNING *
      `;
      const row = asRows<Record<string, unknown>>(rows)[0];
      return row ? itemFromRow(row) : null;
    } catch {
      /* fall through to insert */
    }
  }

  const rows = await sql`
    INSERT INTO shopping_list_items (
      shopping_list_id, tenant_id, user_id,
      item_key, display_name, category, section,
      quantity, unit, quantity_display,
      source, source_slot_ids, notes
    ) VALUES (
      ${listId}, ${tenantId}, ${userId},
      ${itemKey}, ${displayName}, ${category}, ${section},
      ${qty}, ${unit}, ${quantity_display},
      ${input.source ?? "manual_added"}, '[]'::jsonb, ${input.notes ?? null}
    )
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? itemFromRow(row) : null;
}

export async function updateShoppingItem(
  itemId: number,
  tenantId: string,
  userId: string,
  fields: Partial<{
    display_name: string;
    quantity: number | null;
    unit: string | null;
    quantity_display: string;
    notes: string | null;
    section: string;
  }>,
): Promise<ShoppingListItemRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE shopping_list_items SET
      display_name = COALESCE(${fields.display_name ?? null}, display_name),
      quantity = COALESCE(${fields.quantity ?? null}, quantity),
      unit = COALESCE(${fields.unit ?? null}, unit),
      quantity_display = COALESCE(${fields.quantity_display ?? null}, quantity_display),
      notes = COALESCE(${fields.notes ?? null}, notes),
      section = COALESCE(${fields.section ?? null}, section),
      updated_at = now()
    WHERE id = ${itemId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? itemFromRow(row) : null;
}

export async function checkShoppingItem(
  itemId: number,
  tenantId: string,
  userId: string,
  checked: boolean,
  checkedBy?: string | null,
): Promise<ShoppingListItemRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE shopping_list_items SET
      is_checked = ${checked},
      checked_at = ${checked ? new Date().toISOString() : null},
      checked_by = ${checked ? (checkedBy ?? null) : null},
      updated_at = now()
    WHERE id = ${itemId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? itemFromRow(row) : null;
}

export async function removeShoppingItem(
  itemId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    UPDATE shopping_list_items SET is_removed = TRUE, updated_at = now()
    WHERE id = ${itemId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function restoreShoppingItem(
  itemId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    UPDATE shopping_list_items SET is_removed = FALSE, updated_at = now()
    WHERE id = ${itemId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function createShareToken(
  listId: number,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  const token = randomUUID().replace(/-/g, "");
  const days = shoppingShareTokenTtlDays();
  const rows = await sql`
    UPDATE shopping_lists SET
      share_token = ${token},
      share_token_expires_at = now() + (${days}::text || ' days')::interval,
      updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING share_token
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? String(row.share_token) : null;
}

export async function revokeShareToken(
  listId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    UPDATE shopping_lists SET
      share_token = NULL,
      share_token_expires_at = NULL,
      updated_at = now()
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function getShoppingListByShareToken(
  token: string,
): Promise<ShoppingListRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM shopping_lists
    WHERE share_token = ${token}
      AND share_token_expires_at > now()
    LIMIT 1
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  const listId = Number(row.id);
  return listFromRow(row, await loadItems(listId, false));
}

export async function checkItemViaShareToken(
  token: string,
  itemId: number,
  checked: boolean,
): Promise<ShoppingListItemRow | null> {
  const list = await getShoppingListByShareToken(token);
  if (!list) return null;
  const item = list.items?.find((i) => i.id === itemId);
  if (!item) return null;
  return checkShoppingItem(
    itemId,
    list.tenant_id,
    list.user_id,
    checked,
    "shared_user",
  );
}

export async function deleteShoppingList(
  listId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    DELETE FROM shopping_lists
    WHERE id = ${listId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function deleteAllShoppingLists(
  tenantId: string,
  userId: string,
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = await sql`
    DELETE FROM shopping_lists
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length;
}
