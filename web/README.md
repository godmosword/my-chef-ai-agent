# 職人料理大腦 — Web（Vercel）

**Monorepo 唯一產品。** 從 repo 根目錄以 pnpm 開發。

## 本機開發

```bash
# repo 根
pnpm install
cp web/.env.example web/.env.local
# 填入 GEMINI_API_KEY
pnpm tokens:build
pnpm dev:web
```

開啟 http://localhost:3000

### 新 UI（Prompt 3）

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_NEW_UI=1` | `/` 為 Landing；`/app` 為 Today／Library／Me |
| `NEXT_PUBLIC_COOKING_MODE_ENABLED=1` | 食譜詳情顯示「進入烹飪模式」 |
| `NEXT_PUBLIC_MEAL_PLAN_ENABLED=1` | 側欄 Plan／Shopping；週曆與採買聚合 API |
| （未設或 `0`） | `/` 為經典 `ChatPanel`；`/legacy` 永遠可用 |

規格：[`docs/superpowers/specs/2026-05-23-today-library-ui.md`](../docs/superpowers/specs/2026-05-23-today-library-ui.md)、[`2026-05-23-cooking-mode.md`](../docs/superpowers/specs/2026-05-23-cooking-mode.md)、[`2026-05-23-meal-planner.md`](../docs/superpowers/specs/2026-05-23-meal-planner.md)

## Vercel 部署

1. Import repo
2. **Root Directory** = **`web`**（實體目錄，勿用符號連結）
3. 啟用 **Include source files outside of the Root Directory in the Build Step**
4. **Install Command**（建議）：`cd .. && pnpm install --frozen-lockfile`
5. **Build Command**（建議）：`cd .. && pnpm tokens:build && pnpm -F @chef/web build`
6. 設定 `GEMINI_API_KEY`；Neon 連結後有 `DATABASE_URL`
7. （可選）`NEXT_PUBLIC_NEW_UI=1` 啟用新 App shell；`NEXT_PUBLIC_COOKING_MODE_ENABLED=1` 啟用烹飪模式；`NEXT_PUBLIC_MEAL_PLAN_ENABLED=1` 啟用週曆／採買

`MODEL_NAME` 等見 [`vercel.json`](vercel.json)，通常不必在 Dashboard 重複設定。

## API

- `GET /api/health`、`GET /api/quota`（`text`／`image` 配額 bucket）
- `GET|POST /api/recipes`（POST 產生食譜並可持久化；GET 列表）
- `GET|PATCH|DELETE /api/recipes/[id]`（PATCH：`rating`、`record_cook`）、`POST /api/recipes/[id]/tags`、`GET /api/recipes/[id]/versions`
- `POST /api/recipes/hero`（legacy 手動主圖；**image** 配額）
- `GET /api/recipes/[id]/hero-status`（主圖狀態 polling）、`POST /api/recipes/[id]/hero`（重生主圖）
- `POST /api/recipes/poster`
- `GET|PUT /api/cuisine`、`DELETE /api/memory`
- `GET|POST /api/favorites`（`recipe_id` 或 legacy `recipe_name`+`recipe_data`）、`DELETE /api/favorites/:id`
- `GET /api/plan?week_of=`、`PUT /api/plan/:date/:slot`、`GET /api/plan/shopping/:week`（需 `MEAL_PLAN` flag）

需 cookie `chef_session`。

## 資料庫

```bash
# 初次或升級（**必須含 0001 Phase1**：subscriptions / usage_daily；或跑完整 migrate 至 0007）
pnpm -F @chef/web db:migrate
```

`db:migrate` 會自動讀取 `web/.env.local` 的 `DATABASE_URL`（Neon URL 請用雙引號包住，避免 `&` 被 shell 誤解析）。

```bash
pnpm -F @chef/web test   # Vitest（30 tests：cooking、unit-normalizer、shopping-parse、migration 等）
```

## 設計 token

Web 使用 `@chef/design-tokens/tokens.css`（見 `app/globals.css`）。
