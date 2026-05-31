import { displayDateKey } from "@/lib/locale/datetime";
import { pantryVisionUserDailyLimit } from "@/platform/config/pantry-vision-config";
import { asRows, getSql, isDatabaseConfigured } from "./client";

export class PantryVisionQuotaExceededError extends Error {
  constructor() {
    super("已達今日掃描上限");
    this.name = "PantryVisionQuotaExceededError";
  }
}

async function getPantryVisionUsed(
  userId: string,
  tenantId: string,
  usageDate: string,
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  try {
    const rows = await sql`
      SELECT pantry_vision_count FROM usage_daily
      WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND usage_date = ${usageDate}
      LIMIT 1
    `;
    const row = asRows<{ pantry_vision_count?: number }>(rows)[0];
    return Number(row?.pantry_vision_count ?? 0);
  } catch {
    return 0;
  }
}

async function checkPantryVisionQuota(
  userId: string,
  tenantId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = pantryVisionUserDailyLimit();
  if (!isDatabaseConfigured()) {
    return { allowed: true, used: 0, limit };
  }
  const used = await getPantryVisionUsed(userId, tenantId, displayDateKey());
  return { allowed: used < limit, used, limit };
}

export async function consumePantryVisionQuota(
  userId: string,
  tenantId: string,
  units = 1,
): Promise<void> {
  const check = await checkPantryVisionQuota(userId, tenantId);
  if (!check.allowed) throw new PantryVisionQuotaExceededError();
  const sql = getSql();
  if (!sql) return;
  const usageDate = displayDateKey();
  await sql`
    INSERT INTO usage_daily (tenant_id, user_id, usage_date, pantry_vision_count, updated_at)
    VALUES (${tenantId}, ${userId}, ${usageDate}, ${units}, now())
    ON CONFLICT (tenant_id, user_id, usage_date)
    DO UPDATE SET
      pantry_vision_count = usage_daily.pantry_vision_count + ${units},
      updated_at = now()
  `;
}
