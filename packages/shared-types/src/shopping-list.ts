import { z } from "zod";

export const CreateShoppingListSchema = z.object({
  meal_plan_id: z.number().int().positive().optional(),
  name: z.string().max(200).optional(),
});
export type CreateShoppingList = z.infer<typeof CreateShoppingListSchema>;

export const AddShoppingItemSchema = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: z.union([z.string(), z.number()]).optional(),
  raw_unit: z.string().max(32).optional(),
  section: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
});
export type AddShoppingItem = z.infer<typeof AddShoppingItemSchema>;

export const CompleteShoppingListSchema = z.object({
  actual_total_cost: z.number().nonnegative().optional(),
  include_unchecked: z.boolean().optional(),
});
export type CompleteShoppingList = z.infer<typeof CompleteShoppingListSchema>;

export const CheckShoppingItemSchema = z.object({
  checked: z.boolean().default(true),
});
export type CheckShoppingItem = z.infer<typeof CheckShoppingItemSchema>;

// --- Response contracts (serialized by lib/api/shopping-list-json) ---
// Lenient (passthrough): the serializer emits more fields than any single
// view consumes; only the fields the UI reads are declared explicitly.

export const ShoppingListItemSchema = z
  .object({
    id: z.number(),
    display_name: z.string(),
    quantity_display: z.string().nullable(),
    estimated_total_price: z.number().nullable().optional(),
    pantry_coverage_note: z.string().nullable().optional(),
    is_checked: z.boolean(),
    section: z.string(),
  })
  .passthrough();
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

export const ShoppingListProgressSchema = z.object({
  total: z.number(),
  checked: z.number(),
});

export const ShoppingListPayloadSchema = z
  .object({
    id: z.number(),
    name: z.string().nullable(),
    estimated_total_cost: z.number().nullable(),
    progress: ShoppingListProgressSchema,
    items: z.array(ShoppingListItemSchema),
  })
  .passthrough();
export type ShoppingListPayload = z.infer<typeof ShoppingListPayloadSchema>;

/** Response of GET/POST /api/me/shopping-lists[/active] (success case). */
export const ShoppingListResponseSchema = z.object({
  ok: z.boolean().optional(),
  list: ShoppingListPayloadSchema.nullable(),
});
export type ShoppingListResponse = z.infer<typeof ShoppingListResponseSchema>;

/** Public (share-token) payload — no id/cost, read-only view. */
export const SharedShoppingListPayloadSchema = z
  .object({
    name: z.string().nullable(),
    progress: ShoppingListProgressSchema,
    items: z.array(ShoppingListItemSchema),
  })
  .passthrough();
export type SharedShoppingListPayload = z.infer<
  typeof SharedShoppingListPayloadSchema
>;

/** Response of GET /api/shared/shopping-lists/[token] (success case). */
export const SharedShoppingListResponseSchema = z.object({
  ok: z.boolean().optional(),
  list: SharedShoppingListPayloadSchema,
});
export type SharedShoppingListResponse = z.infer<
  typeof SharedShoppingListResponseSchema
>;
