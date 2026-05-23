# 待辦與後續方向

本檔為倉庫內**工程／產品／UX** 的單一 backlog 來源；**已完成事項**只保留於下方「里程碑摘要」與 `CHANGELOG.md`，避免與未來工作混寫在一起。

**里程碑收尾**（每完成一輪可交付的計畫）：同步更新 **`CHANGELOG.md`**、**`README.md`**、本檔，細項見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」。

---

## 里程碑摘要（近期已交付，供對齊／查帳）

| 時間 | 內容 |
|------|------|
| 2026-05-22 | **Monorepo + Design Tokens**：pnpm workspace（`web`、`@chef/design-tokens`、`@chef/shared-types`）；`web-ci.yml`；規格已核准並實作。 |
| 2026-05-23 | **Web 遷移 Phase 0–3**：`web/` Next.js on Vercel（聊天、Neon 記憶／收藏／配額、菜系、主圖、 HTML 海報、legal）。 |
| 2026-05-23 | **移除 LINE Bot 與 Render**：刪除 `apps/line-bot/`、`line-bot-ci.yml`、相關部署文件；產品僅 Web。 |
| 2026-05-23 | **Vercel 部署修正**：`web/vercel.json`；Dashboard **Root Directory = `web`**（實體目錄；`apps/web` 已搬遷）。 |
| 2026-05-23 | **Prompt 3 — Today + Library UI**：Tailwind、primitives、App shell、`/app/*` 頁面；`NEXT_PUBLIC_NEW_UI=1` 啟用；規格 [`2026-05-23-today-library-ui.md`](docs/superpowers/specs/2026-05-23-today-library-ui.md)。 |
| 2026-05-23 | **Prompt 4 — Cooking Mode**：`/app/library/:id/cook`、計時器／語音／Wake Lock、`PATCH /api/recipes/:id`；`NEXT_PUBLIC_COOKING_MODE_ENABLED=1`；規格 [`2026-05-23-cooking-mode.md`](docs/superpowers/specs/2026-05-23-cooking-mode.md)。 |
| 2026-05-23 | **Prompt 5 — Meal Planner + Shopping**：`meal_plans`、週曆／採買頁、單位聚合；`NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`；規格 [`2026-05-23-meal-planner.md`](docs/superpowers/specs/2026-05-23-meal-planner.md)。 |
| 2026-05-23 | **Prompt 6 — PWA + Offline**：Serwist SW、Dexie 快取、離線 Library／Cook、A2HS；規格 [`2026-05-23-pwa-offline.md`](docs/superpowers/specs/2026-05-23-pwa-offline.md)。 |
| 2026-04-26 | **UX Playbook 補齊**：新增 `docs/UX_PLAYBOOK.md`，落地互動狀態矩陣、A11y 基線、microcopy 規範與使用者流程圖，作為後續 UI 驗收基準。 |
| 2026-04-26 | **全域 UI/UX 視覺一致化**：新增 `design_tokens.py` 與 `ui_contracts.py`，Flex/海報 HTML/Pillow/圖卡/法規頁全部改為共享語義色票；新增 `UI_COMPONENT_CONTRACT.md` 與 token 一致性測試。 |
| 2026-04-24 | **生圖與 Token 優化**：Deep Research 併入 system 前截斷（`DEEP_RESEARCH_MAX_CHARS_IN_SYSTEM`）；圖卡 Stage A prompt 精簡；hero 下載與底圖並行；`MAX_COMPLETION_TOKENS` 註解與截斷測試；全量 **140 passed**。 |
| 2026-04-24 | **主圖與媒體**：fallback 不快取、圖片重試／timeout、`media_storage`（memory/gcs）、兩段式圖卡 postback。 |
| 2026-04-23 | **程式碼清理與 token 精簡**：移除殭屍函式與重複邏輯；`job_queue` 合併 dispatch；`SYSTEM_PROMPT` 與 Deep Research／vision prompt 去冗餘。 |
| 2026-04-23 | **溫暖明亮主題全線**：`flex_theme`、Pillow 海報、HTML 海報統一溫暖米白／琥珀金／深森綠；換菜單等 Flex 需符合 LINE 之 HEX 色（曾修正 `rgba` 導致無回應）。 |
| 2026-04-23 | **Render 產圖可部署**：`render.yaml` 的 `buildCommand` 含 `pip`、**`playwright install --with-deps chromium`** 與 **`apt-get install fonts-noto-cjk`**；與本機 `Dockerfile` 路徑分離問題已釐清。 |
| 2026-04-23 | **食譜海報**：`recipe_poster_html.py` 以 Playwright 截圖；本機 CJK 以 `@font-face` + 系統字型，避免純依賴 Google Fonts 於 headless 環境失敗。 |
| 2026-04-23 | **低延遲與佇列**：Deep Research 預設關、短 timeout；YouTube 背景快取；佇列 worker 預設 4。 |
| 更早 | 兩段式圖卡、Deep Research Grounding、OpenAI 主圖、多租戶 Postgres、配額與限流等——詳見 `CHANGELOG.md` 舊條。 |

---

## 零、部署後建議手動驗收（Web · Vercel）

- [ ] **健康檢查**：`GET /api/health` 回 `ai_configured: true`、正確 `model`
- [ ] **聊天**：輸入菜名 → 食譜卡顯示
- [ ] **Neon**：有 `DATABASE_URL` 時顯示今日配額、可收藏、可切換菜系、可清除記憶
- [ ] **主圖**：「生成主圖」有圖（placeholder 或 OpenAI）
- [ ] **海報**：「下載海報」取得 HTML 且可列印

---

## 零點五、Web（Vercel）— 現行主線

> 規格：[`docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md`](docs/superpowers/specs/2026-05-23-line-to-web-vercel-design.md)

- [x] **Phase 0**：`web/` Next.js 聊天 + `/api/recipes` + 匿名 session（2026-05-23）
- [x] **Phase 1**：Neon — 對話記憶、收藏、每日配額、legal 頁（2026-05-23）
- [x] **Phase 2**：主圖 API、HTML 海報下載、菜系選擇 UI（2026-05-23）
- [x] **Phase 3**：README／AGENTS 以 Web 為主（2026-05-23）
- [x] **移除 LINE／Render 程式與 CI**（2026-05-23）
- [x] **Monorepo 重構**：`apps/*` + `@chef/design-tokens` + 分離 CI（2026-05-22）
- [x] **Prompt 3 — Today + Library UI**（Tailwind、primitives、patterns、`/app` 路由；flag `NEXT_PUBLIC_NEW_UI`）（2026-05-23）
- [x] **Prompt 4 — Cooking Mode**（全螢幕烹飪、計時器、語音、評分 PATCH；flag `NEXT_PUBLIC_COOKING_MODE_ENABLED`）（2026-05-23）
- [x] **Prompt 5 — Meal Planner + Shopping**（週曆、DnD、採買聚合、列印；flag `NEXT_PUBLIC_MEAL_PLAN_ENABLED`）（2026-05-23）
- [x] **Prompt 6 — PWA + Offline**（Serwist、Dexie、離線 Library／Cook、manifest；build 預設產 SW）（2026-05-23）

### Prompt 6 後續（PWA / Offline）

> 規格：[`docs/superpowers/specs/2026-05-23-pwa-offline.md`](docs/superpowers/specs/2026-05-23-pwa-offline.md)

- [ ] **真機驗收**：安裝 PWA、飛航模式 Library／Cook、評分同步、SW 更新（規格 §13）
- [ ] **Vercel**：production build 勿設 `ENABLE_PWA=false`（除非刻意關閉）
- [ ] **Library 收藏**：離線 optimistic + `favorite_*` mutations UI
- [ ] **Lighthouse PWA**：補 screenshots、分數截圖存檔
- [ ] **Background Sync**：若未來要 POST 食譜離線佇列，另開項（目前刻意 NetworkOnly）

### Prompt 5 後續（Meal Planner）

> 規格：[`docs/superpowers/specs/2026-05-23-meal-planner.md`](docs/superpowers/specs/2026-05-23-meal-planner.md)

- [ ] **Vercel**：Dashboard 加 `NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`（與 `NEW_UI` 一併）
- [ ] **真機驗收**：週曆 DnD（touch 長按）、跨週導覽、採買列印預覽
- [ ] **聚合單元測試**：`shopping-list-aggregation.test.ts`（可選）
- [ ] **PDF API**：目前 print-only；若要做伺服器 PDF 另開項

### Prompt 4 後續（Cooking Mode）

> 規格：[`docs/superpowers/specs/2026-05-23-cooking-mode.md`](docs/superpowers/specs/2026-05-23-cooking-mode.md)

- [ ] **真機驗收**：Wake Lock 5 分鐘、背景計時、震動／鈴聲、iOS Safari 全螢幕（見規格 §13）
- [ ] **E2E**：進入 cook → 切步 → 完成評分（Playwright）

### Prompt 3 後續（UI）

> 規格：[`docs/superpowers/specs/2026-05-23-today-library-ui.md`](docs/superpowers/specs/2026-05-23-today-library-ui.md)

- [ ] **真 SSE 串流**：`POST /api/recipes?stream=1`（Prompt 2.5）
- [ ] **⌘K CommandBar**
- [ ] **Library 收藏切換** UI 接 `POST/DELETE /api/favorites`
- [ ] **菜系篩選計數** 由 API 提供 aggregate
- [ ] **E2E**：Today 生成、Library 列表（Playwright）

## 三點五、Phase 3+ — Recipe Library（Prompt 2）

> 規格（待撰寫）：`docs/superpowers/specs/2026-05-XX-recipe-library-data-model.md`  
> 依賴：`@chef/shared-types` 空殼已就緒。

- [x] **Recipe Library 實作**（Drizzle + `recipes`／`recipe_versions`／`recipe_tags`／`favorites_v2`；`usage_daily` text/image 配額拆分；Web API 持久化與列表）（2026-05-22）
- [ ] **Recipe Library 資料模型 spec** 正式文件化（`docs/superpowers/specs/2026-05-XX-recipe-library-data-model.md`）

### Web 後續（未排進 Phase 0–3）

- [ ] **圖片上傳辨識**：瀏覽器上傳食材圖 → vision API
- [ ] **兩段式食譜圖卡**：Stage A 底圖 + Stage B 疊字（Web 版，非 Flex）
- [ ] **海報 PNG**：Playwright 或服務端截圖（現僅 HTML 下載）
- [ ] **Deep Research**：可選 grounding（預設關）
- [ ] **OAuth 登入**：取代純匿名 `chef_session`（規格 Phase 3+ 可選）
- [ ] **DB 產品洞察**：[`2026-05-22-db-insights-design.md`](docs/superpowers/specs/2026-05-22-db-insights-design.md) — `scripts/db_product_insights.py`、`GET /admin/insights`（僅規格，未實作）

## 一、平台與後端（backlog）

### 建議優先

- [ ] **Web API 每 session 節流**

### 可排期

- [ ] **可觀測性加強**：結構化 log 已有 request id；可補匯出或儀表板化。
- [ ] **多租戶嚴格化**：`user_memory` 等與 HTTP `tenant_id` 需 migration、欄位與查詢一致時再補。
- [ ] **整合測試**：testcontainers 或 CI 內嵌 Postgres 覆寫 `DATABASE_URL` 路徑（現以 mock／無 DB 為主）。

### 低優先

- [x] ~~**README 內大段手動 SQL**~~：migration 以 `web/migrations/` 為單一來源
- [ ] **兩段式圖卡主題模板**（Web 版）
- [ ] **Deep Research 啟用策略**：只對高價值查詢啟用或加 memoization，避免延遲與成本回彈。
- [ ] **GPT-Image-2 prompt 微調**：若底圖仍偶發問題，針對菜名長度與版面做 A/B。
- [ ] **圖片配額策略**：按需出圖成本偏高時，評估綁付費方案或每日圖片額度。

---

## 二、商業化（可緩）

- [ ] **金流接 webhook**：`BILLING_PROVIDER` 與 checkout 以外，實作 PSP 回寫訂閱與對帳。

---

## 三、產品與文件

- [ ] **偏好編輯**：讓使用者在聊天中改寫 `user_preferences`（指令或小流程）。
- [ ] **版本策略**：是否 semver + git tag、release 與 `CHANGELOG` 日期的對應方式。
- [ ] **README 雙語**：若對象以英文讀者為主，可另增 `README.en.md` 或分區塊英譯。

---

## 四、已知限制

### Web（Vercel）

- 未設 **`DATABASE_URL`** 時：無多輪記憶、收藏、配額、菜系；僅單次聊天與 placeholder 主圖。
- **Serverless** 函式有執行時間上限；極長 AI 請求可能逾時（見規格風險表）。
- **主圖**：`IMAGE_PROVIDER=placeholder` 為備援圖；真實生圖需 `openai_compatible` 與對應金鑰。
- **海報**：下載為 HTML（尚無伺服端 PNG 截圖）。
