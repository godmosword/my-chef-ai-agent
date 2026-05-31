import { z } from "zod";

export const PublicRecipeSchema = z.object({
  title: z.string(),
  cuisine: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  hero_url: z.string().nullable().optional(),
  ingredients: z.array(z.unknown()),
  steps: z.array(z.unknown()),
  author_display: z.string(),
  view_count: z.number().int().nonnegative(),
  like_count: z.number().int().nonnegative(),
  published_at: z.string(),
  snapshot_version: z.number().int().positive(),
});
export type PublicRecipe = z.infer<typeof PublicRecipeSchema>;

export const ShareRecipeResponseSchema = z.object({
  share_token: z.string(),
  share_url: z.string().url(),
  published_at: z.string(),
});
export type ShareRecipeResponse = z.infer<typeof ShareRecipeResponseSchema>;

export const UserSettingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  font_scale: z.number().int().min(80).max(150),
  locale: z.string(),
  voice_enabled: z.boolean(),
  analytics_opt: z.boolean(),
  hero_auto_generate: z.boolean().default(true),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UpdateUserSettingsSchema = UserSettingsSchema.partial();
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;

export const SettingsResponseSchema = z.object({
  ok: z.literal(true),
  settings: UserSettingsSchema,
  db_configured: z.boolean(),
  recipe_count: z.number().int().nonnegative(),
  shared_count: z.number().int().nonnegative(),
});
export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const UpdateSettingsResponseSchema = z.object({
  ok: z.literal(true),
  settings: UserSettingsSchema,
});
export type UpdateSettingsResponse = z.infer<
  typeof UpdateSettingsResponseSchema
>;

export const DeleteAccountResponseSchema = z.object({
  ok: z.literal(true),
  deleted: z.boolean(),
});
export type DeleteAccountResponse = z.infer<
  typeof DeleteAccountResponseSchema
>;

export const CreateShareLinkResponseSchema = ShareRecipeResponseSchema.extend({
  ok: z.literal(true),
});
export type CreateShareLinkResponse = z.infer<
  typeof CreateShareLinkResponseSchema
>;

export const SharedRecipeLikeResponseSchema = z.object({
  like_count: z.number().int().nonnegative(),
  liked: z.boolean(),
});
export type SharedRecipeLikeResponse = z.infer<
  typeof SharedRecipeLikeResponseSchema
>;
