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

**新 UI（Prompt 3）**：在 `web/.env.local` 設 `NEXT_PUBLIC_NEW_UI=1` 後重啟 dev，造訪 `/`（Landing）與 `/app`（今晚吃什麼／Tonight 主頁）。未設時根路徑仍為經典聊天；`/legacy` 永遠可用。

**App 主流程（`NEXT_PUBLIC_NEW_UI=1`）**：

| 路由 | 說明 |
|------|------|
| `/app` | 輸入區（placeholder 輪播、Quick Chips、今晚靈感、最近食譜）；配額在「我的」 |
| `/app/library` | 我的食譜（可刪除、收藏、離線快取） |
| `/app/library/:id` | 食譜詳情（份量切換、⋯ 選單、mobile sticky 烹飪 CTA） |
| `/app/library/:id/cook` | 烹飪模式（需 `NEXT_PUBLIC_COOKING_MODE_ENABLED=1`） |
| `/app/me` | 個人檔案、配額、晚餐提醒設定 |

桌面側欄：Logo 下方為個人區塊（預設顯示名稱「美食家」），其下為「下廚／規劃」導航。UX 細節見 [`docs/ux-spec.md`](docs/ux-spec.md)。產品進化路線見 [`docs/superpowers/specs/2026-05-26-product-evolution-design.md`](docs/superpowers/specs/2026-05-26-product-evolution-design.md)。

**烹飪模式（Prompt 4）**：另設 `NEXT_PUBLIC_COOKING_MODE_ENABLED=1`，於食譜詳情頁顯示「進入烹飪模式」（路由 `/app/library/:id/cook` 亦可直連）。

**週曆與採買（Prompt 5）**：另設 `NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`，側欄出現 Plan／Shopping（`/app/plan`、`/app/shopping`）。

**PWA 與離線（Prompt 6）**：production `next build` 會產生 `public/sw.js`（Serwist）。本機 dev 預設不註冊 SW。關閉：build 設 `ENABLE_PWA=false`，或 client 設 `NEXT_PUBLIC_ENABLE_PWA=false`。圖示：`pnpm -F @chef/web icons:generate`（需 pnpm）。離線可讀已快取食譜（最近 20 筆）；生成新食譜仍需連線。

**公開分享（Prompt 7）**：預設開啟（`NEXT_PUBLIC_SHARING_ENABLED=0` 可關）。料理書詳情可建立公開連結 `/r/:token`；需設定 `NEXT_PUBLIC_SITE_URL`（分享與 OG）。Neon 需跑 migration `web/migrations/0005_public_sharing.sql`。

**分析（Prompt 7）**：選填 `NEXT_PUBLIC_POSTHOG_KEY`（與 `NEXT_PUBLIC_POSTHOG_HOST`）；設 `NEXT_PUBLIC_ANALYTICS_ENABLED=0` 關閉。使用者在「我的」可關閉匿名事件。

**主圖與步驟插圖（Prompt 8）**：新食譜預設只背景生成或提供 **1 張成品主圖**；烹飪步驟插圖改由使用者在食譜詳情主動按「產生這一步的示意圖」，每次清楚提示使用 1 次 **image** 配額。需 `DATABASE_URL`；真實生圖設 `IMAGE_PROVIDER=openai_compatible` 與 `IMAGE_OPENAI_API_KEY`（或 `OPENAI_API_KEY`）。`AUTO_HERO_IMAGE=0` 可關閉主圖；`AUTO_STEP_IMAGES=1` 才會恢復背景批次步驟圖（不建議免費預設）。

**Neon migration**：部署或本機連線 DB 後執行 `pnpm -F @chef/web db:migrate`（含 `0008` 分享／設定、`0009` 食譜版本 `prep_minutes`／`servings` 等）。未跑 `0009` 時生成仍會降級寫入，但建議補齊 schema。

**家庭飲食偏好**：在「我的／偏好」可設定不吃辣、兒童餐、低油低鹽與需避開食材。設定存於 `user_preferences.preferences`，只用於生成 prompt 與結果提示，不送入 analytics。

**日期與配額日界線**：UI 日期、週菜單與每日配額預設以 `Asia/Taipei` 判斷（`NEXT_PUBLIC_DISPLAY_TIMEZONE` 可覆寫）；資料庫 timestamp 仍維持 UTC 儲存。

**文字生成成本**：production `MAX_COMPLETION_TOKENS` 預設 `896`；情境提示只在命中「清冰箱／兒童餐／預算／心情」時加入短規則，對話記憶只保存上次食譜摘要，降低後續請求 token。

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
pnpm -F @chef/web test   # 目前 64 項（18 個測試檔）
```

---

## 文件

| 檔案 | 用途 |
|------|------|
| [`web/README.md`](web/README.md) | Web API、Vercel、資料庫 |
| [`CHANGELOG.md`](CHANGELOG.md) | 變更紀錄 |
| [`TODOS.md`](TODOS.md) | Backlog |
| [`AGENTS.md`](AGENTS.md) | Agent 維運 |
| [`docs/ux-spec.md`](docs/ux-spec.md) | App UX/UI 實作規格（Tonight、食譜、烹飪、錯誤態） |
| [`docs/design-tokens.md`](docs/design-tokens.md) | 設計 token 對照 |
| [`docs/analytics/funnel-cook-success.md`](docs/analytics/funnel-cook-success.md) | PostHog 煮成功漏斗（Wave 1） |
| [`docs/superpowers/specs/2026-05-26-product-evolution-design.md`](docs/superpowers/specs/2026-05-26-product-evolution-design.md) | 產品進化路線（已核准） |

---

## 授權

MIT — [`LICENSE`](LICENSE)
