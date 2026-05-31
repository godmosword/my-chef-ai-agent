import { and, eq, isNull, type SQL } from "drizzle-orm";
import { getDb } from "../drizzle";
import { recipes } from "../schema";

export async function countUserRecipes(
  userId: string,
  tenantId: string,
  extraCondition?: SQL,
): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const conditions = [
    eq(recipes.userId, userId),
    eq(recipes.tenantId, tenantId),
    isNull(recipes.deletedAt),
  ];
  if (extraCondition) conditions.push(extraCondition);

  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(...conditions));

  return rows.length;
}
