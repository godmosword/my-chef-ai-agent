import { eq } from "drizzle-orm";
import { getDb } from "../drizzle";
import {
  favoritesV2,
  mealPlans,
  recipes,
  userSettings,
} from "../schema";
import { clearUserMemory } from "../memory";
import { deleteAllPersonalization } from "../personalization";
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
    await db.delete(mealPlans).where(eq(mealPlans.userId, userId));
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
  }

  if (sql) {
    await clearUserMemory(userId, tenantId);
    await deleteAllPersonalization(tenantId, userId);
    await sql`DELETE FROM usage_daily WHERE user_id = ${userId} AND tenant_id = ${tenantId}`;
    await sql`DELETE FROM favorite_recipes WHERE user_id = ${userId} AND tenant_id = ${tenantId}`;
  }

  return true;
}
