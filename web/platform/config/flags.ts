/** Feature flags — set on Vercel env. */
export const FLAGS = {
  newUI: process.env.NEXT_PUBLIC_NEW_UI === "1",
  cookingMode: process.env.NEXT_PUBLIC_COOKING_MODE_ENABLED === "1",
  pantryTonight: process.env.NEXT_PUBLIC_PANTRY_TONIGHT === "1",
  mealPlan: process.env.NEXT_PUBLIC_MEAL_PLAN_ENABLED === "1",
  sharing: process.env.NEXT_PUBLIC_SHARING_ENABLED !== "0",
  analytics:
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) &&
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "0",
};
