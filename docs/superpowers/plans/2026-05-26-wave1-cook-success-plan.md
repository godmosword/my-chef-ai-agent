# Wave 1 — 煮成功 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提高「生成 → 進烹飪 → 煮完」轉化率：決策卡、烹飪 GA 真機清單、分析漏斗、晚餐 SW 定時推播、完成評分可靠入庫。

**Architecture:** 在既有 Tonight／Library／Cook 路由上增量 UI 與事件；不新增後端表；SW 用 `periodicsync`（fallback client timer）補足僅 `activate` 觸發推播的缺口。

**Tech Stack:** Next.js App Router、PostHog `capture()`、Serwist SW、Vitest、現有 `PATCH /api/recipes/:id`。

**Spec:** [`docs/superpowers/specs/2026-05-26-product-evolution-design.md`](../specs/2026-05-26-product-evolution-design.md)

---

## File map

| 檔案 | 職責 |
|------|------|
| `web/components/recipe/RecipeDecisionCard.tsx` | **新建** — 時間／人數／需購買摘要 |
| `web/lib/recipe/decision-summary.ts` | **新建** — 從 `RecipePayload` 算需購買數、總分鐘 |
| `web/components/patterns/StreamingRecipe.tsx` | 插入決策卡 |
| `web/app/(app)/app/library/[id]/page.tsx` 或 detail client | 決策卡 + `cook_started` source |
| `web/components/cooking/CookingModeClient.tsx` | `source` prop → analytics |
| `web/lib/analytics/events.ts` | 輔助 `duration_bucket` / `rating_bucket` |
| `web/app/sw.ts` | `periodicsync` + `dinner_reminder_fired` 路徑 |
| `web/lib/notifications/dinner-reminder-scheduler.ts` | 註冊 periodic sync tag |
| `docs/PWA_DEVICE_QA.md` | 擴充 §3 烹飪 GA + §4 晚餐推播 |
| `docs/analytics/funnel-cook-success.md` | **新建** — PostHog 漏斗設定說明 |

---

## Task 1: 決策摘要工具 + 測試

**Files:**
- Create: `web/lib/recipe/decision-summary.ts`
- Create: `web/lib/recipe/decision-summary.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// web/lib/recipe/decision-summary.test.ts
import { describe, expect, it } from "vitest";
import { buildDecisionSummary } from "./decision-summary";

describe("buildDecisionSummary", () => {
  it("sums prep and cook minutes", () => {
    const s = buildDecisionSummary({
      prep_minutes: 10,
      cook_minutes: 20,
      servings: 2,
      shopping_list: ["調味：醬油"],
      ingredients: [{ name: "雞蛋" }],
    });
    expect(s.totalMinutes).toBe(30);
    expect(s.servings).toBe(2);
    expect(s.shoppingCount).toBe(1);
  });

  it("handles missing fields", () => {
    const s = buildDecisionSummary({});
    expect(s.totalMinutes).toBeNull();
    expect(s.shoppingCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm -F @chef/web test web/lib/recipe/decision-summary.test.ts
```

- [ ] **Step 3: Implement**

```ts
// web/lib/recipe/decision-summary.ts
import type { RecipePayload } from "@chef/shared-types";

export type DecisionSummary = {
  totalMinutes: number | null;
  servings: number | null;
  shoppingCount: number;
};

export function buildDecisionSummary(recipe: Partial<RecipePayload>): DecisionSummary {
  const prep = recipe.prep_minutes ?? 0;
  const cook = recipe.cook_minutes ?? 0;
  const totalMinutes =
    prep > 0 || cook > 0 ? prep + cook : null;
  const list = recipe.shopping_list ?? [];
  return {
    totalMinutes,
    servings: recipe.servings ?? null,
    shoppingCount: list.length,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add web/lib/recipe/decision-summary.ts web/lib/recipe/decision-summary.test.ts
git commit -m "feat(web): add recipe decision summary helper"
```

---

## Task 2: RecipeDecisionCard UI

**Files:**
- Create: `web/components/recipe/RecipeDecisionCard.tsx`
- Modify: `web/components/patterns/StreamingRecipe.tsx`

- [ ] **Step 1: Create component**

`RecipeDecisionCard` props: `{ summary: DecisionSummary; spicyLabel?: string }`  
版面：一行 pill — `30 分鐘 · 2 人 · 需買 3 樣`；無 totalMinutes 時省略時間；`shoppingCount === 0` 顯示「不必採買」。

使用既有 token：`bg-surface-muted`、`text-text-muted`、`rounded-lg`。

- [ ] **Step 2: Wire into StreamingRecipe**

在 `RecipeResultHero` 下方、`h2` 上方插入：

```tsx
{!streaming && recipe.id && (
  <RecipeDecisionCard summary={buildDecisionSummary(recipe)} />
)}
```

- [ ] **Step 3: Manual verify**

`NEXT_PUBLIC_NEW_UI=1` → 生成食譜 → 結果區頂部見決策卡。

- [ ] **Step 4: Commit**

```bash
git add web/components/recipe/RecipeDecisionCard.tsx web/components/patterns/StreamingRecipe.tsx
git commit -m "feat(web): show decision card on recipe result"
```

---

## Task 3: 詳情頁烹飪入口 + analytics source

**Files:**
- Modify: `web/components/cooking/CookingModeClient.tsx`
- Modify: 詳情頁進入 cook 的 Link/Button（搜尋 `library/${id}/cook` 或 `StickyCookCTA`）

- [ ] **Step 1: Extend cooking_mode_started props**

```ts
capture("cooking_mode_started", {
  is_demo: recipe.id === "demo",
  source: cookSource ?? "detail",
});
```

`cookSource` 型別：`"detail" | "sticky_cta" | "demo" | "library_list"` — 由頁面傳入 optional prop。

- [ ] **Step 2: Pass source from StickyCookCTA / detail primary button**

StickyCookCTA → `source: "sticky_cta"`  
詳情主按鈕 → `source: "detail"`

- [ ] **Step 3: cooking_mode_completed enrichment**

```ts
const mins = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
capture("cooking_mode_completed", {
  is_demo: recipe.id === "demo",
  duration_bucket: mins <= 20 ? "under_20" : mins <= 40 ? "under_40" : "over_40",
  rating_bucket: stars ? (stars >= 4 ? "positive" : "neutral") : "none",
});
```

（`stars` 在完成 handler 可得時傳入 effect 依賴）

- [ ] **Step 4: recipe_generation_succeeded flag**

在 `web/hooks/useRecipeGeneration.ts` 成功分支加 `has_decision_card: true`（上線後恆 true）。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): enrich cook funnel analytics props"
```

---

## Task 4: 完成評分可靠入庫（含離線）

**Files:**
- Modify: `web/components/cooking/CookingModeClient.tsx`
- Test: `web/lib/offline/mutations.test.ts`（若已有則擴充）

- [ ] **Step 1: 確認完成流程**

完成時呼叫 `recordRecipeCook(recipe.id, { rating, record_cook: true })`；離線時 `enqueueMutation({ type: "rating", ... })`。

- [ ] **Step 2: 加測試 — offline rating replay**

模擬 queue 一筆 rating → `flushMutations` → mock fetch PATCH 200。

- [ ] **Step 3: 失敗時使用者可見 toast**

PATCH 失敗顯示「評分稍後同步」且不阻擋離開 cook 頁。

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(web): harden cook completion rating persistence"
```

---

## Task 5: 晚餐推播 SW periodic sync

**Files:**
- Modify: `web/app/sw.ts`
- Modify: `web/lib/notifications/dinner-reminder-scheduler.ts`

- [ ] **Step 1: Register periodic sync on arm**

在 `armDinnerReminderSchedule` 內：

```ts
const reg = await navigator.serviceWorker.ready;
if ("periodicSync" in reg) {
  await (reg as ServiceWorkerRegistration & { periodicSync: { register: (t: string, o?: { minInterval: number }) => Promise<void> } }).periodicSync.register("dinner-reminder", { minInterval: 60 * 60 * 1000 });
}
```

（型別可用窄化或 `// @ts-expect-error` 最小化）

- [ ] **Step 2: SW listener**

```ts
self.addEventListener("periodicsync", (event) => {
  if ((event as PeriodicSyncEvent).tag === "dinner-reminder") {
    event.waitUntil(maybeShowDinnerReminder());
  }
});
```

保留 `activate` 呼叫 `maybeShowDinnerReminder` 作為備援。

- [ ] **Step 3: Dedupe 同日推播**

在 `maybeShowDinnerReminder` 用 Cache API 存 `last-fired-ymd`（Asia/Taipei），同日不重複 show。

- [ ] **Step 4: Manual QA（PWA 安裝後）**

[`docs/PWA_DEVICE_QA.md`](../../PWA_DEVICE_QA.md) 新增 §4：設定 17:30 → 關閉 app → 到點收到通知 → 點擊開 `/app`。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(pwa): periodic sync for dinner reminder notifications"
```

---

## Task 6: PostHog 漏斗文件 + Wave 0 儀表板

**Files:**
- Create: `docs/analytics/funnel-cook-success.md`

- [ ] **Step 1: 撰寫文件**

列出 6 步事件名、建議篩選 `NEXT_PUBLIC_NEW_UI=1`、7 天窗、北極星公式。

- [ ] **Step 2: 在 PostHog UI 建立 funnel**（人工，文件記截圖占位說明）

- [ ] **Step 3: Commit**

```bash
git add docs/analytics/funnel-cook-success.md
git commit -m "docs: PostHog cook-success funnel setup"
```

---

## Task 7: 烹飪模式 GA 真機清單

**Files:**
- Modify: `docs/PWA_DEVICE_QA.md`

- [ ] **Step 1: 新增 §3.5 Cook GA checklist**

項目：Wake Lock 5 分鐘、背景回前景計時仍走、語音 toggle、完成評分寫入、sticky CTA 進入 cook、通知點擊回 app。

- [ ] **Step 2: 執行並勾選**（人工，production build on iPhone）

- [ ] **Step 3: 結果寫入 `TODOS.md` P1 第一項為 [x]**

- [ ] **Step 4: Commit docs only**

```bash
git add docs/PWA_DEVICE_QA.md TODOS.md
git commit -m "docs: cooking mode GA device checklist"
```

---

## Task 8: 里程碑文件同步

**Files:**
- Modify: `CHANGELOG.md` `[Unreleased]`
- Modify: `README.md`（若新增 analytics doc 連結）
- Modify: `TODOS.md`

- [ ] **Step 1: CHANGELOG** — Wave 1 條目：決策卡、漏斗、SW periodic、analytics props

- [ ] **Step 2: README** — 驗證區或 analytics 段落連結 `docs/analytics/funnel-cook-success.md`

- [ ] **Step 3: TODOS** — 勾選或拆 Wave 1 子項

- [ ] **Step 4: 全量測試 + build**

```bash
pnpm -F @chef/web test
pnpm -F @chef/web build
```

- [ ] **Step 5: Commit + push main**

```bash
git add CHANGELOG.md README.md TODOS.md
git commit -m "docs: Wave 1 cook-success milestone sync"
git push origin main
```

---

## 驗收標準（Wave 1 Done）

| # | 標準 |
|---|------|
| 1 | 生成結果頂部顯示決策卡（分鐘／人數／需買 N 樣） |
| 2 | PostHog 可見 6 步漏斗（文件已描述） |
| 3 | `cooking_mode_started` 含 `source` |
| 4 | iPhone GA 清單已跑並記錄於 PWA_DEVICE_QA |
| 5 | PWA 安裝後晚餐推播可於設定時間觸發（client 或 periodic sync） |
| 6 | `pnpm -F @chef/web test` 全綠 |

---

## 刻意不在 Wave 1

- Pantry／今晚清單（Wave 2）
- 一鍵簡化步驟二次生成（Wave 2）
- 週曆 Tonight 一鍵（Wave 3）
- OAuth／付費（Wave 4）
