# Cooking Mode（Prompt 4）

**狀態**：實作中  
**旗標**：`NEXT_PUBLIC_COOKING_MODE_ENABLED=1` 顯示 Detail 入口；路由 `/app/library/:id/cook` 可直連。

## 路由

- `web/app/(cooking)/app/library/[id]/cook` — 無 AppShell，全螢幕
- Query：`?step=N`、`?voice=1`

## 資料

- RSC：`getRecipeForUser` → 正規化 `CookingStep[]`（`timer_seconds` 或 `parseTimerFromText`）
- Client：計時／步驟／語音全在瀏覽器；`sessionStorage` 可恢復 session

## API

- `PATCH /api/recipes/:id` — `{ rating?, last_cooked_at? }`（`cook_count` 伺服端 +1）

## 限制

- 無 framer-motion；無第三方計時／TTS 套件
- 真機 Wake Lock 5 分鐘需人工 checklist（見 Prompt 4 §13）
