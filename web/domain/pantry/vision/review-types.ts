import type { PantryCategory, PantryLocation, PantrySource } from "@/domain/pantry/pantry-types";

type PantryReviewSessionType = "fridge" | "receipt";

export type EnrichedPantryInput = {
  raw_name: string;
  raw_quantity?: string | number | null;
  raw_unit?: string | null;
  expires_at?: string | null;
  purchased_at?: string | null;
  location?: PantryLocation;
  source?: PantrySource;
  confidence?: number;
  notes?: string | null;
  item_key?: string;
  display_name?: string;
  category?: PantryCategory | string;
  recognition_confidence?: number;
  user_edited?: boolean;
  selected?: boolean;
  unit_price?: number | null;
  is_likely_food?: boolean;
  quantity_text?: string;
};

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
