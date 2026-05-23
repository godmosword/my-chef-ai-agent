import OpenAI from "openai";
import { formatAiError } from "@/lib/ai/generate-recipe";
import { buildHeroPrompt } from "@/lib/hero/build-prompt";
import type { RecipePayload } from "@chef/shared-types";

const memoryCache = new Map<string, string>();

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

function placeholderUrl(recipeName: string): string | null {
  const custom = process.env.RECIPE_FALLBACK_HERO_IMAGE_URL?.trim();
  if (custom && custom.toLowerCase() !== "none") return custom;
  const q = encodeURIComponent(recipeName.slice(0, 40));
  return `https://placehold.co/800x600/f5efe6/2a6049/png?text=${q}`;
}

export type HeroImageResult = {
  image_url: string;
  source: "generated" | "cache" | "placeholder";
};

export type GenerateHeroOptions = {
  prompt?: string;
  recipe?: RecipePayload;
};

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
    const url = placeholderUrl(name)!;
    memoryCache.set(cacheKey, url);
    return { image_url: url, source: "placeholder" };
  }

  if (provider !== "openai_compatible") {
    const url = placeholderUrl(name)!;
    return { image_url: url, source: "placeholder" };
  }

  const apiKey = resolveImageApiKey();
  if (!apiKey) {
    const url = placeholderUrl(name)!;
    return { image_url: url, source: "placeholder" };
  }

  const client = new OpenAI({ apiKey, maxRetries: 1 });
  const model =
    process.env.OPENAI_GPT_IMAGE_MODEL_ID?.trim() || "gpt-image-1";

  try {
    const response = await client.images.generate({
      model,
      prompt,
      size: "1024x1024",
      quality: "low",
      response_format: "b64_json",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      const url = placeholderUrl(name)!;
      return { image_url: url, source: "placeholder" };
    }
    const dataUrl = `data:image/png;base64,${b64}`;
    memoryCache.set(cacheKey, dataUrl);
    return { image_url: dataUrl, source: "generated" };
  } catch (err) {
    throw formatAiError(err, model);
  }
}

/** Legacy name-based entry (ChatPanel / POST /api/recipes/hero). */
export async function generateRecipeHeroImageByName(
  recipeName: string,
): Promise<HeroImageResult> {
  return generateRecipeHeroImage(recipeName);
}
