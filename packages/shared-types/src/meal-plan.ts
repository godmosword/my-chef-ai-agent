import { z } from "zod";

export const SlotEnum = z.enum(["breakfast", "lunch", "dinner"]);
export type Slot = z.infer<typeof SlotEnum>;

export const MEAL_SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

export const ShoppingCategoryEnum = z.enum([
  "produce",
  "protein",
  "dairy",
  "pantry",
  "spice",
  "other",
]);
export type ShoppingCategory = z.infer<typeof ShoppingCategoryEnum>;

export const MealPlanSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: SlotEnum,
  filled: z.boolean(),
  id: z.string().uuid().optional(),
  recipe: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      hero_url: z.string().nullable(),
      cuisine: z.string().nullable(),
    })
    .optional(),
  version_no: z.number().int().positive().optional(),
  servings: z.number().int().min(1).max(20).optional(),
  notes: z.string().nullable().optional(),
});
export type MealPlanSlot = z.infer<typeof MealPlanSlotSchema>;

export const WeekPlanSchema = z.object({
  week_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(MealPlanSlotSchema),
});
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

export const ShoppingSourceSchema = z.object({
  date: z.string(),
  slot: SlotEnum,
  recipe_title: z.string(),
  servings: z.number().int(),
});
export type ShoppingSource = z.infer<typeof ShoppingSourceSchema>;

export const AggregatedShoppingItemSchema = z.object({
  name: z.string(),
  amount: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  category: ShoppingCategoryEnum,
  sources: z.array(ShoppingSourceSchema),
});
export type AggregatedShoppingItem = z.infer<typeof AggregatedShoppingItemSchema>;

export const AggregatedShoppingListSchema = z.object({
  week_of: z.string(),
  items: z.array(AggregatedShoppingItemSchema),
  groups: z.record(ShoppingCategoryEnum, z.array(AggregatedShoppingItemSchema)),
});
export type AggregatedShoppingList = z.infer<typeof AggregatedShoppingListSchema>;

export const PutMealPlanSlotSchema = z.object({
  recipe_id: z.string().uuid().nullable(),
  servings: z.number().int().min(1).max(20).optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type PutMealPlanSlot = z.infer<typeof PutMealPlanSlotSchema>;
