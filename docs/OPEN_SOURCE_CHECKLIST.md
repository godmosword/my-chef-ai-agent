# 開源前檢查清單

在將本倉庫公開或擴大協作者範圍前，建議依序完成下列項目（與風險評估項目 2–6 對齊）。

## 1. 授權與著作權

- [ ] 根目錄已具 [`LICENSE`](../LICENSE)，且與 `README.md`「授權」小節一致（目前為 **MIT**）。
- [ ] 若曾合併外部程式碼，確認其授權與 MIT **相容**，並保留必要之著作權聲明。

## 2. 第三方套件授權

- [ ] 安裝開發依賴後執行：  
  `python3 scripts/generate_third_party_licenses.py`  
  並將更新後的 [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) 一併提交。
- [ ] 重大升級 `requirements.txt` 後重新產生該檔，避免文件過期。

## 3. 商標與命名

- [ ] 閱讀 [`README.md`](../README.md) 的「商標聲明」：專案展示名稱與第三方註冊商標之關係；若對外發布，評估是否改用中性品牌名稱。

## 4. 營運與安全預設

- [ ] **生產環境**設定強隨機的 `METRICS_TOKEN`；未設定時 `GET /metrics` 回 **503**（避免指標外洩）。
- [ ] 使用 `ADMIN_API_TOKEN` 保護管理 API；未設定時管理端點為停用狀態。
- [ ] 勿在正式環境開啟 `DEBUG=1`；勿將 `.env`、資料庫備份、Service Account JSON 提交進 Git。

## 5. 機密與 Git 歷史

- [ ] 執行全歷史 secret 掃描（例如 [gitleaks](https://github.com/gitleaks/gitleaks) 或託管平台內建掃描）。
- [ ] 若歷史曾出現金鑰：旋轉金鑰並清理歷史（`git filter-repo` 等），**僅改最新 commit 無法撤銷已外洩之密文**。

## 6. CI 與 GitHub Actions

- [ ] **不要**在 log 中輸出 `secrets.*`（例如 `echo "${{ secrets.FOO }}"`）；驗證步驟僅做「是否為空」判斷即可。
- [ ] 變更 workflow 時檢查：`deploy` 等 job 的 `env_vars` 是否仍只透過 Secrets 注入，而未寫死生產憑證。

## 7. 外部 API 與法遵

- [ ] 部署者自行申請並遵守 **LINE**、**Google／Gemini**、**OpenRouter**、**YouTube** 等供應商條款；本專案程式碼開源**不**包含這些服務之使用權或額度。
