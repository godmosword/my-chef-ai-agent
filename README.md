# 職人料理大腦

以 **Gemini** 為核心的 AI 食譜助理。**pnpm monorepo**：現行產品為 **Web**（[`apps/web/`](apps/web/) → Vercel）；**LINE Bot** 封存維護於 [`apps/line-bot/`](apps/line-bot/)。

設計語彙單一來源：[`@chef/design-tokens`](packages/design-tokens/)（Python Flex／海報 + Next.js CSS）。

---

## 快速開始

### 前置

- Node **≥ 20**、**pnpm ≥ 9**（見根目錄 `packageManager`）
- Python **≥ 3.11**（僅 LINE Bot／DB 腳本）

```bash
pnpm install
```

### Web（建議）

```bash
cp apps/web/.env.example apps/web/.env.local   # GEMINI_API_KEY
pnpm dev:web
```

→ http://localhost:3000

部署：**Vercel Root Directory = `apps/web`**，並啟用 **Include files outside Root Directory**。詳見 [`apps/web/README.md`](apps/web/README.md)。

### LINE Bot（封存）

```bash
pnpm line:dev
# 或
cd apps/line-bot && uvicorn main:app --reload --port 8000
```

詳見 [`apps/line-bot/README.md`](apps/line-bot/README.md)、[`docs/LEGACY_LINE_BOT.md`](docs/LEGACY_LINE_BOT.md)。

### Design tokens 變更

```bash
pnpm tokens:build
bash apps/line-bot/scripts/sync_tokens.sh   # LINE 薄包裝
```

---

## Monorepo 結構

```text
my-chef-ai-agent/
├── apps/
│   ├── web/              # ★ Next.js（Vercel）
│   └── line-bot/         # FastAPI LINE（Render / Cloud Run）
├── packages/
│   ├── design-tokens/    # tokens.json → css / py / tailwind-preset
│   └── shared-types/     # Recipe 型別空殼（Prompt 2）
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

規格：[`docs/superpowers/specs/2026-05-22-monorepo-and-design-tokens.md`](docs/superpowers/specs/2026-05-22-monorepo-and-design-tokens.md)

---

## 驗證

```bash
pnpm tokens:build
pnpm -F @chef/web build
pnpm line:test    # 151 passed, 2 skipped（153 collected）
```

---

## 文件

| 檔案 | 用途 |
|------|------|
| [`apps/web/README.md`](apps/web/README.md) | Web API、Vercel |
| [`apps/line-bot/README.md`](apps/line-bot/README.md) | LINE、pytest、Render |
| [`CHANGELOG.md`](CHANGELOG.md) | 變更紀錄 |
| [`TODOS.md`](TODOS.md) | Backlog |
| [`AGENTS.md`](AGENTS.md) | Agent 維運 |

---

## 授權

MIT — [`LICENSE`](LICENSE)
