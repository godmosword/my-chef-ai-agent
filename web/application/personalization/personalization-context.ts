import {
  isPersonalizationInjectionEnabled,
  personalizationLoadTimeoutMs,
  personalizationMaxTokens,
} from "@/platform/config/personalization-injection-config";
import {
  getTasteProfile,
  listHouseholdMembers,
  type HouseholdMember,
  type TasteProfile,
} from "@/platform/db/personalization";
import {
  recordPersonalizationLoad,
  recordPersonalizationOtelSpan,
} from "@/platform/observability/personalization-metrics";

const DIETARY_ZH: Record<string, string> = {
  vegetarian: "需符合奶蛋素",
  vegan: "需符合全素（無蛋奶）",
  halal: "需符合清真飲食",
  kosher: "需符合猶太飲食",
  keto: "需符合生酮飲食（極低碳水）",
  low_carb: "需低碳水",
  low_sodium: "需低鈉",
  diabetic_friendly: "需糖尿病友善（低 GI、控糖）",
  gluten_free: "需無麩質",
  dairy_free: "需無乳製品",
};

const MEDICAL_ZH: Record<string, string> = {
  diabetes: "家中有糖尿病患，避免高糖高 GI 食材",
  hypertension: "家中有高血壓患者，控制鈉攝取",
  gout: "家中有痛風患者，避免高普林食材（內臟、紅肉湯、海鮮）",
  kidney_disease: "家中有腎病患者，控制蛋白質與鉀",
  pregnancy: "家中有孕婦，避免生食、酒精、高汞魚類",
  lactating: "家中有哺乳者，注意營養均衡與避免酒精",
  post_surgery: "家中有術後復原者，需清淡好消化",
};

const AGE_GROUP_ZH: Record<string, string> = {
  infant: "嬰兒",
  toddler: "幼兒",
  child: "兒童",
  teen: "青少年",
  adult: "成人",
  senior: "長輩",
};

const SCALE_LABELS: Record<
  "spice" | "sweet" | "salt" | "oil",
  Record<number, string>
> = {
  spice: {
    0: "完全不吃辣",
    1: "偏好微辣",
    3: "偏辣",
    4: "嗜辣",
  },
  sweet: {
    0: "偏好少甜",
    1: "偏好微甜",
    3: "偏甜",
    4: "嗜甜",
  },
  salt: {
    0: "偏好少鹹",
    1: "偏好清淡",
    3: "偏鹹",
    4: "重鹹",
  },
  oil: {
    0: "偏好少油",
    1: "偏好清爽",
    3: "偏油",
    4: "重油",
  },
};

export type PersonalizationBlock = {
  hard_constraints: string[];
  soft_preferences: string[];
  household_notes: string[];
  recent_dishes_to_avoid: string[];
  skill_and_time: string | null;
  confidence: number;
  token_estimate: number;
  is_empty: boolean;
};

export function emptyPersonalizationBlock(): PersonalizationBlock {
  return {
    hard_constraints: [],
    soft_preferences: [],
    household_notes: [],
    recent_dishes_to_avoid: [],
    skill_and_time: null,
    confidence: 0,
    token_estimate: 0,
    is_empty: true,
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.5);
}

function scalePreference(
  kind: "spice" | "sweet" | "salt" | "oil",
  value: number | null | undefined,
): string | null {
  if (value == null || value === 2) return null;
  return SCALE_LABELS[kind][value] ?? null;
}

function buildHardConstraints(
  profile: TasteProfile | null,
  members: HouseholdMember[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (line: string) => {
    if (!line || seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const item of profile?.allergies ?? []) {
    add(`不可含${item}（過敏）`);
  }
  for (const code of profile?.dietary_restrictions ?? []) {
    const phrase = DIETARY_ZH[code];
    if (phrase) add(phrase);
  }

  for (const member of members) {
    for (const item of member.allergies) {
      add(`不可含${item}（${member.name} 過敏）`);
    }
    for (const code of member.dietary_restrictions) {
      const phrase = DIETARY_ZH[code];
      if (phrase) add(phrase);
    }
    for (const code of member.medical_conditions) {
      const phrase = MEDICAL_ZH[code];
      if (phrase) add(phrase);
    }
  }

  return out;
}

function buildHouseholdNotes(members: HouseholdMember[]): string[] {
  const notes: string[] = [];
  for (const m of members) {
    const ageZh = m.age_group ? AGE_GROUP_ZH[m.age_group] ?? m.age_group : null;
    if (m.age_group === "infant" || m.age_group === "toddler" || m.age_group === "child") {
      const ageLabel = ageZh ? `${m.name}（${ageZh}）` : m.name;
      notes.push(`家中有 ${ageLabel}，需 不辣、軟食、小份量`);
    } else if (m.age_group === "senior") {
      notes.push(`家中有 ${m.name}（長輩），偏好軟食、清淡、易咀嚼`);
    }
    if (m.texture_needs.length) {
      notes.push(
        `家中有 ${m.name}，口感需求：${m.texture_needs.join("、")}`,
      );
    }
  }
  return notes;
}

function buildSoftPreferences(profile: TasteProfile | null): string[] {
  if (!profile) return [];
  const out: string[] = [];

  const spice = scalePreference("spice", profile.spice_tolerance);
  const sweet = scalePreference("sweet", profile.sweetness_preference);
  const salt = scalePreference("salt", profile.saltiness_preference);
  const oil = scalePreference("oil", profile.oil_preference);
  if (spice) out.push(spice);
  if (sweet) out.push(sweet);
  if (salt) out.push(salt);
  if (oil) out.push(oil);

  if (profile.dislikes.length) {
    out.push(`不喜歡 ${profile.dislikes.slice(0, 5).join("、")}`);
  }
  if (profile.loved_ingredients.length) {
    out.push(`偏好食材：${profile.loved_ingredients.slice(0, 5).join("、")}`);
  }
  if (profile.preferred_cuisines.length) {
    out.push(`偏好菜系：${profile.preferred_cuisines.join("、")}`);
  }
  if (profile.disliked_cuisines.length) {
    out.push(`避免菜系：${profile.disliked_cuisines.join("、")}`);
  }

  return out;
}

function buildRecentDishesToAvoid(profile: TasteProfile | null): string[] {
  if (!profile?.regenerated_dishes?.length) return [];
  const names = profile.regenerated_dishes
    .slice(-10)
    .map((d) => d.name)
    .filter(Boolean);
  const unique = [...new Set(names)];
  return unique.slice(-8);
}

function buildSkillAndTime(profile: TasteProfile | null): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.cooking_skill_level != null) {
    const level =
      profile.cooking_skill_level === 0
        ? "初學"
        : profile.cooking_skill_level === 1
          ? "中等"
          : "進階";
    parts.push(`使用者烹飪程度${level}`);
  }
  if (profile.typical_cooking_time_min != null) {
    parts.push(`偏好 ${profile.typical_cooking_time_min} 分鐘內完成`);
  }
  if (!parts.length) return null;
  return parts.join("，");
}

export function buildPersonalizationBlock(
  profile: TasteProfile | null,
  members: HouseholdMember[],
  maxTokens: number = personalizationMaxTokens(),
): PersonalizationBlock {
  const hard_constraints = buildHardConstraints(profile, members);
  const household_notes = buildHouseholdNotes(members);
  let soft_preferences = buildSoftPreferences(profile);
  let recent_dishes_to_avoid = buildRecentDishesToAvoid(profile);
  let skill_and_time = buildSkillAndTime(profile);
  const confidence = profile?.confidence_score ?? 0;

  const block: PersonalizationBlock = {
    hard_constraints,
    soft_preferences,
    household_notes,
    recent_dishes_to_avoid,
    skill_and_time,
    confidence,
    token_estimate: 0,
    is_empty: false,
  };

  block.token_estimate = estimateTokens(renderPersonalizationBlock(block));
  applyTokenBudget(block, maxTokens);
  block.is_empty =
    block.hard_constraints.length === 0 &&
    block.household_notes.length === 0 &&
    block.soft_preferences.length === 0 &&
    block.recent_dishes_to_avoid.length === 0 &&
    !block.skill_and_time;

  if (!block.is_empty) {
    block.token_estimate = estimateTokens(renderPersonalizationBlock(block));
  }

  return block;
}

/** Drop P3 then trim P2; never drop P0/P1. */
export function applyTokenBudget(
  block: PersonalizationBlock,
  maxTokens: number,
): void {
  const renderAndCheck = () =>
    estimateTokens(renderPersonalizationBlock(block)) > maxTokens;

  if (!renderAndCheck()) return;

  block.recent_dishes_to_avoid = [];
  block.skill_and_time = null;
  if (!renderAndCheck()) return;

  if (block.soft_preferences.length > 0) {
    const trimmed: string[] = [];
    for (const line of block.soft_preferences) {
      if (line.startsWith("不喜歡 ")) {
        const items = line.replace(/^不喜歡 /, "").split("、");
        trimmed.push(`不喜歡 ${items.slice(0, 3).join("、")}`);
      } else if (line.startsWith("偏好食材：")) {
        const items = line.replace(/^偏好食材：/, "").split("、");
        trimmed.push(`偏好食材：${items.slice(0, 3).join("、")}`);
      } else if (line.startsWith("偏好菜系：")) {
        const items = line.replace(/^偏好菜系：/, "").split("、");
        trimmed.push(`偏好菜系：${items.slice(0, 3).join("、")}`);
      } else if (line.startsWith("避免菜系：")) {
        const items = line.replace(/^避免菜系：/, "").split("、");
        trimmed.push(`避免菜系：${items.slice(0, 3).join("、")}`);
      } else {
        trimmed.push(line);
      }
    }
    block.soft_preferences = trimmed;
  }
}

export function renderPersonalizationBlock(block: PersonalizationBlock): string {
  if (block.is_empty) return "";

  const sections: string[] = ["【使用者個人化資訊】"];

  if (block.hard_constraints.length) {
    sections.push("※ 必須遵守的限制：");
    for (const line of block.hard_constraints) {
      sections.push(`- ${line}`);
    }
  }

  if (block.household_notes.length) {
    sections.push("※ 家庭成員備註：");
    for (const line of block.household_notes) {
      sections.push(`- ${line}`);
    }
  }

  if (block.soft_preferences.length) {
    sections.push("※ 口味偏好（可彈性調整）：");
    for (const line of block.soft_preferences) {
      sections.push(`- ${line}`);
    }
  }

  if (block.recent_dishes_to_avoid.length) {
    sections.push(
      `※ 近期已換過的菜（避免重複推薦）：${block.recent_dishes_to_avoid.join("、")}`,
    );
  }

  if (block.skill_and_time) {
    sections.push(`※ 烹飪能力與時間：${block.skill_and_time}`);
  }

  sections.push(
    "請在生成食譜時遵守上述「必須遵守的限制」（這是不可妥協的硬限制），並盡量考慮「口味偏好」。若使用者本次明確要求的菜色與限制衝突（例如過敏食材），請改用替代食材並在 kitchen_talk 簡短說明替換原因；若有因限制調整，可選填 personalization_note（≤60 字）說明。",
  );

  return sections.join("\n");
}

async function loadFromDb(
  tenantId: string,
  userId: string,
  maxTokens: number,
): Promise<PersonalizationBlock> {
  const [profile, members] = await Promise.all([
    getTasteProfile(tenantId, userId),
    listHouseholdMembers(tenantId, userId),
  ]);

  if (!profile && members.length === 0) {
    return emptyPersonalizationBlock();
  }

  return buildPersonalizationBlock(profile, members, maxTokens);
}

function sleep(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("timeout"), ms);
  });
}

/**
 * Loads profile + household, compresses to prompt block.
 * Fail-open: never raises; timeout → empty block.
 */
export async function loadPersonalizationContext(
  tenantId: string,
  userId: string,
  options?: { max_tokens?: number; timeout_sec?: number },
): Promise<PersonalizationBlock> {
  if (!isPersonalizationInjectionEnabled()) {
    recordPersonalizationLoad("empty");
    return emptyPersonalizationBlock();
  }

  const maxTokens = options?.max_tokens ?? personalizationMaxTokens();
  const timeoutMs =
    options?.timeout_sec != null
      ? options.timeout_sec * 1000
      : personalizationLoadTimeoutMs();

  try {
    const raced = await Promise.race([
      loadFromDb(tenantId, userId, maxTokens),
      sleep(timeoutMs),
    ]);

    if (raced === "timeout") {
      recordPersonalizationLoad("timeout");
      console.warn("[personalization] load timeout", {
        tenant_id: tenantId,
        user_id_suffix: userId.slice(-4),
      });
      return emptyPersonalizationBlock();
    }

    const block = raced;
    if (block.is_empty) {
      recordPersonalizationLoad("empty");
    } else {
      recordPersonalizationLoad("ok");
    }

    recordPersonalizationOtelSpan({
      confidence: block.confidence,
      hard_constraints_count: block.hard_constraints.length,
      token_estimate: block.token_estimate,
      is_empty: block.is_empty,
    });

    console.info("[personalization] load ok", {
      is_empty: block.is_empty,
      hard_constraints_count: block.hard_constraints.length,
      household_notes_count: block.household_notes.length,
      soft_preferences_count: block.soft_preferences.length,
      token_estimate: block.token_estimate,
    });

    return block;
  } catch (err) {
    recordPersonalizationLoad("error");
    console.error("[personalization] load error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return emptyPersonalizationBlock();
  }
}
