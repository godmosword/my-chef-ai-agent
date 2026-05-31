import {
  IngredientSchema,
  KitchenTalkLineSchema,
  RecipePayloadSchema,
  ShoppingItemSchema,
  StepSchema,
} from "@chef/shared-types";
import { z } from "zod";

/** LLM output shape — extends shared RecipePayload with optional personalization note. */
export const AiRecipePayloadSchema = RecipePayloadSchema.extend({
  personalization_note: z.string().max(60).optional(),
  kitchen_talk: z.array(KitchenTalkLineSchema).optional(),
  ingredients: z.array(IngredientSchema).optional(),
  steps: z.array(StepSchema).optional(),
  shopping_list: z.array(ShoppingItemSchema).optional(),
});

export type AiRecipePayload = z.infer<typeof AiRecipePayloadSchema>;

export function parseAiRecipeJson(raw: string): AiRecipePayload {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  let json: unknown;
  try {
    json = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new Error("Invalid JSON in model output");
  }
  const parsed = AiRecipePayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid recipe JSON shape");
  }
  if (!parsed.data.recipe_name?.trim()) {
    throw new Error("Missing recipe_name in JSON");
  }
  return parsed.data;
}
