import { ApiError } from "@/application/api/client";
import { isBrowserOnline } from "@/platform/sync/network";
import type { GenerationErrorKind, GenerationErrorView } from "@/application/api/error-types";

const MIN_PROMPT_CHARS = 4;

export function validatePromptLength(message: string): GenerationErrorView | null {
  const trimmed = message.trim();
  if (trimmed.length >= MIN_PROMPT_CHARS) return null;
  return {
    kind: "input_short",
    message: "多給一點線索，AI 才好幫你想",
    retry: false,
    focusInput: true,
    clearInput: false,
  };
}

function messageHints(kind: GenerationErrorKind, raw: string): GenerationErrorView {
  switch (kind) {
    case "network":
      return {
        kind,
        message: "網路怪怪的，試試重新生成",
        retry: true,
        focusInput: false,
        clearInput: false,
      };
    case "timeout":
      return {
        kind,
        message: "AI 還在想，再給它一次機會",
        retry: true,
        focusInput: false,
        clearInput: false,
      };
    case "content_blocked":
      return {
        kind,
        message: "這個我幫不上忙，試試其他食材組合",
        retry: false,
        focusInput: true,
        clearInput: true,
      };
    case "quota":
      return {
        kind,
        message: "今天的生成次數用完了",
        retry: false,
        focusInput: false,
        clearInput: false,
      };
    case "input_short":
      return {
        kind,
        message: "多給一點線索，AI 才好幫你想",
        retry: false,
        focusInput: true,
        clearInput: false,
      };
    default:
      return {
        kind: "unknown",
        message: raw || "出了點小問題，請稍後再試",
        retry: true,
        focusInput: false,
        clearInput: false,
      };
  }
}

function classifyMessage(raw: string): GenerationErrorKind {
  const m = raw.toLowerCase();
  if (
    m.includes("額度") ||
    m.includes("quota") ||
    m.includes("429") ||
    m.includes("用完")
  ) {
    return "quota";
  }
  if (
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("deadline") ||
    m.includes("逾時")
  ) {
    return "timeout";
  }
  if (
    m.includes("safety") ||
    m.includes("blocked") ||
    m.includes("policy") ||
    m.includes("違規") ||
    m.includes("不適當")
  ) {
    return "content_blocked";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("offline")) {
    return "network";
  }
  return "unknown";
}

export function classifyGenerationError(
  err: unknown,
  fallbackMessage?: string,
): GenerationErrorView {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return messageHints("quota", err.message);
    }
    if (err.status === 408 || err.status === 504) {
      return messageHints("timeout", err.message);
    }
    if (err.status === 400) {
      const kind = classifyMessage(err.message);
      if (kind !== "unknown") return messageHints(kind, err.message);
    }
    const kind = classifyMessage(err.message);
    return messageHints(kind, err.message);
  }

  if (!isBrowserOnline()) {
    return messageHints("network", "offline");
  }

  if (typeof fallbackMessage === "string" && fallbackMessage) {
    return classifyStreamErrorMessage(fallbackMessage);
  }

  return messageHints("unknown", err instanceof Error ? err.message : "");
}

export function classifyStreamErrorMessage(message: string): GenerationErrorView {
  const kind = classifyMessage(message);
  return messageHints(kind, message);
}
