import { z } from "zod";

export const PatchDietaryPreferencesSchema = z.object({
  tags: z.array(z.string()).optional(),
  avoid_custom: z.string().max(500).optional(),
});
export type PatchDietaryPreferences = z.infer<
  typeof PatchDietaryPreferencesSchema
>;

export const DietaryPreferencesSchema = z.object({
  tags: z.array(z.string()).default([]),
  avoid_custom: z.string().default(""),
});
export type DietaryPreferencesPayload = z.infer<
  typeof DietaryPreferencesSchema
>;

/** Response of GET /api/me/dietary-preferences (success case). */
export const DietaryPreferencesResponseSchema = z.object({
  ok: z.boolean().optional(),
  preferences: DietaryPreferencesSchema,
});
export type DietaryPreferencesResponse = z.infer<
  typeof DietaryPreferencesResponseSchema
>;
