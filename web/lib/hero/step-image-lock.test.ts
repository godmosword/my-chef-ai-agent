import { describe, expect, it } from "vitest";
import {
  isStepImageRequestInFlight,
  reserveStepImageRequest,
  releaseStepImageRequest,
} from "./trigger-step-images";

describe("step image request lock", () => {
  it("prevents repeated requests for the same recipe step while in flight", () => {
    const key = { recipeId: "recipe-1", stepIndex: 2 };

    expect(reserveStepImageRequest(key)).toBe(true);
    expect(isStepImageRequestInFlight(key)).toBe(true);
    expect(reserveStepImageRequest(key)).toBe(false);

    releaseStepImageRequest(key);
    expect(isStepImageRequestInFlight(key)).toBe(false);
  });
});
