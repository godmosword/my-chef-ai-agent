import { z } from "zod";
import type { EnrichedPantryInput } from "@/domain/pantry/vision/review-types";
import { PANTRY_CATEGORIES } from "@/domain/pantry/pantry-types";

const pantryLocationSchema = z.enum([
  "fridge_main",
  "fridge_door",
  "freezer",
  "pantry",
  "counter",
  "other",
]);
const pantryCategorySchema = z.enum(PANTRY_CATEGORIES);

const quantitySchema = z.union([z.string(), z.number()]).nullable().optional();

const pantryItemInputSchema = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: quantitySchema,
  raw_unit: z.string().max(32).nullable().optional(),
  expires_at: z.string().max(32).nullable().optional(),
  location: pantryLocationSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const UpdatePantryItemSchema = z
  .object({
    raw_name: z.string().min(1).max(200).optional(),
    raw_quantity: quantitySchema,
    raw_unit: z.string().max(32).nullable().optional(),
    expires_at: z.string().max(32).nullable().optional(),
    location: pantryLocationSchema.optional(),
    notes: z.string().max(500).nullable().optional(),
    category: pantryCategorySchema.optional(),
  })
  .strict();

export const BulkAddPantrySchema = z.object({
  items: z.array(pantryItemInputSchema).min(1).max(100),
});

export const AddPantryItemSchema = pantryItemInputSchema;

export const PantryAnnotateSchema = z.object({
  ingredients: z
    .array(z.union([z.string(), z.object({ name: z.string().optional() })]))
    .max(100)
    .default([]),
});

export const PantryConsumeSchema = z
  .object({
    full: z.boolean().optional(),
    amount: z.number().positive().optional(),
    unit: z.string().max(32).optional(),
  })
  .refine((d) => d.full === true || d.amount != null, {
    message: "amount or full required",
  });

export const PantryManualTextSchema = z.object({
  text: z.string().min(1).max(4000),
});

const enrichedItemSchema: z.ZodType<EnrichedPantryInput> = z.object({
  raw_name: z.string().min(1).max(200),
  raw_quantity: quantitySchema,
  raw_unit: z.string().max(32).nullable().optional(),
  expires_at: z.string().max(32).nullable().optional(),
  purchased_at: z.string().max(32).nullable().optional(),
  location: pantryLocationSchema.optional(),
  source: z
    .enum([
      "manual",
      "photo",
      "receipt",
      "recipe_consumed",
      "shopping_list_completed",
      "auto",
    ])
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  item_key: z.string().max(128).optional(),
  display_name: z.string().max(200).optional(),
  category: z.union([pantryCategorySchema, z.string().max(64)]).optional(),
  recognition_confidence: z.number().min(0).max(1).optional(),
  user_edited: z.boolean().optional(),
  selected: z.boolean().optional(),
  unit_price: z.number().nullable().optional(),
  is_likely_food: z.boolean().optional(),
  quantity_text: z.string().max(64).optional(),
});

export const PantryReviewPatchSchema = z
  .object({
    items: z.array(enrichedItemSchema).optional(),
    toggle_index: z.number().int().nonnegative().optional(),
    remove_index: z.number().int().nonnegative().optional(),
    edit_index: z.number().int().nonnegative().optional(),
    edit_text: z.string().max(200).optional(),
  })
  .strict();

export const UseItUpBodySchema = z.object({
  priority_item_ids: z.array(z.number().int().positive()).optional(),
  max_suggestions: z.number().int().min(1).max(5).optional(),
  expand_suggestion_id: z.string().uuid().optional(),
});
