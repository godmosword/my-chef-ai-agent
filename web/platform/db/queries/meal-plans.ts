import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { MealPlanSlot, PutMealPlanSlot, Slot, WeekPlan } from "@chef/shared-types";
import { MEAL_SLOTS } from "@chef/shared-types";
import { addDaysIso, floorToWeekMonday, weekDates } from "@/domain/calendar/week";
import { getDb } from "../drizzle";
import { mealCalendarEntries, recipeVersions, recipes } from "../schema";

type PlanRow = typeof mealCalendarEntries.$inferSelect;

function slotKey(date: string, slot: Slot): string {
  return `${date}|${slot}`;
}

function rowToSlot(
  date: string,
  slot: Slot,
  row: PlanRow | undefined,
  recipeMeta?: {
    id: string;
    title: string;
    hero_url: string | null;
    cuisine: string | null;
    version_no: number;
  } | null,
): MealPlanSlot {
  if (!row?.recipeId || !recipeMeta) {
    return { date, slot, filled: false };
  }
  return {
    date,
    slot,
    filled: true,
    id: row.id,
    recipe: {
      id: recipeMeta.id,
      title: recipeMeta.title,
      hero_url: recipeMeta.hero_url,
      cuisine: recipeMeta.cuisine,
    },
    version_no: recipeMeta.version_no,
    servings: row.servings,
    notes: row.notes,
  };
}

export async function getWeekPlan(
  userId: string,
  tenantId: string,
  weekOfInput: string,
): Promise<WeekPlan> {
  const week_of = floorToWeekMonday(weekOfInput);
  const dates = weekDates(week_of);
  const endExclusive = addDaysIso(week_of, 7);

  const db = getDb();
  if (!db) {
    const slots: MealPlanSlot[] = [];
    for (const date of dates) {
      for (const slot of MEAL_SLOTS) {
        slots.push({ date, slot, filled: false });
      }
    }
    return { week_of, slots };
  }

  const rows = await db
    .select()
    .from(mealCalendarEntries)
    .where(
      and(
        eq(mealCalendarEntries.userId, userId),
        eq(mealCalendarEntries.tenantId, tenantId),
        gte(mealCalendarEntries.planDate, week_of),
        lt(mealCalendarEntries.planDate, endExclusive),
      ),
    );

  const recipeIds = [
    ...new Set(rows.map((r) => r.recipeId).filter((id): id is string => Boolean(id))),
  ];

  const recipeMap = new Map<
    string,
    { id: string; title: string; hero_url: string | null; cuisine: string | null }
  >();
  const versionMap = new Map<string, number>();

  if (recipeIds.length) {
    const recipeRows = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        heroUrl: recipes.heroUrl,
        cuisine: recipes.cuisine,
        latestVersionId: recipes.latestVersionId,
      })
      .from(recipes)
      .where(inArray(recipes.id, recipeIds));

    for (const r of recipeRows) {
      recipeMap.set(r.id, {
        id: r.id,
        title: r.title,
        hero_url: r.heroUrl,
        cuisine: r.cuisine,
      });
    }

    const versionIds = rows
      .map((r) => r.recipeVersionId)
      .filter((id): id is string => Boolean(id));
    if (versionIds.length) {
      const versions = await db
        .select({ id: recipeVersions.id, versionNo: recipeVersions.versionNo })
        .from(recipeVersions)
        .where(inArray(recipeVersions.id, versionIds));
      for (const v of versions) {
        versionMap.set(v.id, v.versionNo);
      }
    }
  }

  const byKey = new Map<string, PlanRow>();
  for (const row of rows) {
    byKey.set(slotKey(String(row.planDate), row.slot as Slot), row);
  }

  const slots: MealPlanSlot[] = [];
  for (const date of dates) {
    for (const slot of MEAL_SLOTS) {
      const row = byKey.get(slotKey(date, slot));
      let meta: {
        id: string;
        title: string;
        hero_url: string | null;
        cuisine: string | null;
        version_no: number;
      } | null = null;
      if (row?.recipeId) {
        const base = recipeMap.get(row.recipeId);
        if (base) {
          meta = {
            ...base,
            version_no: row.recipeVersionId
              ? (versionMap.get(row.recipeVersionId) ?? 1)
              : 1,
          };
        }
      }
      slots.push(rowToSlot(date, slot, row, meta));
    }
  }

  return { week_of, slots };
}

export async function upsertMealPlanSlot(
  userId: string,
  tenantId: string,
  planDate: string,
  slot: Slot,
  body: PutMealPlanSlot,
): Promise<MealPlanSlot | null> {
  const db = getDb();
  if (!db) return null;

  if (body.recipe_id === null) {
    await db
      .delete(mealCalendarEntries)
      .where(
        and(
          eq(mealCalendarEntries.userId, userId),
          eq(mealCalendarEntries.tenantId, tenantId),
          eq(mealCalendarEntries.planDate, planDate),
          eq(mealCalendarEntries.slot, slot),
        ),
      );
    return { date: planDate, slot, filled: false };
  }

  const [recipe] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      heroUrl: recipes.heroUrl,
      cuisine: recipes.cuisine,
      latestVersionId: recipes.latestVersionId,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, body.recipe_id),
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!recipe?.latestVersionId) return null;

  const [version] = await db
    .select({ id: recipeVersions.id, versionNo: recipeVersions.versionNo })
    .from(recipeVersions)
    .where(eq(recipeVersions.id, recipe.latestVersionId))
    .limit(1);

  if (!version) return null;

  const servings = body.servings ?? 2;
  const notes = body.notes ?? null;

  const [existing] = await db
    .select({ id: mealCalendarEntries.id })
    .from(mealCalendarEntries)
    .where(
      and(
        eq(mealCalendarEntries.userId, userId),
        eq(mealCalendarEntries.tenantId, tenantId),
        eq(mealCalendarEntries.planDate, planDate),
        eq(mealCalendarEntries.slot, slot),
      ),
    )
    .limit(1);

  let planId: string;
  if (existing) {
    const [updated] = await db
      .update(mealCalendarEntries)
      .set({
        recipeId: recipe.id,
        recipeVersionId: version.id,
        servings,
        notes,
      })
      .where(eq(mealCalendarEntries.id, existing.id))
      .returning();
    planId = updated.id;
  } else {
    const [inserted] = await db
      .insert(mealCalendarEntries)
      .values({
        userId,
        tenantId,
        planDate,
        slot,
        recipeId: recipe.id,
        recipeVersionId: version.id,
        servings,
        notes,
      })
      .returning();
    planId = inserted.id;
  }

  return {
    date: planDate,
    slot,
    filled: true,
    id: planId,
    recipe: {
      id: recipe.id,
      title: recipe.title,
      hero_url: recipe.heroUrl,
      cuisine: recipe.cuisine,
    },
    version_no: version.versionNo,
    servings,
    notes,
  };
}

export type PlanWithVersion = {
  planDate: string;
  slot: Slot;
  servings: number;
  recipeTitle: string;
  shoppingList: unknown[];
};

export async function listPlansWithShoppingForWeek(
  userId: string,
  tenantId: string,
  weekOf: string,
): Promise<PlanWithVersion[]> {
  const db = getDb();
  if (!db) return [];

  const week_of = floorToWeekMonday(weekOf);
  const endExclusive = addDaysIso(week_of, 7);

  const rows = await db
    .select({
      planDate: mealCalendarEntries.planDate,
      slot: mealCalendarEntries.slot,
      servings: mealCalendarEntries.servings,
      recipeTitle: recipes.title,
      shoppingList: recipeVersions.shoppingList,
    })
    .from(mealCalendarEntries)
    .innerJoin(recipes, eq(mealCalendarEntries.recipeId, recipes.id))
    .innerJoin(
      recipeVersions,
      eq(mealCalendarEntries.recipeVersionId, recipeVersions.id),
    )
    .where(
      and(
        eq(mealCalendarEntries.userId, userId),
        eq(mealCalendarEntries.tenantId, tenantId),
        gte(mealCalendarEntries.planDate, week_of),
        lt(mealCalendarEntries.planDate, endExclusive),
      ),
    );

  return rows.map((r) => ({
    planDate: String(r.planDate),
    slot: r.slot as Slot,
    servings: r.servings,
    recipeTitle: r.recipeTitle,
    shoppingList: (r.shoppingList as unknown[]) ?? [],
  }));
}
