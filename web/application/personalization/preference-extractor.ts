import {
  isPreferenceExtractionEnabled,
  isPreferenceExtractionLlmTierEnabled,
  preferenceConfidenceThreshold,
} from "@/platform/config/preference-extraction-config";
import { getTasteProfile } from "@/platform/db/personalization";
import { extractPreferencesViaLlm } from "./extract-preferences-llm";
import {
  ruleBasedExtract,
  shouldRunLlmTier,
} from "./preference-extractor-rules";
import type {
  ExtractionResult,
  LastRecipeContext,
  PersistSignalsResult,
  PreferenceSignal,
} from "./preference-extractor-types";
import { persistSignals } from "./persist-signals";

export type {
  ExtractionResult,
  LastRecipeContext,
  PersistSignalsResult,
} from "./preference-extractor-types";

export async function extractSignals(
  message: string,
  lastRecipe?: LastRecipeContext | null,
  options?: { userId?: string; tenantId?: string },
): Promise<ExtractionResult> {
  const tenantId = options?.tenantId ?? "default";
  const userId = options?.userId;
  const profile = userId
    ? await getTasteProfile(tenantId, userId).catch(() => null)
    : null;

  const ruleSignals = ruleBasedExtract(message, lastRecipe, profile);

  let llmSignals: PreferenceSignal[] = [];
  let raw_response: string | null = null;

  if (
    userId &&
    shouldRunLlmTier(
      message,
      ruleSignals,
      isPreferenceExtractionLlmTierEnabled(),
    )
  ) {
    const llm = await extractPreferencesViaLlm(message, lastRecipe, userId);
    llmSignals = llm.signals;
    raw_response = llm.raw_response;
  }

  const combined = [...ruleSignals, ...llmSignals];
  const seen = new Set<string>();
  const signals: PreferenceSignal[] = [];
  for (const s of combined) {
    const key = `${s.signal_type}:${JSON.stringify(s.value)}:${s.member_name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push(s);
  }

  return { signals, raw_response };
}

export async function extractAndPersist(
  message: string,
  tenantId: string,
  userId: string,
  lastRecipe?: LastRecipeContext | null,
): Promise<PersistSignalsResult & { skipped?: number }> {
  if (!isPreferenceExtractionEnabled()) {
    return { written: 0, skipped_low_confidence: 0, errors: 0, skipped: 0 };
  }

  const { signals } = await extractSignals(message, lastRecipe, {
    userId,
    tenantId,
  });
  const result = await persistSignals(
    signals,
    tenantId,
    userId,
    preferenceConfidenceThreshold(),
  );
  return result;
}

export { persistSignals } from "./persist-signals";
