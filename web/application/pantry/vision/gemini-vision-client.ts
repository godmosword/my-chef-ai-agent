import OpenAI from "openai";
import { resolveModelName } from "@/platform/config/app-config";

function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
  });
}

function imageToDataUrl(bytes: Buffer, mimeType: string): string {
  const b64 = bytes.toString("base64");
  const mime = mimeType || "image/jpeg";
  return `data:${mime};base64,${b64}`;
}

/** Gemini Vision via OpenAI-compatible chat API; returns raw model text. */
export async function callGeminiVisionJson(options: {
  systemPrompt: string;
  userPrompt: string;
  imageBytes: Buffer;
  mimeType: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}): Promise<string> {
  const client = getClient();
  const model = resolveModelName();
  const dataUrl = imageToDataUrl(options.imageBytes, options.mimeType);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await client.chat.completions.create(
      {
        model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        messages: [
          { role: "system", content: options.systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: options.userPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
    return response.choices[0]?.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
