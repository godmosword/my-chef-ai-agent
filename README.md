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
pnpm -F @chef/web test   # Vitest（recipe payload + migration SQL）
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
