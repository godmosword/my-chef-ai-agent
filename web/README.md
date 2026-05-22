# 職人料理大腦 — Web（Vercel）

Next.js 網頁版，取代 LINE webhook + Render 作為主要使用入口。

## 本機開發

```bash
cd web
cp .env.example .env.local
# 編輯 .env.local 填入 GEMINI_API_KEY
npm install
npm run dev
```

開啟 http://localhost:3000

## Vercel 部署

1. Import 此 GitHub repo
2. **Root Directory** 設為 `web`
3. Environment Variables：`GEMINI_API_KEY`（必填）、可選 `MODEL_NAME`、`MAX_COMPLETION_TOKENS`
4. Deploy

Phase 1 起可再加 Neon 的 `DATABASE_URL`（對話記憶／收藏）。

## API

- `GET /api/health` — 存活檢查
- `POST /api/recipes` — body `{ "message": "..." }`，需瀏覽器 cookie `chef_session`

設計規格見 [`docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md`](../docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md)。
