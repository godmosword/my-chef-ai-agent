import { resolvePlanLimit } from "@/lib/config";
import { asRows, getSql, isDatabaseConfigured } from "./client";

export type QuotaDecision = {
  allowed: boolean;
  plan_key: string;
  limit: number;
  used: number;
  remaining: number;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getSubscription(
  userId: string,
  tenantId: string,
): Promise<{ plan_key: string; status: string }> {
  const sql = getSql();
  if (!sql) return { plan_key: "free", status: "inactive" };

  const rows = await sql`
    SELECT plan_key, status FROM subscriptions
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    LIMIT 1
  `;
  const row = asRows<{ plan_key?: string; status?: string }>(rows)[0];
  if (!row) return { plan_key: "free", status: "inactive" };
  return {
    plan_key: row.plan_key || "free",
    status: row.status || "inactive",
  };
}

async function getDailyUsage(
  userId: string,
  tenantId: string,
  usageDate: string,
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;

  const rows = await sql`
    SELECT requests_count FROM usage_daily
    WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND usage_date = ${usageDate}
    LIMIT 1
  `;
  const row = asRows<{ requests_count?: number }>(rows)[0];
  return row?.requests_count ? Number(row.requests_count) : 0;
}

async function incrementDailyUsage(
  userId: string,
  tenantId: string,
  usageDate: string,
  units: number,
): Promise<number | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = await sql`
    INSERT INTO usage_daily (tenant_id, user_id, usage_date, requests_count, updated_at)
    VALUES (${tenantId}, ${userId}, ${usageDate}, ${units}, now())
    ON CONFLICT (tenant_id, user_id, usage_date)
    DO UPDATE SET
      requests_count = usage_daily.requests_count + EXCLUDED.requests_count,
      updated_at = now()
    RETURNING requests_count
  `;
  const row = asRows<{ requests_count?: number }>(rows)[0];
  return row?.requests_count != null ? Number(row.requests_count) : null;
}

async function appendUsageLedger(
  userId: string,
  tenantId: string,
  units: number,
  eventType: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const payload = JSON.stringify(detail);
  await sql`
    INSERT INTO usage_ledger (tenant_id, user_id, units, event_type, detail, created_at)
    VALUES (${tenantId}, ${userId}, ${units}, ${eventType}, ${payload}::jsonb, now())
  `;
}

export async function checkQuota(
  userId: string,
  tenantId: string,
): Promise<QuotaDecision> {
  if (!isDatabaseConfigured()) {
    const limit = resolvePlanLimit("free");
    return {
      allowed: true,
      plan_key: "free",
      limit,
      used: 0,
      remaining: limit,
    };
  }

  const sub = await getSubscription(userId, tenantId);
  const planKey = sub.status === "active" ? sub.plan_key : "free";
  const used = await getDailyUsage(userId, tenantId, utcToday());
  const limit = resolvePlanLimit(planKey);
  const remaining = Math.max(limit - used, 0);
  return {
    allowed: used < limit,
    plan_key: planKey,
    limit,
    used,
    remaining,
  };
}

export async function consumeQuota(
  userId: string,
  tenantId: string,
  units = 1,
  eventType = "text_recipe_generation",
): Promise<QuotaDecision> {
  const decision = await checkQuota(userId, tenantId);
  if (!decision.allowed) return decision;
  if (!isDatabaseConfigured()) return decision;

  const usedAfter = await incrementDailyUsage(
    userId,
    tenantId,
    utcToday(),
    units,
  );
  const minimumExpected = decision.used + units;
  if (usedAfter == null || usedAfter < minimumExpected) {
    return {
      allowed: false,
      plan_key: decision.plan_key,
      limit: decision.limit,
      used: decision.used,
      remaining: Math.max(decision.limit - decision.used, 0),
    };
  }

  await appendUsageLedger(userId, tenantId, units, eventType, {
    used_after: usedAfter,
  });

  return {
    allowed: true,
    plan_key: decision.plan_key,
    limit: decision.limit,
    used: usedAfter,
    remaining: Math.max(decision.limit - usedAfter, 0),
  };
}
