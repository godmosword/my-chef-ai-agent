import { z } from "zod";

export const CreateShoppingListSchema = z.object({
  meal_plan_id: z.number().int().positive().optional(),
  name: z.string().max(200).optional(),
});

export const AddShoppingItemSchema = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: z.union([z.string(), z.number()]).optional(),
  raw_unit: z.string().max(32).optional(),
  section: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
});

export const CompleteShoppingListSchema = z.object({
  actual_total_cost: z.number().nonnegative().optional(),
  include_unchecked: z.boolean().optional(),
});

export const CheckShoppingItemSchema = z.object({
  checked: z.boolean().default(true),
});
