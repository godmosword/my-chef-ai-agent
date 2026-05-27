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
| `NEXT_PUBLIC_PANTRY_TONIGHT=1` | Tonight「今晚清冰箱」清單（最多 5 樣）；生成／採買／步驟整合 |
| `NEXT_PUBLIC_MEAL_PLAN_ENABLED=1` | 側欄 Plan／Shopping；週曆與採買聚合 API；生成後可「加入本週菜單」 |
| （未設或 `0`） | `/` 為經典 `ChatPanel`；`/legacy` 永遠可用 |

規格：[`docs/superpowers/specs/2026-05-23-today-library-ui.md`](../docs/superpowers/specs/2026-05-23-today-library-ui.md)、[`2026-05-23-cooking-mode.md`](../docs/superpowers/specs/2026-05-23-cooking-mode.md)、[`2026-05-23-meal-planner.md`](../docs/superpowers/specs/2026-05-23-meal-planner.md)

## Vercel 部署（唯一正式環境）

本產品**不上線到 localhost**。出貨流程：改 code → 測試／build → **`git push origin main`** → Vercel 自動部署 Production。見根目錄 [`CLAUDE.md`](../CLAUDE.md)、[`AGENTS.md`](../AGENTS.md)。

1. Import repo
2. **Root Directory** = **`web`**（實體目錄，勿用符號連結）
3. 啟用 **Include source files outside of the Root Directory in the Build Step**
4. **Install Command**（建議）：`cd .. && pnpm install --frozen-lockfile`
5. **Build Command**（建議）：`cd .. && pnpm tokens:build && pnpm -F @chef/web build`
6. 設定 `GEMINI_API_KEY`；Neon 連結後有 `DATABASE_URL`
7. （建議）`NEXT_PUBLIC_NEW_UI=1`、`NEXT_PUBLIC_COOKING_MODE_ENABLED=1`、`NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`、`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_DISPLAY_TIMEZONE=Asia/Taipei`

`MODEL_NAME` 等見 [`vercel.json`](vercel.json)，通常不必在 Dashboard 重複設定。

### 文字生成成本

- `MAX_COMPLETION_TOKENS` production 預設 `896`，可在 Vercel Dashboard 覆寫。
- 情境提示只在命中「清冰箱／兒童餐／預算／心情」時加入短 system 規則。
- `user_memory` 只保存上次食譜摘要，完整食譜仍由 `recipes` / `recipe_versions` 持久化。

## 程式分層（`domain` / `application` / `platform`）

一次搬遷後的約定（細節見 [`docs/superpowers/specs/2026-05-26-midterm-architecture-design.md`](../docs/superpowers/specs/2026-05-26-midterm-architecture-design.md)）：

| 目錄 | 職責 | 範例 |
|------|------|------|
| `domain/` | 純邏輯與型別，無 DB／瀏覽器 I/O | `recipe/`、`cook/`、`plan/`、`pantry/`（預留） |
| `application/` | 編排、對外 API client、hero 生圖、通知排程 | `api/`、`hero/`、`notifications/` |
| `platform/` | DB、離線同步、analytics、identity、config | `db/`、`sync/`、`analytics/` |
| `lib/` | 展示層鄰近：copy、demo、marketing、`utils/`、`locale/`、`theme` | 不 import `platform` 寫入邏輯 |

**依賴**：`domain` → 不 import `platform`／`application`；`components`／`app` → `application` + `domain` + 允許的 `lib`。

## API

- `GET /api/health`、`GET /api/quota`（`text`／`image` 配額 bucket）
- `GET|POST /api/recipes`（POST 產生食譜並可持久化；GET 列表）
- `GET|PATCH|DELETE /api/recipes/[id]`（PATCH：`rating`、`record_cook`）、`POST /api/recipes/[id]/tags`、`GET /api/recipes/[id]/versions`
- `POST /api/recipes/hero`（legacy 手動主圖；**image** 配額）
- `GET /api/recipes/[id]/hero-status`（主圖狀態 polling）、`POST /api/recipes/[id]/hero`（重生主圖）
- `POST /api/recipes/[id]/steps/[stepIndex]/image`（按需產生單一步驟插圖；**image** 配額 1 次）
- `POST /api/recipes/poster`
- `GET|PUT /api/cuisine`、`DELETE /api/memory`
- `GET|PATCH /api/me/dietary-preferences`（家庭飲食偏好與需避開食材）
- `GET|POST /api/favorites`（`recipe_id` 或 legacy `recipe_name`+`recipe_data`）、`DELETE /api/favorites/:id`
- `GET /api/plan?week_of=`、`PUT /api/plan/:date/:slot`、`GET /api/plan/shopping/:week`（需 `MEAL_PLAN` flag；legacy 週曆 `meal_calendar_entries`）
- **MP-1 週菜單規劃（後端）**：`generateMealPlan()`、`expandSlotToFullRecipe()`（`web/application/meal-planning/`）；表 `meal_plans`／`meal_slots`／`meal_plan_pantry_snapshot`（migration `0016`）。**尚無 HTTP 觸發**（MP-2 UI）。伺服器 env 見 `.env.example` 的 `ENABLE_MEAL_PLANNING`、`MEAL_PLAN_*`。

需 cookie `chef_session`。

## 資料庫

```bash
# 初次或升級（建議跑完整 migrate 至最新；至少需含 0001、0003、0008、0009）
pnpm -F @chef/web db:migrate
```

`db:migrate` 會自動讀取 `web/.env.local` 的 `DATABASE_URL`（Neon URL 請用雙引號包住，避免 `&` 被 shell 誤解析）。

```bash
pnpm -F @chef/web test
```

## 圖片與配額策略

- 免費預設：文字食譜完成後只自動處理 1 張成品主圖。
- 步驟插圖：使用者在食譜詳情或烹飪流程需要時才按需產生，每一步使用 1 次 image 配額。
- `AUTO_STEP_IMAGES=0` 是成本友善預設；只有設為 `1` 才會背景批次產生最多 `MAX_STEP_IMAGES` 張步驟圖。
- 圖片生成失敗不會阻斷文字食譜，UI 會提示仍可開始料理。

## 設計 token

Web 使用 `@chef/design-tokens/tokens.css`（見 `app/globals.css`）。
