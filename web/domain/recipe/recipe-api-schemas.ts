import { z } from "zod";

export const PatchRecipeMetaSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  record_cook: z.boolean().optional(),
});

export const RecipeShareRepublishSchema = z.object({
  republish: z.boolean().optional(),
});

export const RecipeFeedbackSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("regenerate"),
    recipe_name: z.string().min(1).max(200),
    cuisine: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("taste"),
    text: z.string().min(1).max(50),
  }),
]);
