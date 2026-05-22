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
3. Environment Variables：
   - `GEMINI_API_KEY`（**必填**）
   - `MODEL_NAME`（建議 `gemini-3.1-flash-lite-preview`，與 Python 版一致；錯誤模型會出現 `404 status code (no body)`）
4. Deploy

若從**倉庫根目錄**匯入 Vercel，根目錄已含 `vercel.json` 的 `"rootDirectory": "web"`；亦可於 Dashboard 手動將 Root Directory 設為 `web`。

## Phase 1（Neon）

1. Vercel → Storage → **Neon Postgres** → 連結專案（自動注入 `DATABASE_URL`）
2. 首次可於本機對 DB 執行：`python3 init_db.py`（根目錄 migration 與 Python 版相同 schema）
3. 重新 Deploy

功能：多輪對話記憶、每日配額、收藏、清除記憶。

## API

- `GET /api/health` — 存活檢查
- `GET /api/quota` — 今日用量
- `POST /api/recipes` — body `{ "message": "..." }`（含記憶與配額）
- `DELETE /api/memory` — 清除對話
- `GET|POST /api/favorites` — 收藏列表／新增
- `DELETE /api/favorites/:id` — 刪除收藏

皆需瀏覽器 cookie `chef_session`。

設計規格見 [`docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md`](../docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md)。
