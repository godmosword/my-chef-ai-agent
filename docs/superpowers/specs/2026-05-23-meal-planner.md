# Weekly Meal Planner + Shopping List（Prompt 5）

**狀態**：已實作  
**旗標**：`NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`

## 路由

- `/app/plan?week_of=YYYY-MM-DD` — 週曆（`week_of` 自動 floor 至週一）
- `/app/shopping?week_of=...` — 採買清單（列印優先；PDF API 未啟用）

## API

- `GET /api/plan?week_of=` — 21 slots
- `PUT /api/plan/:date/:slot` — upsert / 清除
- `GET /api/plan/shopping/:week` — 聚合採買清單

## 資料

- Migration `0004_meal_plans.sql`
- `recipe_versions.shopping_list` 經 `parseShoppingList` 正規化（字串或物件）

## 單位歸併

- `packages/shared-types/src/unit-normalizer.ts`
- 保守合併：僅 `normalizeName` 完全相同

## UI

- Desktop 7×3 table；Mobile 7 rows × 3 cols
- `@dnd-kit/core` 拖拉（touch 1s 啟動）
- 採買清單 checkbox 僅前端 state
