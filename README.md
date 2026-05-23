# 職人料理大腦

以 **Gemini** 為核心的 AI 食譜助理。**pnpm monorepo**：產品為 **Web**（[`web/`](web/) → Vercel）。

設計語彙單一來源：[`@chef/design-tokens`](packages/design-tokens/)（Next.js CSS + Tailwind preset）。

---

## 快速開始

### 前置

- Node **≥ 20**、**pnpm ≥ 9**（見根目錄 `packageManager`）

```bash
pnpm install
```

### Web

```bash
cp web/.env.example web/.env.local   # GEMINI_API_KEY
pnpm dev:web
```

→ http://localhost:3000

**新 UI（Prompt 3）**：在 `web/.env.local` 設 `NEXT_PUBLIC_NEW_UI=1` 後重啟 dev，造訪 `/`（Landing）與 `/app`（Today）。未設時根路徑仍為經典聊天；`/legacy` 永遠可用。

**烹飪模式（Prompt 4）**：另設 `NEXT_PUBLIC_COOKING_MODE_ENABLED=1`，於食譜詳情頁顯示「進入烹飪模式」（路由 `/app/library/:id/cook` 亦可直連）。

部署：**Vercel Root Directory = `web`**，並啟用 **Include files outside Root Directory**。詳見 [`web/README.md`](web/README.md)。

### Design tokens 變更

```bash
pnpm tokens:build
```

---

## Monorepo 結構

```text
my-chef-ai-agent/
├── web/                  # Next.js（Vercel）
├── packages/
│   ├── design-tokens/    # tokens.json → css / tailwind-preset
│   └── shared-types/     # Zod Recipe Library 型別（@chef/shared-types）
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

---

## 驗證

```bash
pnpm tokens:build
pnpm -F @chef/web build
pnpm -F @chef/web test   # Vitest（5 tests：recipe payload + migration SQL）
```

---

## 文件

| 檔案 | 用途 |
|------|------|
| [`web/README.md`](web/README.md) | Web API、Vercel、資料庫 |
| [`CHANGELOG.md`](CHANGELOG.md) | 變更紀錄 |
| [`TODOS.md`](TODOS.md) | Backlog |
| [`AGENTS.md`](AGENTS.md) | Agent 維運 |

---

## 授權

MIT — [`LICENSE`](LICENSE)
