# 變更紀錄

本檔依**時間由新到舊**記錄對使用者、部署或營運有影響的變更；逐行 commit 請用 `git log`。

工程計畫或里程碑收尾時，請與 **`TODOS.md`**、**`README.md`** 一併更新，避免文件與程式脫節（見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」）。

---

## 2026-04-23（兩段式食譜圖卡產生器）

- **新增兩段式產圖模組**：`app/recipe_card_generator.py` 新增 `RecipeCardData` schema、`build_base_image_prompt(...)`、`generate_base_image(...)` 與 `compose_recipe_card(...)`，採「先生底圖、後疊繁中」策略，降低大量繁中文字直接交給模型渲染造成的亂碼與版面漂移。
- **可直接跑的範例**：新增 `examples/sample-recipe.json` 與 `scripts/generate_recipe_card_example.py`，支援 `--skip-api`（本機佔位底圖）與 OpenAI Stage A 正式生圖兩種路徑，最終輸出 `1200x1500` PNG。
- **測試覆蓋**：新增 `tests/test_recipe_card_generator.py`，覆蓋 prompt 關鍵詞與最終 PNG 輸出尺寸，確保模組可在無外部 API 的 CI/本機環境先驗證 Stage B 渲染穩定性。

## 2026-04-23（食譜海報補上主圖）

- **海報會優先帶成品照**：`generate_recipe_poster` 現在會先取既有主圖快取；若尚未有圖，會沿用目前 `IMAGE_PROVIDER` 現場補一張，再把 `photo_url` 傳進 `app/recipe_poster.py`。
- **下載失敗不再留白**：海報 renderer 新增安全的 https 圖片抓取、cover crop 與圓角貼圖；主圖失效、超大、非圖片或下載失敗時，會自動退回原本的純文字海報，不阻斷回傳。
- **測試與文件**：新增海報嵌圖與 postback 帶圖測試；全量測試更新為 **102 passed**，README / TODOS 已同步。

## 2026-04-22（Dark Michelin 視覺重構）

- **Flex / 海報主題統一**：`app/flex_theme.py` 改為 Dark Michelin token，LINE Flex 的主選單、菜系輪播、食譜卡、收藏卡與 fallback 卡片全部改為深墨背景、石板卡片、暖白文字與 Michelin 橘 CTA。
- **食譜海報改版**：`app/recipe_poster.py` 由亮底改為深色石板底，標題、內文與步驟 badge 全面套用暗黑奢華配色，不變更既有版面與輸出介面。
- **測試**：補上 Flex dark surface / CTA 色票斷言，以及海報 dark palette 像素 smoke test；文件同步更新。

## 2026-04-22（主圖與海報回傳修正）

- **GPT-Image-2 與 Gemini 可並存**：`generate_recipe_image()` 不再共用文字生成的 `ai_client`，改為獨立建立 OpenAI image client。現在即使文字食譜仍走 Gemini，`IMAGE_PROVIDER=openai_compatible` 也能正常呼叫 GPT-Image-2。
- **設定需求更明確**：主圖生成可用 `IMAGE_OPENAI_API_KEY`（未設時回退 `OPENAI_API_KEY`）；食譜海報與 OpenAI 主圖回傳都需 `PUBLIC_APP_BASE_URL` 為有效 `https`，否則會明確提示管理員設定，而不是只顯示泛用失敗訊息。
- **測試**：新增 Gemini + OpenAI 圖片共存、缺少 image key fallback、缺少 `PUBLIC_APP_BASE_URL` 的海報錯誤提示測試。

## 2026-04-22（食譜海報字型 fallback）

- **CI / Linux 穩定性**：`app/recipe_poster.py` 新增 Linux 常見 CJK 字型候選，並在完全找不到中日韓字型時回退到 Pillow 內建字型，避免海報渲染在 GitHub Actions 或精簡容器內直接拋出 `RuntimeError`。
- **測試**：新增「無 CJK font 仍可輸出 PNG」覆蓋，確保海報功能至少能優雅退化，不阻斷整體測試與部署流程。

## 2026-04-22（OpenAI 路徑切換）

- **非 Gemini 模型供應商**：專案的非 Gemini 路徑由 **OpenRouter** 改為直接呼叫 **OpenAI API**；`AsyncOpenAI` client 不再指向 `https://openrouter.ai/api/v1`，改用標準 OpenAI 連線方式。
- **環境變數調整**：部署與本機設定中的 `OPENROUTER_API_KEY` 改為 `OPENAI_API_KEY`；`render.yaml`、`.env.example`、README 與 AGENTS 說明已同步。
- **相容性**：`gemini-*` 模型仍走 Gemini OpenAI-compatible endpoint，不受影響；只有非 Gemini `MODEL_NAME` 的 API key / provider 路徑改變。

## 2026-04-22（Deep Research 食譜 Grounding）

- **Google Deep Research 預處理**：背景食譜生成在正式呼叫文字模型前，會先透過 Google Interactions API 的 **`deep-research-preview-04-2026`** agent 進行研究式 Grounding，整理權威比例、烹飪化學／食安要點與台灣近期市場時價。
- **優雅回退**：Deep Research 路徑加入 timeout 與錯誤 fallback；若超時、SDK 錯誤或 research 失敗，會記錄 log 並自動回到原本無 Grounding 的食譜生成流程，不阻斷使用者出餐體驗。
- **設定與依賴**：runtime 依賴新增 `google-genai>=1.55.0` 以支援 Interactions API；可選 `DEEP_RESEARCH_API_KEY` 與 `DEEP_RESEARCH_TIMEOUT_SEC` 供部署時調整。
- **測試與文件**：新增 Deep Research prompt、fallback 與 system prompt 注入測試；README / TODOS 已同步。當前全量測試為 **92 passed**。

## 2026-04-22（食譜資訊圖海報）

- **新增食譜海報**：使用者可從 recipe card 按下 **「🖼 生成食譜海報」**，依既有 recipe JSON 產出單張可分享的 **PNG 資訊圖**。
- **渲染方式**：海報由 **Pillow** 走固定模板排版，不額外擴充 AI schema，也不生成每一步驟照片；重點是手機可讀與繁中文字穩定呈現。
- **媒體管線重用**：生成後沿用既有 `register_recipe_hero_png(...)` 與 `/media/recipe-hero/{token}` 對外提供短期公開 URL，再以 LINE push 回圖與 URL。
- **依賴與測試**：`Pillow` 納入 runtime 依賴；新增海報 renderer、recipe card 按鈕與 postback 流程測試。當前全量測試為 **86 passed**。

## 2026-04-22（食譜生成成本改善）

- **預設不自動生圖**：背景食譜生成流程不再每次都呼叫圖片模型；recipe card 改由使用者按下 **「🖼 生成主圖」** 後才按需出圖，大幅降低平均單次食譜成本。
- **圖片快取**：`IMAGE_CACHE_TTL_SEC` 預設由 **300 → 86400** 秒，重複菜名更容易命中快取，減少重複圖片 API 成本。
- **文字成本**：`MAX_COMPLETION_TOKENS` 預設由 **2048 → 1024**、`AI_MAX_RETRIES` 由 **2 → 1**；`MAX_HISTORY_TURNS` 維持 **2**，在壓低 token 成本與維持食譜品質之間取平衡。
- **LINE 體驗**：recipe Flex footer 新增生成主圖 postback；快取命中時直接回帶圖卡片，未命中則先回 loading 文案再 push 成品卡。
- **測試與文件**：補上按需出圖、快取命中/未命中、過期卡片與成本控制預設值測試；README / TODOS 已同步。

## 2026-04-22（GPT-Image-2 食譜主圖）

- **`IMAGE_PROVIDER=openai_compatible`**：食譜主圖生成由舊的 DALL·E 路徑改為 **`gpt-image-2-2026-04-21`**，維持 `1024x1024`，並將 `quality` 降為 **`low`**，優先符合 LINE 手機端顯示並降低 API 成本。
- **繁體中文文字渲染**：生圖 prompt 強化，要求將菜名以**繁體中文**清楚渲染在菜單卡、小木牌或深色石板上，讓主圖更接近餐廳出餐情境。
- **相容性調整**：OpenAI 圖片回應改由 **`b64_json` → PNG bytes → 本站公開 URL**，再交給 Flex hero 使用；外部仍維持回傳 https URL，不影響既有食譜卡流程。
- **測試與文件**：補上 GPT-Image-2 參數、prompt 與 fallback 測試；README 同步更新圖片供應器說明與測試數量。

## 2026-04-14（開源前：預設 token 與倉庫整理）

- **AI 成本**：`MAX_COMPLETION_TOKENS` 預設由 **4096 → 2048**（仍可用環境變數拉高）；`MAX_HISTORY_TURNS` 預設 **2**（可 `MAX_HISTORY_TURNS` 覆寫），減少送入模型的歷史 token。
- **截斷修復**：`AI_TRUNCATION_RECOVERY_PROMPT` 縮短，降低重試輪的 prompt 開銷。
- **`.gitignore`**：補上常見本機目錄（`.venv/`、`venv/`、coverage 等），避免誤提交。
- **文件**：刪除冗餘 `TODO.md`（待辦以 `TODOS.md` 為準）；`.env.example`／`README` 環境變數表同步新預設。

---

## 2026-04-14（開源準備：授權、指標端點、第三方授權清單）

- **授權**：新增根目錄 MIT 全文 [`LICENSE`](LICENSE)，與 README「授權」小節對齊。
- **`GET /metrics`**：未設定 `METRICS_TOKEN` 時回 **503**（避免對外暴露營運指標）；已設定時仍須正確的 `X-Metrics-Token`。`METRICS_TOKEN` 於設定載入時會 trim，空字串視同未設定。
- **文件**：README 新增「開源、商標與第三方服務」；新增 [`docs/OPEN_SOURCE_CHECKLIST.md`](docs/OPEN_SOURCE_CHECKLIST.md)、[`docs/THIRD_PARTY_LICENSES.md`](docs/THIRD_PARTY_LICENSES.md)（由 `scripts/generate_third_party_licenses.py` 產生）；`CONTRIBUTING.md` 補測試用 `METRICS_TOKEN` 與授權表更新流程。
- **開發依賴**：`requirements-dev.txt` 新增 `pip-licenses`。
- **CI**：`test` job 注入 `METRICS_TOKEN` 占位值，與本機 pytest 一致。
- **測試**：`tests/test_ready_and_rate_limit.py` 新增 `/metrics` 行為覆蓋；pytest 收集數更新為 **72**（無 Postgres 時 2 skip、70 pass）。

---

## 2026-04-13（圖文選單資產與預覽）

- **圖文選單底圖**：`richmenu.jpg` 更新為米其林風六格設計（金橫幅／米白格線條圖示、**2500×1686**、小於 **1 MB** 以符合 LINE 上限）。
- **`scripts/render_richmenu_michelin.py`**：可選，程式產出同尺寸亮色底圖，並自動挑選可完整顯示繁中的系統字型；若改由設計稿出圖，可直接覆蓋 `richmenu.jpg` 後上傳。
- **`docs/preview_richmenu.html`**：本機以瀏覽器疊上 `richmenu_config.json` 熱區，預覽點擊區是否對齊底圖。
- **提醒**：`git push` 與 Render 部署**不會**更新 LINE 上的圖文選單；變更圖檔或 JSON 後須執行 **`python3 setup_richmenu.py`**。

---

## 文件與協作流程

- **`CONTRIBUTING.md`**：貢獻方式、測試指令，以及 plan／里程碑收尾時必同步更新 **`TODOS.md`**、**`CHANGELOG.md`**、**`README.md`**（詳見 **`AGENTS.md`**）。
- **`.cursor/rules/plan-ship-docs.mdc`**：Cursor 規則（`alwaysApply: true`），提醒 agent 收尾時一併更新上述三份文件。
- **GitHub Actions**：`deploy.yml` 併入 **`ci.yml`**；push `main` 時改為**同一 workflow 一次排程**——先跑測試，通過後再部署 Cloud Run（PR 仍只跑測試）。
- **Rich Menu 文件**：新增 [`docs/RICH_MENU.md`](docs/RICH_MENU.md)（LINE 限制、`bounds` 對照、參考 repo、上傳與 413、Figma 迭代檢核表）；[`README.md`](README.md) Rich Menu 小節已連結。

### LINE 介面

- **食譜主圖**：`IMAGE_PROVIDER=placeholder` 或 Vertex／OpenAI 生圖失敗時，改為預設使用公開 **https** 備援圖（可 `RECIPE_FALLBACK_HERO_IMAGE_URL` 覆寫，`none` 關閉）；`GCS_SIGNED_URL_TTL_SEC` 預設改為 **3600** 以利 `gs://` 私桶轉簽名 URL。
- **Rich Menu**：改為 **`richmenu.jpg`**（2500×1686、小於 1 MB，避免 LINE **413 Request Entity Too Large**）；`setup_richmenu.py` 依副檔名送 `image/jpeg`／`image/png`，超過 1 MB 的 PNG 可選安裝 Pillow 自動轉 JPEG。

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
- **食譜主圖快取**：`IMAGE_CACHE_TTL_SEC`（現預設 86400，0 關閉）對同菜名 in-memory 去重。
- **YouTube**：可選 `YOUTUBE_API_KEY` 補教學影片連結。

### 食譜 JSON、截斷與 Flex 體驗

- **`MAX_COMPLETION_TOKENS`** 預設拉高（可環境變數覆寫），降低長 JSON 被截斷機率。
- **`AI_MAX_RETRIES`**、`**AI_TRUNCATION_RECOVERY_PROMPT**`：截斷或解析失敗時多輪修復。
- **`SYSTEM_PROMPT`**：限制 `kitchen_talk`／食材／步驟／採買清單數量與長度。
- **食譜卡**：僅在有效 **https** 成品圖時顯示 hero；否則文字色塊標頭，避免與菜名無關的隨機圖；菜系輪播改色塊 hero；按鈕配色與主題一致。
- **`build_fallback_recipe_flex`**：截斷時改短摘要與引導，避免整段 raw JSON 塞給使用者。

### 測試

- 單元測試涵蓋 Flex、配額、佇列、AI 錯誤文案、多媒體、`/ready`、rate limit、AI transport retry 等；目前套件已成長至 **86** 則（以 `pytest` 收集結果為準）。

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
