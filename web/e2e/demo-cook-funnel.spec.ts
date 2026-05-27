import { test, expect } from "@playwright/test";
import {
  completeCookingSteps,
  dismissBlockingOverlays,
  dismissCookingOnboarding,
} from "./helpers";

test.describe("demo cook funnel", () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookingOnboarding(page);
    await page.route(/\/api\/recipes\/demo/, async (route) => {
      const method = route.request().method();
      if (method === "PATCH" || method === "GET") {
        await route.fulfill({
          json: { ok: true, recipe: { id: "demo", recipe_name: "示範" } },
        });
        return;
      }
      await route.continue();
    });
  });

  test("示範烹飪：step_tip、走完步驟並評分", async ({ page }) => {
    await page.goto("/demo/recipe/cook");
    await dismissBlockingOverlays(page);

    await expect(page.getByText("米洗到水變清即可")).toBeVisible();

    await completeCookingSteps(page);
    await expect(page.getByRole("heading", { name: "完成了！" })).toBeVisible();

    await page.getByRole("button", { name: "👍 會" }).click();
    await expect(page.getByText("感謝你的回饋")).toBeVisible();
  });
});
