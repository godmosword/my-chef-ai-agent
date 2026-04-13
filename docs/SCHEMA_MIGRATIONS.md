# 資料庫 schema 與 migration 策略

本專案採 **Postgres-only**（`DATABASE_URL`）資料層，schema 來源統一為 `migrations/` 與 `init_db.py`。

## 原則

1. **單一真實來源**：以 Postgres migration（`migrations/*.sql`）為準，避免在 DB 後台手改造成 schema 漂移。
2. **變更流程**：新增或修改表／欄位時，先寫可重跑的 migration（`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`），再在 Render／本機對目標 DB 執行一次。
3. **多租戶約束**：核心表以 `tenant_id` + `user_id` 複合鍵與索引維持租戶隔離。

## Readiness

`GET /ready` 在已設定 `DATABASE_URL` 時會做一次輕量查詢；失敗回 **503**，與 `GET /` 的 liveness 分離。
