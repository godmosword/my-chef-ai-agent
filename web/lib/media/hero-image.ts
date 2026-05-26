import OpenAI from "openai";
import { buildHeroPrompt } from "@/lib/hero/build-prompt";
import type { RecipePayload } from "@chef/shared-types";

const memoryCache = new Map<string, string>();

const DEFAULT_MODEL = "gpt-image-2";
const MODEL_FALLBACK = "gpt-image-2-2026-04-21";

export function imageProvider(): string {
  return (process.env.IMAGE_PROVIDER || "placeholder").trim().toLowerCase();
}

export function resolveImageApiKey(): string | null {
  return (
    process.env.IMAGE_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

/** Same-origin static asset (committed under public/marketing). Reliable on Vercel. */
const DEFAULT_PLACEHOLDER_HERO = "/marketing/hero-three-cup-chicken.jpg";

export function getPlaceholderHeroUrl(_recipeName?: string): string {
  const custom = process.env.RECIPE_FALLBACK_HERO_IMAGE_URL?.trim();
  if (custom && custom.toLowerCase() !== "none") return custom;
  return DEFAULT_PLACEHOLDER_HERO;
}

export type HeroImageResult = {
  image_url: string;
  source: "generated" | "cache" | "placeholder";
};

export type GenerateHeroOptions = {
  prompt?: string;
  recipe?: RecipePayload;
};

function formatImageApiError(err: unknown, model: string): Error {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401 || err.status === 403) {
      return new Error(
        "OpenAI 圖像 API 金鑰無效或未設定，請在 Vercel 設定 IMAGE_OPENAI_API_KEY（或 OPENAI_API_KEY）。",
      );
    }
    if (err.status === 404) {
      return new Error(
        `OpenAI 圖像模型「${model}」不可用，請設 OPENAI_GPT_IMAGE_MODEL_ID=gpt-image-2-2026-04-21。`,
      );
    }
    if (err.status === 400) {
      return new Error(
        `OpenAI 圖像請求被拒（400）${err.message ? `：${err.message}` : ""}`,
      );
    }
    return new Error(
      `OpenAI 圖像錯誤（HTTP ${err.status}）${err.message ? `：${err.message}` : ""}`,
    );
  }
  if (err instanceof Error) return err;
  return new Error(String(err));
}

async function generateWithOpenAI(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  const baseParams = {
    prompt,
    size: "1024x1024" as const,
    quality: "low" as const,
    output_format: "jpeg" as const,
  };

  let response;
  try {
    response = await client.images.generate({
      model,
      ...baseParams,
    });
  } catch (err) {
    if (
      err instanceof OpenAI.APIError &&
      err.status === 404 &&
      model === DEFAULT_MODEL
    ) {
      response = await client.images.generate({
        model: MODEL_FALLBACK,
        ...baseParams,
      });
    } else {
      throw err;
    }
  }

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI 圖像 API 未回傳圖片資料");
  }
  return `data:image/jpeg;base64,${b64}`;
}

export async function generateRecipeHeroImage(
  recipeName: string,
  options?: GenerateHeroOptions,
): Promise<HeroImageResult> {
  const name = recipeName.trim() || "美味食譜";
  const prompt =
    options?.prompt ??
    (options?.recipe ? buildHeroPrompt(options.recipe) : buildHeroPrompt({ recipe_name: name }));
  const cacheKey = `${imageProvider()}:${prompt.toLowerCase().slice(0, 120)}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return { image_url: cached, source: "cache" };

  const provider = imageProvider();
  if (provider === "placeholder") {
    const url = getPlaceholderHeroUrl(name);
    memoryCache.set(cacheKey, url);
    return { image_url: url, source: "placeholder" };
  }

  if (provider !== "openai_compatible") {
    const url = getPlaceholderHeroUrl(name);
    return { image_url: url, source: "placeholder" };
  }

  const apiKey = resolveImageApiKey();
  if (!apiKey) {
    const url = getPlaceholderHeroUrl(name);
    return { image_url: url, source: "placeholder" };
  }

  const client = new OpenAI({ apiKey, maxRetries: 1 });
  const model = process.env.OPENAI_GPT_IMAGE_MODEL_ID?.trim() || DEFAULT_MODEL;

  try {
    const dataUrl = await generateWithOpenAI(client, model, prompt);
    memoryCache.set(cacheKey, dataUrl);
    return { image_url: dataUrl, source: "generated" };
  } catch (err) {
    throw formatImageApiError(err, model);
  }
}

/** Legacy name-based entry (ChatPanel / POST /api/recipes/hero). */
export async function generateRecipeHeroImageByName(
  recipeName: string,
): Promise<HeroImageResult> {
  return generateRecipeHeroImage(recipeName);
}
