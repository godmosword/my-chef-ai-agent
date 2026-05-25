import { asRows, getSql } from "./client";

export const DIETARY_PRESET_OPTIONS = [
  { key: "no_spicy", label: "不吃辣" },
  { key: "kids_meal", label: "兒童餐" },
  { key: "vegetarian", label: "素食" },
  { key: "low_oil", label: "低油" },
  { key: "low_salt", label: "低鹽" },
  { key: "no_nuts", label: "避免花生／堅果" },
  { key: "no_shellfish", label: "避免甲殼類" },
  { key: "no_dairy", label: "避免乳製品" },
  { key: "no_egg", label: "避免蛋" },
  { key: "no_kiwi", label: "避免奇異果" },
] as const;

export type DietaryPresetKey = (typeof DIETARY_PRESET_OPTIONS)[number]["key"];

export type DietaryPreferences = {
  tags: DietaryPresetKey[];
  avoid_custom: string;
};

const EMPTY: DietaryPreferences = { tags: [], avoid_custom: "" };

function parsePreferences(raw: unknown): DietaryPreferences {
  if (!raw || typeof raw !== "object") {
    if (Array.isArray(raw)) {
      return { tags: [], avoid_custom: raw.map(String).join("、") };
    }
    return EMPTY;
  }
  const o = raw as Record<string, unknown>;
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is DietaryPresetKey =>
        typeof t === "string" &&
        DIETARY_PRESET_OPTIONS.some((p) => p.key === t),
      )
    : [];
  const avoid_custom =
    typeof o.avoid_custom === "string" ? o.avoid_custom.trim() : "";
  return { tags, avoid_custom };
}

export async function getDietaryPreferences(
  userId: string,
  tenantId: string,
): Promise<DietaryPreferences> {
  const sql = getSql();
  if (!sql) return EMPTY;

  const rows = await sql`
    SELECT preferences FROM user_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{ preferences?: unknown }>(rows)[0];
  if (!row?.preferences) return EMPTY;
  return parsePreferences(row.preferences);
}

export async function saveDietaryPreferences(
  userId: string,
  tenantId: string,
  prefs: DietaryPreferences,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    INSERT INTO user_preferences (tenant_id, user_id, preferences, updated_at)
    VALUES (${tenantId}, ${userId}, ${JSON.stringify(prefs)}::jsonb, now())
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = now()
  `;
}

const PRESET_PROMPT_LINES: Record<DietaryPresetKey, string> = {
  no_spicy: "不要辣、不要辣椒與花椒",
  kids_meal: "適合兒童、好咀嚼、溫和不刺激",
  vegetarian: "素食（不含肉類與海鮮）",
  low_oil: "少油烹調",
  low_salt: "少鹽、調味清淡",
  no_nuts: "不可含花生、堅果或堅果醬",
  no_shellfish: "不可含蝦、蟹、貝類等甲殼類",
  no_dairy: "不可含乳製品（奶、起司、奶油）",
  no_egg: "不可含蛋或蛋製品",
  no_kiwi: "不可含奇異果",
};

/** Text for LLM system prompt (not for analytics). */
export function dietaryPreferencesPromptText(prefs: DietaryPreferences): string | null {
  const lines: string[] = [];
  for (const tag of prefs.tags) {
    const line = PRESET_PROMPT_LINES[tag];
    if (line) lines.push(line);
  }
  if (prefs.avoid_custom) {
    const items = prefs.avoid_custom
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length) {
      lines.push(`禁止出現以下食材或調味：${items.join("、")}`);
    }
  }
  return lines.length ? lines.join("；") : null;
}

/** Labels for UI badge (no custom text in analytics). */
export function dietaryAvoidDisplayLabels(prefs: DietaryPreferences): string[] {
  const labels: string[] = [];
  for (const tag of prefs.tags) {
    const opt = DIETARY_PRESET_OPTIONS.find((p) => p.key === tag);
    if (opt) labels.push(opt.label);
  }
  if (prefs.avoid_custom) {
    const items = prefs.avoid_custom
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    labels.push(...items);
  }
  return labels;
}
