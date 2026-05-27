/** MP-1 meal planning domain types */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type EffortLevel = "quick" | "medium" | "serious";
export type IngredientUrgency = "urgent" | "soon" | "normal" | "none";
export type ViolationSeverity = "critical" | "warning";
export type PlanStatus = "draft" | "active" | "completed" | "abandoned" | "archived";
export type SlotStatus = "planned" | "swapped_out" | "cooked" | "skipped";

export type MealPattern = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snack?: boolean;
};

export type KeyIngredient = {
  item_key: string;
  display_name: string;
  approx_quantity: number | null;
  approx_unit: string | null;
  from_pantry: boolean;
  urgency: IngredientUrgency;
};

export type MealPlanConstraints = {
  start_date: string;
  end_date: string;
  meal_pattern: MealPattern;
  budget_total_twd?: number | null;
  weekday_max_time_min?: number;
  weekend_max_time_min?: number;
  max_same_cuisine_in_row?: number;
  max_same_protein_in_row?: number;
  prioritize_pantry?: boolean;
  prioritize_expiring?: boolean;
  target_household_member_ids?: number[];
  allow_leftover_repurposing?: boolean;
  batch_cooking_preferred?: boolean;
};

export type CandidateSlot = {
  slot_date: string;
  meal_type: MealType;
  slot_index: number;
  dish_title: string;
  cuisine?: string | null;
  estimated_time_min?: number | null;
  effort_level?: EffortLevel | null;
  key_ingredients: KeyIngredient[];
  estimated_cost?: number | null;
  tags?: string[];
  rationale?: string | null;
};

export type ConstraintViolation = {
  code: string;
  severity: ViolationSeverity;
  affected_slots: number[];
  message: string;
};

export type AggregatedIngredient = {
  item_key: string;
  display_name: string;
  net_quantity: number | null;
  unit: string | null;
  vague: boolean;
};

export const DEFAULT_MEAL_PATTERN: MealPattern = {
  breakfast: false,
  lunch: true,
  dinner: true,
};
