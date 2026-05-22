# 職人料理大腦 — LINE Bot（封存維護）

FastAPI + LINE Messaging API。現行產品請用 [`apps/web`](../web/)。

## 本機

```bash
cd apps/line-bot
pip install -r requirements.txt -r requirements-dev.txt
cp ../../.env.example .env   # 或 export 環境變數
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  uvicorn main:app --reload --port 8000
```

## 測試

```bash
# 從 repo 根
pnpm line:test

# 或
cd apps/line-bot
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```

預期 **153 collected**（151 passed、2 skipped，需 Postgres 整合測試時）。

## Design tokens

```bash
bash apps/line-bot/scripts/sync_tokens.sh
```

`app/design_tokens.py` 為薄包裝；色票來源為 `packages/design-tokens`。

## 資料庫

```bash
cd apps/line-bot
python3 init_db.py   # 需 DATABASE_URL
```

Migration：`migrations/`。

## 部署

- **Render**：[`render.yaml`](render.yaml)（`rootDir: apps/line-bot`）
- **Cloud Run**：根目錄 CI `line-bot-ci.yml`（`docker build -f apps/line-bot/Dockerfile .`）

完整說明：[`docs/LEGACY_LINE_BOT.md`](../../docs/LEGACY_LINE_BOT.md)。
