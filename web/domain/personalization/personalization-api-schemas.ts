import { z } from "zod";

export const TasteProfilePatchSchema = z
  .object({
    spice_tolerance: z.number().int().min(0).max(4).nullable().optional(),
    sweetness_preference: z.number().int().min(0).max(4).nullable().optional(),
    saltiness_preference: z.number().int().min(0).max(4).nullable().optional(),
    oil_preference: z.number().int().min(0).max(4).nullable().optional(),
    allergies: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    loved_ingredients: z.array(z.string()).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    preferred_cuisines: z.array(z.string()).optional(),
    disliked_cuisines: z.array(z.string()).optional(),
    cooking_skill_level: z.number().int().min(0).max(2).nullable().optional(),
    typical_cooking_time_min: z.number().int().min(5).max(240).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

export const PersonalizationDeleteSchema = z.object({
  scope: z.enum(["all", "taste"]).default("all"),
});

export const HouseholdCreateSchema = z.object({
  name: z.string().min(1).max(40),
  relation: z.string().max(20).optional(),
  age_group: z.string().max(20).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  texture_needs: z.array(z.string()).optional(),
  notes: z.string().max(300).optional(),
});

export const HouseholdPatchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  relation: z.string().max(20).nullable().optional(),
  age_group: z.string().max(20).nullable().optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  texture_needs: z.array(z.string()).optional(),
  notes: z.string().max(300).nullable().optional(),
});

export const OnboardingStatusSchema = z.object({
  status: z.enum(["pending", "started", "completed", "declined"]),
});
