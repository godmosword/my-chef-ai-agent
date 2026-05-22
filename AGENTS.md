# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**職人料理大腦**（Chef AI Brain）為 **pnpm monorepo**，現行產品僅 **Web**：

- **產品**：[`apps/web/`](apps/web/)（Next.js → Vercel）
- **設計 token**：[`packages/design-tokens/`](packages/design-tokens/) — 改色：`pnpm tokens:build`
- **共用型別**：[`packages/shared-types/`](packages/shared-types/)

### Monorepo 約定

| 變更路徑 | 觸發 CI | 備註 |
|----------|---------|------|
| `apps/web/**`、`packages/**` | `web-ci.yml` | `pnpm -F @chef/web build` |
| `docs/**` only | 通常無 CI | |

- **packages 不可互相 import**（僅 apps 依賴 packages）。
- **Token 流程**：編輯 `packages/design-tokens/src/tokens.json` → `pnpm tokens:build` → Web 使用 `tokens.css`。

### Running the Web dev server

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm tokens:build
pnpm dev:web
```

- 首頁：`http://localhost:3000`
- Vercel：**Root Directory = `apps/web`**；**Include files outside root**；`GEMINI_API_KEY` 必填

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

- 改動完成後：**在 `main` commit 並 `git push origin main`**（不開 PR 作為主要出貨）。
- Vercel 環境變數見 `apps/web/README.md`。

### Gotchas

- 未設 `DATABASE_URL` 時 Web 無記憶／收藏／配額（僅單次聊天）。
- Serverless 函式有執行時間上限；長 AI 請求可能逾時。
