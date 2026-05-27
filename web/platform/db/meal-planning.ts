/**
 * MP-1: Weekly meal plan sessions + slots (distinct from meal_calendar_entries).
 */
import type {
  GenerationProgress,
  KeyIngredient,
  MealPattern,
  MealPlanConstraints,
  PlanStatus,
  SlotStatus,
} from "@/domain/meal-planning/types";
import { asRows, getSql } from "./client";

export type MealSlotRow = {
  id: number;
  meal_plan_id: number;
  tenant_id: string;
  user_id: string;
  slot_date: string;
  meal_type: string;
  slot_index: number;
  dish_title: string;
  cuisine: string | null;
  estimated_time_min: number | null;
  effort_level: string | null;
  key_ingredients: KeyIngredient[];
  estimated_cost: number | null;
  tags: string[];
  rationale: string | null;
  full_recipe_json: Record<string, unknown> | null;
  full_recipe_generated_at: string | null;
  status: SlotStatus;
  cooked_at: string | null;
  skipped_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanRow = {
  id: number;
  tenant_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  meal_pattern: MealPattern;
  constraints: MealPlanConstraints;
  target_household_member_ids: number[];
  status: PlanStatus;
  name: string | null;
  total_estimated_cost: number | null;
  pantry_reuse_score: number | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  completed_at: string | null;
  generation_progress: GenerationProgress;
  slots?: MealSlotRow[];
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function toDateOnly(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
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

function slotFromRow(row: Record<string, unknown>): MealSlotRow {
  return {
    id: Number(row.id),
    meal_plan_id: Number(row.meal_plan_id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    slot_date: toDateOnly(row.slot_date),
    meal_type: String(row.meal_type),
    slot_index: Number(row.slot_index ?? 0),
    dish_title: String(row.dish_title),
    cuisine: row.cuisine == null ? null : String(row.cuisine),
    estimated_time_min:
      row.estimated_time_min == null ? null : Number(row.estimated_time_min),
    effort_level: row.effort_level == null ? null : String(row.effort_level),
    key_ingredients: parseJson<KeyIngredient[]>(row.key_ingredients, []),
    estimated_cost:
      row.estimated_cost == null ? null : Number(row.estimated_cost),
    tags: parseJson<string[]>(row.tags, []),
    rationale: row.rationale == null ? null : String(row.rationale),
    full_recipe_json: parseJson<Record<string, unknown> | null>(
      row.full_recipe_json,
      null,
    ),
    full_recipe_generated_at: toIso(row.full_recipe_generated_at),
    status: String(row.status) as SlotStatus,
    cooked_at: toIso(row.cooked_at),
    skipped_at: toIso(row.skipped_at),
    notes: row.notes == null ? null : String(row.notes),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function planFromRow(
  row: Record<string, unknown>,
  slots?: MealSlotRow[],
): MealPlanRow {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    start_date: toDateOnly(row.start_date),
    end_date: toDateOnly(row.end_date),
    meal_pattern: parseJson<MealPattern>(row.meal_pattern, {
      breakfast: false,
      lunch: true,
      dinner: true,
    }),
    constraints: parseJson<MealPlanConstraints>(row.constraints, {
      start_date: toDateOnly(row.start_date),
      end_date: toDateOnly(row.end_date),
      meal_pattern: { breakfast: false, lunch: true, dinner: true },
    }),
    target_household_member_ids: parseJson<number[]>(
      row.target_household_member_ids,
      [],
    ),
    status: String(row.status) as PlanStatus,
    name: row.name == null ? null : String(row.name),
    total_estimated_cost:
      row.total_estimated_cost == null
        ? null
        : Number(row.total_estimated_cost),
    pantry_reuse_score:
      row.pantry_reuse_score == null ? null : Number(row.pantry_reuse_score),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
    activated_at: toIso(row.activated_at),
    completed_at: toIso(row.completed_at),
    generation_progress: parseJson<GenerationProgress>(row.generation_progress, {
      phase: "done",
    }),
    slots,
  };
}

export async function createMealPlan(
  tenantId: string,
  userId: string,
  fields: {
    start_date: string;
    end_date: string;
    meal_pattern: MealPattern;
    constraints: MealPlanConstraints;
    target_household_member_ids?: number[];
    name?: string | null;
    status?: PlanStatus;
  },
): Promise<MealPlanRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO meal_plans (
      tenant_id, user_id, start_date, end_date, meal_pattern, constraints,
      target_household_member_ids, status, name
    ) VALUES (
      ${tenantId}, ${userId}, ${fields.start_date}, ${fields.end_date},
      ${JSON.stringify(fields.meal_pattern)}::jsonb,
      ${JSON.stringify(fields.constraints)}::jsonb,
      ${JSON.stringify(fields.target_household_member_ids ?? [])}::jsonb,
      ${fields.status ?? "draft"},
      ${fields.name ?? null}
    )
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? planFromRow(row) : null;
}

async function loadSlotsForPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<MealSlotRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM meal_slots
    WHERE meal_plan_id = ${planId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
    ORDER BY slot_date ASC, meal_type ASC, slot_index ASC
  `;
  return asRows<Record<string, unknown>>(rows).map(slotFromRow);
}

export async function getMealPlan(
  planId: number,
  tenantId: string,
  userId: string,
  options?: { include_slots?: boolean },
): Promise<MealPlanRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM meal_plans
    WHERE id = ${planId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  const slots =
    options?.include_slots !== false
      ? await loadSlotsForPlan(planId, tenantId, userId)
      : undefined;
  return planFromRow(row, slots);
}

export async function listMealPlans(
  tenantId: string,
  userId: string,
  options?: { status_filter?: PlanStatus; limit?: number },
): Promise<MealPlanRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const limit = options?.limit ?? 20;
  const rows = options?.status_filter
    ? await sql`
        SELECT * FROM meal_plans
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
          AND status = ${options.status_filter}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM meal_plans
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
  return asRows<Record<string, unknown>>(rows).map((r) => planFromRow(r));
}

export async function getActiveMealPlan(
  tenantId: string,
  userId: string,
): Promise<MealPlanRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM meal_plans
    WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND status = 'active'
    LIMIT 1
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  const planId = Number(row.id);
  const slots = await loadSlotsForPlan(planId, tenantId, userId);
  return planFromRow(row, slots);
}

async function setPlanStatus(
  planId: number,
  tenantId: string,
  userId: string,
  status: PlanStatus,
  extra?: Record<string, unknown>,
): Promise<MealPlanRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const activated =
    status === "active" ? new Date().toISOString() : undefined;
  const completed =
    status === "completed" ? new Date().toISOString() : undefined;

  const rows = await sql`
    UPDATE meal_plans SET
      status = ${status},
      activated_at = COALESCE(${activated ?? null}::timestamptz, activated_at),
      completed_at = COALESCE(${completed ?? null}::timestamptz, completed_at),
      total_estimated_cost = COALESCE(${extra?.total_estimated_cost ?? null}, total_estimated_cost),
      pantry_reuse_score = COALESCE(${extra?.pantry_reuse_score ?? null}, pantry_reuse_score),
      updated_at = now()
    WHERE id = ${planId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? getMealPlan(planId, tenantId, userId) : null;
}

export async function activateMealPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<MealPlanRow | null> {
  const sql = getSql();
  if (!sql) return null;
  await sql`
    UPDATE meal_plans SET status = 'archived', updated_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND status = 'active'
      AND id != ${planId}
  `;
  return setPlanStatus(planId, tenantId, userId, "active", {
    activated_at: new Date().toISOString(),
  });
}

export async function completeMealPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<MealPlanRow | null> {
  return setPlanStatus(planId, tenantId, userId, "completed");
}

export async function abandonMealPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<MealPlanRow | null> {
  return setPlanStatus(planId, tenantId, userId, "abandoned");
}

export async function updateMealPlanMeta(
  planId: number,
  tenantId: string,
  userId: string,
  fields: {
    total_estimated_cost?: number;
    pantry_reuse_score?: number;
    name?: string;
    status?: PlanStatus;
  },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  const existing = await getMealPlan(planId, tenantId, userId, {
    include_slots: false,
  });
  if (!existing) return;
  await sql`
    UPDATE meal_plans SET
      total_estimated_cost = ${fields.total_estimated_cost ?? existing.total_estimated_cost},
      pantry_reuse_score = ${fields.pantry_reuse_score ?? existing.pantry_reuse_score},
      name = ${fields.name ?? existing.name},
      status = ${fields.status ?? existing.status},
      updated_at = now()
    WHERE id = ${planId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function deleteMealPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    DELETE FROM meal_plans
    WHERE id = ${planId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function bulkInsertMealSlots(
  planId: number,
  tenantId: string,
  userId: string,
  slots: Omit<
    MealSlotRow,
    | "id"
    | "meal_plan_id"
    | "tenant_id"
    | "user_id"
    | "created_at"
    | "updated_at"
    | "full_recipe_json"
    | "full_recipe_generated_at"
    | "cooked_at"
    | "skipped_at"
    | "status"
  >[],
): Promise<MealSlotRow[]> {
  const sql = getSql();
  if (!sql || !slots.length) return [];
  const out: MealSlotRow[] = [];
  for (const s of slots) {
    const rows = await sql`
      INSERT INTO meal_slots (
        meal_plan_id, tenant_id, user_id, slot_date, meal_type, slot_index,
        dish_title, cuisine, estimated_time_min, effort_level, key_ingredients,
        estimated_cost, tags, rationale, status
      ) VALUES (
        ${planId}, ${tenantId}, ${userId}, ${s.slot_date}, ${s.meal_type},
        ${s.slot_index}, ${s.dish_title}, ${s.cuisine}, ${s.estimated_time_min},
        ${s.effort_level}, ${JSON.stringify(s.key_ingredients)}::jsonb,
        ${s.estimated_cost}, ${JSON.stringify(s.tags)}::jsonb, ${s.rationale},
        'planned'
      )
      RETURNING *
    `;
    const row = asRows<Record<string, unknown>>(rows)[0];
    if (row) out.push(slotFromRow(row));
  }
  return out;
}

export async function getMealSlot(
  slotId: number,
  tenantId: string,
  userId: string,
): Promise<MealSlotRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM meal_slots
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}

export async function updateMealSlot(
  slotId: number,
  tenantId: string,
  userId: string,
  fields: Partial<{
    dish_title: string;
    cuisine: string;
    key_ingredients: KeyIngredient[];
    full_recipe_json: Record<string, unknown> | null;
    status: SlotStatus;
    notes: string;
  }>,
): Promise<MealSlotRow | null> {
  const existing = await getMealSlot(slotId, tenantId, userId);
  if (!existing) return null;
  const sql = getSql();
  if (!sql) return null;

  const clearRecipe =
    fields.dish_title != null && fields.dish_title !== existing.dish_title;

  const rows = await sql`
    UPDATE meal_slots SET
      dish_title = ${fields.dish_title ?? existing.dish_title},
      cuisine = ${fields.cuisine ?? existing.cuisine},
      key_ingredients = ${JSON.stringify(fields.key_ingredients ?? existing.key_ingredients)}::jsonb,
      full_recipe_json = ${clearRecipe ? null : fields.full_recipe_json !== undefined ? JSON.stringify(fields.full_recipe_json) : existing.full_recipe_json},
      full_recipe_generated_at = ${clearRecipe ? null : existing.full_recipe_generated_at},
      status = ${fields.status ?? existing.status},
      notes = ${fields.notes !== undefined ? fields.notes : existing.notes},
      updated_at = now()
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}

export async function listSlotsForDate(
  tenantId: string,
  userId: string,
  date: string,
): Promise<MealSlotRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM meal_slots
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      AND slot_date = ${date}
      AND status = 'planned'
    ORDER BY meal_type ASC, slot_index ASC
  `;
  return asRows<Record<string, unknown>>(rows).map(slotFromRow);
}

export async function markSlotCooked(
  slotId: number,
  tenantId: string,
  userId: string,
): Promise<MealSlotRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE meal_slots SET status = 'cooked', cooked_at = now(), updated_at = now()
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}

export async function markSlotSkipped(
  slotId: number,
  tenantId: string,
  userId: string,
  reason?: string,
): Promise<MealSlotRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE meal_slots SET
      status = 'skipped',
      skipped_at = now(),
      notes = COALESCE(${reason ?? null}, notes),
      updated_at = now()
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}

export async function savePantrySnapshot(
  planId: number,
  pantryItems: unknown[],
  expiringItems: unknown[],
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    INSERT INTO meal_plan_pantry_snapshot (meal_plan_id, pantry_items, expiring_items)
    VALUES (
      ${planId},
      ${JSON.stringify(pantryItems)}::jsonb,
      ${JSON.stringify(expiringItems)}::jsonb
    )
    ON CONFLICT (meal_plan_id) DO UPDATE SET
      pantry_items = EXCLUDED.pantry_items,
      expiring_items = EXCLUDED.expiring_items
  `;
}

export async function getPantrySnapshot(
  planId: number,
): Promise<{ pantry_items: unknown[]; expiring_items: unknown[] } | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT pantry_items, expiring_items FROM meal_plan_pantry_snapshot
    WHERE meal_plan_id = ${planId}
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  return {
    pantry_items: parseJson(row.pantry_items, []),
    expiring_items: parseJson(row.expiring_items, []),
  };
}

export async function deleteAllMealPlanning(
  tenantId: string,
  userId: string,
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = await sql`
    DELETE FROM meal_plans
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length;
}

export async function updateGenerationProgress(
  planId: number,
  tenantId: string,
  userId: string,
  progress: GenerationProgress,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    UPDATE meal_plans SET
      generation_progress = ${JSON.stringify(progress)}::jsonb,
      updated_at = now()
    WHERE id = ${planId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export async function deleteSlotsForPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    DELETE FROM meal_slots
    WHERE meal_plan_id = ${planId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
  `;
}

export async function swapMealSlot(
  slotId: number,
  tenantId: string,
  userId: string,
  newData: {
    dish_title: string;
    cuisine?: string | null;
    estimated_time_min?: number | null;
    effort_level?: string | null;
    key_ingredients: KeyIngredient[];
    estimated_cost?: number | null;
    tags?: string[];
    rationale?: string | null;
  },
): Promise<MealSlotRow | null> {
  const existing = await getMealSlot(slotId, tenantId, userId);
  if (!existing || existing.status === "swapped_out") return null;
  const sql = getSql();
  if (!sql) return null;

  await sql`
    UPDATE meal_slots SET status = 'swapped_out', updated_at = now()
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;

  const rows = await sql`
    INSERT INTO meal_slots (
      meal_plan_id, tenant_id, user_id, slot_date, meal_type, slot_index,
      dish_title, cuisine, estimated_time_min, effort_level, key_ingredients,
      estimated_cost, tags, rationale, status
    ) VALUES (
      ${existing.meal_plan_id}, ${tenantId}, ${userId}, ${existing.slot_date},
      ${existing.meal_type}, ${existing.slot_index}, ${newData.dish_title},
      ${newData.cuisine ?? null}, ${newData.estimated_time_min ?? null},
      ${newData.effort_level ?? null},
      ${JSON.stringify(newData.key_ingredients)}::jsonb,
      ${newData.estimated_cost ?? null},
      ${JSON.stringify(newData.tags ?? [])}::jsonb,
      ${newData.rationale ?? null}, 'planned'
    )
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}

export async function saveSlotFullRecipe(
  slotId: number,
  tenantId: string,
  userId: string,
  recipe: Record<string, unknown>,
): Promise<MealSlotRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    UPDATE meal_slots SET
      full_recipe_json = ${JSON.stringify(recipe)}::jsonb,
      full_recipe_generated_at = now(),
      updated_at = now()
    WHERE id = ${slotId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? slotFromRow(row) : null;
}
