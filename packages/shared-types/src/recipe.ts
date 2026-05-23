import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().optional(),
  price: z.string().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  optional: z.boolean().optional(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const StepSchema = z.union([
  z.string().min(1),
  z.object({
    no: z.number().int().positive().optional(),
    text: z.string().min(1),
    timer_seconds: z.number().int().nonnegative().optional(),
    tip: z.string().optional(),
    image_hint: z.string().optional(),
  }),
]);
export type Step = z.infer<typeof StepSchema>;

export const ShoppingItemSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    amount: z.string().optional(),
    unit: z.string().optional(),
    category: z
      .enum(["produce", "protein", "dairy", "pantry", "spice", "other"])
      .optional(),
    note: z.string().optional(),
  }),
]);
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;

export const KitchenTalkLineSchema = z.object({
  role: z.string(),
  content: z.string(),
});
export type KitchenTalkLine = z.infer<typeof KitchenTalkLineSchema>;

export const CostEstimateSchema = z.union([
  z.string(),
  z.object({
    currency: z.string().default("TWD"),
    total_low: z.number().nonnegative().optional(),
    total_high: z.number().nonnegative().optional(),
    per_serving_low: z.number().nonnegative().optional(),
    per_serving_high: z.number().nonnegative().optional(),
    note: z.string().optional(),
  }),
]);
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

export const TagSourceSchema = z.enum(["user", "ai", "cuisine"]);
export type TagSource = z.infer<typeof TagSourceSchema>;

export const RecipeVersionSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  version_no: z.number().int().positive(),
  ingredients: z.array(z.unknown()),
  steps: z.array(z.unknown()),
  shopping_list: z.array(z.unknown()),
  kitchen_talk: z.string().nullable().optional(),
  cost_estimate: z.unknown().nullable().optional(),
  source_prompt: z.string(),
  diff_from_prompt: z.string().nullable().optional(),
  model_used: z.string().nullable().optional(),
  deep_research: z.boolean().optional(),
  created_at: z.string(),
});
export type RecipeVersion = z.infer<typeof RecipeVersionSchema>;

export const RecipeTagSchema = z.object({
  tag: z.string(),
  source: TagSourceSchema,
});
export type RecipeTag = z.infer<typeof RecipeTagSchema>;

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  title: z.string(),
  cuisine: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  hero_url: z.string().nullable().optional(),
  poster_url: z.string().nullable().optional(),
  latest_version_id: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  cook_count: z.number().int().nonnegative().optional(),
  last_cooked_at: z.string().nullable().optional(),
  tags: z.array(RecipeTagSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipeWithLatestVersionSchema = RecipeSchema.extend({
  latest_version: RecipeVersionSchema.nullable().optional(),
  version_no: z.number().int().positive().optional(),
});
export type RecipeWithLatestVersion = z.infer<typeof RecipeWithLatestVersionSchema>;

/** Legacy + library API response shape (flat recipe fields for ChatPanel). */
export const RecipePayloadSchema = z.object({
  id: z.string().uuid().optional(),
  version_no: z.number().int().positive().optional(),
  recipe_name: z.string().optional(),
  theme: z.string().optional(),
  kitchen_talk: z.array(KitchenTalkLineSchema).optional(),
  ingredients: z.array(z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
  shopping_list: z.array(z.unknown()).optional(),
  estimated_total_cost: z.string().optional(),
  photo_url: z.string().optional(),
  cuisine: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(RecipeTagSchema).optional(),
  share_token: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});
export type RecipePayload = z.infer<typeof RecipePayloadSchema>;

export const GenerateRecipeRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context_tags: z.array(z.string()).max(10).optional(),
  enable_deep_research: z.boolean().optional(),
});
export type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;

export const GenerateRecipeVersionRequestSchema = z.object({
  diff_prompt: z.string().min(1).max(1000),
  enable_deep_research: z.boolean().optional(),
});
export type GenerateRecipeVersionRequest = z.infer<
  typeof GenerateRecipeVersionRequestSchema
>;

export const ListRecipesQuerySchema = z.object({
  q: z.string().optional(),
  cuisine: z.string().optional(),
  tag: z.string().optional(),
  favorite_only: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type ListRecipesQuery = z.infer<typeof ListRecipesQuerySchema>;

export const AddTagRequestSchema = z.object({
  tag: z.string().min(1).max(64),
});
export type AddTagRequest = z.infer<typeof AddTagRequestSchema>;

export const FavoriteByRecipeIdSchema = z.object({
  recipe_id: z.string().uuid(),
});
export type FavoriteByRecipeId = z.infer<typeof FavoriteByRecipeIdSchema>;

export const LegacyFavoriteSchema = z.object({
  recipe_name: z.string().min(1).optional(),
  recipe_data: z.record(z.string(), z.unknown()).optional(),
});
export type LegacyFavorite = z.infer<typeof LegacyFavoriteSchema>;
