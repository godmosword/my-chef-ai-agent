# 待辦與後續方向

本檔為倉庫內**唯一**工程／產品／UX backlog，僅保留尚未完成項目。

**流程備忘**：每完成一項工程計畫或里程碑，請同步更新 **`CHANGELOG.md`**、**`README.md`**，並在此檔勾除或調整對應條目（完整清單見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」）。

---

## 紀錄（非 backlog，供對齊進度）

| 日期 | 摘要 |
|------|------|
| 2026-04-14 | 開源前整理：`MAX_COMPLETION_TOKENS` 預設 2048、`MAX_HISTORY_TURNS` 預設 2 與截斷提示縮短；`.gitignore` 擴充；刪 `TODO.md`；README／CHANGELOG 同步。 |
| 2026-04-14 | 開源準備：`LICENSE`、`docs/THIRD_PARTY_LICENSES.md`（腳本產生）、`docs/OPEN_SOURCE_CHECKLIST.md`；`/metrics` 未設 `METRICS_TOKEN` 回 503；README／AGENTS／CONTRIBUTING 測試數與環境變數說明已同步。 |
| 2026-04-13 | 圖文選單：`richmenu.jpg` 換版、`docs/preview_richmenu.html` 熱區預覽、可選 `scripts/render_richmenu_michelin.py`；README／CHANGELOG 已同步。LINE 端仍須自行執行 `python3 setup_richmenu.py`。 |

---

## 一、平台與後端

### 建議優先

- [ ] **Webhook per-user 節流**：在佇列前依 LINE `userId`（可加 `tenant_id`）限流，補強僅 per-IP 未涵蓋的濫用情境（與 `app/rate_limit.py` 並存）。
- [ ] **可觀測性**：結構化 log（已具 request id）、user id 雜湊欄位；可選 OpenTelemetry 匯出。

### 可排期中優先

- [ ] **核心表多租戶**：`user_memory` 等若需與 HTTP `tenant_id` 嚴格對齊，補 migration、`tenant_id` 欄位與 RLS／查詢條件（刪除使用者資料已依 tenant 清用量相關表）。
- [ ] **整合測試**：testcontainers 或 CI 內嵌 Postgres，覆寫 `DATABASE_URL` 路徑（現以 mock／無 DB 為主）。
- [ ] **`handlers` 拆分**：`process_ai_reply` 依「指令路由／AI 流程」拆模組，降低合併衝突。
- [ ] **設定載入策略**：評估延遲初始化 AI／DB client；目前「import 即讀 env」見 [`AGENTS.md`](AGENTS.md)。

### 低優先

- [ ] **README 內大段手動 SQL**：與 `supabase/migrations` 已一致時，改為連結 migration／`init_db.py`，避免雙份維護。
- [ ] **Supabase CLI**：團隊若固定用 CLI，補 `config.toml` 範本與 CI migration 驗證。

---

## 二、商業化（可緩）

- [ ] **金流**：`BILLING_PROVIDER` 與 checkout 連結模板以外，實際 **PSP webhook** 回寫訂閱與對帳。

---

## 三、產品與文件

- [ ] **偏好編輯**：若需使用者改寫 `user_preferences`，補指令或管理介面。
- [ ] **CHANGELOG 版本策略**：是否採 semver + git tag，release 時如何對應條目日期。
- [ ] **README 英文化**：若開源對象以英文為主，另增 `README.en.md` 或雙語區塊。

---

## 四、已知限制（知情即可）

- Webhook **reply_token** 僅短期有效；長任務已改 **push** 為主（背景食譜生成）。
- 未設定 **任何資料庫** 時，對話記憶與收藏不持久；上線前請設定 `DATABASE_URL` 或 Supabase。
- **in-memory** 圖片快取、rate limit、佇列皆**單進程**語意；多副本部署時各實例獨立（跨機一致需 Redis 等，見 backlog）。
