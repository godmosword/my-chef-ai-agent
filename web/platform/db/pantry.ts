/**
 * Pantry inventory CRUD (PT-1). Requires migration 0013.
 */
import {
  addQuantities,
  normalizeIngredientName,
  normalizeQuantityAndUnit,
  subtractQuantity,
} from "@/domain/pantry/pantry-normalization";
import type { MergeStrategy, PantryLocation, PantrySource } from "@/domain/pantry/pantry-types";
import { asRows, getSql } from "./client";

export type PantryItem = {
  id: number;
  tenant_id: string;
  user_id: string;
  item_key: string;
  display_name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  quantity_text: string | null;
  location: string;
  expires_at: string | null;
  purchased_at: string;
  source: string;
  confidence: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PantryItemInput = {
  raw_name: string;
  raw_quantity?: string | number | null;
  raw_unit?: string | null;
  expires_at?: string | null;
  purchased_at?: string | null;
  location?: PantryLocation;
  source?: PantrySource;
  confidence?: number;
  notes?: string | null;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function toDateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.slice(0, 10);
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pantryItemFromRow(row: Record<string, unknown>): PantryItem {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    item_key: String(row.item_key),
    display_name: String(row.display_name),
    category: row.category == null ? null : String(row.category),
    quantity: toNumber(row.quantity),
    unit: row.unit == null ? null : String(row.unit),
    quantity_text: row.quantity_text == null ? null : String(row.quantity_text),
    location: String(row.location),
    expires_at: toDateOnly(row.expires_at),
    purchased_at: toDateOnly(row.purchased_at) ?? new Date().toISOString().slice(0, 10),
    source: String(row.source),
    confidence: Number(row.confidence ?? 1),
    notes: row.notes == null ? null : String(row.notes),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function expiresMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = a ?? null;
  const db = b ?? null;
  return da === db;
}

async function listActiveByItemKey(
  tenantId: string,
  userId: string,
  itemKey: string,
): Promise<PantryItem[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM pantry_items
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND item_key = ${itemKey}
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  `;
  return asRows<Record<string, unknown>>(rows).map(pantryItemFromRow);
}

async function insertRow(
  tenantId: string,
  userId: string,
  fields: {
    item_key: string;
    display_name: string;
    category: string | null;
    quantity: number | null;
    unit: string | null;
    quantity_text: string | null;
    location: string;
    expires_at: string | null;
    purchased_at?: string | null;
    source: string;
    confidence: number;
    notes: string | null;
  },
): Promise<PantryItem> {
  const sql = getSql();
  if (!sql) throw new Error("Database not configured");

  const purchasedAt =
    fields.purchased_at ?? new Date().toISOString().slice(0, 10);

  const rows = await sql`
    INSERT INTO pantry_items (
      tenant_id, user_id, item_key, display_name, category,
      quantity, unit, quantity_text, location, expires_at, purchased_at,
      source, confidence, notes
    ) VALUES (
      ${tenantId}, ${userId}, ${fields.item_key}, ${fields.display_name}, ${fields.category},
      ${fields.quantity}, ${fields.unit}, ${fields.quantity_text}, ${fields.location}, ${fields.expires_at}, ${purchasedAt},
      ${fields.source}, ${fields.confidence}, ${fields.notes}
    )
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) throw new Error("Insert failed");
  return pantryItemFromRow(row);
}

async function updateRow(
  id: number,
  tenantId: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<PantryItem | null> {
  const sql = getSql();
  if (!sql) return null;

  const existing = await getPantryItem(id, tenantId, userId);
  if (!existing) return null;

  const rows = await sql`
    UPDATE pantry_items SET
      display_name = ${patch.display_name ?? existing.display_name},
      category = ${patch.category ?? existing.category},
      quantity = ${patch.quantity !== undefined ? patch.quantity : existing.quantity},
      unit = ${patch.unit !== undefined ? patch.unit : existing.unit},
      quantity_text = ${patch.quantity_text !== undefined ? patch.quantity_text : existing.quantity_text},
      location = ${patch.location ?? existing.location},
      expires_at = ${patch.expires_at !== undefined ? patch.expires_at : existing.expires_at},
      source = ${patch.source ?? existing.source},
      confidence = ${patch.confidence ?? existing.confidence},
      notes = ${patch.notes !== undefined ? patch.notes : existing.notes},
      updated_at = now()
    WHERE id = ${id} AND tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? pantryItemFromRow(row) : null;
}

function mergeQuantities(
  aQty: number | null,
  aUnit: string | null,
  bQty: number | null,
  bUnit: string | null,
): { quantity: number | null; unit: string | null } {
  if (aQty == null || aUnit == null) {
    return { quantity: bQty, unit: bUnit };
  }
  if (bQty == null || bUnit == null) {
    return { quantity: aQty, unit: aUnit };
  }
  try {
    const summed = addQuantities(aQty, aUnit, bQty, bUnit);
    return { quantity: summed.quantity, unit: summed.unit };
  } catch {
    return { quantity: aQty, unit: aUnit };
  }
}

function pickLatestExpiry(
  a: string | null,
  b: string | null,
): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

async function softDeleteRow(id: number, tenantId: string, userId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE pantry_items SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function addPantryItem(
  tenantId: string,
  userId: string,
  options: {
    raw_name: string;
    raw_quantity?: string | number | null;
    raw_unit?: string | null;
    expires_at?: string | null;
    purchased_at?: string | null;
    location?: string;
    source?: string;
    confidence?: number;
    notes?: string | null;
    merge_strategy?: MergeStrategy;
  },
): Promise<PantryItem> {
  const [itemKey, , category] = normalizeIngredientName(options.raw_name);
  const [quantity, unit, quantityText] = normalizeQuantityAndUnit(
    options.raw_quantity,
    options.raw_unit,
  );
  const displayName = options.raw_name.trim() || itemKey;
  const mergeStrategy = options.merge_strategy ?? "merge_if_same_expiry";
  const expiresAt = options.expires_at ?? null;
  const location = options.location ?? "fridge_main";
  const source = options.source ?? "manual";
  const confidence = options.confidence ?? 1;

  const active = await listActiveByItemKey(tenantId, userId, itemKey);

  if (mergeStrategy === "never_merge" || active.length === 0) {
    return insertRow(tenantId, userId, {
      item_key: itemKey,
      display_name: displayName,
      category,
      quantity,
      unit,
      quantity_text: quantityText || null,
      location,
      expires_at: expiresAt,
      purchased_at: options.purchased_at ?? null,
      source,
      confidence,
      notes: options.notes ?? null,
    });
  }

  let targets: PantryItem[] = [];
  if (mergeStrategy === "always_merge") {
    targets = active;
  } else {
    targets = active.filter((row) => expiresMatch(row.expires_at, expiresAt));
  }

  if (targets.length === 0) {
    return insertRow(tenantId, userId, {
      item_key: itemKey,
      display_name: displayName,
      category,
      quantity,
      unit,
      quantity_text: quantityText || null,
      location,
      expires_at: expiresAt,
      purchased_at: options.purchased_at ?? null,
      source,
      confidence,
      notes: options.notes ?? null,
    });
  }

  const primary = targets[0]!;
  let mergedQty = primary.quantity;
  let mergedUnit = primary.unit;
  const merged = mergeQuantities(mergedQty, mergedUnit, quantity, unit);
  mergedQty = merged.quantity;
  mergedUnit = merged.unit;

  let mergedExpiry = primary.expires_at;
  for (const row of targets) {
    mergedExpiry = pickLatestExpiry(mergedExpiry, row.expires_at);
    if (row.id !== primary.id) {
      const part = mergeQuantities(mergedQty, mergedUnit, row.quantity, row.unit);
      mergedQty = part.quantity;
      mergedUnit = part.unit;
      await softDeleteRow(row.id, tenantId, userId);
    }
  }
  if (mergeStrategy === "always_merge") {
    mergedExpiry = pickLatestExpiry(mergedExpiry, expiresAt);
  }

  const updated = await updateRow(primary.id, tenantId, userId, {
    display_name: displayName,
    category,
    quantity: mergedQty,
    unit: mergedUnit,
    quantity_text: quantityText || primary.quantity_text,
    location,
    expires_at: mergedExpiry,
    confidence: Math.max(primary.confidence, confidence),
  });
  return updated!;
}

export async function bulkAddPantryItems(
  tenantId: string,
  userId: string,
  items: PantryItemInput[],
  options?: { merge_strategy?: MergeStrategy },
): Promise<PantryItem[]> {
  const mergeStrategy = options?.merge_strategy ?? "merge_if_same_expiry";
  const results: PantryItem[] = [];
  for (const item of items) {
    const row = await addPantryItem(tenantId, userId, {
      raw_name: item.raw_name,
      raw_quantity: item.raw_quantity,
      raw_unit: item.raw_unit,
      expires_at: item.expires_at ?? null,
      purchased_at: item.purchased_at ?? null,
      location: item.location ?? "fridge_main",
      source: item.source ?? "manual",
      confidence: item.confidence ?? 1,
      notes: item.notes ?? null,
      merge_strategy: mergeStrategy,
    });
    results.push(row);
  }
  return results;
}

export async function listPantryItems(
  tenantId: string,
  userId: string,
  options?: {
    location?: string;
    category?: string;
    include_expired?: boolean;
  },
): Promise<PantryItem[]> {
  const sql = getSql();
  if (!sql) return [];

  const today = new Date().toISOString().slice(0, 10);
  const rows = await sql`
    SELECT * FROM pantry_items
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
    ORDER BY expires_at ASC NULLS LAST, created_at DESC
  `;

  let items = asRows<Record<string, unknown>>(rows).map(pantryItemFromRow);

  if (options?.location) {
    items = items.filter((i) => i.location === options.location);
  }
  if (options?.category) {
    items = items.filter((i) => i.category === options.category);
  }
  if (options?.include_expired === false) {
    items = items.filter((i) => !i.expires_at || i.expires_at >= today);
  }

  return items;
}

export async function getPantryItem(
  itemId: number,
  tenantId: string,
  userId: string,
): Promise<PantryItem | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM pantry_items
    WHERE id = ${itemId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? pantryItemFromRow(row) : null;
}

export async function updatePantryItem(
  itemId: number,
  tenantId: string,
  userId: string,
  fields: {
    raw_name?: string;
    raw_quantity?: string | number | null;
    raw_unit?: string | null;
    expires_at?: string | null;
    location?: string;
    notes?: string | null;
    category?: string;
  },
): Promise<PantryItem | null> {
  const existing = await getPantryItem(itemId, tenantId, userId);
  if (!existing) return null;

  const patch: Record<string, unknown> = {};

  if (fields.raw_name != null) {
    const [itemKey, , category] = normalizeIngredientName(fields.raw_name);
    patch.display_name = fields.raw_name.trim();
    patch.category = fields.category ?? category;
    patch.item_key = itemKey;
  }
  if (
    fields.raw_quantity !== undefined ||
    fields.raw_unit !== undefined
  ) {
    const [quantity, unit, quantityText] = normalizeQuantityAndUnit(
      fields.raw_quantity,
      fields.raw_unit,
    );
    patch.quantity = quantity;
    patch.unit = unit;
    patch.quantity_text = quantityText || null;
  }
  if (fields.expires_at !== undefined) patch.expires_at = fields.expires_at;
  if (fields.location != null) patch.location = fields.location;
  if (fields.notes !== undefined) patch.notes = fields.notes;

  const sql = getSql();
  if (!sql) return null;

  if (patch.item_key) {
    const rows = await sql`
      UPDATE pantry_items SET
        item_key = ${String(patch.item_key)},
        display_name = ${String(patch.display_name)},
        category = ${patch.category as string | null},
        quantity = ${patch.quantity !== undefined ? patch.quantity : existing.quantity},
        unit = ${patch.unit !== undefined ? patch.unit : existing.unit},
        quantity_text = ${patch.quantity_text !== undefined ? patch.quantity_text : existing.quantity_text},
        location = ${(patch.location as string) ?? existing.location},
        expires_at = ${patch.expires_at !== undefined ? patch.expires_at : existing.expires_at},
        notes = ${patch.notes !== undefined ? patch.notes : existing.notes},
        updated_at = now()
      WHERE id = ${itemId} AND tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;
    const row = asRows<Record<string, unknown>>(rows)[0];
    return row ? pantryItemFromRow(row) : null;
  }

  return updateRow(itemId, tenantId, userId, patch);
}

export async function consumePantryItem(
  itemId: number,
  tenantId: string,
  userId: string,
  options?: { amount?: number | null; unit?: string | null },
): Promise<PantryItem | null> {
  const existing = await getPantryItem(itemId, tenantId, userId);
  if (!existing) return null;

  if (options?.amount == null) {
    await softDeleteRow(itemId, tenantId, userId);
    return { ...existing, quantity: 0 };
  }

  if (existing.quantity == null || existing.unit == null) {
    await softDeleteRow(itemId, tenantId, userId);
    return { ...existing, quantity: 0 };
  }

  const consumeUnit = options.unit ?? existing.unit;
  let remaining: number;
  try {
    remaining = subtractQuantity(
      existing.quantity,
      existing.unit,
      options.amount,
      consumeUnit,
    );
  } catch (err) {
    throw err;
  }

  if (remaining <= 0) {
    await softDeleteRow(itemId, tenantId, userId);
    return { ...existing, quantity: 0 };
  }

  return updateRow(itemId, tenantId, userId, {
    quantity: remaining,
    unit: existing.unit,
  });
}

export async function deletePantryItem(
  itemId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const existing = await getPantryItem(itemId, tenantId, userId);
  if (!existing) return false;
  await softDeleteRow(itemId, tenantId, userId);
  return true;
}

export async function hardDeleteAllPantry(
  tenantId: string,
  userId: string,
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = await sql`
    DELETE FROM pantry_items
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length;
}

export async function findExpiringSoon(
  tenantId: string,
  userId: string,
  options?: { days_ahead?: number },
): Promise<PantryItem[]> {
  const sql = getSql();
  if (!sql) return [];
  const daysAhead = options?.days_ahead ?? 3;
  const today = new Date();
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + daysAhead);
  const endStr = end.toISOString().slice(0, 10);

  const rows = await sql`
    SELECT * FROM pantry_items
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
      AND expires_at IS NOT NULL
      AND expires_at <= ${endStr}::date
    ORDER BY expires_at ASC
  `;
  return asRows<Record<string, unknown>>(rows).map(pantryItemFromRow);
}

export async function findByItemKey(
  tenantId: string,
  userId: string,
  itemKeys: string[],
): Promise<Record<string, PantryItem[]>> {
  const sql = getSql();
  const out: Record<string, PantryItem[]> = {};
  for (const key of itemKeys) out[key] = [];
  if (!sql || itemKeys.length === 0) return out;

  const rows = await sql`
    SELECT * FROM pantry_items
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
      AND item_key = ANY(${itemKeys})
  `;
  for (const row of asRows<Record<string, unknown>>(rows)) {
    const item = pantryItemFromRow(row);
    if (!out[item.item_key]) out[item.item_key] = [];
    out[item.item_key]!.push(item);
  }
  return out;
}
