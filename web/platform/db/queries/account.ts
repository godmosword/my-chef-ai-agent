import { eq } from "drizzle-orm";
import { getDb } from "../drizzle";
import {
  favoritesV2,
  mealCalendarEntries,
  recipes,
  userSettings,
} from "../schema";
import { clearUserMemory } from "../memory";
import { deleteAllPersonalization } from "../personalization";
import { hardDeleteAllPantry } from "../pantry";
import {
  hardDeleteNotificationInbox,
} from "../notification-inbox";
import { hardDeleteNotificationPrefs } from "../notification-prefs";
import { deleteAllMealPlanning } from "../meal-planning";
import { getSql } from "../client";

export async function deleteAllUserData(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const db = getDb();
  const sql = getSql();

  if (db) {
    await db.delete(recipes).where(eq(recipes.userId, userId));
    await db.delete(favoritesV2).where(eq(favoritesV2.userId, userId));
    await db.delete(mealCalendarEntries).where(
      eq(mealCalendarEntries.userId, userId),
    );
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
  }

  if (sql) {
    await clearUserMemory(userId, tenantId);
    await deleteAllPersonalization(tenantId, userId);
    await hardDeleteAllPantry(tenantId, userId);
    await hardDeleteNotificationPrefs(tenantId, userId);
    await hardDeleteNotificationInbox(tenantId, userId);
    await deleteAllMealPlanning(tenantId, userId);
    await sql`DELETE FROM usage_daily WHERE user_id = ${userId} AND tenant_id = ${tenantId}`;
    await sql`DELETE FROM favorite_recipes WHERE user_id = ${userId} AND tenant_id = ${tenantId}`;
  }

  return true;
}
