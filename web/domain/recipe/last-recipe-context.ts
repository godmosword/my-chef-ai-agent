export type LastRecipeContext = {
  recipe_name?: string;
  cuisine?: string;
  /** ISO timestamp of when the recipe was generated (for 5-minute feedback window). */
  generated_at?: string;
};
