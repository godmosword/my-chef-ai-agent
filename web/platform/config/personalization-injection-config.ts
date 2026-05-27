/** PM-3: inject taste profile into recipe generation prompts. */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function isPersonalizationInjectionEnabled(): boolean {
  return envFlag("ENABLE_PERSONALIZATION_INJECTION", true);
}

export function personalizationMaxTokens(): number {
  const n = parseInt(process.env.PERSONALIZATION_MAX_TOKENS || "350", 10);
  return Number.isFinite(n) && n > 0 ? n : 350;
}

export function personalizationLoadTimeoutMs(): number {
  const sec = parseFloat(process.env.PERSONALIZATION_LOAD_TIMEOUT_SEC || "1.5");
  return (Number.isFinite(sec) && sec > 0 ? sec : 1.5) * 1000;
}
