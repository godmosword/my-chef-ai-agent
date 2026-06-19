# AGENTS.md

## Cursor Cloud specific instructions

- Agent 編排：[`docs/AGENT-WORKFLOW.md`](docs/AGENT-WORKFLOW.md) · Domain：[`docs/AGENT-DOMAIN.md`](docs/AGENT-DOMAIN.md)

### Overview

**職人料理大腦**（Chef AI Brain）為 **pnpm monorepo**，現行產品僅 **Web**：

- **產品**：[`web/`](web/)（Next.js → Vercel）
- **設計 token**：[`packages/design-tokens/`](packages/design-tokens/) — 改色：`pnpm tokens:build`
- **共用型別**：[`packages/shared-types/`](packages/shared-types/)

### Monorepo 約定

| 變更路徑 | 觸發 CI | 備註 |
|----------|---------|------|
| `web/**`、`packages/**` | `web-ci.yml` | `pnpm -F @chef/web build` |
| `docs/**` only | 通常無 CI | |

- **packages 不可互相 import**（僅 apps 依賴 packages）。
- **Web 分層**（`web/domain`、`web/application`、`web/platform`；`web/lib` 僅 copy／locale／utils 等）：`domain` 不得 import `platform` 或 `application`。見 [`web/README.md`](web/README.md) 與 [`docs/superpowers/specs/2026-05-26-midterm-architecture-design.md`](docs/superpowers/specs/2026-05-26-midterm-architecture-design.md)。
- **Token 流程**：編輯 `packages/design-tokens/src/tokens.json` → `pnpm tokens:build` → Web 使用 `tokens.css`。

### Running the Web dev server（僅本機開發）

```bash
pnpm install
cp web/.env.example web/.env.local
pnpm tokens:build
pnpm dev:web
```

- 首頁：`http://localhost:3000` — **僅供開發除錯，不是 deploy 目標，也不是 agent 預設驗收網址。**
- 正式環境：**Vercel**（Root Directory = `web`；**Include files outside root**；`GEMINI_API_KEY` 必填）

### Running tests

```bash
pnpm -F @chef/web test
pnpm -F @chef/web build
```

### External services

| Service | Env | Notes |
|---------|-----|-------|
| Gemini | `GEMINI_API_KEY` | 必填 |
| Postgres | `DATABASE_URL` | Neon；`pnpm -F @chef/web db:migrate` |
| OpenAI 圖像 | `OPENAI_API_KEY` / `IMAGE_OPENAI_API_KEY` | 可選主圖 |

### Plan／里程碑收尾（必做）

同步 **`TODOS.md`**、**`CHANGELOG.md`**、**`README.md`**（見 [`CONTRIBUTING.md`](CONTRIBUTING.md)）。

### Git／部署流程（維護者／Agent 必遵守）

**正式出貨 = Vercel Production，不是 localhost。**

| 步驟 | 動作 |
|------|------|
| 1 | 改程式 |
| 2 | `pnpm -F @chef/web test`（與／或 `pnpm -F @chef/web build`） |
| 3 | `git commit` → **`git push origin main`** |
| 4 | Vercel 自動部署；請使用者在 **Production URL** 驗收 |

- **不開 PR** 作為本倉庫預設出貨路徑（fork 協作者除外，見 `CONTRIBUTING.md`）。
- **不要**為了驗收而啟動 dev server 並丟 `localhost` 連結；無法靜態驗證時在聊天中明說，請使用者在 Vercel 上測。
- Production 環境變數設在 **Vercel Dashboard**（見 `web/README.md`）；`web/.env.local` 僅本機。
- **不要**把 GCP Cloud Build／根目錄 `Dockerfile` 當產品主線 deploy（可關閉 trigger，避免與 Vercel 重複）。
- 完整條文：[`CLAUDE.md`](CLAUDE.md)；Cursor 規則 [`.cursor/rules/vercel-main-ship.mdc`](.cursor/rules/vercel-main-ship.mdc)。

### Gotchas

- 未設 `DATABASE_URL` 時 Web 無記憶／收藏／配額（僅單次聊天）。
- Serverless 函式有執行時間上限；長 AI 請求可能逾時。
