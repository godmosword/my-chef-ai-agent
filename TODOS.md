# 待辦與後續方向

本檔為倉庫內**工程／產品／UX** 的單一 backlog 來源；**已完成事項**只保留於下方「里程碑摘要」與 `CHANGELOG.md`，避免與未來工作混寫在一起。

**里程碑收尾**（每完成一輪可交付的計畫）：同步更新 **`CHANGELOG.md`**、**`README.md`**、本檔，細項見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」。

---

## 個人化記憶（Personalization Memory）

- [x] **PM-1**：`user_taste_profile`／`household_members` migration `0010`、[`web/platform/db/personalization.ts`](web/platform/db/personalization.ts) CRUD、刪除帳戶連動
- [x] **PM-2**：[`web/application/personalization/`](web/application/personalization/) 規則＋LLM 萃取、背景 `waitUntil` 寫入、收藏／再來一道 feedback API
- [x] **PM-3**：[`personalization-context.ts`](web/application/personalization/personalization-context.ts) + [`assemble-system-prompt`](web/application/recipe/assemble-system-prompt.ts) 注入生成；`GET /api/metrics` 個人化計數
- [x] **PM-4**：Web [`/app/profile`](web/app/(app)/app/profile/page.tsx) CRUD、[`/app/onboarding`](web/app/(app)/app/onboarding/page.tsx)、`applied_personalization` 透明說明；（LINE Bot 已移除，Flex／指令 N/A）
- [x] **PT-1**：migration `0013`、`domain/pantry` 正規化（238 別名）、`platform/db/pantry.ts` CRUD／合併策略、刪帳連動
- [x] **PT-2**：Gemini Vision 冰箱／收據辨識、審核 session、`/api/pantry/vision`、[`/app/pantry/scan`](web/app/(app)/app/pantry/scan/page.tsx)、手動輸入 API
- [x] **PT-3**：[`/app/pantry`](web/app/(app)/app/pantry/page.tsx) CRUD UI、`/api/me/pantry`、清冰箱 DB 連動、食譜 ✓ 冰箱有標註；（LINE Flex N/A）
- [x] **PT-4**：效期提醒（App 收件匣 + Cron）、用完它反向推薦、週報、通知偏好（migration `0015`）
- [x] **P0（個人化 + 冰箱）**：PM-1～PM-4、PT-1～PT-4 已交付

## P1 — 週菜單與習慣（P0 完成後）

- [x] **MP-1**：`meal_plans`／`meal_slots`／`meal_plan_pantry_snapshot`、兩段式規劃演算法、lazy 展開食譜（migration `0016`）
- [ ] **MP-2**：週菜單規劃 UI（觸發規劃、檢視 slots、啟用計畫）
- [x] **MP-3**：採買清單合併與分類（`shopping_lists`／`shopping_list_items`、merge 引擎、Web API、`/app/plan/[planId]/shopping`、`/shop/[token]` 分享；migration `0017`；LINE N/A）
- [x] **MP-4**：每日菜單／晚餐提醒／採買提醒／週回顧（App 收件匣 + Cron `meal-plan-daily`）；slot cooked/skip + pantry 扣減 API；`/app/dashboard`、`/app/plan/[id]/review`；migration `0018`；LINE N/A
- [x] **P1**：MP-1～MP-4 後端與 Web 執行迴路已閉環（MP-2 規劃 UI 仍待補）
- [ ] **P1-3**：通知 Web Push（需使用者授權，補強收件匣）
- [ ] **P2**：語音引導烹飪、超市整合、營養追蹤（placeholder）

## 中長期架構 — 三支柱並行（[`spec`](docs/superpowers/specs/2026-05-26-midterm-architecture-design.md)）

- [x] **Architecture sprint**：`web/lib` → `domain/` · `application/` · `platform/` **一次搬遷**（2026-05-27）
- [x] `AGENTS.md` + `web/README.md` 分層約定 + `web/eslint.config.mjs`
- [x] P2：`NEXT_PUBLIC_PANTRY_TONIGHT` + `domain/pantry` + 今晚清單 UI／採買扣減／步驟標註
- [x] P3：Tonight→週曆一鍵、採買扣 pantry、週菜單分享連結（需 `MEAL_PLAN` flag）

## 產品進化 Wave 1 — 煮成功（[`spec`](docs/superpowers/specs/2026-05-26-product-evolution-design.md) · [`plan`](docs/superpowers/plans/2026-05-26-wave1-cook-success-plan.md)）

- [x] **決策卡**：生成結果頂部顯示時間／人數／需購買 N 樣
- [x] **烹飪漏斗**：`cooking_mode_*` 補 `source`／duration；PostHog 6 步漏斗（[`docs/analytics/funnel-cook-success.md`](docs/analytics/funnel-cook-success.md)）
- [x] **晚餐推播 SW**：`periodicsync` + 同日 dedupe（見 Wave 1 plan Task 5）
- [ ] **烹飪 GA**：iPhone 真機清單（§3.5.2–3.5.5、§4 — 待人工；§3.5.6、3.5.8 已由 E2E 覆蓋）

## UX 規格後續（[`docs/ux-spec.md`](docs/ux-spec.md)）

- [x] **PWA 晚餐提醒**：Service Worker `periodicsync` + client timer + 同日 dedupe
- [ ] **Landing 視覺**：與 App token 完全對齊（P2-2 收尾）
- [ ] **⌘K CommandBar**（spec 暫緩，側欄已移除頂部搜尋占位）

## P1 — 驗證留存與下廚流程（確認 P0 後）

- [ ] iPhone 真機驗收烹飪模式（Wake Lock、背景計時、提示音）
- [ ] 分享至 LINE／Threads OG 預覽
- [ ] 週菜單加入食譜流程優化
- [ ] 收藏後再次料理流程
- [ ] 7 天回訪漏斗（PostHog dashboard）
- [x] Playwright E2E：生成 → 收藏 → 烹飪 → 完成 → 分享（`web/e2e/*`，CI `web-ci.yml`）

## P2 — 確認留存後再評估

- [ ] OAuth 登入與跨裝置同步
- [ ] 付費方案與圖片額度策略
- [ ] 家庭多人共享週菜單
- [ ] 食材照片辨識
- [ ] 社群料理卡片自動生成
- [ ] 食材選物或合作導購

---

## 里程碑摘要（近期已交付，供對齊／查帳）

| 時間 | 內容 |
|------|------|
| 2026-05-31 | **Code review 低優先收尾**：Legacy API（memory／cuisine／hero／poster）移除；`server-only` DB 護欄；display-name 拆至 browser-storage；Library／Plan 響應式小修；撤銷誤推 MP-2／shared-types 大搬移（`009eb1c` revert 後重做本 slice）。 |
| 2026-05-31 | **Code review 階段 1–8 收尾**：Legacy ChatPanel 移除（`ec201f9`）；server/client 邊界、響應式自查、build／E2E／bundle 驗證；`NEXT_PUBLIC_NEW_UI` 清掉；`metadataBase`、standalone E2E（`97b37fc`）。 |
| 2026-05-27 | **架構一次搬遷 + P0**：`domain/`／`application/`／`platform/`；個人化 PM-1～4、冰箱 PT-1～4、MP-1 後端；migration `0010`–`0016`。 |
| 2026-05-26 | **E2E + step_tip + 剩菜續作**：Playwright 漏斗（mock API + demo cook）；`step_tip` 生成／詳情／烹飪；完成頁剩菜 prefill；`CookingModeClient` 完成後停止 URL sync。 |
| 2026-05-26 | **產品進化規格**：[`2026-05-26-product-evolution-design.md`](docs/superpowers/specs/2026-05-26-product-evolution-design.md)；Wave 1 實作計畫 [`2026-05-26-wave1-cook-success-plan.md`](docs/superpowers/plans/2026-05-26-wave1-cook-success-plan.md)。 |
| 2026-05-26 | **料理書刪除 + DB 韌性**：`DELETE /api/recipes/:id` UI；`recipe_versions` 缺 `0009` 欄位時自動降級；`.gitignore` 加入 `web/.env.local`。 |
| 2026-05-26 | **桌面側欄**：個人區塊（美食家）移至 Logo 下方，不再貼底。 |
| 2026-05-22 | **UX 規格 Phase 1–7**：`docs/ux-spec.md`；Tonight 主頁重組、食譜 CTA／份量／錯誤態、晚餐提醒卡、設計 token 別名；規格見 [`docs/ux-spec.md`](docs/ux-spec.md)。 |
| 2026-05-22 | **Monorepo + Design Tokens**：pnpm workspace（`web`、`@chef/design-tokens`、`@chef/shared-types`）；`web-ci.yml`；規格已核准並實作。 |
| 2026-05-23 | **Web 遷移 Phase 0–3**：`web/` Next.js on Vercel（聊天、Neon 記憶／收藏／配額、菜系、主圖、 HTML 海報、legal）。 |
| 2026-05-23 | **移除 LINE Bot 與 Render**：刪除 `apps/line-bot/`、`line-bot-ci.yml`、相關部署文件；產品僅 Web。 |
| 2026-05-23 | **Vercel 部署修正**：`web/vercel.json`；Dashboard **Root Directory = `web`**（實體目錄；`apps/web` 已搬遷）。 |
| 2026-05-23 | **Prompt 3 — Today + Library UI**：Tailwind、primitives、App shell、`/app/*` 頁面；`NEXT_PUBLIC_NEW_UI=1` 啟用；規格 [`2026-05-23-today-library-ui.md`](docs/superpowers/specs/2026-05-23-today-library-ui.md)。 |
| 2026-05-23 | **Prompt 4 — Cooking Mode**：`/app/library/:id/cook`、計時器／語音／Wake Lock、`PATCH /api/recipes/:id`；`NEXT_PUBLIC_COOKING_MODE_ENABLED=1`；規格 [`2026-05-23-cooking-mode.md`](docs/superpowers/specs/2026-05-23-cooking-mode.md)。 |
| 2026-05-23 | **Prompt 5 — Meal Planner + Shopping**：`meal_plans`、週曆／採買頁、單位聚合；`NEXT_PUBLIC_MEAL_PLAN_ENABLED=1`；規格 [`2026-05-23-meal-planner.md`](docs/superpowers/specs/2026-05-23-meal-planner.md)。 |
| 2026-05-23 | **Prompt 6 — PWA + Offline**：Serwist SW、Dexie 快取、離線 Library／Cook、A2HS；規格 [`2026-05-23-pwa-offline.md`](docs/superpowers/specs/2026-05-23-pwa-offline.md)。 |
| 2026-05-23 | **Prompt 7 — Public Sharing + Polish**：公開 `/r/:token`、分享 API、設定／刪帳戶、PostHog、錯誤頁；規格 [`2026-05-23-public-sharing.md`](docs/superpowers/specs/2026-05-23-public-sharing.md)。 |
| 2026-05-23 | **Prompt 8 — Hero 自動化**：`POST /api/recipes` 背景主圖、`hero_status` polling、占位 UI、設定開關；migration `0006`。 |
| 2026-05-23 | **Prompt 9 — Marketing Landing**：五段式首頁、prefill、OG image、情境卡片；圖片放 `public/marketing/`。 |
| 2026-05-23 | **Prompt 10 — Today Polish**：Hero quick prompts、配額 sidebar 樣式、Greeting subtitle、空狀態引導。 |
| 2026-05-24 | **Frontend Wave 4a–4b**：暗色 token、Today 結果主圖、詳情／公開版面、烹飪 polish；規格 [`2026-05-24-frontend-wave4-design.md`](docs/superpowers/specs/2026-05-24-frontend-wave4-design.md)。 |
| 2026-05-26 | **Web token／dead-code cleanup**：情境 prompt 改短規則、記憶只存上次食譜摘要、production `MAX_COMPLETION_TOKENS=896`；刪除未引用舊 components／hooks／prompt lists 與未使用依賴。 |
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

## 零、Neon 資料庫（部署後若 API 500）

- [x] **本機 migration**（2026-05-22）：`pnpm -F @chef/web db:migrate` 已套用 **`0001`–`0016`**（共 15 支；含個人化 `0010`–`0012`、冰箱 `0013`–`0014`、通知 `0015`、週菜單 v2 `0016`）
- [ ] **Vercel Production Neon**：確認遠端 DB 亦已跑至 `0016`（部署後若 API 500 先查 migration 版本）
- [ ] 或 Neon SQL Editor 手動補跑：`web/migrations/*.sql`（以 `db:migrate` 為單一來源為佳）
- [ ] 確認：`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;`（應含 `pantry_items`、`user_taste_profile`、`meal_slots` 等）

## 零點一、部署後建議手動驗收（Web · Vercel）

- [ ] **健康檢查**：`GET /api/health` 回 `ai_configured: true`、正確 `model`
- [ ] **聊天**：輸入菜名 → 食譜卡顯示
- [ ] **Neon**：有 `DATABASE_URL` 時顯示今日配額、可收藏、可切換菜系、可清除記憶
- [x] **主圖 + 按需步驟插圖**：新食譜預設只處理成品主圖；步驟圖需使用者主動按鈕觸發並使用 1 次 image 配額
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
- [x] **Prompt 7 — Public Sharing + Polish**（公開頁、分享 lifecycle、設定、PostHog、文案；migration `0005`）（2026-05-23）

### Prompt 7 後續（Sharing / Polish）

> 規格：[`docs/superpowers/specs/2026-05-23-public-sharing.md`](docs/superpowers/specs/2026-05-23-public-sharing.md)

- [ ] **Neon**：執行 `0005_public_sharing.sql`（若尚未跑過，建議改跑完整 `db:migrate`）
- [ ] **Vercel**：`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_POSTHOG_KEY`（選填 `POSTHOG_HOST`）
- [ ] **真機**：LINE／FB 連結預覽 OG；重新發布／撤銷 curl 或 UI 驗收
- [ ] **Analytics**：PostHog 儀表板對照事件清單
- [ ] **其餘埋點**：plan／shopping／favorite 等（可選）

### Prompt 6 後續（PWA / Offline）

> 規格：[`docs/superpowers/specs/2026-05-23-pwa-offline.md`](docs/superpowers/specs/2026-05-23-pwa-offline.md)

- [ ] **真機驗收**：安裝 PWA、飛航模式 Library／Cook、評分同步、SW 更新（清單 [`docs/PWA_DEVICE_QA.md`](docs/PWA_DEVICE_QA.md)）
- [ ] **Vercel**：production build 勿設 `ENABLE_PWA=false`（除非刻意關閉）
- [x] **Library 收藏**：離線 optimistic + `favorite_*` mutations UI（2026-05-24）
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
- [x] **Library 收藏切換** UI 接 `POST/DELETE /api/favorites`（2026-05-24）
- [ ] **菜系篩選計數** 由 API 提供 aggregate
- [ ] **E2E**：Today 生成、Library 列表（Playwright）

### Frontend Wave 4（旅程切片）

> 規格：[`docs/superpowers/specs/2026-05-24-frontend-wave4-design.md`](docs/superpowers/specs/2026-05-24-frontend-wave4-design.md) · 計畫：[`docs/superpowers/plans/2026-05-24-frontend-wave4-plan.md`](docs/superpowers/plans/2026-05-24-frontend-wave4-plan.md)

- [x] **Wave 4a**：暗色 token、Today 結果主圖、`RecipeDetailLayout`（2026-05-24）
- [x] **Wave 4b**：烹飪模式 typography／完成 toast、公開頁版面、`RecipeDetailSections`（2026-05-24）
- [x] **Wave 4c**：`SectionHeader`、Plan／Shopping／Me 視覺 parity、UX_PLAYBOOK §Web App（2026-05-24）

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
- [ ] **家庭飲食偏好驗收**：在 Vercel production 設定避開食材，確認生成 prompt 套用且分享頁不公開私人偏好。
- [ ] **版本策略**：是否 semver + git tag、release 與 `CHANGELOG` 日期的對應方式。
- [ ] **README 雙語**：若對象以英文讀者為主，可另增 `README.en.md` 或分區塊英譯。

---

## 四、已知限制

### Web（Vercel）

- 未設 **`DATABASE_URL`** 時：無多輪記憶、收藏、配額、菜系；僅單次聊天與 placeholder 主圖。
- 每日配額與 UI 日期預設以 **Asia/Taipei** 判斷；跨時區正式支援需後續加入使用者時區設定或 cookie。
- **Serverless** 函式有執行時間上限；極長 AI 請求可能逾時（見規格風險表）。
- **主圖**：`IMAGE_PROVIDER=placeholder` 為備援圖；真實生圖需 `openai_compatible` 與對應金鑰。
- **海報**：下載為 HTML（尚無伺服端 PNG 截圖）。
