export const SIGNAL_TYPES = [
  "dislike",
  "allergy",
  "loved_dish",
  "loved_ingredient",
  "spice_pref",
  "sweetness_pref",
  "saltiness_pref",
  "oil_pref",
  "dietary_restriction",
  "preferred_cuisine",
  "disliked_cuisine",
  "cooking_skill",
  "cooking_time",
  "household_member_info",
] as const;

type SignalType = (typeof SIGNAL_TYPES)[number];

export type PreferenceSignal = {
  signal_type: SignalType;
  value: string | number | Record<string, unknown>;
  confidence: number;
  evidence: string;
  member_name?: string | null;
};

export type ExtractionResult = {
  signals: PreferenceSignal[];
  raw_response?: string | null;
};

export type { LastRecipeContext } from "@/domain/recipe/last-recipe-context";

export type PersistSignalsResult = {
  written: number;
  skipped_low_confidence: number;
  errors: number;
};
