/** Feature flags — set on Vercel env. */
export const FLAGS = {
  newUI: process.env.NEXT_PUBLIC_NEW_UI === "1",
  cookingMode: process.env.NEXT_PUBLIC_COOKING_MODE_ENABLED === "1",
  mealPlan: process.env.NEXT_PUBLIC_MEAL_PLAN_ENABLED === "1",
};
