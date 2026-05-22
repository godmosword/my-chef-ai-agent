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

## Vercel 部署

1. Import repo
2. **Root Directory** = **`web`**（實體目錄，勿用符號連結）
3. 啟用 **Include source files outside of the Root Directory in the Build Step**
4. **Install Command**（建議）：`cd .. && pnpm install --frozen-lockfile`
5. **Build Command**（建議）：`cd .. && pnpm tokens:build && pnpm -F @chef/web build`
6. 設定 `GEMINI_API_KEY`；Neon 連結後有 `DATABASE_URL`

`MODEL_NAME` 等見 [`vercel.json`](vercel.json)，通常不必在 Dashboard 重複設定。

## API

- `GET /api/health`、`GET /api/quota`（`text`／`image` 配額 bucket）
- `GET|POST /api/recipes`（POST 產生食譜並可持久化；GET 列表）
- `GET|DELETE /api/recipes/[id]`、`POST /api/recipes/[id]/tags`、`GET /api/recipes/[id]/versions`
- `POST /api/recipes/hero`（**image** 配額）、`POST /api/recipes/poster`
- `GET|PUT /api/cuisine`、`DELETE /api/memory`
- `GET|POST /api/favorites`（`recipe_id` 或 legacy `recipe_name`+`recipe_data`）、`DELETE /api/favorites/:id`

需 cookie `chef_session`。

## 資料庫

```bash
# 初次或升級（Recipe Library）
DATABASE_URL=... pnpm -F @chef/web db:migrate
```

```bash
pnpm -F @chef/web test   # Vitest
```

## 設計 token

Web 使用 `@chef/design-tokens/tokens.css`（見 `app/globals.css`）。
