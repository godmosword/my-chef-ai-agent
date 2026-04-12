# 待辦與後續優化（對齊程式現況）

本檔記錄**尚未實作**或**可選加強**項目；已交付內容見 [`CHANGELOG.md`](CHANGELOG.md)。

## 高優先（營運／穩定性）

- [ ] **Gemini／OpenRouter 429 與配額**：統一退避與重試策略，並在 metrics 區分 `429` 與逾時。
- [ ] **Readiness**：可選 `GET /ready` 或擴充 health，串接 Supabase ping／AI provider smoke（失敗時仍允許 liveness 通過與否需定案）。
- [ ] **Per-user / IP rate limit**：Webhook 與公開端點（`checkout`、`legal`）防濫用。

## 中優先（產品／資料）

- [ ] **核心表多租戶**：`user_memory` 等表若需真正 tenant 隔離，補 migration + 讀寫帶 `tenant_id`（現行刪除流程已依 tenant 清用量表）。
- [ ] **金流**：`BILLING_PROVIDER` 僅識別與連結模板，實際付款回寫訂閱需接各 PSP webhook。

## 低優先（DX／文件）

- [ ] **README §3.2 手動 SQL**：與 migration 檔 RPC 回傳欄位名已對齊時，可縮減重複 DDL、改為「僅列核心表」並連結 migration。
- [ ] **Supabase CLI**：若團隊固定用 CLI，可補 `config.toml` 範本與 CI 驗證 migration。
