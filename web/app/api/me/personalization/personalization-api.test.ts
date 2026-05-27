import { describe, expect, it, vi, beforeEach } from "vitest";
import * as personalization from "@/platform/db/personalization";
import * as session from "@/platform/identity/session";
import * as uiConfig from "@/platform/config/personalization-ui-config";
import { GET, PATCH, DELETE } from "./route";

vi.mock("@/platform/identity/session", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/platform/config/personalization-ui-config", () => ({
  isPersonalizationUiEnabled: vi.fn(() => true),
}));

vi.mock("@/platform/db/client", () => ({
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/platform/db/personalization-onboarding", () => ({
  getOnboardingStatus: vi.fn(async () => "pending"),
}));

vi.mock("@/platform/db/personalization-rate-limit", () => ({
  checkPersonalizationPatchRateLimit: vi.fn(() => true),
}));

describe("personalization API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(session.getSessionUserId).mockResolvedValue("user-a");
  });

  it("GET returns 401 without session", async () => {
    vi.mocked(session.getSessionUserId).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PATCH updates only provided fields", async () => {
    const upsert = vi.spyOn(personalization, "upsertTasteProfile").mockResolvedValue({
      tenant_id: "default",
      user_id: "user-a",
      spice_tolerance: 3,
      sweetness_preference: null,
      saltiness_preference: null,
      oil_preference: null,
      allergies: [],
      dislikes: [],
      loved_ingredients: [],
      loved_dishes: [],
      regenerated_dishes: [],
      dietary_restrictions: [],
      preferred_cuisines: [],
      disliked_cuisines: [],
      cooking_skill_level: null,
      typical_cooking_time_min: null,
      notes: null,
      confidence_score: 0.2,
      onboarding_status: "pending",
      created_at: "",
      updated_at: "",
    });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ spice_tolerance: 3 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      "default",
      "user-a",
      expect.objectContaining({ spice_tolerance: 3 }),
    );
  });

  it("DELETE taste scope calls clearTasteProfile", async () => {
    const clear = vi.spyOn(personalization, "clearTasteProfile").mockResolvedValue();
    const wipe = vi.spyOn(personalization, "deleteAllPersonalization").mockResolvedValue();

    const req = new Request("http://localhost", {
      method: "DELETE",
      body: JSON.stringify({ scope: "taste" }),
    });
    await DELETE(req);
    expect(clear).toHaveBeenCalledWith("default", "user-a");
    expect(wipe).not.toHaveBeenCalled();
  });

  it("feature flag off returns disabled on GET", async () => {
    vi.mocked(uiConfig.isPersonalizationUiEnabled).mockReturnValue(false);
    const res = await GET();
    const json = await res.json();
    expect(json.enabled).toBe(false);
  });
});
