# 職人料理大腦

以 **Gemini** 為核心的 AI 食譜助理。**現行產品為 Web 版**（[`web/`](web/)，部署於 **Vercel**）；瀏覽器即可聊天、收藏、生成主圖與下載海報。

---

## 快速開始（Web · 建議）

```bash
cd web
cp .env.example .env.local   # 填入 GEMINI_API_KEY
npm install
npm run dev
```

開啟 http://localhost:3000

**正式部署**：Vercel 專案 **Root Directory = `web`**，設定 `GEMINI_API_KEY`；記憶／收藏／菜系需 **Neon**（`DATABASE_URL`）。  
完整說明：[`web/README.md`](web/README.md)

設計與分階段規格：[`docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md`](docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md)

---

## Web 功能總覽

| 類別 | 說明 |
|------|------|
| 食譜 | 輸入需求 → 結構化食譜卡（`kitchen_talk`、食材、步驟、採買、成本） |
| 記憶 | 多輪對話（`user_memory`，需 Postgres） |
| 配額 | 每日次數（`usage_daily`） |
| 收藏 | 我的最愛 |
| 菜系 | 頂部 chip 切換料理情境 |
| 主圖 | 食譜卡「生成主圖」（`IMAGE_PROVIDER`） |
| 海報 | 下載可列印 HTML |
| 法規 | `/legal/disclaimer`、`/legal/privacy` |

---

## 技術棧（Web）

- **框架**：Next.js 15（App Router）
- **AI**：OpenAI 相容 API → Gemini（`GEMINI_API_KEY`）
- **資料庫**：Neon Postgres（`@neondatabase/serverless`），schema 與 [`init_db.py`](init_db.py) 相同
- **部署**：Vercel（[`web/vercel.json`](web/vercel.json)）

---

## 資料庫（Web 與舊版共用）

- Migration：[`migrations/`](migrations/)
- 建表：`python3 init_db.py`（需 `DATABASE_URL`）
- 說明：[`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)、[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md)

---

## 專案結構

```text
my-chef-ai-agent/
├── web/                 # ★ 現行產品（Next.js，Vercel）
│   ├── app/             # 頁面與 API routes
│   ├── components/
│   └── lib/
├── app/                 # 封存：LINE FastAPI（見 docs/LEGACY_LINE_BOT.md）
├── main.py              # 封存入口
├── tests/               # Python 單元／整合測試
├── docs/
├── migrations/
├── init_db.py
├── render.yaml          # 封存：Render LINE 部署
└── …
```

---

## 封存：LINE Bot + Render

若仍維護 LINE 官方帳號與 Render webhook，請改閱 **[`docs/LEGACY_LINE_BOT.md`](docs/LEGACY_LINE_BOT.md)**（指令、Rich Menu、`render.yaml`、Flex／Playwright 海報、兩段式圖卡等）。  
**新部署請以 Web 為主，不再建議新開 LINE 路線。**

---

## Python 測試（維護共用模組）

```bash
pip install -r requirements-dev.txt
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```

---

## 文件與治理

| 檔案 | 用途 |
|------|------|
| [`CHANGELOG.md`](CHANGELOG.md) | 變更紀錄 |
| [`TODOS.md`](TODOS.md) | Backlog |
| [`AGENTS.md`](AGENTS.md) | Agent／本機維運（含直推 `main`） |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 貢獻與里程碑收尾 |
| [`docs/UX_PLAYBOOK.md`](docs/UX_PLAYBOOK.md) | UX 規範（Web UI 對齊設計 token） |

---

## 開源與授權

- **授權**：MIT — [`LICENSE`](LICENSE)
- **第三方**：[`docs/THIRD_PARTY_LICENSES.md`](docs/THIRD_PARTY_LICENSES.md)
- **開源自查**：[`docs/OPEN_SOURCE_CHECKLIST.md`](docs/OPEN_SOURCE_CHECKLIST.md)
- 外部 API 須遵守 Google Gemini、OpenAI 等服務條款；LINE 僅封存路徑需要。
