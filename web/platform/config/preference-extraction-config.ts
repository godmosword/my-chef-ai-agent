/** PM-2: preference extraction from chat (env-driven). */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function isPreferenceExtractionEnabled(): boolean {
  return envFlag("ENABLE_PREFERENCE_EXTRACTION", true);
}

export function isPreferenceExtractionLlmTierEnabled(): boolean {
  return envFlag("PREFERENCE_EXTRACTION_LLM_TIER", true);
}

export function preferenceConfidenceThreshold(): number {
  const n = parseFloat(process.env.PREFERENCE_CONFIDENCE_THRESHOLD || "0.7");
  return Number.isFinite(n) ? n : 0.7;
}

export function preferenceExtractionTimeoutMs(): number {
  const n = parseInt(process.env.PREFERENCE_EXTRACTION_TIMEOUT_SEC || "8", 10);
  return (Number.isFinite(n) ? n : 8) * 1000;
}
