/** Feature flags — set on Vercel env. */
export const FLAGS = {
  cookingMode: process.env.NEXT_PUBLIC_COOKING_MODE_ENABLED === "1",
  pantryTonight: process.env.NEXT_PUBLIC_PANTRY_TONIGHT === "1",
  mealPlan: process.env.NEXT_PUBLIC_MEAL_PLAN_ENABLED === "1",
  shoppingList: process.env.NEXT_PUBLIC_SHOPPING_LIST_ENABLED !== "0",
  sharing: process.env.NEXT_PUBLIC_SHARING_ENABLED !== "0",
  analytics:
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) &&
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "0",
};
