# 變更紀錄

本檔依**時間由新到舊**記錄對使用者、部署或營運有影響的變更；逐行 commit 請用 `git log`。

工程計畫或里程碑收尾時，請與 **`TODOS.md`**、**`README.md`** 一併更新，避免文件與程式脫節（見 [`AGENTS.md`](AGENTS.md)「Plan／里程碑收尾」）。

---

## 2026-04-26（UX Playbook 補齊）

- 新增 [`docs/UX_PLAYBOOK.md`](docs/UX_PLAYBOOK.md)，補齊四項設計規範：
  - 互動狀態矩陣（食譜、主圖、海報、圖卡、收藏）
  - A11y 最小基線（對比、字級、觸控尺寸、語意與焦點）
  - Loading/Error/Success microcopy 語氣規範
  - 使用者視角 IA 流程圖（含 fallback 分支）
- README 新增 UX 規範入口，方便後續實作與驗收對齊。

## 2026-04-26（全域 UI/UX 視覺一致化）

- **單一 token source**：新增 [`app/design_tokens.py`](app/design_tokens.py)，統一跨層色票（Flex、海報 HTML、Pillow、圖卡、法規頁）。
- **Flex 視覺收斂**：[`app/flex_theme.py`](app/flex_theme.py) 改由共享 token 驅動；[`app/flex_messages.py`](app/flex_messages.py) 導入 [`app/ui_contracts.py`](app/ui_contracts.py) 的按鈕語義（primary/secondary/link）與一致色階。
- **海報/圖卡一致化**：[`app/recipe_poster_html.py`](app/recipe_poster_html.py)、[`app/recipe_poster.py`](app/recipe_poster.py)、[`app/recipe_card_generator.py`](app/recipe_card_generator.py) 改為共用 token，對齊背景、邊框、主色、文字層級與角色色。
- **Web 法規頁一致化**：[`app/routes.py`](app/routes.py) 抽出 `LEGAL_PAGE_STYLE`，移除重複 inline CSS 並改用共享 token。
- **契約與防漂移**：新增 [`docs/UI_COMPONENT_CONTRACT.md`](docs/UI_COMPONENT_CONTRACT.md) 與 `tests/test_design_token_consistency.py`（4 tests）確保 token 映射不回歸。

## 2026-04-25（主圖／圖卡／海報穩定性）

- **圖像 API 金鑰**：新增 `resolve_openai_image_api_key()`（[`app/config.py`](app/config.py)），`generate_base_image` 與主圖 client 一致；聊天走 Gemini 時仍可用環境變數 `OPENAI_API_KEY` 或 `IMAGE_OPENAI_API_KEY` 產圖。
- **圖卡 Stage A**：圖像 API 若只回 `url` 則以 `httpx` 下載，不再只接受 `b64_json`。
- **海報（HTML）**：Linux／Docker 可經 `file://` 載入 Noto CJK（`ChefNotoSans` / `ChefNotoSerif`）；Playwright 改 `domcontentloaded` 並在截圖前等 `document.fonts.ready`；`RECIPE_POSTER_RENDERER=pillow` 可強制純 Pillow。
- **海報內文**：`_parse_steps` 支援 `steps` 為 `dict`（`title`／`description` 等）與字串。
- **文件**：`README` 補圖用金鑰與 `RECIPE_POSTER_RENDERER` 說明。
- **測試**：全量 **146 passed**。

## 2026-04-24（生圖效率與 Token 優化）

- **Deep Research**：併入 system 前依 `DEEP_RESEARCH_MAX_CHARS_IN_SYSTEM`（預設 1200，範圍 400–8000）截斷研究報告並標註摘要從略，降低啟用時的 input token。
- **圖卡 Stage A**：精簡 `build_base_image_prompt`、保留 4:5 版面與區塊 placeholder 等約束。
- **圖卡管線**：HTTPS hero 下載與 Stage A 底圖以 `asyncio.gather` 並行。
- **`MAX_COMPLETION_TOKENS`**：補充 env／成本與截斷修復權衡說明；新增 `tests/test_call_ai_truncation.py`。
- **測試**：全量 **140 passed**。

## 2026-04-23（文件：重寫 TODOS／README）

- **TODOS.md**：重寫為目前 backlog 結構；里程碑摘要對齊溫暖明亮主題、Render（Playwright + `fonts-noto-cjk`）、程式碼清理等；**零章**改為可重複的部署／LINE 手動驗收清單；移除與現況不符的舊敘述（如 Dark Michelin、舊海報色敘事）。
- **README.md**：全篇對齊現有產品與技術（溫暖明亮 Flex、海報雙管線、Render 建置要點）；精簡重複段、更新專案結構與指令表。
- **AGENTS.md**：測試數量更新為 **122** 則（與 CI／本機一致）。

## 2026-04-23（程式碼清理與 Token 精簡）

- **殭屍代碼**：刪除未使用的 `render_recipe_poster_png_html_async` 與多餘 `asyncio` import；移除未引用常數 `VIEW_FAVORITES_CMD`；`handlers.py` 不再 import 未使用的 `save_user_memory`。
- **佇列**：`job_queue.py` 以內部 `_dispatch()` 統一 text／image／postback 分派，消除 OpenTelemetry tracer 有／無時的重複邏輯。
- **海報輔助函式**：`_derive_cook_time`、`_derive_quick_tips` 集中在 `recipe_poster.py`，`recipe_poster_html.py` 改為共用 import，避免雙份維護。
- **Prompt**：`SYSTEM_PROMPT` 移除與 `_build_system_prompt` 動態行重複的靜態步驟上限；精簡 `deep_research._build_research_prompt` 與圖片辨識 vision prompt，降低每請求 token。
- **測試**：全量 **122 passed**。

## 2026-04-23（修正 Playwright 部署 & 全面溫暖明亮化）

- **修正 Playwright 在 Render 上無法啟動的根本原因**：`render.yaml` 的 `buildCommand` 改為 `pip install -r requirements.txt && python -m playwright install --with-deps chromium`，原本只用 Dockerfile（Render Python env 不讀取），現在正確安裝 Chromium 及系統依賴。
- **Flex 食譜卡改為溫暖明亮主題**：`flex_theme.py` 全面從深色轉為溫暖米白底（#FFFAF5）、琥珀金強調色（#C8922A）、深棕黑文字，視覺更舒適。
- **Pillow fallback 也同步改版**：`recipe_poster.py` 背景改溫暖米白、卡片改純白、步驟徽章改深森綠，即使 Playwright 不可用也能呈現明亮海報。

## 2026-04-23（食譜海報視覺重設計）

- **全新精緻雜誌風配色**：`recipe_poster_html.py` 標題區改為深森綠漸層（#2A6049）底色，強調色改為琥珀金（#C8922A），底色改為溫暖米白（#F9F7F4），整體視覺提升為高端食譜雜誌質感。
- **字體升級**：標題與區塊標籤改用 Noto Serif TC 宋體；食材清單、時間框等使用細緻 border-left 與圓點修飾，去除舊橙紅風格。
- **移除多餘文字訊息**：`handlers.py` 海報生成完成後，不再推送「食譜海報已完成：URL」那行文字，只傳送圖片本身。
- **Dockerfile 補齊 Playwright 依賴**：加入 Chromium 所需系統套件（libnss3、libgbm1、fonts-noto-cjk 等）及 `python -m playwright install chromium`，確保 Render 部署後 Playwright 可正常執行。

## 2026-04-23（食譜與圖片低延遲調整）

- **預設主路徑改為偏快模式**：背景食譜生成不再預設執行 Deep Research；需顯式設 `ENABLE_DEEP_RESEARCH=1` 才會啟用。啟用後 `DEEP_RESEARCH_TIMEOUT_SEC` 也改為限制在 **5-20 秒**，預設 **10** 秒，避免單次請求卡住近一分鐘。
- **首包不再等 YouTube**：初次食譜回覆不阻塞等待教學影片搜尋，改為背景預抓與記憶體快取；YouTube timeout 預設縮短為 **3** 秒，後續需要影片按鈕時可直接吃快取。
- **AI timeout / retry 下修**：文字食譜 timeout 新增 `AI_CHAT_TIMEOUT_SEC`（預設 **18** 秒）、主圖 timeout 新增 `AI_IMAGE_TIMEOUT_SEC`（預設 **25** 秒）、圖片辨識 timeout 新增 `AI_VISION_TIMEOUT_SEC`（預設 **20** 秒）；`AI_TRANSPORT_MAX_RETRIES` 預設由 **3 → 1**，降低尾延遲。
- **海報不再補生成品照**：`generate_recipe_poster` 若已有主圖快取會沿用；若尚未有圖，直接生成純文字海報，不再同步等待圖片模型。
- **佇列吞吐提高**：`QUEUE_WORKER_COUNT` 預設由 **2 → 4**，降低多請求排隊時間。
- **測試**：全量測試更新為 **122 passed**。

## 2026-04-23（食譜海報升級：HTML+CSS → PNG）

- **雜誌級食譜資訊圖**：新增 `app/recipe_poster_html.py`，以 Playwright headless Chromium 渲染 HTML+CSS 模板，輸出品質大幅提升：橙紅漸層標題、兩欄食材清單、6 步驟橘色圓形 badge 卡片、廚師三人對話、小撇步、調味比例表與烹調時間。
- **成品主圖直接嵌入**：有 `photo_url` 時，自動下載並以 base64 data URI 嵌入 HTML，避免 Playwright 外部網路限制。
- **Pillow 雙重 fallback**：Playwright 未安裝或截圖失敗時，自動退回舊版 Pillow 渲染，不影響既有部署。
- **依賴新增**：`playwright>=1.40.0` 加入 `requirements.txt`；Render 部署需在 build command 加 `python3 -m playwright install chromium`（或讓 fallback 自動接管）。
- **測試**：新增 `tests/test_recipe_poster_html.py`（16 tests），全量測試由 **99 → 115 passed**。
- **部署狀態**：程式碼已直接推送 `main`，Render 應已自動觸發 deploy；**LINE Bot 端對端測試（海報排版與成品主圖嵌入）待回本機後驗收**，詳見 `TODOS.md`「零、本機接續測試」。

## 2026-04-23（兩段式食譜圖卡產生器）

- **主圖穩定性修正**：`generate_recipe_image(...)` 新增 image transport retry/backoff（RateLimit/Timeout/Connection）、timeout 預設提升至 60 秒，並改為「僅成功生成的 https URL 才可快取」；fallback 圖不寫快取，避免暫時故障被放大。
- **主圖 prompt 修正**：移除要求模型渲染繁中菜名的文字生圖指令，改為純成品食物攝影（no readable text / no logo / no watermark），菜名改由 Flex 文字層呈現。
- **媒體儲存抽象**：新增 `app/media_storage.py`（`memory|gcs`），主圖／海報／食譜圖卡輸出可走 durable GCS；GCS 設定不完整時會警告並優雅回退 memory，不中斷主流程。
- **兩段式食譜圖卡整合上線**：`action=generate_recipe_card` 已接入 postback，Stage A 產底圖、Stage B 程式疊繁中，成功後 push 圖片網址；失敗時回安全錯誤訊息。
- **部署文件同步**：更新 `render.yaml`、`.env.example`、README 的 image 相關設定（`IMAGE_PROVIDER` 預設、`AI_IMAGE_*`、`RECIPE_IMAGE_STORAGE_*`、快取 TTL 3600）。

## 2026-04-23（主圖、媒體儲存與兩段式食譜圖卡）

- **主圖穩定性**：`generate_recipe_image(...)` 具 image transport retry／backoff；timeout 提升；僅成功生成的 **https** URL 寫快取，fallback 圖不快取。
- **主圖 prompt**：純成品食物攝影（no readable text／no logo／no watermark），菜名由 Flex 文字層呈現。
- **媒體儲存抽象**：新增 `app/media_storage.py`（`memory|gcs`）；GCS 不完整時警告並回退 memory。
- **兩段式圖卡上線**：`action=generate_recipe_card` 接入 postback；Stage A 底圖、Stage B 疊繁中；部署見 `render.yaml`、`.env.example`、README 之 image／storage 變數。

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

- **圖文選單底圖**：`richmenu.jpg` 更新為職人料理風六格設計（金橫幅／米白格線條圖示、**2500×1686**、小於 **1 MB** 以符合 LINE 上限）。
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
