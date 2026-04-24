# 待辦與後續方向

本檔為倉庫內**工程／產品／UX** 的單一 backlog 來源；**已完成事項**只保留於下方「里程碑摘要」與 `CHANGELOG.md`，避免與未來工作混寫在一起。

**里程碑收尾**（每完成一輪可交付的計畫）：同步更新 **`CHANGELOG.md`**、**`README.md`**、本檔，細項見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」。

---

## 里程碑摘要（近期已交付，供對齊／查帳）

| 時間 | 內容 |
|------|------|
| 2026-04-24 | 主圖流程穩定化：fallback 不快取、圖片重試與 timeout 提升、新增 media_storage（memory/gcs）與 recipe card postback 整合。 |
| 2026-04-23 | 新增兩段式食譜圖卡產生器（Stage A: gpt-image-2 視覺底圖；Stage B: 程式疊繁中），並補上 sample recipe、範例 runner 與單元測試。 |
| 2026-04-22 | Dark Michelin UI 重構完成：集中更新 `flex_theme` token，LINE Flex 與食譜海報統一為深墨背景、石板卡片、暖白文字與 Michelin 橘 CTA，並補上代表性視覺測試。 |
| 2026-04-22 | 修正主圖與海報回傳：GPT-Image-2 改走獨立 OpenAI image client，不再受 Gemini 文字 client 牽制；缺少 `PUBLIC_APP_BASE_URL` 時改為明確提示管理員設定。 |
| 2026-04-22 | 食譜海報字型 fallback 已補強：新增 Linux 常見 CJK 字型候選，找不到字型時回退 Pillow 內建字型，避免 CI／容器環境因缺字型而失敗。 |
| 2026-04-23 | 食譜海報已補上主圖：postback 會優先取快取或補生成品照，再嵌入海報；若主圖下載失敗則自動退回純文字版，README／CHANGELOG／測試已同步。 |
| 2026-04-22 | 非 Gemini API 路徑已由 OpenRouter 改為 OpenAI，`OPENROUTER_API_KEY` 改為 `OPENAI_API_KEY`，並同步更新 `render.yaml`、`.env.example`、README／CHANGELOG。 |
| 2026-04-22 | Deep Research Grounding 完成：背景食譜生成可先透過 Google Interactions API 執行研究式預處理，再把濃縮報告注入 system prompt；timeout / 錯誤時自動 fallback，README／CHANGELOG／測試已同步。 |
| 2026-04-22 | 食譜資訊圖海報 v1 完成：新增 recipe card「生成食譜海報」按鈕、Pillow 海報模板渲染、既有短期 PNG 媒體管線重用；README／CHANGELOG／測試已同步。 |
| 2026-04-22 | 成本改善第一階段完成：recipe card 改為按需「生成主圖」、圖片快取預設拉高至 86400 秒、文字輸出與 JSON retry 預設下修；README／CHANGELOG／測試已同步。 |
| 2026-04-14 | 開源前整理：`MAX_COMPLETION_TOKENS` 預設 2048、`MAX_HISTORY_TURNS` 預設 2 與截斷提示縮短；`.gitignore` 擴充；刪 `TODO.md`；README／CHANGELOG 同步。 |
| 2026-04-14 | 開源準備：`LICENSE`、`docs/THIRD_PARTY_LICENSES.md`（腳本產生）、`docs/OPEN_SOURCE_CHECKLIST.md`；`/metrics` 未設 `METRICS_TOKEN` 回 503；README／AGENTS／CONTRIBUTING 測試數與環境變數說明已同步。 |
| 2026-04-22 | `openai_compatible` 食譜主圖已升級至 GPT-Image-2，並改為解析 `b64_json` 後掛本站公開 hero URL；README／CHANGELOG／測試已同步。 |
| 2026-04-13 | 圖文選單：`richmenu.jpg` 換版、`docs/preview_richmenu.html` 熱區預覽、可選 `scripts/render_richmenu_michelin.py`；README／CHANGELOG 已同步。LINE 端仍須自行執行 `python3 setup_richmenu.py`。 |

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

- [ ] **README 內大段手動 SQL**：與 `supabase/migrations` 已一致時，改為連結 migration／`init_db.py`，避免雙份維護。
- [ ] **Supabase CLI**：團隊若固定用 CLI，補 `config.toml` 範本與 CI migration 驗證。
- [ ] **GPT-Image-2 prompt 微調**：若實際上線後繁中文字渲染仍偶發變形，針對菜名長度、字體風格與擺放位置做 A/B prompt 調整。
- [ ] **圖片配額策略**：若按需出圖後成本仍偏高，再評估將「生成主圖」綁定付費方案或每日圖片額度，而非所有方案無上限開放。
- [ ] **海報第二版**：若要更接近範例教學圖，可再評估加入單張成品圖、調味比例區塊、步驟縮圖或多模板版型。
- [ ] **兩段式食譜圖卡主題模板**：在 `app/recipe_card_generator.py` 增加 warm/minimal/premium/night-market 等可切換視覺 preset，並讓不同模板共用同一份 recipe schema。
- [ ] **Deep Research 成本與快取策略**：若 research grounding 上線後延遲或成本偏高，評估只對高價值需求啟用、加入 memoization，或將市場時價研究獨立成較短 TTL 快取。

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
