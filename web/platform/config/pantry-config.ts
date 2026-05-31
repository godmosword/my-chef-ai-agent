/** PT-1: pantry data layer feature flags. */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function isPantryEnabled(): boolean {
  return envFlag("ENABLE_PANTRY", true);
}

export function pantryExpiryWarnDays(): number {
  const n = parseInt(process.env.PANTRY_EXPIRY_WARN_DAYS || "3", 10);
  return Number.isFinite(n) ? n : 3;
}
