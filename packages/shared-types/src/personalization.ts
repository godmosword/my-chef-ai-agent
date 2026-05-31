import { z } from "zod";

export const OnboardingStatusValueSchema = z.enum([
  "pending",
  "started",
  "completed",
  "declined",
]);
export type OnboardingStatus = z.infer<typeof OnboardingStatusValueSchema>;

export const LovedDishSchema = z.object({
  name: z.string(),
  cuisine: z.string().nullable().optional(),
  last_loved_at: z.string(),
});
export type LovedDish = z.infer<typeof LovedDishSchema>;

export const RegeneratedDishSchema = z.object({
  name: z.string(),
  cuisine: z.string().nullable().optional(),
  regenerated_at: z.string(),
});
export type RegeneratedDish = z.infer<typeof RegeneratedDishSchema>;

export const TasteProfileSchema = z.object({
  tenant_id: z.string(),
  user_id: z.string(),
  spice_tolerance: z.number().nullable(),
  sweetness_preference: z.number().nullable(),
  saltiness_preference: z.number().nullable(),
  oil_preference: z.number().nullable(),
  allergies: z.array(z.string()),
  dislikes: z.array(z.string()),
  loved_ingredients: z.array(z.string()),
  loved_dishes: z.array(LovedDishSchema),
  regenerated_dishes: z.array(RegeneratedDishSchema),
  dietary_restrictions: z.array(z.string()),
  preferred_cuisines: z.array(z.string()),
  disliked_cuisines: z.array(z.string()),
  cooking_skill_level: z.number().nullable(),
  typical_cooking_time_min: z.number().nullable(),
  notes: z.string().nullable(),
  confidence_score: z.number(),
  onboarding_status: OnboardingStatusValueSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type TasteProfile = z.infer<typeof TasteProfileSchema>;

export const HouseholdMemberSchema = z.object({
  id: z.number().int(),
  tenant_id: z.string(),
  user_id: z.string(),
  name: z.string(),
  relation: z.string().nullable(),
  age_group: z.string().nullable(),
  dietary_restrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  dislikes: z.array(z.string()),
  medical_conditions: z.array(z.string()),
  texture_needs: z.array(z.string()),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

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
export type TasteProfilePatch = z.infer<typeof TasteProfilePatchSchema>;

export const PersonalizationDeleteSchema = z.object({
  scope: z.enum(["all", "taste"]).default("all"),
});
export type PersonalizationDelete = z.infer<typeof PersonalizationDeleteSchema>;

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
export type HouseholdCreate = z.infer<typeof HouseholdCreateSchema>;

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
export type HouseholdPatch = z.infer<typeof HouseholdPatchSchema>;

export const OnboardingStatusSchema = z.object({
  status: OnboardingStatusValueSchema,
});
export type OnboardingStatusRequest = z.infer<typeof OnboardingStatusSchema>;

export const PersonalizationBundleSchema = z.object({
  ok: z.literal(true),
  enabled: z.boolean().optional(),
  db_configured: z.boolean().optional(),
  taste_profile: TasteProfileSchema.nullable(),
  household_members: z.array(HouseholdMemberSchema),
  onboarding_status: OnboardingStatusValueSchema.optional(),
});
export type PersonalizationBundle = z.infer<typeof PersonalizationBundleSchema>;

export const PatchPersonalizationResponseSchema = z.object({
  ok: z.literal(true),
  taste_profile: TasteProfileSchema,
});
export type PatchPersonalizationResponse = z.infer<
  typeof PatchPersonalizationResponseSchema
>;

export const HouseholdMemberResponseSchema = z.object({
  ok: z.literal(true),
  member: HouseholdMemberSchema,
});
export type HouseholdMemberResponse = z.infer<
  typeof HouseholdMemberResponseSchema
>;

export const OnboardingStatusResponseSchema = z.object({
  ok: z.literal(true),
  status: OnboardingStatusValueSchema,
});
export type OnboardingStatusResponse = z.infer<
  typeof OnboardingStatusResponseSchema
>;
