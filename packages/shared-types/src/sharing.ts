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
