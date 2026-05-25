import {
  dietaryPreferencesPromptText,
  getDietaryPreferences,
} from "./dietary-preferences";

/** Legacy string for prompts — uses structured dietary preferences. */
export async function getUserPreferences(
  userId: string,
  tenantId: string,
): Promise<string | null> {
  const prefs = await getDietaryPreferences(userId, tenantId);
  return dietaryPreferencesPromptText(prefs);
}
