# 貢獻指南

## 開發與測試

- **產品**：[`web/README.md`](web/README.md)（Vercel）；Agent 改動完直推 `main`。
- 環境與指令：根目錄 [`AGENTS.md`](AGENTS.md)。

```bash
pnpm install
pnpm tokens:build
pnpm -F @chef/web test
pnpm -F @chef/web build
```

- 開源前自查：[`docs/OPEN_SOURCE_CHECKLIST.md`](docs/OPEN_SOURCE_CHECKLIST.md)。

## Plan／里程碑收尾（必做）

每完成一項較大工程計畫或里程碑，**請與程式碼同一批 commit** 更新以下檔案，避免文件與實作脫節：

| 檔案 | 用途 |
|------|------|
| [`TODOS.md`](TODOS.md) | Backlog：已完成項勾除或改寫，新缺口補列。 |
| [`CHANGELOG.md`](CHANGELOG.md) | 對使用者／部署／營運的變更摘要。 |
| [`README.md`](README.md) | 功能表、`.env` 說明、測試數量、專案結構等與現況一致。 |

完整說明與維護者偏好（含 deploy 流程）：[`AGENTS.md`](AGENTS.md) 的「Plan／里程碑收尾」與「Git／部署流程」。

## 維護者出貨（本倉庫預設）

### 部署目標：僅 Vercel

- **Production** 由 [Vercel](https://vercel.com) 托管：**Root Directory = `web`**，Git 連 `main` 自動部署。
- **`localhost` 只用於本機開發**（`pnpm dev:web`），**不是**上線或請人驗收的網址。
- 根目錄 `Dockerfile` 僅供可選的 GCP Cloud Build；**產品主線仍是 Vercel**。不需要時請在 GCP 關閉 trigger。

### 程式出貨：直推 main

1. 通過測試／建置（見上方指令）。
2. **`git commit`** → **`git push origin main`**。
3. 在 Vercel Production（或 `NEXT_PUBLIC_SITE_URL`）驗收。

**不開 PR** 作為維護者／Agent 的預設流程。對外協作者若無 `main` 寫入權，再改用 fork + PR。

### Agent 禁止慣例

- 不要為了「請你看變更」而啟動 dev server 並給 `http://localhost:3000`。
- 不要把「本機跑起來」說成 deploy。

細節：[`CLAUDE.md`](CLAUDE.md)、[`AGENTS.md`](AGENTS.md)「Git／部署流程」。

## Cursor 規則

| 規則 | 用途 |
|------|------|
| [`.cursor/rules/vercel-main-ship.mdc`](.cursor/rules/vercel-main-ship.mdc) | Vercel + 直推 `main`；禁止 localhost 當 deploy／驗收 |
| [`.cursor/rules/plan-ship-docs.mdc`](.cursor/rules/plan-ship-docs.mdc) | 里程碑收尾時同步 TODOS、CHANGELOG、README |
