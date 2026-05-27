import { test, expect } from "@playwright/test";
import {
  MOCK_RECIPE_ID,
  completeCookingSteps,
  dismissBlockingOverlays,
  dismissCookingOnboarding,
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
    await page.getByLabel("描述你想吃的料理").fill("30分鐘咖哩");
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

    const shareBtn = page.getByRole("button", { name: /^分享/ });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    const shareDialog = page.getByRole("dialog");
    await expect(shareDialog).toBeVisible({ timeout: 10_000 });
    // 發布成功後顯示連結與「複製連結」（標題可能為 h2 或 Radix Title，不依賴 role=heading）
    await expect(shareDialog.getByText(/e2e-share-token/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      shareDialog.getByRole("button", { name: "複製連結" }),
    ).toBeVisible();
  });
});
