# Agent Domain Sheet — 職人料理大腦（Chef AI Brain）

> `/agent-plan` 與 `/agent-action` 會讀此檔的 Bootstrap、紅線、驗證矩陣。  
> Meta 流程見 [`AGENT-WORKFLOW.md`](AGENT-WORKFLOW.md)。

---

## 專案識別

| 欄位 | 值 |
|------|-----|
| **專案名稱** | 職人料理大腦（Chef AI Brain） |
| **主要技術棧** | pnpm monorepo · Next.js（Vercel）· Gemini · Neon Postgres |
| **回應語言** | 繁體中文 |

---

## Bootstrap（Plan / Action 必讀）

大任務或不熟模組時依序讀：

| 優先 | 檔案 | 用途 |
|------|------|------|
| 1 | `CLAUDE.md` | 出貨紅線、commit 風格、部署流程 |
| 2 | `AGENTS.md` | monorepo 約定、測試命令、外部服務 |
| 3 | `web/README.md` | Web 分層、Vercel 設定、功能旗標 |
| 4 | `TODOS.md` / `CHANGELOG.md` | 待辦與已 ship（**TODOS 檔首可能落後**，以 CHANGELOG／程式為準） |
| 5 | `CONTRIBUTING.md` | 里程碑文件同步、出貨慣例 |

### 依任務加讀

| 任務類型 | 加讀 |
|----------|------|
| Web UI / 路由 | `docs/superpowers/specs/2026-05-23-today-library-ui.md`、相關 spec |
| 架構／分層 | `docs/superpowers/specs/2026-05-26-midterm-architecture-design.md` |
| 烹飪模式 | `docs/superpowers/specs/2026-05-23-cooking-mode.md` |
| 週菜單／採買 | `docs/superpowers/specs/2026-05-23-meal-planner.md` |
| Design tokens | `packages/design-tokens/`、`DESIGN.md` |
| DB／migration | `web/platform/db/`、`pnpm -F @chef/web db:migrate` |
| Deploy／Vercel | `web/vercel.json`、`.cursor/rules/vercel-main-ship.mdc` |

---

## 紅線（Plan 違反 → CRITICAL）

| 紅線 | 說明 |
|------|------|
| **正式環境 = Vercel** | 禁止以 `localhost` 作 deploy 或驗收目的地；勿為驗收啟動 dev server（除非使用者明確要求） |
| **分層依賴** | `web/domain` 不得 import `platform` 或 `application`；`packages` 不可互相 import |
| **預設不 commit／push** | 僅在使用者明確要求時 commit；push 需使用者說「ship／push main」 |
| **出貨路徑** | 預設直推 `main`（不開 PR）；禁止把 GCP Cloud Build／根目錄 `Dockerfile` 當產品主線 |
| **AI 與資料** | `GEMINI_API_KEY` 為必填；長 AI 請求須顧及 serverless 逾時；未設 `DATABASE_URL` 時無記憶／收藏／配額 |
| **里程碑文件** | 較大工程完成時須同步 `TODOS.md`、`CHANGELOG.md`、`README.md`（見 `plan-ship-docs.mdc`） |

---

## 驗證矩陣

依 **變更觸及面** 跑最小集合（未全綠不得宣稱完成）：

| 觸及 | 必跑（最小） |
|------|----------------|
| **Web 預設** | `pnpm -F @chef/web test` |
| **型別／編譯** | `npx tsc -p web --noEmit` |
| **Build（出貨前）** | `pnpm -F @chef/web build` |
| **Design tokens** | `pnpm tokens:build`（改 `packages/design-tokens/` 時） |
| **DB schema** | `pnpm -F @chef/web db:migrate`（本機／staging 驗證 migration） |

對齊 CI：`web/**` 或 `packages/**` 變更觸發 `web-ci.yml`（`pnpm -F @chef/web build`）。

**Production 驗收：** Vercel Production URL（`NEXT_PUBLIC_SITE_URL`）；無法靜態驗證 UI 時須在回覆中明說。

---

## Protected paths / models

| 路徑／領域 | 要求 |
|------------|------|
| `web/domain/` | 架構邊界；禁止廉價模型大改；必跑 `pnpm -F @chef/web test` |
| `web/platform/db/`、migrations | Leader 或 L3；必跑 build + 相關 test |
| Gemini prompt／AI 管線（`web/application/` hero、chat） | 必跑 test；注意 token 成本與逾時 |
| `packages/shared-types/` | 型別契約；改動須對齊 Web consumer |

---

## Docs sync（可見行為變更時）

| 變更類型 | 同步 |
|----------|------|
| 使用者可見行為 | `CHANGELOG.md` |
| 待辦／完成度 | `TODOS.md` |
| 功能、環境變數、測試數 | `README.md`、`web/README.md` |
| Agent 指令／導航 | `CLAUDE.md`、`AGENTS.md` |

---

## Ship 政策

| 情境 | 行為 |
|------|------|
| 預設 | **不** commit / push |
| 使用者說「commit」 | 只 stage **本次相關檔**；禁止 `git add -A` |
| 使用者說「ship／push main」 | scoped tests／build 全綠後 `git push origin main`；請使用者在 Vercel Production 驗收 |
| branch protection | 失敗時報錯，改人類處理 |

---

## 專案反模式

| 反模式 | 為什麼 |
|--------|--------|
| 用 localhost 代替 Vercel 驗收 | 違反出貨流程；Production 才是正式環境 |
| 為出貨開 PR／feature branch | 本 repo 主線是直推 `main` |
| `domain` import `platform` | 破壞分層、難測試 |
| 里程碑不同步 TODOS／CHANGELOG | 待辦與事實脫節 |
| 改 token 忘記 `pnpm tokens:build` | Web CSS 與設計不一致 |

---

## 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-06-19 | 初版 Domain sheet（agent-orchestration bootstrap） |
