import { apiFetch } from "./client";
import type {
  HouseholdCreate,
  HouseholdMemberResponse,
  HouseholdPatch,
  OnboardingStatus,
  PatchPersonalizationResponse,
  PersonalizationBundle,
  TasteProfile,
} from "@chef/shared-types";
import {
  HouseholdMemberResponseSchema,
  OnboardingStatusResponseSchema,
  PatchPersonalizationResponseSchema,
  PersonalizationBundleSchema,
} from "@chef/shared-types";
import type { AppliedPersonalization } from "@/application/personalization/applied-personalization";

export async function fetchPersonalization(): Promise<PersonalizationBundle> {
  return apiFetch(
    "/api/me/personalization",
    undefined,
    PersonalizationBundleSchema,
  );
}

export async function patchPersonalization(
  patch: Partial<TasteProfile>,
): Promise<PatchPersonalizationResponse> {
  return apiFetch("/api/me/personalization", {
    method: "PATCH",
    body: JSON.stringify(patch),
  }, PatchPersonalizationResponseSchema);
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
  body: HouseholdCreate,
): Promise<HouseholdMemberResponse> {
  return apiFetch("/api/me/household", {
    method: "POST",
    body: JSON.stringify(body),
  }, HouseholdMemberResponseSchema);
}

export async function updateHouseholdMemberApi(
  memberId: number,
  patch: HouseholdPatch,
): Promise<HouseholdMemberResponse> {
  return apiFetch(`/api/me/household/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }, HouseholdMemberResponseSchema);
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
  const res = await apiFetch(
    "/api/me/onboarding/status",
    undefined,
    OnboardingStatusResponseSchema,
  );
  return res.status;
}

export type { AppliedPersonalization, PersonalizationBundle };
