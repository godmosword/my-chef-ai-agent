/**
 * MP-1: Two-stage meal plan generation (candidate + validate/repair + persist).
 */
import {
  loadPersonalizationContext,
} from "@/application/personalization/personalization-context";
import { computeAggregatedIngredientNeeds } from "@/domain/meal-planning/aggregate-ingredients";
import { computePantryReuseScore } from "@/domain/meal-planning/pantry-reuse-score";
import { validatePlan } from "@/domain/meal-planning/validate-plan";
import type {
  CandidateSlot,
  ConstraintViolation,
  MealPlanConstraints,
} from "@/domain/meal-planning/types";
import {
  mealPlanDefaultBudgetTwd,
  mealPlanMaxRepairIterations,
} from "@/platform/config/meal-planning-config";
import { defaultExpiryWarnDays } from "@/platform/config/notification-config";
import { findExpiringSoon, listPantryItems } from "@/platform/db/pantry";
import {
  getTasteProfile,
  listHouseholdMembers,
} from "@/platform/db/personalization";
import {
  activateMealPlan,
  bulkInsertMealSlots,
  createMealPlan,
  savePantrySnapshot,
  updateMealPlanMeta,
} from "@/platform/db/meal-planning";
import {
  recordMealPlanGeneration,
  recordMealPlanRepairIterations,
  recordMealPlanReuseScore,
  recordMealPlanViolation,
} from "@/platform/observability/meal-planning-metrics";
import { generateCandidatePlan } from "./generate-candidate-plan";

export type PlanGenerationRequest = {
  tenant_id: string;
  user_id: string;
  constraints: MealPlanConstraints;
  activate?: boolean;
};

export type PlanGenerationResult = {
  plan_id: number;
  warnings: string[];
  validation_iterations: number;
  pantry_reuse_score: number;
  diagnostic: Record<string, unknown>;
};

function violationMessages(violations: ConstraintViolation[]): string[] {
  return violations
    .filter((v) => v.severity === "warning" || v.severity === "critical")
    .map((v) => v.message);
}

async function buildValidationContext(
  tenantId: string,
  userId: string,
  constraints: MealPlanConstraints,
) {
  const [personalization, profile, members] = await Promise.all([
    loadPersonalizationContext(tenantId, userId),
    getTasteProfile(tenantId, userId),
    listHouseholdMembers(tenantId, userId),
  ]);

  const householdAllergies = members.flatMap((m) => m.allergies);
  const dietaryRestrictions = [
    ...(profile?.dietary_restrictions ?? []),
    ...members.flatMap((m) => m.dietary_restrictions),
  ];

  return {
    constraints: {
      ...constraints,
      budget_total_twd:
        constraints.budget_total_twd ?? mealPlanDefaultBudgetTwd(),
    },
    personalization,
    userAllergies: profile?.allergies ?? [],
    householdAllergies,
    dietaryRestrictions,
  };
}

async function generateWithRepair(
  tenantId: string,
  userId: string,
  constraints: MealPlanConstraints,
  pantryItems: Awaited<ReturnType<typeof listPantryItems>>,
  expiringItems: Awaited<ReturnType<typeof findExpiringSoon>>,
  recentlyEaten: string[],
): Promise<{
  slots: CandidateSlot[];
  violations: ConstraintViolation[];
  iterations: number;
}> {
  const ctx = await buildValidationContext(tenantId, userId, constraints);
  const maxIter = mealPlanMaxRepairIterations();

  let plan = (
    await generateCandidatePlan(
      tenantId,
      userId,
      constraints,
      pantryItems,
      expiringItems,
      recentlyEaten,
    )
  ).slots;

  let iterations = 0;
  let violations = validatePlan(plan, ctx);

  while (iterations < maxIter) {
    const critical = violations.filter((v) => v.severity === "critical");
    if (!critical.length) break;

    const repairMsgs = critical.map(
      (v) => `[${v.code}] ${v.message} slots=${v.affected_slots.join(",")}`,
    );
    plan = (
      await generateCandidatePlan(
        tenantId,
        userId,
        constraints,
        pantryItems,
        expiringItems,
        recentlyEaten,
        repairMsgs,
        plan,
      )
    ).slots;
    iterations += 1;
    violations = validatePlan(plan, ctx);
  }

  return { slots: plan, violations, iterations };
}

export async function generateMealPlan(
  req: PlanGenerationRequest,
): Promise<PlanGenerationResult> {
  const start = Date.now();
  const { tenant_id, user_id, constraints } = req;

  const budgetConstraints: MealPlanConstraints = {
    ...constraints,
    budget_total_twd:
      constraints.budget_total_twd ?? mealPlanDefaultBudgetTwd(),
  };

  const warnDays = defaultExpiryWarnDays();
  const [pantryItems, expiringRaw, profile, personalization] = await Promise.all([
    listPantryItems(tenant_id, user_id, {
      include_expired: false,
      min_confidence: 0.5,
    }),
    findExpiringSoon(tenant_id, user_id, { days_ahead: warnDays }),
    getTasteProfile(tenant_id, user_id),
    loadPersonalizationContext(tenant_id, user_id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const expiringItems = expiringRaw.filter(
    (i) => i.expires_at && i.expires_at >= today,
  );

  const recentlyEaten = [
    ...(profile?.regenerated_dishes ?? []).slice(0, 30).map((d) => d.name),
    ...personalization.recent_dishes_to_avoid,
  ];

  const planRow = await createMealPlan(tenant_id, user_id, {
    start_date: constraints.start_date,
    end_date: constraints.end_date,
    meal_pattern: constraints.meal_pattern,
    constraints: budgetConstraints,
    target_household_member_ids:
      constraints.target_household_member_ids ?? [],
    name: `${constraints.start_date} ~ ${constraints.end_date} 本週菜單`,
    status: "draft",
  });

  if (!planRow) {
    recordMealPlanGeneration("llm_error", Date.now() - start, 0);
    throw new Error("Failed to create meal plan");
  }

  try {
    const { slots, violations, iterations } = await generateWithRepair(
      tenant_id,
      user_id,
      budgetConstraints,
      pantryItems,
      expiringItems,
      recentlyEaten,
    );

    for (const v of violations) {
      recordMealPlanViolation(v.code, v.severity);
    }
    recordMealPlanRepairIterations(iterations);

    const reuseScore = computePantryReuseScore(slots, pantryItems);
    recordMealPlanReuseScore(reuseScore);

    const totalCost = slots.reduce((s, sl) => s + (sl.estimated_cost ?? 0), 0);
    const aggregated = computeAggregatedIngredientNeeds(slots, pantryItems);

    await bulkInsertMealSlots(
      planRow.id,
      tenant_id,
      user_id,
      slots.map((s) => ({
        slot_date: s.slot_date,
        meal_type: s.meal_type,
        slot_index: s.slot_index,
        dish_title: s.dish_title,
        cuisine: s.cuisine ?? null,
        estimated_time_min: s.estimated_time_min ?? null,
        effort_level: s.effort_level ?? null,
        key_ingredients: s.key_ingredients,
        estimated_cost: s.estimated_cost ?? null,
        tags: s.tags ?? [],
        rationale: s.rationale ?? null,
        notes: null,
      })),
    );

    await savePantrySnapshot(
      planRow.id,
      pantryItems.map((p) => ({
        item_key: p.item_key,
        display_name: p.display_name,
        quantity: p.quantity,
        unit: p.unit,
        expires_at: p.expires_at,
      })),
      expiringItems.map((p) => ({
        item_key: p.item_key,
        display_name: p.display_name,
        expires_at: p.expires_at,
      })),
    );

    await updateMealPlanMeta(planRow.id, tenant_id, user_id, {
      total_estimated_cost: totalCost,
      pantry_reuse_score: reuseScore,
    });

    if (req.activate) {
      await activateMealPlan(planRow.id, tenant_id, user_id);
    }

    try {
      const { ensureShoppingListForPlan } = await import(
        "@/application/shopping-list/shopping-list-service"
      );
      await ensureShoppingListForPlan(planRow.id, tenant_id, user_id);
    } catch (shopErr) {
      console.error("[meal-planner] shopping list bootstrap failed", {
        planId: planRow.id,
        message: shopErr instanceof Error ? shopErr.message : String(shopErr),
      });
    }

    const criticalLeft = violations.filter((v) => v.severity === "critical");
    const resultKind =
      criticalLeft.length > 0
        ? "partial"
        : violations.some((v) => v.severity === "warning")
          ? "partial"
          : "ok";

    recordMealPlanGeneration(
      resultKind,
      Date.now() - start,
      slots.length,
    );

    const warnings = violationMessages(violations);
    if (!pantryItems.length) {
      warnings.push("冰箱為空，多數食材需採買");
    }

    return {
      plan_id: planRow.id,
      warnings,
      validation_iterations: iterations,
      pantry_reuse_score: reuseScore,
      diagnostic: {
        slot_count: slots.length,
        aggregated_ingredient_count: aggregated.length,
        critical_violations: criticalLeft.length,
      },
    };
  } catch (err) {
    recordMealPlanGeneration("llm_error", Date.now() - start, 0);
    throw err;
  }
}
