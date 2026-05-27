import type { OnboardingStatus } from "./personalization-types";
import { getSql } from "./client";
import { asRows } from "./client";
import { listHouseholdMembers } from "./personalization";
import { getTasteProfile } from "./personalization";

export type { OnboardingStatus } from "./personalization-types";

export async function getOnboardingStatus(
  tenantId: string,
  userId: string,
): Promise<OnboardingStatus> {
  const sql = getSql();
  if (!sql) return "pending";

  const rows = await sql`
    SELECT onboarding_status FROM user_taste_profile
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{ onboarding_status?: string }>(rows)[0];
  if (row?.onboarding_status) {
    return row.onboarding_status as OnboardingStatus;
  }

  const [profile, members] = await Promise.all([
    getTasteProfile(tenantId, userId),
    listHouseholdMembers(tenantId, userId),
  ]);
  if (!profile && members.length === 0) return "pending";
  return "completed";
}

export async function setOnboardingStatus(
  tenantId: string,
  userId: string,
  status: OnboardingStatus,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    INSERT INTO user_taste_profile (tenant_id, user_id, onboarding_status, updated_at)
    VALUES (${tenantId}, ${userId}, ${status}, now())
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      onboarding_status = EXCLUDED.onboarding_status,
      updated_at = now()
  `;
}

export async function shouldPromptOnboarding(
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const status = await getOnboardingStatus(tenantId, userId);
  return status === "pending";
}
