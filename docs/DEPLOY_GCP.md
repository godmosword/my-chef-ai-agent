# GCP Cloud Run 部署教學（逐步版）

本文件一步步帶你將「米其林職人大腦」LINE Bot 部署到 GCP Cloud Run。

---

## 步驟一：啟用 GCP API

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇或建立一個專案
3. 點擊上方搜尋列，搜尋並開啟以下 API：
   - **Cloud Run API**
   - **Artifact Registry API**
   - **Cloud Build API**

4. 每個 API 頁面點擊「啟用」按鈕

---

## 步驟二：建立 Service Account

1. 左側選單 → **IAM 與管理** → **Service Account**
2. 點擊「**建立 Service Account**」
3. 填寫：
   - **Service account 名稱**：例如 `github-deploy`
   - **說明**：例如「供 GitHub Actions 部署 Cloud Run 使用」
4. 點擊「**建立並繼續**」
5. 在「授予此 Service Account 專案存取權」步驟，點擊「新增角色」，依序加入：
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`
6. 點擊「**完成**」
7. 在列表中找到剛建立的 Service Account，點擊右側三個點 → **管理金鑰**
8. 點擊「**新增金鑰**」→ **建立新金鑰** → 選擇 **JSON** → 下載
9. 將此 JSON 檔案妥善保管（會用在步驟五）

---

## 步驟三：取得專案 ID 與選擇區域

1. 在 GCP Console 上方，點擊專案名稱旁的下拉選單
2. 複製並記下 **專案 ID**（例如 `my-project-123456`）
3. 決定要部署的區域，常用：
   - `asia-east1`（台灣）
   - `asia-northeast1`（東京）
   - `us-central1`（美國）

---

## 步驟四：將程式推送到 GitHub

1. 將專案 push 到 GitHub（若尚未 push）
2. 確認 `main` 分支已包含：`Dockerfile`、`.github/workflows/deploy.yml`、`main.py` 等檔案

---

## 步驟五：在 GitHub 設定 Secrets

1. 開啟你的 GitHub repo
2. 點擊 **Settings** → 左側 **Secrets and variables** → **Actions**
3. 點擊「**New repository secret**」，依序新增以下 Secret：

| 名稱 | 值 | 如何取得 |
|------|-----|----------|
| `GCP_SA_KEY` | 步驟二下載的整個 JSON 檔內容 | 用文字編輯器開啟 JSON 檔，複製全部內容貼上 |
| `GCP_PROJECT_ID` | 你的 GCP 專案 ID | 步驟三取得 |
| `CLOUD_RUN_SERVICE` | 服務名稱，例如 `my-chef-ai-agent` | 自訂，英文小寫、可用連字號 |
| `CLOUD_RUN_REGION` | `asia-east1`（或你選擇的區域） | 步驟三決定 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel 的 Access Token | [LINE Developers](https://developers.line.biz/) → 你的 Channel → Messaging API |
| `LINE_CHANNEL_SECRET` | LINE Channel 的 Secret | 同上，Basic settings 頁面 |
| `OPENROUTER_API_KEY` | OpenRouter API 金鑰 | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `SUPABASE_URL` | Supabase 專案 URL | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `SUPABASE_KEY` | Supabase anon key | 同上 |

> 若未使用 Supabase，`SUPABASE_URL` 和 `SUPABASE_KEY` 可留空或省略。

---

## 步驟六：觸發部署

1. 在 GitHub repo 的 `main` 分支做一次 push（可改任意檔案後 commit & push）
2. 點擊上方 **Actions** 分頁
3. 應該會看到「Deploy to GCP Cloud Run」工作流程正在執行
4. 等待約 3–5 分鐘，直到出現綠色勾勾

---

## 步驟七：取得 Cloud Run 服務網址

1. 開啟 [GCP Cloud Run 頁面](https://console.cloud.google.com/run)
2. 點擊你的服務名稱（例如 `my-chef-ai-agent`）
3. 在頂部可看到 **URL**，格式類似：
   ```
   https://my-chef-ai-agent-xxxxx-uc.a.run.app
   ```
4. 複製此 URL

---

## 步驟八：設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇你的 Provider 與 Channel
3. 點擊 **Messaging API** 分頁
4. 在 **Webhook settings** 區塊：
   - **Webhook URL** 填入：`https://你的CloudRun網址/callback`
   - 範例：`https://my-chef-ai-agent-xxxxx-uc.a.run.app/callback`
5. 點擊 **Update**
6. 點擊 **Verify** 測試連線，應顯示「Success」
7. 將 **Use webhook** 設為「Enabled」
8. 將 **Auto-reply messages** 設為「Disabled」

---

## 步驟九：測試 LINE Bot

1. 在 LINE 搜尋你的 Bot 並加入好友
2. 傳送任意訊息（例如「番茄炒蛋」）
3. 若收到食譜卡片，代表部署與 Webhook 運作正常

---

## 常見問題

### 部署失敗：Permission denied

- 確認 Service Account 有 `Cloud Run Admin`、`Service Account User`、`Storage Admin` 角色
- 確認 GCP_PROJECT_ID 正確

### LINE Webhook 驗證失敗

- 確認 Cloud Run URL 正確，且後方有 `/callback`
- 確認 Cloud Run 服務已啟用 `--allow-unauthenticated`（GitHub Actions 已預設）
- 在瀏覽器開啟 `https://你的URL/` 應看到 `{"status":"ok",...}`

### 冷啟動較慢

- 第一次請求約需 5–15 秒屬正常
- 可考慮設定 Cloud Run「最低執行個體數」為 1 以減少冷啟動（會產生費用）

---

## 後續更新

之後每次 push 到 `main` 分支，GitHub Actions 會自動重新部署到 Cloud Run，無需手動操作。
