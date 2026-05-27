import type { EnrichedPantryInput } from "./map-to-pantry-inputs";

export type PantryReviewSessionType = "fridge" | "receipt";

export type PantryReviewSessionPayload = {
  kind: "pantry_review";
  type: PantryReviewSessionType;
  items: EnrichedPantryInput[];
  store_name?: string | null;
  purchased_at?: string | null;
  total_amount?: number | null;
  overall_quality?: string;
  advice?: string | null;
  user_edits_count: number;
  created_at: string;
};
