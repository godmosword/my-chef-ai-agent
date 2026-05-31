// Share step uses data-testid recipe-share-* (not getByRole('dialog')) — see e73968f+
import { test, expect } from "@playwright/test";
import {
  MOCK_RECIPE_ID,
  completeCookingSteps,
  dismissBlockingOverlays,
  dismissCookingOnboarding,
  fillHeroPrompt,
  installRecipeApiMocks,
} from "./helpers";

test.describe("recipe funnel (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookingOnboarding(page);
    await installRecipeApiMocks(page);
  });

  test("Tonight 生成顯示菜名", async ({ page }) => {
    await page.goto("/app");
    await dismissBlockingOverlays(page);
    await fillHeroPrompt(page, "30分鐘咖哩");
    await page.getByRole("button", { name: "生成食譜" }).click();
    await expect(page.getByRole("heading", { name: "E2E 測試咖哩" })).toBeVisible({
      timeout: 45_000,
    });
  });

  test("收藏 → 烹飪 → 完成 → 分享", async ({ page }) => {
    await page.goto(`/app/library/${MOCK_RECIPE_ID}`);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "E2E 測試咖哩" })).toBeVisible();

    await page.getByRole("button", { name: "收藏" }).click();
    await expect(page.getByRole("button", { name: "取消收藏" })).toBeVisible();

    await page.goto(`/app/library/${MOCK_RECIPE_ID}/cook`);
    await dismissBlockingOverlays(page);
    await expect(page).toHaveURL(new RegExp(`/app/library/${MOCK_RECIPE_ID}/cook`));

    await completeCookingSteps(page);
    await page.getByRole("button", { name: "👍 會" }).click();
    await expect(page.getByRole("heading", { name: "完成了！" })).toBeVisible();

    await page.goto(`/app/library/${MOCK_RECIPE_ID}`);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "E2E 測試咖哩" })).toBeVisible();

    const shareBtn = page.getByTestId("recipe-share-trigger");
    await expect(shareBtn).toBeVisible();
    const sharePost = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/recipes/${MOCK_RECIPE_ID}/share`) &&
        res.request().method() === "POST" &&
        res.ok(),
      { timeout: 20_000 },
    );
    await shareBtn.click();
    await sharePost;

    const sharePanel = page.getByTestId("recipe-share-dialog");
    await expect(sharePanel).toBeVisible({ timeout: 20_000 });
    await expect(sharePanel).toContainText(/e2e-share-token/);
    await expect(sharePanel.getByRole("button", { name: "複製連結" })).toBeVisible();
  });
});
