# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**職人料理大腦**（Chef AI Brain）為 **pnpm monorepo**：

- **現行產品**：[`apps/web/`](apps/web/)（Next.js → Vercel）
- **封存維護**：[`apps/line-bot/`](apps/line-bot/)（FastAPI LINE → Render LEGACY / Cloud Run CI）
- **設計 token**：[`packages/design-tokens/`](packages/design-tokens/) — 改色先 `pnpm tokens:build`，LINE 再 `bash apps/line-bot/scripts/sync_tokens.sh`

合約規格：[`docs/superpowers/specs/2026-05-22-monorepo-and-design-tokens.md`](docs/superpowers/specs/2026-05-22-monorepo-and-design-tokens.md)

### Monorepo 約定

| 變更路徑 | 觸發 CI | 備註 |
|----------|---------|------|
| `apps/web/**`、`packages/**` | `web-ci.yml` | `pnpm -F @chef/web build` |
| `apps/line-bot/**`、`packages/design-tokens/**` | `line-bot-ci.yml` | `pytest`；push `main` 另可能 Cloud Run deploy |
| `docs/**` only | 通常無 CI | |

- **packages 不可互相 import**（僅 apps 依賴 packages）。
- **Token 流程**：編輯 `packages/design-tokens/src/tokens.json` → `pnpm tokens:build` → Web 自動用 `tokens.css`；LINE 跑 `sync_tokens.sh` 更新 `_generated_tokens.py`（**有 commit 入版**）。

### Running the Web dev server（現行）

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm tokens:build
pnpm dev:web
```

- 首頁：`http://localhost:3000`
- Vercel：**Root Directory = `apps/web`**；**Include files outside root**；`GEMINI_API_KEY` 必填

### Running the legacy LINE server（封存）

```bash
pnpm line:dev
# 或 cd apps/line-bot && uvicorn main:app --reload --port 8000
```

見 [`apps/line-bot/README.md`](apps/line-bot/README.md)、[`docs/LEGACY_LINE_BOT.md`](docs/LEGACY_LINE_BOT.md)。

### Running tests

```bash
pnpm line:test
```

或：

```bash
cd apps/line-bot
pip install -r requirements-dev.txt
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```

**153** collected（151 passed + 2 skipped 為常態）；需 `requirements-dev.txt`（含 Pillow）。

### External services

| Service | Env | Notes |
|---------|-----|-------|
| Gemini | `GEMINI_API_KEY` | Web + LINE |
| LINE | `LINE_CHANNEL_*` | 僅 line-bot |
| Postgres | `DATABASE_URL` | Neon / Render；`apps/line-bot/init_db.py` |
| OpenAI 圖像 | `OPENAI_API_KEY` / `IMAGE_OPENAI_API_KEY` | 可選主圖 |

### Plan／里程碑收尾（必做）

同步 **`TODOS.md`**、**`CHANGELOG.md`**、**`README.md`**（見 [`CONTRIBUTING.md`](CONTRIBUTING.md)）。

### Git／部署流程（維護者／Agent 必遵守）

- 改動完成後：**在 `main` commit 並 `git push origin main`**（不開 PR 作為主要出貨）。
- Vercel／Render Dashboard 手動設定見 `apps/web/README.md`、`apps/line-bot/render.yaml`。

### Gotchas

- LINE／Web 環境變數在 **import 時**驗證（line-bot `app/config.py`）。
- `pytest` 請在 **`apps/line-bot`** 執行（或 `pnpm line:test`）。
- Docker：`docker build -f apps/line-bot/Dockerfile .`（context = repo 根）。
- 改 `apps/web` 不應觸發 line-bot deploy（已 path filter）。
