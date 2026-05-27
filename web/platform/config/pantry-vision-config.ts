/** PT-2: fridge / receipt vision recognition. */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function isPantryVisionEnabled(): boolean {
  return envFlag("ENABLE_PANTRY_VISION", true);
}

export function pantryVisionUserDailyLimit(): number {
  const n = parseInt(process.env.PANTRY_VISION_USER_DAILY_LIMIT || "20", 10);
  return Number.isFinite(n) ? n : 20;
}

export function pantryVisionCacheTtlSec(): number {
  const n = parseInt(process.env.PANTRY_VISION_CACHE_TTL_SEC || "3600", 10);
  return Number.isFinite(n) ? n : 3600;
}

export function pantryReviewTtlSec(): number {
  const n = parseInt(process.env.PANTRY_REVIEW_TTL_SEC || "1800", 10);
  return Number.isFinite(n) ? n : 1800;
}

export function pantryVisionLowConfidenceThreshold(): number {
  const n = parseFloat(process.env.PANTRY_VISION_LOW_CONFIDENCE_THRESHOLD || "0.5");
  return Number.isFinite(n) ? n : 0.5;
}

export function pantryVisionHighConfidenceThreshold(): number {
  const n = parseFloat(process.env.PANTRY_VISION_HIGH_CONFIDENCE_THRESHOLD || "0.8");
  return Number.isFinite(n) ? n : 0.8;
}

export function aiVisionTimeoutSec(): number {
  const n = parseInt(process.env.AI_VISION_TIMEOUT_SEC || "20", 10);
  return Number.isFinite(n) ? n : 20;
}

export function imageIntentClassifierTimeoutSec(): number {
  const n = parseInt(process.env.IMAGE_INTENT_TIMEOUT_SEC || "6", 10);
  return Number.isFinite(n) ? n : 6;
}
