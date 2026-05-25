import { describe, expect, it } from "vitest";
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProps,
  timeCategoryFromMinutes,
} from "./events";

describe("analytics event sanitization", () => {
  it("drops raw prompts, custom allergens, session ids, and share tokens", () => {
    expect(
      sanitizeAnalyticsProps({
        source: "today",
        prompt: "冰箱有雞蛋和青菜",
        custom_allergen: "奇異果",
        session_id: "session-123",
        token: "share-token",
        success: true,
      }),
    ).toEqual({ source: "today", success: true });
  });

  it("keeps coarse cooking time categories only", () => {
    expect(timeCategoryFromMinutes(20)).toBe("under_20");
    expect(timeCategoryFromMinutes(30)).toBe("under_30");
    expect(timeCategoryFromMinutes(45)).toBe("over_30");
  });

  it("redacts public share tokens from analytics paths", () => {
    expect(sanitizeAnalyticsPath("/r/abc123-secret")).toBe("/r/[token]");
    expect(sanitizeAnalyticsPath("/app/library/recipe-id")).toBe("/app/library/recipe-id");
  });
});
