/**
 * PT-4: "Use It Up" reverse recipe recommendation (two-call strategy).
 */
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { buildCleanFridgeSystemBlock } from "@/domain/pantry/clean-fridge-prompt";
import {
  formatQuantityForDisplay,
  type PantryDisplayItem,
} from "@/domain/pantry/pantry-ui";
import {
  loadPersonalizationContext,
  renderPersonalizationBlock,
} from "@/application/personalization/personalization-context";
import { generateRecipe, type AiRecipePayload } from "@/domain/recipe/generate-recipe";
import { checkQuota, consumeQuota } from "@/platform/db/quota";
import { resolveModelName } from "@/platform/config/app-config";
import {
  useItUpCandidateMaxTokens,
  useItUpCandidateTimeoutSec,
  useItUpFullRecipesCount,
} from "@/platform/config/notification-config";
import type { PantryItem } from "@/platform/db/pantry";
import { getTasteProfile } from "@/platform/db/personalization";
import {
  recordUseItUp,
  recordUseItUpCall,
} from "@/platform/observability/notification-metrics";

export type UseItUpSuggestion = {
  suggestion_id: string;
  recipe_title: string;
  cuisine: string;
  estimated_time_min: number;
  priority_ingredients_used: string[];
  other_pantry_ingredients_used: string[];
  additional_shopping: string[];
  rationale: string;
  recipe_full: AiRecipePayload | null;
};

export type UseItUpRequest = {
  tenant_id: string;
  user_id: string;
  priority_ingredients: PantryItem[];
  other_available?: PantryItem[];
  max_suggestions?: number;
  titles_only?: boolean;
  trigger?: string;
};

type CandidateRow = {
  title: string;
  cuisine: string;
  estimated_time_min: number;
  priority_used: string[];
  other_used: string[];
  needs_shopping: string[];
  rationale: string;
};

function toDisplay(item: PantryItem): PantryDisplayItem {
  return {
    id: item.id,
    display_name: item.display_name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    quantity_text: item.quantity_text,
    expires_at: item.expires_at,
    location: item.location,
    item_key: item.item_key,
    confidence: item.confidence,
  };
}

function lineForItem(item: PantryItem, today: string): string {
  const qty = formatQuantityForDisplay(toDisplay(item));
  let expiry = "";
  if (item.expires_at) {
    const d =
      (new Date(`${item.expires_at}T12:00:00Z`).getTime() -
        new Date(`${today}T12:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000);
    if (d <= 0) expiry = "（已過期）";
    else if (d <= 1) expiry = "（明天過期）";
    else expiry = `（${Math.round(d)} 天內）`;
  }
  return `- ${item.display_name} · ${qty}${expiry}`;
}

function parseCandidatesJson(raw: string): CandidateRow[] {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestions?: CandidateRow[];
    };
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    return [];
  }
}

async function fetchCandidates(
  req: UseItUpRequest,
  personalizationText: string,
  regeneratedNames: string[],
): Promise<CandidateRow[]> {
  const start = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const priorityLines = req.priority_ingredients.map((i) => lineForItem(i, today));
  const otherLines = (req.other_available ?? []).map((i) => lineForItem(i, today));

  const prompt = `你是「用完它」食譜推薦助手。使用者冰箱有以下食材快過期，請推薦 3-5 道家常菜優先使用這些食材。

【快過期食材（優先使用）】
${priorityLines.join("\n") || "（無）"}

【其他冰箱常備】
${otherLines.join("\n") || "（無）"}

【使用者偏好】
${personalizationText}

【最近換掉的菜（勿推薦）】
${regeneratedNames.length ? regeneratedNames.join("、") : "（無）"}

只回 JSON：
{
  "suggestions": [
    {
      "title": "番茄炒蛋",
      "cuisine": "台式",
      "estimated_time_min": 15,
      "priority_used": ["番茄"],
      "other_used": ["雞蛋", "蔥"],
      "needs_shopping": [],
      "rationale": "快速消化番茄，家常菜小孩也愛"
    }
  ]
}

規則：
- 至少 3 道，最多 5 道
- 排序：使用越多快過期食材越前面
- 不要硬塞所有快過期食材到一道菜
- needs_shopping 列 1-3 樣最少必需的
- rationale 一句話即可`;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    recordUseItUpCall("candidates", "no_api_key", Date.now() - start);
    return [];
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
    timeout: useItUpCandidateTimeoutSec() * 1000,
  });

  try {
    const res = await client.chat.completions.create({
      model: resolveModelName(),
      max_tokens: useItUpCandidateMaxTokens(),
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    const content = res.choices[0]?.message?.content ?? "";
    const rows = parseCandidatesJson(content);
    recordUseItUpCall("candidates", "ok", Date.now() - start);
    return rows;
  } catch {
    recordUseItUpCall("candidates", "error", Date.now() - start);
    return [];
  }
}

async function expandFullRecipe(
  title: string,
  priorityLines: string[],
  personalizationText: string,
  tenantId: string,
  userId: string,
): Promise<AiRecipePayload | null> {
  const start = Date.now();
  const pre = await checkQuota(userId, tenantId, "text");
  if (!pre.allowed) {
    recordUseItUpCall("full_recipe", "quota", Date.now() - start);
    return null;
  }

  const cleanBlock = buildCleanFridgeSystemBlock(priorityLines);
  const systemParts = [cleanBlock, personalizationText].filter(Boolean);
  const userMessage = `請做「${title}」，優先用完快過期食材。`;
  try {
    const { recipe } = await generateRecipe(
      [
        {
          role: "system",
          content: systemParts.join("\n\n") || "你是專業廚師，回傳 JSON 食譜。",
        },
        { role: "user", content: userMessage },
      ],
      userId,
    );
    const charged = await consumeQuota(
      userId,
      tenantId,
      1,
      "use_it_up_full_recipe",
      "text",
    );
    if (!charged.allowed) {
      recordUseItUpCall("full_recipe", "quota", Date.now() - start);
      return null;
    }
    recordUseItUpCall("full_recipe", "ok", Date.now() - start);
    return recipe;
  } catch {
    recordUseItUpCall("full_recipe", "error", Date.now() - start);
    return null;
  }
}

export async function suggestUseItUpRecipes(
  req: UseItUpRequest,
): Promise<UseItUpSuggestion[]> {
  const max = req.max_suggestions ?? 3;
  const trigger = req.trigger ?? "command";
  recordUseItUp(trigger, max);

  try {
    const personalization = await loadPersonalizationContext(
      req.tenant_id,
      req.user_id,
    );
    const profile = await getTasteProfile(req.tenant_id, req.user_id);
    const regenerated = (profile?.regenerated_dishes ?? [])
      .slice(0, 30)
      .map((d) => d.name);

    const personalizationText = renderPersonalizationBlock(personalization);

    const candidates = await fetchCandidates(
      req,
      personalizationText,
      regenerated,
    );

    if (!candidates.length) return [];

    const ranked = [...candidates].sort((a, b) => {
      const pa = a.priority_used?.length ?? 0;
      const pb = b.priority_used?.length ?? 0;
      return pb - pa;
    });

    const top = ranked.slice(0, max);
    const fullCount = req.titles_only ? 0 : useItUpFullRecipesCount();
    const today = new Date().toISOString().slice(0, 10);
    const priorityLines = req.priority_ingredients.map((i) => lineForItem(i, today));

    const out: UseItUpSuggestion[] = [];
    for (let i = 0; i < top.length; i++) {
      const c = top[i]!;
      let recipe_full: AiRecipePayload | null = null;
      if (i < fullCount) {
        recipe_full = await expandFullRecipe(
          c.title,
          priorityLines,
          personalizationText,
          req.tenant_id,
          req.user_id,
        );
      }
      out.push({
        suggestion_id: randomUUID(),
        recipe_title: c.title,
        cuisine: c.cuisine ?? "家常",
        estimated_time_min: c.estimated_time_min ?? 20,
        priority_ingredients_used: c.priority_used ?? [],
        other_pantry_ingredients_used: c.other_used ?? [],
        additional_shopping: c.needs_shopping ?? [],
        rationale: c.rationale ?? "",
        recipe_full,
      });
    }
    return out;
  } catch {
    return [];
  }
}
