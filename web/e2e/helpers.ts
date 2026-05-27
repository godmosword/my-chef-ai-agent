import type { Page } from "@playwright/test";

export const MOCK_RECIPE_ID = "11111111-1111-4111-8111-111111111111";

export const MOCK_RECIPE = {
  id: MOCK_RECIPE_ID,
  version_no: 1,
  recipe_name: "E2E 測試咖哩",
  cuisine: "家常",
  prep_minutes: 10,
  cook_minutes: 20,
  servings: 2,
  ingredients: [{ name: "雞肉", amount: "200", unit: "g" }],
  steps: [
    { text: "雞肉切塊醃製", step_tip: "別醃太久以免過鹹" },
    { text: "下鍋炒香", step_tip: "火不要太大" },
    { text: "加入醬料燉煮 15 分鐘" },
  ],
  shopping_list: ["雞肉 200g"],
  hero_status: "ready",
  photo_url: "/marketing/hero-three-cup-chicken.jpg",
};

export async function dismissCookingOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("cooking_onboarded_v1", "1");
    localStorage.setItem("chef_onboarded_v1", "1");
    sessionStorage.removeItem("cooking_session_demo");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });
}

/** After navigation, skip resume / app onboarding if they appear. */
export async function dismissBlockingOverlays(page: Page) {
  for (const name of ["略過", "跳過"]) {
    const btn = page.getByRole("button", { name });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
  for (const name of ["開始使用", "開始烹飪"]) {
    const btn = page.getByRole("button", { name });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
  const restart = page.getByRole("button", { name: "重新開始" });
  if (await restart.isVisible().catch(() => false)) {
    await restart.click();
  }
  const resume = page.getByRole("button", { name: "繼續烹飪" });
  if (await resume.isVisible().catch(() => false)) {
    await resume.click();
  }
}

export async function installRecipeApiMocks(page: Page) {
  const shareToken = "e2e-share-token-000000000001";

  await page.route("**/api/quota", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        db_configured: true,
        text: { used: 0, limit: 20, remaining: 20 },
        image: { used: 0, limit: 5, remaining: 5 },
      },
    });
  });

  await page.route("**/api/me/dietary-preferences", async (route) => {
    await route.fulfill({ json: { preferences: {} } });
  });

  await page.route("**/api/me**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          ok: true,
          profile: { display_name: "美食家" },
          quota: { text: { remaining: 20 }, image: { remaining: 5 } },
        },
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/api/favorites**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ json: { ok: true, items: [], favoriteIds: [] } });
      return;
    }
    if (method === "POST") {
      await route.fulfill({
        status: 201,
        json: { ok: true, id: "fav-1", recipe_id: MOCK_RECIPE_ID },
      });
      return;
    }
    await route.fulfill({ json: { ok: true } });
  });

  await page.route(`**/api/recipes/${MOCK_RECIPE_ID}/hero-status`, async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        hero_status: "ready",
        hero_url: MOCK_RECIPE.photo_url,
        hero_error: null,
      },
    });
  });

  // Share handler registered first; wildcard below uses fallback() for /share URLs.
  await page.route(`**/api/recipes/${MOCK_RECIPE_ID}/share`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        json: {
          ok: true,
          share_token: shareToken,
          share_url: `http://127.0.0.1:3000/r/${shareToken}`,
          published_at: new Date().toISOString(),
        },
      });
      return;
    }
    await route.fulfill({ json: { ok: true } });
  });

  await page.route(`**/api/recipes/${MOCK_RECIPE_ID}**`, async (route) => {
    if (route.request().url().includes("/share")) {
      await route.fallback();
      return;
    }
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ json: { ok: true, recipe: MOCK_RECIPE } });
      return;
    }
    if (method === "PATCH") {
      await route.fulfill({ json: { ok: true, recipe: MOCK_RECIPE } });
      return;
    }
    await route.continue();
  });

  await page.route("**/api/recipes", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        json: {
          ok: true,
          recipe: MOCK_RECIPE,
          quota: {
            remaining: 19,
            limit: 20,
            used: 1,
            text: { used: 1, limit: 20, remaining: 19 },
            image: { used: 0, limit: 5, remaining: 5 },
          },
        },
      });
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          ok: true,
          items: [{ ...MOCK_RECIPE, id: MOCK_RECIPE_ID }],
          next_cursor: null,
          db_configured: true,
        },
      });
      return;
    }
    await route.continue();
  });

}

/** Advance cooking UI until completion screen or step guard exceeded. */
export async function completeCookingSteps(page: Page, maxIterations = 12) {
  for (let i = 0; i < maxIterations; i += 1) {
    if (await page.getByRole("heading", { name: "完成了！" }).isVisible().catch(() => false)) {
      return;
    }
    await dismissBlockingOverlays(page);
    const done = page.getByRole("button", { name: "完成" });
    if (await done.isVisible().catch(() => false)) {
      await done.click();
      continue;
    }
    const next = page.getByRole("button", { name: "下一步" });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(120);
      continue;
    }
    await page.waitForTimeout(120);
  }
}
