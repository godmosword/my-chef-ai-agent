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
2. **Settings → General → Root Directory** 填 **`web`**（必填；無法寫在 `vercel.json` 裡）
3. **只需手動加一個環境變數** `GEMINI_API_KEY`（見下方）
4. Deploy

> 若 Build 報錯 `vercel.json ... additional property rootDirectory`：請拉最新 main／PR，並確認倉庫**根目錄沒有** `vercel.json`，設定在 `web/vercel.json`。

### 環境變數：你只要設定 `GEMINI_API_KEY`

`MODEL_NAME` **不用**在 Vercel 介面設定。程式預設已是 `gemini-3.1-flash-lite`；[`web/vercel.json`](vercel.json) 也會在部署時帶入同名變數。

| 變數 | 是否必須在 Dashboard 新增 | 說明 |
|------|-------------------------|------|
| `GEMINI_API_KEY` | **是** | Google AI Studio 金鑰 |
| `MODEL_NAME` | 否 | 預設 `gemini-3.1-flash-lite` |
| `DATABASE_URL` | 否（要記憶／收藏才要） | 連 Neon 後自動注入 |

**在 Vercel 新增 `GEMINI_API_KEY` 的步驟：**

1. 打開專案 → 上方 **Settings**
2. 左側 **Environment Variables**
3. 點 **Add Environment Variable**（或 **Add New**）
4. **Key**：`GEMINI_API_KEY`
5. **Value**：貼上你的金鑰
6. 勾選 **Production**（建議 Preview、Development 一併勾選）
7. **Save** → 到 **Deployments** 對最新部署選 **Redeploy**

若畫面上只有 Neon 自動產生的變數、沒有「新增」按鈕，通常是權限或視窗寬度問題；可改用 [Vercel CLI](https://vercel.com/docs/cli/env)：`vercel env add GEMINI_API_KEY production`。

`MODEL_NAME` 等非機密變數由 [`web/vercel.json`](vercel.json) 的 `env` 區塊提供；機密金鑰仍請用 Dashboard 設定。

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
