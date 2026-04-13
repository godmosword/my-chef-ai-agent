# 資料庫 schema 與 migration 策略

本專案可同時支援 **Render Postgres**（`DATABASE_URL`）與 **Supabase REST**（僅在未設 `DATABASE_URL` 時）。兩者並存時，應用程式讀寫以 Postgres 為主（見 `app/db.py`）。

## 原則

1. **單一真實來源**：若生產環境已使用 `DATABASE_URL`，請以 Postgres migration（例如 `init_db.py` 或專案內 SQL 檔）為準，避免只在 Supabase Dashboard 手改表而與程式假設漂移。
2. **變更流程**：新增或修改表／欄位時，先寫可重跑的 migration（`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`），再在 Render／本機對目標 DB 執行一次。
3. **雙軌時**：若歷史原因同時有 Supabase 專案與 Render DB，訂閱／用量等僅 Supabase 有的表，仍以 Supabase migration 或文件化手動步驟維護；程式中 `_delete_user_data` 會在清除使用者時兩邊都刪。

## Readiness

`GET /ready` 在已設定 `DATABASE_URL` 或已初始化 Supabase client 時，會做一次輕量查詢；失敗回 **503**，與 `GET /` 的 liveness 分離。
