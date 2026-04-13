# GCP Cloud Run 部署教學

將「米其林職人大腦」LINE Bot 部署到 GCP Cloud Run 的逐步教學。

---

## 目錄

1. [啟用 GCP API](#步驟一啟用-gcp-api)  
2. [建立 Service Account](#步驟二建立-service-account)  
3. [取得專案 ID 與區域](#步驟三取得專案-id-與區域)  
4. [推送到 GitHub](#步驟四推送到-github)  
5. [設定 GitHub Secrets](#步驟五設定-github-secrets)  
6. [觸發部署](#步驟六觸發部署)  
7. [取得 Cloud Run URL](#步驟七取得-cloud-run-url)  
8. [設定 LINE Webhook](#步驟八設定-line-webhook)  
9. [測試 Bot](#步驟九測試-bot)  

---

## 步驟一：啟用 GCP API

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 選取或建立專案
3. 點擊上方搜尋列，分別搜尋並啟用：
   - **Cloud Run API**
   - **Artifact Registry API**
   - **Cloud Build API**

---

## 步驟二：建立 Service Account

1. 左側選單 → **IAM 與管理** → **Service Account**
2. 點擊 **建立 Service Account**
3. 填寫：
   - 名稱：`github-deploy`（可自訂）
   - 說明：供 GitHub Actions 部署 Cloud Run
4. 點擊 **建立並繼續**
5. 點擊 **新增角色**，依序加入：
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`
6. 點擊 **完成**
7. 在列表中點該 Service Account 右側 ⋮ → **管理金鑰**
8. **新增金鑰** → **建立新金鑰** → 選擇 **JSON** → 下載
9. 妥善保存此 JSON 檔（步驟五會用到）

---

## 步驟三：取得專案 ID 與區域

1. GCP Console 上方點擊專案名稱下拉
2. 複製 **專案 ID**（例如 `my-project-123456`）
3. 選擇部署區域，建議：
   - `asia-east1`（台灣）
   - `asia-northeast1`（東京）

---

## 步驟四：推送到 GitHub

### 若尚未建立 repo

1. 前往 [github.com/new](https://github.com/new)
2. Repository name：`my-chef-ai-agent`
3. 選擇 Public，**不要**勾選 Add README
4. 點擊 **Create repository**

### 在本機專案執行

```bash
cd /Users/godmosword.eth/Downloads/my-chef-ai-agent

git init
git remote add origin https://github.com/你的帳號/my-chef-ai-agent.git

git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

> 若 push 要求登入，請使用 [Personal Access Token](https://github.com/settings/tokens)（勾選 `repo`）作為密碼。

---

## 步驟五：設定 GitHub Secrets

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. 點擊 **New repository secret**，依序新增：

| Secret 名稱 | 值 | 取得方式 |
|-------------|-----|----------|
| `GCP_SA_KEY` | JSON 檔完整內容 | 步驟二下載的 JSON，用文字編輯器開啟並複製全部 |
| `GCP_PROJECT_ID` | 專案 ID | 步驟三 |
| `CLOUD_RUN_SERVICE` | `my-chef-ai-agent` | 自訂服務名稱 |
| `CLOUD_RUN_REGION` | `asia-east1` | 步驟三選擇的區域 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Access Token | [LINE Developers](https://developers.line.biz/) → Channel → Messaging API |
| `LINE_CHANNEL_SECRET` | Channel Secret | LINE Developers → Basic settings |
| `GEMINI_API_KEY` | API 金鑰 | [Google AI Studio](https://aistudio.google.com/apikey) |
| `DATABASE_URL` | Postgres 連線字串 | Render Postgres 或其他 PostgreSQL（選填，建議正式環境設定） |

---

## 步驟六：觸發部署

1. 對 `main` 分支做任意修改後 push，例如：

```bash
git add .
git commit -m "Trigger deploy"
git push origin main
```

2. 前往 GitHub 上方 **Actions** 分頁  
3. 確認「Deploy to GCP Cloud Run」workflow 執行中  
4. 等待約 3–5 分鐘至成功（綠色 ✓）

---

## 步驟七：取得 Cloud Run URL

1. 開啟 [Cloud Run](https://console.cloud.google.com/run)
2. 點擊服務名稱（如 `my-chef-ai-agent`）
3. 在頂部複製 **URL**，例如：`https://my-chef-ai-agent-xxxxx-uc.a.run.app`

**驗證**：在瀏覽器開啟 `https://你的URL/`，應看到：

```json
{"status":"ok","message":"米其林職人大腦 (Gemini 3.1 Pro Preview 版)"}
```

---

## 步驟八：設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇 Provider 與 Channel
3. 點擊 **Messaging API**
4. 在 **Webhook settings**：
   - Webhook URL：`https://你的CloudRun網址/callback`
   - 範例：`https://my-chef-ai-agent-xxxxx-uc.a.run.app/callback`
5. 點擊 **Update** → **Verify**（應顯示 Success）
6. **Use webhook**：Enabled  
7. **Auto-reply messages**：Disabled  

---

## 步驟九：測試 Bot

1. 在 LINE 搜尋並加入 Bot 好友
2. 傳送「番茄炒蛋」或「🍳 隨機配菜」
3. 若收到食譜卡片，代表部署成功

---

## 常見問題

**部署失敗：Permission denied**  
→ 確認 Service Account 已授予 Cloud Run Admin、Service Account User、Storage Admin

**部署失敗：container failed to start and listen on PORT**  
→ 通常為 `GEMINI_API_KEY` 未設定或為空。請至 GitHub → Settings → Secrets → Actions 新增 `GEMINI_API_KEY`（從 [Google AI Studio](https://aistudio.google.com/apikey) 取得）

**LINE Webhook 驗證失敗**  
→ 確認 URL 以 `/callback` 結尾、Cloud Run 服務為 `allow-unauthenticated`

**冷啟動較慢**  
→ 首次請求約 5–15 秒屬正常，可設「最低執行個體數」為 1 減少冷啟動（會產生費用）

**訊息仍顯示舊版模型名稱（如 Claude）**  
→ 若程式已部署但 LINE 仍顯示舊文字，請檢查 **LINE Developers Console** → **Messaging API** → **Greeting messages**（加入好友的招呼訊息），該處為 LINE 平台設定，需手動更新為「米其林職人大腦，Gemini 3.1 Pro 已就緒」等

---

## 後續更新

之後每次 push 到 `main`，GitHub Actions 會自動重新部署。
