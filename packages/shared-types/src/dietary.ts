import { z } from "zod";

export const PatchDietaryPreferencesSchema = z.object({
  tags: z.array(z.string()).optional(),
  avoid_custom: z.string().max(500).optional(),
});
export type PatchDietaryPreferences = z.infer<
  typeof PatchDietaryPreferencesSchema
>;
