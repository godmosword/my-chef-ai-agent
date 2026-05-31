import {
  addAllergy,
  addDislike,
  addHouseholdMember,
  addLovedDish,
  appendUniqueStrings,
  getTasteProfile,
  listHouseholdMembers,
  updateHouseholdMember,
  upsertTasteProfile,
  type HouseholdMember,
} from "@/platform/db/personalization";
import { preferenceConfidenceThreshold } from "@/platform/config/preference-extraction-config";
import type {
  PersistSignalsResult,
  PreferenceSignal,
} from "./preference-extractor-types";

async function findMemberByName(
  tenantId: string,
  userId: string,
  name: string,
): Promise<HouseholdMember | null> {
  const members = await listHouseholdMembers(tenantId, userId);
  const trimmed = name.trim();
  return members.find((m) => m.name === trimmed) ?? null;
}

async function appendToProfileArray(
  tenantId: string,
  userId: string,
  field: "loved_ingredients" | "dietary_restrictions" | "preferred_cuisines" | "disliked_cuisines",
  item: string,
): Promise<void> {
  const profile = await getTasteProfile(tenantId, userId);
  const current = profile?.[field] ?? [];
  const next = appendUniqueStrings(current, String(item));
  await upsertTasteProfile(tenantId, userId, { [field]: next });
}

async function persistOneSignal(
  signal: PreferenceSignal,
  tenantId: string,
  userId: string,
): Promise<void> {
  const memberName = signal.member_name?.trim();
  if (memberName && signal.signal_type !== "household_member_info") {
    const member = await findMemberByName(tenantId, userId, memberName);
    if (member) {
      if (signal.signal_type === "allergy") {
        await updateHouseholdMember(member.id, tenantId, userId, {
          allergies: appendUniqueStrings(member.allergies, String(signal.value)),
        });
        return;
      }
      if (signal.signal_type === "dislike") {
        await updateHouseholdMember(member.id, tenantId, userId, {
          dislikes: appendUniqueStrings(member.dislikes, String(signal.value)),
        });
        return;
      }
    }
    console.warn(
      "[preference] member_name set but no matching household member; using main profile",
      { member_name: memberName, signal_type: signal.signal_type },
    );
  }

  switch (signal.signal_type) {
    case "dislike":
      await addDislike(tenantId, userId, String(signal.value));
      return;
    case "allergy":
      await addAllergy(tenantId, userId, String(signal.value));
      return;
    case "loved_dish":
      await addLovedDish(tenantId, userId, String(signal.value));
      return;
    case "loved_ingredient":
      await appendToProfileArray(
        tenantId,
        userId,
        "loved_ingredients",
        String(signal.value),
      );
      return;
    case "spice_pref":
      await upsertTasteProfile(tenantId, userId, {
        spice_tolerance: Number(signal.value),
      });
      return;
    case "sweetness_pref":
      await upsertTasteProfile(tenantId, userId, {
        sweetness_preference: Number(signal.value),
      });
      return;
    case "saltiness_pref":
      await upsertTasteProfile(tenantId, userId, {
        saltiness_preference: Number(signal.value),
      });
      return;
    case "oil_pref":
      await upsertTasteProfile(tenantId, userId, {
        oil_preference: Number(signal.value),
      });
      return;
    case "dietary_restriction":
      await appendToProfileArray(
        tenantId,
        userId,
        "dietary_restrictions",
        String(signal.value),
      );
      return;
    case "preferred_cuisine":
      await appendToProfileArray(
        tenantId,
        userId,
        "preferred_cuisines",
        String(signal.value),
      );
      return;
    case "disliked_cuisine":
      await appendToProfileArray(
        tenantId,
        userId,
        "disliked_cuisines",
        String(signal.value),
      );
      return;
    case "cooking_skill":
      await upsertTasteProfile(tenantId, userId, {
        cooking_skill_level: Number(signal.value),
      });
      return;
    case "cooking_time":
      await upsertTasteProfile(tenantId, userId, {
        typical_cooking_time_min: Number(signal.value),
      });
      return;
    case "household_member_info": {
      const value = signal.value as Record<string, unknown>;
      const name = typeof value.name === "string" ? value.name.trim() : "";
      if (!name) return;
      const existing = await findMemberByName(tenantId, userId, name);
      if (existing) return;
      await addHouseholdMember(tenantId, userId, {
        name,
        relation: typeof value.relation === "string" ? value.relation : undefined,
        age_group:
          typeof value.age_group === "string" ? value.age_group : undefined,
        allergies: Array.isArray(value.allergies)
          ? value.allergies.map(String)
          : [],
        dislikes: Array.isArray(value.dislikes)
          ? value.dislikes.map(String)
          : [],
        dietary_restrictions: Array.isArray(value.dietary_restrictions)
          ? value.dietary_restrictions.map(String)
          : [],
      });
      return;
    }
    default:
      return;
  }
}

export async function persistSignals(
  signals: PreferenceSignal[],
  tenantId: string,
  userId: string,
  confidenceThreshold: number = preferenceConfidenceThreshold(),
): Promise<PersistSignalsResult> {
  const result: PersistSignalsResult = {
    written: 0,
    skipped_low_confidence: 0,
    errors: 0,
  };

  for (const signal of signals) {
    if (signal.confidence < confidenceThreshold) {
      result.skipped_low_confidence += 1;
      continue;
    }
    try {
      await persistOneSignal(signal, tenantId, userId);
      result.written += 1;
    } catch (err) {
      result.errors += 1;
      console.error("[preference] persist signal failed", {
        signal_type: signal.signal_type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (result.written > 0) {
    console.info("[preference] persisted signals", {
      written: result.written,
      skipped_low_confidence: result.skipped_low_confidence,
      errors: result.errors,
    });
  }

  return result;
}
