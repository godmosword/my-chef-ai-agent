import { z } from "zod";

export const ProfileResponseSchema = z.object({
  ok: z.literal(true),
  db_configured: z.boolean(),
  recipe_count: z.number().int().nonnegative(),
  shared_count: z.number().int().nonnegative(),
  favorites_count: z.number().int().nonnegative(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  first_recipe_at: z.string().nullable(),
  last_recipe_at: z.string().nullable(),
});
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
