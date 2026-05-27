import { resolvePlanLimit } from "@/platform/config/app-config";
import { displayDateKey } from "@/lib/locale/datetime";
import { asRows, getSql, isDatabaseConfigured } from "./client";

export type QuotaKind = "text" | "image";

export type QuotaBucket = {
  used: number;
  limit: number;
  remaining: number;
};

export type QuotaDecision = {
  allowed: boolean;
  plan_key: string;
  /** Legacy: text recipe generations used today */
  limit: number;
  used: number;
  remaining: number;
  text: QuotaBucket;
  image: QuotaBucket;
};

function quotaToday(): string {
  return displayDateKey();
}

function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "42P01" || message.includes('relation "subscriptions" does not exist');
}

async function getSubscription(
  userId: string,
  tenantId: string,
): Promise<{ plan_key: string; status: string }> {
  const sql = getSql();
  if (!sql) return { plan_key: "free", status: "inactive" };

  try {
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
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn(
        "[quota] subscriptions table missing; run pnpm -F @chef/web db:migrate (0001 or 0007)",
      );
      return { plan_key: "free", status: "inactive" };
    }
    throw err;
  }
}

type DailyUsageRow = {
  requests_count?: number;
  text_requests_count?: number;
  image_requests_count?: number;
};

async function getDailyUsageBreakdown(
  userId: string,
  tenantId: string,
  usageDate: string,
): Promise<{ text: number; image: number; legacy: number }> {
  const sql = getSql();
  if (!sql) return { text: 0, image: 0, legacy: 0 };

  const rows = await sql`
    SELECT requests_count, text_requests_count, image_requests_count
    FROM usage_daily
    WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND usage_date = ${usageDate}
    LIMIT 1
  `;
  const row = asRows<DailyUsageRow>(rows)[0];
  const legacy = row?.requests_count ? Number(row.requests_count) : 0;
  const text = row?.text_requests_count
    ? Number(row.text_requests_count)
    : legacy;
  const image = row?.image_requests_count
    ? Number(row.image_requests_count)
    : 0;
  return { text, image, legacy };
}

function buildDecision(
  planKey: string,
  limit: number,
  textUsed: number,
  imageUsed: number,
): QuotaDecision {
  const textRemaining = Math.max(limit - textUsed, 0);
  const imageRemaining = Math.max(limit - imageUsed, 0);
  return {
    allowed: textUsed < limit,
    plan_key: planKey,
    limit,
    used: textUsed,
    remaining: textRemaining,
    text: { used: textUsed, limit, remaining: textRemaining },
    image: { used: imageUsed, limit, remaining: imageRemaining },
  };
}

async function incrementDailyUsage(
  userId: string,
  tenantId: string,
  usageDate: string,
  units: number,
  kind: QuotaKind,
): Promise<{ text: number; image: number } | null> {
  const sql = getSql();
  if (!sql) return null;

  if (kind === "text") {
    const rows = await sql`
      INSERT INTO usage_daily (
        tenant_id, user_id, usage_date,
        requests_count, text_requests_count, updated_at
      )
      VALUES (
        ${tenantId}, ${userId}, ${usageDate},
        ${units}, ${units}, now()
      )
      ON CONFLICT (tenant_id, user_id, usage_date)
      DO UPDATE SET
        requests_count = usage_daily.requests_count + EXCLUDED.requests_count,
        text_requests_count = usage_daily.text_requests_count + EXCLUDED.text_requests_count,
        updated_at = now()
      RETURNING text_requests_count, image_requests_count
    `;
    const row = asRows<{
      text_requests_count?: number;
      image_requests_count?: number;
    }>(rows)[0];
    if (row?.text_requests_count == null) return null;
    return {
      text: Number(row.text_requests_count),
      image: Number(row.image_requests_count ?? 0),
    };
  }

  const rows = await sql`
    INSERT INTO usage_daily (
      tenant_id, user_id, usage_date,
      image_requests_count, updated_at
    )
    VALUES (${tenantId}, ${userId}, ${usageDate}, ${units}, now())
    ON CONFLICT (tenant_id, user_id, usage_date)
    DO UPDATE SET
      image_requests_count = usage_daily.image_requests_count + EXCLUDED.image_requests_count,
      updated_at = now()
    RETURNING text_requests_count, image_requests_count
  `;
  const row = asRows<{
    text_requests_count?: number;
    image_requests_count?: number;
  }>(rows)[0];
  if (row?.image_requests_count == null) return null;
  return {
    text: Number(row.text_requests_count ?? 0),
    image: Number(row.image_requests_count),
  };
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
  kind: QuotaKind = "text",
): Promise<QuotaDecision> {
  const limit = resolvePlanLimit("free");
  if (!isDatabaseConfigured()) {
    return buildDecision("free", limit, 0, 0);
  }

  const sub = await getSubscription(userId, tenantId);
  const planKey = sub.status === "active" ? sub.plan_key : "free";
  const planLimit = resolvePlanLimit(planKey);
  const usage = await getDailyUsageBreakdown(userId, tenantId, quotaToday());
  const decision = buildDecision(
    planKey,
    planLimit,
    usage.text,
    usage.image,
  );
  if (kind === "image") {
    decision.allowed = usage.image < planLimit;
  }
  return decision;
}

export async function consumeQuota(
  userId: string,
  tenantId: string,
  units = 1,
  eventType = "text_recipe_generation",
  kind: QuotaKind = "text",
): Promise<QuotaDecision> {
  const decision = await checkQuota(userId, tenantId, kind);
  const bucket = kind === "image" ? decision.image : decision.text;
  if (!bucket.remaining || bucket.used >= bucket.limit) {
    return { ...decision, allowed: false };
  }
  if (!isDatabaseConfigured()) return decision;

  const before = kind === "image" ? decision.image.used : decision.text.used;
  const after = await incrementDailyUsage(
    userId,
    tenantId,
    quotaToday(),
    units,
    kind,
  );
  if (!after) {
    return { ...decision, allowed: false };
  }

  const usedAfter = kind === "image" ? after.image : after.text;
  if (usedAfter < before + units) {
    return { ...decision, allowed: false };
  }

  await appendUsageLedger(userId, tenantId, units, eventType, {
    kind,
    used_after: usedAfter,
  });

  return checkQuota(userId, tenantId, kind);
}
