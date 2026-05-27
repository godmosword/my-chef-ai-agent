import type { PersonalizationBlock } from "@/application/personalization/personalization-context";
import { normalizeIngredientName } from "@/domain/pantry/pantry-normalization";
import { detectSlotProtein } from "./protein-detect";
import {
  enumerateExpectedSlots,
  isWeekendDate,
  slotKey,
} from "./slot-expectations";
import type {
  CandidateSlot,
  ConstraintViolation,
  MealPlanConstraints,
} from "./types";

const MEAT_KEYWORDS = ["肉", "雞", "豬", "牛", "魚", "蝦", "培根", "火腿", "鴨"];

function containsAny(text: string, terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term.toLowerCase()));
}

function slotIngredientText(slot: CandidateSlot): string {
  return [
    slot.dish_title,
    ...slot.key_ingredients.map((k) => k.display_name),
  ].join(" ");
}

export type ValidationContext = {
  constraints: MealPlanConstraints;
  personalization: PersonalizationBlock;
  userAllergies: string[];
  householdAllergies: string[];
  dietaryRestrictions: string[];
};

export function validatePlan(
  slots: CandidateSlot[],
  ctx: ValidationContext,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  violations.push(...checkAllergiesAndDiet(slots, ctx));
  violations.push(...checkBudget(slots, ctx.constraints));
  violations.push(...checkCuisineRepeat(slots, ctx.constraints));
  violations.push(...checkProteinRepeat(slots, ctx.constraints));
  violations.push(...checkTimeExceeded(slots, ctx.constraints));
  violations.push(...checkDuplicateDish(slots));
  violations.push(...checkSlotCompleteness(slots, ctx.constraints));
  return violations;
}

function checkAllergiesAndDiet(
  slots: CandidateSlot[],
  ctx: ValidationContext,
): ConstraintViolation[] {
  const out: ConstraintViolation[] = [];
  const allAllergyTerms = [
    ...ctx.userAllergies,
    ...ctx.householdAllergies,
  ];

  const isVegetarian = ctx.dietaryRestrictions.some(
    (d) => d === "vegetarian" || d === "vegan" || /素/.test(d),
  );
  const isVegan = ctx.dietaryRestrictions.includes("vegan");

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    const text = slotIngredientText(slot);
    for (const term of allAllergyTerms) {
      if (term && containsAny(text, [term])) {
        out.push({
          code: "allergy_violation",
          severity: "critical",
          affected_slots: [i],
          message: `第 ${i + 1} 道可能含過敏原`,
        });
        break;
      }
    }
    if ((isVegetarian || isVegan) && containsAny(text, MEAT_KEYWORDS)) {
      out.push({
        code: "dietary_violation",
        severity: "critical",
        affected_slots: [i],
        message: `第 ${i + 1} 道不符合飲食限制`,
      });
    }
    if (isVegan && containsAny(text, ["蛋", "奶", "乳", "起司", "芝士"])) {
      out.push({
        code: "dietary_violation",
        severity: "critical",
        affected_slots: [i],
        message: `第 ${i + 1} 道不符合全素限制`,
      });
    }
  }
  return out;
}

function checkBudget(
  slots: CandidateSlot[],
  constraints: MealPlanConstraints,
): ConstraintViolation[] {
  const budget = constraints.budget_total_twd;
  if (budget == null || budget <= 0) return [];
  const total = slots.reduce((s, sl) => s + (sl.estimated_cost ?? 0), 0);
  if (total <= budget * 1.1) return [];
  const overPct = (total - budget) / budget;
  return [
    {
      code: "budget_exceeded",
      severity: overPct > 0.25 ? "critical" : "warning",
      affected_slots: slots.map((_, i) => i),
      message: `預估總成本 NT$${total} 超過預算 NT$${budget}`,
    },
  ];
}

function checkCuisineRepeat(
  slots: CandidateSlot[],
  constraints: MealPlanConstraints,
): ConstraintViolation[] {
  const max = constraints.max_same_cuisine_in_row ?? 2;
  const out: ConstraintViolation[] = [];
  let run = 1;
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]!.cuisine ?? "";
    const cur = slots[i]!.cuisine ?? "";
    if (prev && cur && prev === cur) {
      run += 1;
      if (run > max) {
        out.push({
          code: "cuisine_repeat",
          severity: "warning",
          affected_slots: [i - max, i],
          message: `菜系「${cur}」連續超過 ${max} 餐`,
        });
      }
    } else {
      run = 1;
    }
  }
  return out;
}

function checkProteinRepeat(
  slots: CandidateSlot[],
  constraints: MealPlanConstraints,
): ConstraintViolation[] {
  const max = constraints.max_same_protein_in_row ?? 2;
  const proteins = slots.map((s) =>
    detectSlotProtein(
      s.dish_title,
      s.key_ingredients.map((k) => k.display_name),
    ),
  );
  const out: ConstraintViolation[] = [];
  let run = 1;
  let last: string | null = proteins[0] ?? null;
  for (let i = 1; i < proteins.length; i++) {
    const cur = proteins[i];
    if (cur && cur === last) {
      run += 1;
      if (run > max) {
        out.push({
          code: "protein_repeat",
          severity: "warning",
          affected_slots: [i - max, i],
          message: `蛋白質「${cur}」連續超過 ${max} 餐`,
        });
      }
    } else {
      run = 1;
      last = cur ?? null;
    }
  }
  return out;
}

function checkTimeExceeded(
  slots: CandidateSlot[],
  constraints: MealPlanConstraints,
): ConstraintViolation[] {
  const weekdayMax =
    constraints.weekday_max_time_min ?? 30;
  const weekendMax =
    constraints.weekend_max_time_min ?? 60;
  const out: ConstraintViolation[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    const t = slot.estimated_time_min;
    if (t == null) continue;
    const max = isWeekendDate(slot.slot_date) ? weekendMax : weekdayMax;
    if (t > max) {
      out.push({
        code: "time_exceeded",
        severity: "warning",
        affected_slots: [i],
        message: `「${slot.dish_title}」預估 ${t} 分鐘，超過上限 ${max} 分鐘`,
      });
    }
  }
  return out;
}

function checkDuplicateDish(slots: CandidateSlot[]): ConstraintViolation[] {
  const seen = new Map<string, number>();
  const out: ConstraintViolation[] = [];
  for (let i = 0; i < slots.length; i++) {
    const title = slots[i]!.dish_title.trim();
    const prev = seen.get(title);
    if (prev != null) {
      out.push({
        code: "duplicate_dish",
        severity: "critical",
        affected_slots: [prev, i],
        message: `重複菜名「${title}」`,
      });
    } else {
      seen.set(title, i);
    }
  }
  return out;
}

function checkSlotCompleteness(
  slots: CandidateSlot[],
  constraints: MealPlanConstraints,
): ConstraintViolation[] {
  const expected = enumerateExpectedSlots(
    constraints.start_date,
    constraints.end_date,
    constraints.meal_pattern,
  );
  const have = new Set(
    slots.map((s) => slotKey(s.slot_date, s.meal_type, s.slot_index)),
  );
  const missing = expected.filter(
    (e) => !have.has(slotKey(e.slot_date, e.meal_type, e.slot_index)),
  );
  if (!missing.length) return [];
  return [
    {
      code: "slot_incomplete",
      severity: "critical",
      affected_slots: [],
      message: `缺少 ${missing.length} 個餐次（預期 ${expected.length}，實際 ${slots.length}）`,
    },
  ];
}

/** Map LLM ingredient name to item_key for pantry matching */
export function ingredientNameToKey(name: string): string {
  const [key] = normalizeIngredientName(name);
  return key;
}
