# Render Postgres 設定

在 Render 上新增 **PostgreSQL** 後，將 Web Service 與該資料庫綁定，並在環境變數中設定 `DATABASE_URL`。

## 1. 建立資料庫

1. Render Dashboard → **New** → **PostgreSQL**
2. 建立完成後，進入該 Postgres 資源 → **Connect** → 複製 **Internal Database URL**（同區域的 Web Service 請用 Internal，較穩定且不需對外開放）

## 2. 綁定到 Web Service

在 **Web Service**（本專案）→ **Environment**：

- 新增或連結變數 **`DATABASE_URL`**：若使用 Render 的「Link Database」，通常會自動注入 `DATABASE_URL`。
## 3. 建立資料表

**方式 A（建議）**：本機或 CI 已設定 `DATABASE_URL` 時，於專案根目錄執行：

```bash
python3 init_db.py
```

**方式 B**：直接套用 migration（Render Postgres → **Shell** 或任何 `psql` 客戶端皆可）：

```bash
psql "$DATABASE_URL" -f migrations/20260414_postgres_multitenant.sql
```

## 4. 重新部署

儲存環境變數後 **Manual Deploy** 一次，讓程式載入 `psycopg` 與新的 `DATABASE_URL`。

## 行為說明

- 若設定了 **`DATABASE_URL`**：記憶、收藏、菜系情境、配額與訂閱一律走 **PostgreSQL**。
