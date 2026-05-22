# 職人料理大腦 — Web（Vercel）

**Monorepo 現行產品。** 從 repo 根目錄以 pnpm 開發；LINE Bot 見 [`apps/line-bot`](../line-bot/)。

## 本機開發

```bash
# repo 根
pnpm install
cp apps/web/.env.example apps/web/.env.local
# 填入 GEMINI_API_KEY
pnpm tokens:build
pnpm dev:web
```

開啟 http://localhost:3000

## Vercel 部署

1. Import repo
2. **Root Directory** = **`apps/web`**
3. 啟用 **Include source files outside of the Root Directory in the Build Step**
4. **Install Command**（建議）：`cd ../.. && pnpm install --frozen-lockfile`
5. **Build Command**（建議）：`cd ../.. && pnpm tokens:build && pnpm -F @chef/web build`
6. 設定 `GEMINI_API_KEY`；Neon 連結後有 `DATABASE_URL`

`MODEL_NAME` 等見 [`vercel.json`](vercel.json)，通常不必在 Dashboard 重複設定。

## API

- `GET /api/health`、`GET /api/quota`
- `POST /api/recipes`、`POST /api/recipes/hero`、`POST /api/recipes/poster`
- `GET|PUT /api/cuisine`、`DELETE /api/memory`
- `GET|POST /api/favorites`、`DELETE /api/favorites/:id`

需 cookie `chef_session`。

## 資料庫

```bash
cd apps/line-bot && python3 init_db.py   # 與 Web 共用 schema
```

## 設計 token

Web 使用 `@chef/design-tokens/tokens.css`（見 `app/globals.css`）。
