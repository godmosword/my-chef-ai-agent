# 待辦與後續方向

本檔為倉庫內**工程／產品／UX** 的單一 backlog 來源；**已完成事項**只保留於下方「里程碑摘要」與 `CHANGELOG.md`，避免與未來工作混寫在一起。

**里程碑收尾**（每完成一輪可交付的計畫）：同步更新 **`CHANGELOG.md`**、**`README.md`**、本檔，細項見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」。

---

## 里程碑摘要（近期已交付，供對齊／查帳）

| 時間 | 內容 |
|------|------|
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

## 零、部署後建議手動驗收（可重複執行）

> 以下無法單靠 CI 覆蓋，需在 **Render（或等價環境）+ 真實 LINE** 各驗一次。

- [ ] **健康檢查**：`GET /` 回 `{"status":"ok"}`；有設 `DATABASE_URL` 時 `GET /ready` 應 200（否則依設計可能 503）。
- [ ] **海報圖**（LINE）：產生任一食譜 →「🖼 生成食譜海報」→ 圖中**中文可讀、無豆腐塊**；版面為溫暖雜誌風（非舊版深色大塊）。
- [ ] **換菜單**（LINE）：觸發菜系輪播／換菜單關鍵字，確認 Bot **有回應**（歷史問題曾為 Flex 顏色格式錯誤遭 API 拒絕）。
- [ ] **主圖 + 海報**（可選）：先「🖼 生成主圖」再海報，確認主圖可嵌入海報（若服務有設定公開 URL 與快取）。

若正式環境仍出現海報亂字：確認該次 build 日誌是否成功執行 `fonts-noto-cjk` 與 `playwright install`（見 `render.yaml`）。

---

## 一、平台與後端（backlog）

### 建議優先

- [ ] **Webhook 每使用者節流**：佇列前依 LINE `userId`（＋`tenant_id`）限流，補齊僅 per-IP 未涵蓋的濫用情境（與 `app/rate_limit.py` 並存）。

### 可排期

- [ ] **可觀測性加強**：結構化 log 已有 request id；可補匯出或儀表板化。
- [ ] **多租戶嚴格化**：`user_memory` 等與 HTTP `tenant_id` 需 migration、欄位與查詢一致時再補。
- [ ] **整合測試**：testcontainers 或 CI 內嵌 Postgres 覆寫 `DATABASE_URL` 路徑（現以 mock／無 DB 為主）。
- [ ] **handlers 模組化**：`process_*` 依指令／食譜流程拆檔，降低合併衝突。
- [ ] **延遲初始化**：評估 AI／DB client 非 import 即連線（見 [`AGENTS.md`](AGENTS.md) 說明現狀）。

### 低優先

- [ ] **README 內大段手動 SQL**：以 migration／`init_db.py` 為單一來源，避免雙份敘述。
- [ ] **兩段式圖卡主題模板**：`recipe_card_generator.py` 增加 warm／minimal／premium 等 preset，共用同一 recipe schema。
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

- **reply_token** 短期有效；長任務以 **push** 為主（背景食譜）。
- 未設 **資料庫** 時，記憶與收藏不持久；上線前請設 `DATABASE_URL`（或相容 Postgres）。
- **記憶體** 圖快取、rate limit、佇列皆**單進程**語意；多副本時各實例獨立，跨機一致需 Redis 等外掛（見 backlog 與 `IMAGE_CACHE_BACKEND`）。
