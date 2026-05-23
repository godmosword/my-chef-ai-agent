import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { userSettings } from "@/lib/db/schema";

/** User preference; defaults true when no row. */
export async function isHeroAutoEnabled(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return true;

  const [row] = await db
    .select({ heroAutoGenerate: userSettings.heroAutoGenerate })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!row) return true;
  return row.heroAutoGenerate;
}
