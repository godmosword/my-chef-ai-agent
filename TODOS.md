# 待辦與後續方向

本檔案為根目錄**唯一**待辦清單（工程、產品、UX、營運一併列於此）。完成項目請勾選或刪除條目；舊檔 [`TODO.md`](TODO.md) 僅保留轉址說明。

---

## 營運與平台（併自原 TODO.md）

### 高優先

- [x] **Gemini／OpenRouter 429 與配額**：`chat.completions` 對 429／`APITimeoutError`／`APIConnectionError` 指數退避（`AI_TRANSPORT_*`）；metrics：`ai.completion.errors.rate_limit_total`、`timeout_total`、`connection_total`。
- [x] **Readiness**：`GET /ready` 在有設定 DB 時做輕量 ping，失敗 503；liveness 仍為 `GET /`（不做 AI smoke）。
- [x] **Per-IP rate limit**：`POST /callback`、`GET /billing/checkout`、`GET /legal/*` 每 IP 每分鐘上限（`RATE_LIMIT_*`）；per-user webhook 節流仍見下方「速率限制」。

### 中優先

- [ ] **核心表多租戶**：`user_memory` 等表若需真正 tenant 隔離，補 migration + 讀寫帶 `tenant_id`（現行刪除流程已依 tenant 清用量表）。
- [ ] **金流**（可緩）：`BILLING_PROVIDER` 僅識別與連結模板，實際付款回寫訂閱需接各 PSP webhook。

### 低優先

- [ ] **README §3.2 手動 SQL**：與 migration 檔 RPC 回傳欄位名已對齊時，可縮減重複 DDL、改為「僅列核心表」並連結 migration。
- [ ] **Supabase CLI**：若團隊固定用 CLI，可補 `config.toml` 範本與 CI 驗證 migration。

---

## 高優先（影響正確性或使用者體驗）

- [x] **收藏／記憶錯誤分流**：收藏 postback 已區分「未設定資料庫」與「已設定但寫入失敗」；DB 例外於 `safe_db` 計 `db.ops.errors.<fn>_total`。
- [x] **遷移與 schema 版本**：已補 `docs/SCHEMA_MIGRATIONS.md`（單一來源、雙軌注意、與 `/ready` 關係）。

---

## 中優先（品質與可維護性）

- [x] **Vertex AI + Imagen 食譜主圖**：程式已支援 `IMAGE_PROVIDER=vertex_imagen`（`app/ai_service.py`）、`VERTEX_*`／`GCP_PROJECT_ID`、SA JSON 或 ADC；同菜名可設 `IMAGE_CACHE_TTL_SEC`（預設 300，0 關閉）做 in-memory 去重。**營運側**仍須在 GCP 啟用 Vertex／Imagen 並配置憑證；跨 instance／CDN 快取見後續。
- [ ] **整合測試**：以 testcontainers 或 CI 內嵌 Postgres 驗證 `DATABASE_URL` 路徑（目前單元測試以無 DB 為主）。
- [ ] **handlers 拆分**：`process_ai_reply` 較長，可抽「指令路由」與「AI 回覆」兩層，降低合併衝突。
- [ ] **設定載入**：延遲初始化 clients 仍待評估；「import 時即讀 env」見 `AGENTS.md` Gotchas。

---

## LINE 介面與 UX（Flex 食譜卡／Rich Menu）

- [ ] **食譜參考圖與影片**：`photo_url` 由後端依 `IMAGE_PROVIDER`（Vertex 或佔位圖／DALL·E）；`video_url` 由 YouTube Data API。若需自有 CDN 或簽名 URL、跨機快取，再補上傳與外部快取流程。
- [ ] **食譜卡視覺層級**：確保菜名／主題在第一屏可見；總價區塊可降字級或移至 footer 旁，避免搶過菜名（見 `app/flex_messages.py` 食譜 bubble）。
- [ ] **步驟區過長**：預設只顯示前 2～3 步 +「展開」postback，或請 AI 輸出較短句，減少單卡捲動長度。
- [ ] **收藏按鈕樣式**：橘色主按鈕與「重新構思」secondary 對比可微調飽和度／邊框，全站統一主／次按鈕語意。
- [ ] **底部按鈕權重**：若數據顯示「重新構思」少用，可改較小或連結風格，保留收藏與「再做一次」為主。
- [ ] **Rich Menu 品牌一致**：選單標題與官方帳號顯示名（例如「老皮主廚」vs「米其林職人大腦」）對齊，避免使用者疑惑是否同一服務（`richmenu_config.json`／`setup_richmenu.py`）。
- [ ] **Rich Menu 與文字指令**：六格動作與 README／bot 關鍵字一致（例如「採買清單」vs `🛒 檢視清單`），文件與 UI 用同一套說法。
- [ ] **Rich Menu 色條可讀性**：頂色條分類在縮圖下是否仍易區分，必要時檢查紅／綠鄰格與對比（無障礙粗略檢查）。
- [ ] **輸入列「點我開啟菜單」**：與 Rich Menu 同時出現時易重複；改為僅首次／選單收合時顯示，或改一句固定引導「下方可切換功能」。
- [ ] **少用鍵盤族群**：歡迎或重置後可推一則短訊＋圖示，引導用下方選單而非依賴輸入列按鈕。
- [ ] **Flex footer 免責**：極小字「僅供參考」＋連結至 `GET /legal/disclaimer`（或官方說明 URL），不佔首屏主視覺。
- [ ] **配額即將用盡**：在快達每日上限時於回覆或 alt text 一行提示，優於僅在超額後才給升級連結（與 `app/billing.py` 搭配）。

---

## 低優先（產品或工程優化）

- [ ] **偏好寫入**：若產品需要使用者編輯 `user_preferences`，補 UI 或指令與 API（目前以讀取為主）。
- [ ] **速率限制（per userId）**：webhook 佇列前對單一 LINE `userId` 簡單節流（目前僅 per-IP）；可降低濫用與 AI 成本。
- [ ] **可觀測性**：結構化 log（request id、user id hash）與可選 OpenTelemetry，便於 Render 上除錯。

---

## 文件與發布

- [ ] **CHANGELOG 版本策略**：決定是否採用語意化版本標籤（git tag）並在 release 時將 `[Unreleased]` 區塊改為版本號與日期。
- [ ] **README 英文化**：若對外開源受眾以英文為主，可另增 `README.en.md` 或雙語段落。

---

## 已知限制（非必「修」，但需知情）

- Webhook 回覆依賴有效 `reply_token`；本機用假 token 測試時 LINE API 會 401，屬預期。
- 未設定任何資料庫時，收藏與多輪記憶不持久；部署生產環境前請設定 `DATABASE_URL` 或 Supabase。
