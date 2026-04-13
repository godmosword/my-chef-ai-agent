# 待辦與後續方向

本檔案追蹤**已知缺口**、**可選強化**與**維運注意事項**，方便貢獻者與維護者對齊。完成項目請在 PR 中更新此檔或刪除對應條目。

與營運／產品相關的待辦另見根目錄 **[`TODO.md`](TODO.md)**（佇列、配額、金流等）。

---

## 高優先（影響正確性或使用者體驗）

- [ ] **收藏／記憶錯誤分流**：區分「未設定資料庫」與「DB 連線／schema 錯誤」，回覆與 log 更精準（目前多數失敗共用簡短訊息）。
- [ ] **遷移與 schema 版本**：若 DDL 變更，提供單一 migration 策略（例如 `schema_migrations` 表或文件化手動步驟），避免 Render Postgres 與 Supabase 雙軌漂移。

---

## 中優先（品質與可維護性）

- [ ] **整合測試**：以 testcontainers 或 CI 內嵌 Postgres 驗證 `DATABASE_URL` 路徑（目前單元測試以無 DB 為主）。
- [ ] **handlers 拆分**：`process_ai_reply` 較長，可抽「指令路由」與「AI 回覆」兩層，降低合併衝突。
- [ ] **設定載入**：文件化「import 時即讀 env」的限制，或評估延遲初始化 clients（需權衡首次請求延遲與測試複雜度）。

---

## 低優先（產品或工程優化）

- [ ] **偏好寫入**：若產品需要使用者編輯 `user_preferences`，補 UI 或指令與 API（目前以讀取為主）。
- [ ] **速率限制**：webhook 層對單一 `userId` 簡單節流，降低濫用與 AI 成本。
- [ ] **可觀測性**：結構化 log（request id、user id hash）與可選 OpenTelemetry，便於 Render 上除錯。

---

## 文件與發布

- [ ] **CHANGELOG 版本策略**：決定是否採用語意化版本標籤（git tag）並在 release 時將 `[Unreleased]` 區塊改為版本號與日期。
- [ ] **README 英文化**：若對外開源受眾以英文為主，可另增 `README.en.md` 或雙語段落。

---

## 已知限制（非必「修」，但需知情）

- Webhook 回覆依賴有效 `reply_token`；本機用假 token 測試時 LINE API 會 401，屬預期。
- 未設定任何資料庫時，收藏與多輪記憶不持久；部署生產環境前請設定 `DATABASE_URL` 或 Supabase。
