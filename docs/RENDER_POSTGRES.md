# Render Postgres 設定（取代 Supabase）

在 Render 上新增 **PostgreSQL** 後，將 Web Service 與該資料庫綁定，並在環境變數中設定 `DATABASE_URL`。

## 1. 建立資料庫

1. Render Dashboard → **New** → **PostgreSQL**
2. 建立完成後，進入該 Postgres 資源 → **Connect** → 複製 **Internal Database URL**（同區域的 Web Service 請用 Internal，較穩定且不需對外開放）

## 2. 綁定到 Web Service

在 **Web Service**（本專案）→ **Environment**：

- 新增或連結變數 **`DATABASE_URL`**：若使用 Render 的「Link Database」，通常會自動注入 `DATABASE_URL`。
- 若已改用 Postgres，可**移除** `SUPABASE_URL` / `SUPABASE_KEY`（避免誤用舊 BaaS）。

## 3. 建立資料表

在 Postgres 上執行下列 SQL（Render Postgres → **Shell** 或任何 `psql` 客戶端皆可）：

```sql
-- 與 README 中 Supabase 節相同結構，供本專案 ORM 無關之直連使用

CREATE TABLE IF NOT EXISTS user_memory (
  user_id text PRIMARY KEY,
  history jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY,
  preferences text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_recipes (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  recipe_name text NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_cuisine_context (
  user_id text PRIMARY KEY,
  active_cuisine text NOT NULL,
  context_updated_at timestamptz NOT NULL
);
```

## 4. 重新部署

儲存環境變數後 **Manual Deploy** 一次，讓程式載入 `psycopg` 與新的 `DATABASE_URL`。

## 行為說明

- 若設定了 **`DATABASE_URL`**：記憶、收藏、菜系情境一律走 **PostgreSQL**，不會再建立 Supabase 連線。
- 若**未**設定 `DATABASE_URL` 但設定了 `SUPABASE_URL` + `SUPABASE_KEY`：行為與先前相同（Supabase REST）。
