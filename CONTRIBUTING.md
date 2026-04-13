# 貢獻指南

## 開發與測試

- 本機啟動、環境變數、pytest 與 webhook 模擬：見根目錄 [`AGENTS.md`](AGENTS.md)。
- 執行測試：`LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key python3 -m pytest tests/ -v`

## Plan／里程碑收尾（必做）

每完成一項較大工程計畫或里程碑，**請與程式碼同一批 commit** 更新以下檔案，避免文件與實作脫節：

| 檔案 | 用途 |
|------|------|
| [`TODOS.md`](TODOS.md) | Backlog：已完成項勾除或改寫，新缺口補列。 |
| [`CHANGELOG.md`](CHANGELOG.md) | 對使用者／部署／營運的變更摘要。 |
| [`README.md`](README.md) | 功能表、`.env` 說明、測試數量、專案結構等與現況一致。 |

完整說明與維護者偏好（含 deploy 流程）：[`AGENTS.md`](AGENTS.md) 的「Plan／里程碑收尾」與「Git／部署流程」。

## Cursor 規則

本倉庫在 [`.cursor/rules/plan-ship-docs.mdc`](.cursor/rules/plan-ship-docs.mdc) 設有對應規則，提醒 agent 收尾時同步上述三份文件。
