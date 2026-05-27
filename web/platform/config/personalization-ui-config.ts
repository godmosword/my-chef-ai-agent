/** PM-4: personalization management UI + onboarding. */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function isPersonalizationUiEnabled(): boolean {
  return envFlag("ENABLE_PERSONALIZATION_UI", true);
}

export function isOnboardingFlowEnabled(): boolean {
  return envFlag("ENABLE_ONBOARDING_FLOW", true);
}

export function showAppliedPersonalization(): boolean {
  return envFlag("SHOW_APPLIED_PERSONALIZATION", true);
}

export function onboardingRetryMax(): number {
  const n = parseInt(process.env.ONBOARDING_RETRY_MAX || "2", 10);
  return Number.isFinite(n) ? n : 2;
}
