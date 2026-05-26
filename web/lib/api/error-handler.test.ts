import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  classifyGenerationError,
  classifyStreamErrorMessage,
  validatePromptLength,
} from "@/lib/api/error-handler";

describe("validatePromptLength", () => {
  it("rejects very short prompts", () => {
    const view = validatePromptLength("hi");
    expect(view?.kind).toBe("input_short");
    expect(view?.focusInput).toBe(true);
  });
});

describe("classifyGenerationError", () => {
  it("maps quota API errors", () => {
    const view = classifyGenerationError(new ApiError("今日免費額度已用完", 429));
    expect(view.kind).toBe("quota");
  });

  it("maps timeout messages", () => {
    const view = classifyStreamErrorMessage("Request timed out");
    expect(view.kind).toBe("timeout");
    expect(view.retry).toBe(true);
  });
});
