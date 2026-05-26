# PostHog — 煮成功漏斗（Wave 1）

北極星：**生成成功 → 進入烹飪 → 煮完**（事件名勿改，僅補屬性）。

## 建議漏斗（6 步）

| 順序 | 事件 | 備註 |
|------|------|------|
| 1 | `recipe_generation_started` | 可篩 `NEXT_PUBLIC_NEW_UI=1` |
| 2 | `recipe_generation_succeeded` | 含 `has_decision_card: true` |
| 3 | `cooking_mode_started` | 含 `source`：`detail` / `sticky_cta` / `demo` / `library_list` |
| 4 | `cooking_mode_completed` | 含 `duration_bucket`、`rating_bucket` |
| 5 | `recipe_cook_recorded` | 若已實作 PATCH 成功事件 |
| 6 | `dinner_reminder_fired` | 選用；`channel: sw \| client` |

**轉化視窗**：7 天（PostHog Funnel → Conversion window）。

**篩選**（建議）：

- Property `NEXT_PUBLIC_NEW_UI` 或環境 tag = production
- 排除 `is_demo: true`（若要看真實料理書路徑）

## 北極星公式（示意）

```
煮完率 = unique(cooking_mode_completed) / unique(recipe_generation_succeeded)
```

可依 `source` 分組比較 sticky CTA vs 詳情主按鈕。

## PostHog UI 建立步驟（人工）

1. Insights → New → Funnel
2. 依上表依序加入事件
3. Conversion window = **7 days**
4. Breakdown（可選）：`source` on step 3
5. 儲存至 Dashboard「Wave 1 — Cook Success」

截圖可貼於內部 Notion；本 repo 不存圖。

## 相關程式

- 事件定義與 bucket：`web/lib/analytics/events.ts`
- 烹飪來源 query：`web/lib/cooking/cook-source.ts`
- 產品規格：[`docs/superpowers/specs/2026-05-26-product-evolution-design.md`](../superpowers/specs/2026-05-26-product-evolution-design.md)
