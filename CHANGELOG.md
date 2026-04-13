# 變更紀錄

本檔依**時間由新到舊**記錄對使用者、部署或營運有影響的變更；逐行 commit 請用 `git log`。

工程計畫或里程碑收尾時，請與 **`TODOS.md`**、**`README.md`** 一併更新，避免文件與程式脫節（見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」）。

---

## 文件與協作流程

- **`CONTRIBUTING.md`**：貢獻方式、測試指令，以及 plan／里程碑收尾時必同步更新 **`TODOS.md`**、**`CHANGELOG.md`**、**`README.md`**（詳見 **`AGENTS.md`**）。
- **`.cursor/rules/plan-ship-docs.mdc`**：Cursor 規則（`alwaysApply: true`），提醒 agent 收尾時一併更新上述三份文件。
- **GitHub Actions**：`deploy.yml` 併入 **`ci.yml`**；push `main` 時改為**同一 workflow 一次排程**——先跑測試，通過後再部署 Cloud Run（PR 仍只跑測試）。

### LINE 介面

- **食譜主圖**：`IMAGE_PROVIDER=placeholder` 或 Vertex／DALL·E 失敗時，改為預設使用公開 **https** 備援圖（可 `RECIPE_FALLBACK_HERO_IMAGE_URL` 覆寫，`none` 關閉）；`GCS_SIGNED_URL_TTL_SEC` 預設改為 **3600** 以利 `gs://` 私桶轉簽名 URL。
- **Rich Menu**：更新 **`richmenu.png`**（2500×1686）為深藍／象牙白／酒紅系扁平版面；上線後請再執行 `python3 setup_richmenu.py` 同步到 LINE。

---

## 2026-04（GCP 憑證、穩定性、食譜品質與 Flex）

### 設定與雲端憑證

- **`GOOGLE_APPLICATION_CREDENTIALS_JSON`**：若設定，啟動時將 JSON 寫入暫存檔並設定 **`GOOGLE_APPLICATION_CREDENTIALS`**，方便 Render／Cloud Run 等以單一密文注入 ADC（`app/config.py`）。

### 平台與韌性

- **`GET /ready`**：已設定 Postgres 或 Supabase 時做輕量 DB ping，失敗回 503；**`GET /`** 維持 liveness。
- **Rate limit**：`POST /callback`、`GET /billing/checkout`、`GET /legal/*` 支援每 IP 每分鐘上限（`RATE_LIMIT_*`，0 關閉）。
- **AI 傳輸重試**：`chat.completions` 遇 429、逾時、連線錯誤時指數退避（`AI_TRANSPORT_*`），並有對應 metrics。
- **收藏錯誤分流**：區分「未設定資料庫」與「寫入失敗」；`safe_db` 失敗時計 `db.ops.errors.<函式>_total`。
- **文件**：[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md) 說明 migration 與 Postgres／Supabase 雙軌注意事項。

### Vertex 與多媒體

- **Vertex AI Imagen**：`IMAGE_PROVIDER=vertex_imagen` 時以 Vertex 產生食譜主圖；`GCP_PROJECT_ID`、`VERTEX_*`、服務帳號 JSON 或 ADC；失敗回退佔位策略。
- **食譜主圖快取**：`IMAGE_CACHE_TTL_SEC`（預設 300，0 關閉）對同菜名 in-memory 去重。
- **YouTube**：可選 `YOUTUBE_API_KEY` 補教學影片連結。

### 食譜 JSON、截斷與 Flex 體驗

- **`MAX_COMPLETION_TOKENS`** 預設拉高（可環境變數覆寫），降低長 JSON 被截斷機率。
- **`AI_MAX_RETRIES`**、`**AI_TRUNCATION_RECOVERY_PROMPT**`：截斷或解析失敗時多輪修復。
- **`SYSTEM_PROMPT`**：限制 `kitchen_talk`／食材／步驟／採買清單數量與長度。
- **食譜卡**：僅在有效 **https** 成品圖時顯示 hero；否則文字色塊標頭，避免與菜名無關的隨機圖；菜系輪播改色塊 hero；按鈕配色與主題一致。
- **`build_fallback_recipe_flex`**：截斷時改短摘要與引導，避免整段 raw JSON 塞給使用者。

### 測試

- 單元測試涵蓋 Flex、配額、佇列、AI 錯誤文案、多媒體、`/ready`、rate limit、AI transport retry 等；目前套件約 **57** 則（以 `pytest` 收集結果為準）。

---

## 2026-04-12（v2.1 佇列、配額與營運 API）

- Webhook 改為 **記憶體佇列 + async worker**、event **去重**、佇列滿 **503**。
- **`app/billing.py`**：`consume_quota` 與每日用量；多租戶 `X-Tenant-ID`。
- **`GET /metrics`**、`GET /billing/checkout`、管理訂閱 API、法律端點；`docs/LEGAL_POLICY.md`。
- **`DATABASE_URL`** 與 **`psycopg`** 直連 Postgres；**`init_db.py`**；[`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)。
- **`supabase/migrations/20260412120000_commercial_schema.sql`**：用量／訂閱表與 **`increment_usage_daily`** RPC。
- CI：`deploy.yml` 加上 concurrency，降低 Cloud Run 部署衝突。

---

## 2026-03-01（v2.0 模組化）

- 程式拆入 **`app/`** 套件；`main.py` 薄入口。
- **圖片食材辨識**、**收藏輪播**、AI JSON **重試**、菜系選單快取。
- Health 回傳 `model` 等；**`httpx`** 下載 LINE 圖片。

---

## 2026-02-28 與更早

- **Render**：`render.yaml`、環境變數改由平台設定。
- **主選單 Flex**、清冰箱／預算／心情等情境引導。
- **非同步 LINE SDK**、**`@safe_db`**、歷史上曾用 `BackgroundTasks`（已由 v2.1 佇列取代）。
- 較早的 `README` 與 Cloud Run 部署文件整理。
