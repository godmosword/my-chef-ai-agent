# 資料庫 schema 與 migration 策略

本專案採 **Postgres-only**（`DATABASE_URL`）資料層，schema 來源為 **`web/migrations/*.sql`** 與 `pnpm -F @chef/web db:migrate`。

## 原則

1. **單一真實來源**：以 Web migration SQL 為準，避免在 DB 後台手改造成 schema 漂移。
2. **變更流程**：新增或修改表／欄位時，先寫可重跑的 migration（`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`），再對 Neon／本機執行 `db:migrate`。
3. **多租戶約束**：核心表以 `tenant_id` + `user_id` 複合鍵與索引維持租戶隔離。

## 健康檢查

`GET /api/health` 在已設定 `GEMINI_API_KEY` 時回傳 `ai_configured: true` 與目前 `model`。
