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

export const HeroStatusSchema = z.enum([
  "pending",
  "generating",
  "ready",
  "failed",
  "skipped",
]);
export type HeroStatus = z.infer<typeof HeroStatusSchema>;

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  title: z.string(),
  cuisine: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  hero_url: z.string().nullable().optional(),
  hero_status: HeroStatusSchema.optional(),
  hero_error: z.string().nullable().optional(),
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
  hero_status: HeroStatusSchema.optional(),
  hero_error: z.string().nullable().optional(),
  cuisine: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(RecipeTagSchema).optional(),
  share_token: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  prep_minutes: z.number().int().nonnegative().optional(),
  cook_minutes: z.number().int().nonnegative().optional(),
  servings: z.number().int().positive().optional(),
});
export type RecipePayload = z.infer<typeof RecipePayloadSchema>;

export const GenerateRecipeRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  /** Tonight pantry (Wave 2): up to 5 items to use first. */
  pantry_items: z.array(z.string().min(1).max(40)).max(5).optional(),
  /** PT-3: 清冰箱 mode from DB pantry (system prompt block). */
  clean_fridge_mode: z.boolean().optional(),
  clean_fridge_items: z.array(z.string().min(1).max(80)).max(50).optional(),
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

export const ListRecipesResponseSchema = z.object({
  ok: z.literal(true),
  items: z.array(RecipeWithLatestVersionSchema),
  next_cursor: z.string().nullable(),
  db_configured: z.boolean(),
});
export type ListRecipesResponse = z.infer<typeof ListRecipesResponseSchema>;

export const GetRecipeResponseSchema = z.object({
  ok: z.literal(true),
  recipe: RecipePayloadSchema,
});
export type GetRecipeResponse = z.infer<typeof GetRecipeResponseSchema>;

export const FavoriteItemSchema = z.object({
  id: z.number().int(),
  recipe_id: z.string().optional(),
  recipe_name: z.string(),
  recipe_data: RecipePayloadSchema.optional(),
  created_at: z.string(),
});
export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;

export const ListFavoritesResponseSchema = z.object({
  ok: z.literal(true),
  items: z.array(FavoriteItemSchema),
  db_configured: z.boolean(),
});
export type ListFavoritesResponse = z.infer<
  typeof ListFavoritesResponseSchema
>;

export const AddFavoriteResponseSchema = z.object({
  ok: z.literal(true),
  saved: z.boolean(),
  recipe_id: z.string().optional(),
});
export type AddFavoriteResponse = z.infer<typeof AddFavoriteResponseSchema>;

export const RemoveFavoriteResponseSchema = z.object({
  ok: z.literal(true),
  deleted: z.boolean(),
});
export type RemoveFavoriteResponse = z.infer<
  typeof RemoveFavoriteResponseSchema
>;

export const RecordRecipeCookResponseSchema = z.object({
  ok: z.literal(true),
  updated: z.literal(true),
});
export type RecordRecipeCookResponse = z.infer<
  typeof RecordRecipeCookResponseSchema
>;

export const DeleteRecipeResponseSchema = z.object({
  ok: z.literal(true),
  deleted: z.literal(true),
});
export type DeleteRecipeResponse = z.infer<
  typeof DeleteRecipeResponseSchema
>;

export const QuotaBucketSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});
export type QuotaBucket = z.infer<typeof QuotaBucketSchema>;

export const QuotaResponseSchema = z.object({
  ok: z.literal(true),
  db_configured: z.boolean(),
  plan_key: z.string().optional(),
  limit: z.number().int().nonnegative().optional(),
  used: z.number().int().nonnegative().optional(),
  remaining: z.number().int().nonnegative().optional(),
  text: QuotaBucketSchema,
  image: QuotaBucketSchema,
});
export type QuotaResponse = z.infer<typeof QuotaResponseSchema>;

export const GenerateRecipeResponseSchema = z.object({
  ok: z.literal(true),
  recipe: RecipePayloadSchema,
  applied_personalization: z
    .object({
      hard_constraints_applied: z.array(z.string()),
      soft_preferences_applied: z.array(z.string()),
      household_considered: z.array(z.string()),
    })
    .nullable()
    .optional(),
  suggest_onboarding: z.boolean().optional(),
  quota: z
    .object({
      remaining: z.number().int().nonnegative(),
      limit: z.number().int().nonnegative(),
      used: z.number().int().nonnegative(),
      text: QuotaBucketSchema,
      image: QuotaBucketSchema,
    })
    .optional(),
});
export type GenerateRecipeResponse = z.infer<
  typeof GenerateRecipeResponseSchema
>;

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
