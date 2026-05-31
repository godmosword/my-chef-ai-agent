export type OnboardingStatus =
  | "pending"
  | "started"
  | "completed"
  | "declined";

export type LovedDish = {
  name: string;
  cuisine?: string | null;
  last_loved_at: string;
};

export type RegeneratedDish = {
  name: string;
  cuisine?: string | null;
  regenerated_at: string;
};

export type TasteProfile = {
  tenant_id: string;
  user_id: string;
  spice_tolerance: number | null;
  sweetness_preference: number | null;
  saltiness_preference: number | null;
  oil_preference: number | null;
  allergies: string[];
  dislikes: string[];
  loved_ingredients: string[];
  loved_dishes: LovedDish[];
  regenerated_dishes: RegeneratedDish[];
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  disliked_cuisines: string[];
  cooking_skill_level: number | null;
  typical_cooking_time_min: number | null;
  notes: string | null;
  confidence_score: number;
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: number;
  tenant_id: string;
  user_id: string;
  name: string;
  relation: string | null;
  age_group: string | null;
  dietary_restrictions: string[];
  allergies: string[];
  dislikes: string[];
  /** Store only what the user volunteers; sensitive — never log this field. */
  medical_conditions: string[];
  texture_needs: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};
