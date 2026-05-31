import { z } from "zod";

export const PANTRY_CATEGORIES = [
  "vegetable",
  "fruit",
  "meat",
  "seafood",
  "egg_dairy",
  "grain",
  "bean_tofu",
  "seasoning",
  "oil",
  "sauce",
  "spice",
  "dry_goods",
  "frozen",
  "beverage",
  "snack",
  "other",
] as const;

export const PantryCategorySchema = z.enum(PANTRY_CATEGORIES);
const PantryLocationSchema = z.enum([
  "fridge_main",
  "fridge_door",
  "freezer",
  "pantry",
  "counter",
  "other",
]);
const PantrySourceSchema = z.enum([
  "manual",
  "photo",
  "receipt",
  "recipe_consumed",
  "shopping_list_completed",
  "auto",
]);
const QuantitySchema = z.union([z.string(), z.number()]).nullable().optional();

const PantryItemInputSchema = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: QuantitySchema,
  raw_unit: z.string().max(32).nullable().optional(),
  expires_at: z.string().max(32).nullable().optional(),
  location: PantryLocationSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const UpdatePantryItemSchema = z
  .object({
    raw_name: z.string().min(1).max(200).optional(),
    raw_quantity: QuantitySchema,
    raw_unit: z.string().max(32).nullable().optional(),
    expires_at: z.string().max(32).nullable().optional(),
    location: PantryLocationSchema.optional(),
    notes: z.string().max(500).nullable().optional(),
    category: PantryCategorySchema.optional(),
  })
  .strict();
export type UpdatePantryItem = z.infer<typeof UpdatePantryItemSchema>;

export const BulkAddPantrySchema = z.object({
  items: z.array(PantryItemInputSchema).min(1).max(100),
});
export type BulkAddPantry = z.infer<typeof BulkAddPantrySchema>;

export const AddPantryItemSchema = PantryItemInputSchema;
export type AddPantryItem = z.infer<typeof AddPantryItemSchema>;

export const PantryAnnotateSchema = z.object({
  ingredients: z
    .array(z.union([z.string(), z.object({ name: z.string().optional() })]))
    .max(100)
    .default([]),
});
export type PantryAnnotateRequest = z.infer<typeof PantryAnnotateSchema>;

export const PantryConsumeSchema = z
  .object({
    full: z.boolean().optional(),
    amount: z.number().positive().optional(),
    unit: z.string().max(32).optional(),
  })
  .refine((d) => d.full === true || d.amount != null, {
    message: "amount or full required",
  });
export type PantryConsume = z.infer<typeof PantryConsumeSchema>;

export const PantryManualTextSchema = z.object({
  text: z.string().min(1).max(4000),
});
export type PantryManualText = z.infer<typeof PantryManualTextSchema>;

export const EnrichedPantryInputSchema = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: QuantitySchema,
  raw_unit: z.string().max(32).nullable().optional(),
  expires_at: z.string().max(32).nullable().optional(),
  purchased_at: z.string().max(32).nullable().optional(),
  location: PantryLocationSchema.optional(),
  source: PantrySourceSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  item_key: z.string().max(128).optional(),
  display_name: z.string().max(200).optional(),
  category: z.union([PantryCategorySchema, z.string().max(64)]).optional(),
  recognition_confidence: z.number().min(0).max(1).optional(),
  user_edited: z.boolean().optional(),
  selected: z.boolean().optional(),
  unit_price: z.number().nullable().optional(),
  is_likely_food: z.boolean().optional(),
  quantity_text: z.string().max(64).optional(),
});
export type EnrichedPantryInput = z.infer<typeof EnrichedPantryInputSchema>;

export const PantryReviewPatchSchema = z
  .object({
    items: z.array(EnrichedPantryInputSchema).optional(),
    toggle_index: z.number().int().nonnegative().optional(),
    remove_index: z.number().int().nonnegative().optional(),
    edit_index: z.number().int().nonnegative().optional(),
    edit_text: z.string().max(200).optional(),
  })
  .strict();
export type PantryReviewPatch = z.infer<typeof PantryReviewPatchSchema>;

export const UseItUpBodySchema = z.object({
  priority_item_ids: z.array(z.number().int().positive()).optional(),
  max_suggestions: z.number().int().min(1).max(5).optional(),
  expand_suggestion_id: z.string().uuid().optional(),
});
export type UseItUpBody = z.infer<typeof UseItUpBodySchema>;

export const PantryDisplayItemSchema = z.object({
  id: z.number().int().nullable().optional(),
  item_key: z.string(),
  display_name: z.string(),
  category: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  quantity_text: z.string().nullable(),
  location: z.string(),
  expires_at: z.string().nullable(),
  confidence: z.number(),
  notes: z.string().nullable().optional(),
});

export const PantryListResponseSchema = z.object({
  items: z.array(PantryDisplayItemSchema),
  groups: z.array(z.unknown()).optional(),
});

/** Response of POST /api/me/pantry/annotate (success case). */
export const PantryAnnotateResponseSchema = z
  .object({
    ok: z.boolean().optional(),
    annotations: z
      .array(
        z
          .object({ name: z.string(), in_pantry: z.boolean() })
          .passthrough(),
      )
      .default([]),
    match_count: z.number(),
    total: z.number(),
  })
  .passthrough();
export type PantryAnnotateResponse = z.infer<
  typeof PantryAnnotateResponseSchema
>;

/** Response of GET /api/me/pantry/summary (success case). */
export const PantrySummaryResponseSchema = z
  .object({
    total_count: z.number(),
    expiring_count: z.number(),
    expired_count: z.number(),
    by_category: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();
export type PantrySummaryResponse = z.infer<
  typeof PantrySummaryResponseSchema
>;
