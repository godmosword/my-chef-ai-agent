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

**週曆與採買（Prompt 5）**：另設 `NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`，側欄出現 Plan／Shopping（`/app/plan`、`/app/shopping`）。

**PWA 與離線（Prompt 6）**：production `next build` 會產生 `public/sw.js`（Serwist）。本機 dev 預設不註冊 SW。關閉：build 設 `ENABLE_PWA=false`，或 client 設 `NEXT_PUBLIC_ENABLE_PWA=false`。圖示：`pnpm -F @chef/web icons:generate`（需 pnpm）。離線可讀已快取食譜（最近 20 筆）；生成新食譜仍需連線。

**公開分享（Prompt 7）**：預設開啟（`NEXT_PUBLIC_SHARING_ENABLED=0` 可關）。料理書詳情可建立公開連結 `/r/:token`；需設定 `NEXT_PUBLIC_SITE_URL`（分享與 OG）。Neon 需跑 migration `web/migrations/0005_public_sharing.sql`。

**分析（Prompt 7）**：選填 `NEXT_PUBLIC_POSTHOG_KEY`（與 `NEXT_PUBLIC_POSTHOG_HOST`）；設 `NEXT_PUBLIC_ANALYTICS_ENABLED=0` 關閉。使用者在「我的」可關閉匿名事件。

**主圖與步驟插圖（Prompt 8）**：新食譜背景生成**主圖**與**烹飪步驟 AI 插圖**（Cook 模式逐步顯示；最多 `MAX_STEP_IMAGES`，預設 6 步）。需 `DATABASE_URL`；真實生圖設 `IMAGE_PROVIDER=openai_compatible` 與 `IMAGE_OPENAI_API_KEY`（或 `OPENAI_API_KEY`）。`AUTO_HERO_IMAGE=0`／`AUTO_STEP_IMAGES=0` 可關閉；「我的」可關閉個人主圖偏好。每張圖各計入每日 **image** 配額（主圖 1 次 + 每步 1 次）。

**行銷首頁（Prompt 9）**：`NEXT_PUBLIC_NEW_UI=1` 時 `/` 為 Landing（Hero 產品 mock + 三步驟 + 情境卡）；情境卡片連 `/app?prefill=…`。`public/marketing/hero-three-cup-chicken.jpg` 僅供 API 主圖備援（見 `web/public/marketing/README.md`）。

**PWA 真機驗收**：見 [`docs/PWA_DEVICE_QA.md`](docs/PWA_DEVICE_QA.md)（飛航模式、Cook 計時、收藏離線同步）。

### 部署與出貨（維護者／Agent）

| 項目 | 規則 |
|------|------|
| **正式環境** | **Vercel**（Root Directory = `web`，Include files outside root）— 見 [`web/README.md`](web/README.md) |
| **出貨** | `git commit` → **`git push origin main`**（預設不開 PR） |
| **驗收** | Vercel Production URL，**不是** `localhost` |
| **本機** | `pnpm dev:web` 僅開發用 |

完整條文：[`CLAUDE.md`](CLAUDE.md)、[`AGENTS.md`](AGENTS.md)、Cursor [`.cursor/rules/vercel-main-ship.mdc`](.cursor/rules/vercel-main-ship.mdc)。

可選：GCP Cloud Build 若仍連到本 repo 會 build 根目錄 `Dockerfile`；**產品主線仍是 Vercel**。不需要 Cloud Run 時請關閉 GCP trigger。

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
pnpm -F @chef/web test   # Vitest（30 tests：recipe、migration、cooking、meal-plan 單位／解析）
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
