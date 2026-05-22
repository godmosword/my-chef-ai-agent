/**
 * Shared domain types for Web (Prompt 2: Recipe Library).
 * Placeholder — expand in recipe-library spec.
 */

export type Ingredient = {
  name: string;
  price?: string;
};

export type Step = string;

export type KitchenTalkLine = {
  role: string;
  content: string;
};

/** Minimal recipe payload aligned with existing API JSON. */
export type Recipe = {
  recipe_name?: string;
  theme?: string;
  kitchen_talk?: KitchenTalkLine[];
  ingredients?: Ingredient[] | string[];
  steps?: Step[];
  shopping_list?: string[];
  estimated_total_cost?: string;
  photo_url?: string;
};
