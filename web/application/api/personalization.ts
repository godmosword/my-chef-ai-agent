import { apiFetch } from "./client";
import type { HouseholdMember, TasteProfile } from "@/platform/db/personalization";
import type { OnboardingStatus } from "@/domain/personalization/profile-types";
import type { AppliedPersonalization } from "@/application/personalization/applied-personalization";

export type PersonalizationBundle = {
  ok: true;
  db_configured: boolean;
  taste_profile: TasteProfile | null;
  household_members: HouseholdMember[];
  onboarding_status: OnboardingStatus;
};

export async function fetchPersonalization(): Promise<PersonalizationBundle> {
  return apiFetch<PersonalizationBundle>("/api/me/personalization");
}

export async function patchPersonalization(
  patch: Partial<TasteProfile>,
): Promise<{ ok: true; taste_profile: TasteProfile }> {
  return apiFetch("/api/me/personalization", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deletePersonalization(
  scope: "all" | "taste" = "all",
): Promise<void> {
  await apiFetch("/api/me/personalization", {
    method: "DELETE",
    body: JSON.stringify({ scope }),
  });
}

export async function createHouseholdMember(
  body: Parameters<typeof import("@/platform/db/personalization").addHouseholdMember>[2] & {
    name: string;
  },
): Promise<{ ok: true; member: HouseholdMember }> {
  return apiFetch("/api/me/household", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateHouseholdMemberApi(
  memberId: number,
  patch: Record<string, unknown>,
): Promise<{ ok: true; member: HouseholdMember }> {
  return apiFetch(`/api/me/household/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteHouseholdMemberApi(memberId: number): Promise<void> {
  await apiFetch(`/api/me/household/${memberId}`, { method: "DELETE" });
}

export async function setOnboardingStatusApi(
  status: OnboardingStatus,
): Promise<void> {
  await apiFetch("/api/me/onboarding/status", {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await apiFetch<{ ok: true; status: OnboardingStatus }>(
    "/api/me/onboarding/status",
  );
  return res.status;
}

export type { AppliedPersonalization };
