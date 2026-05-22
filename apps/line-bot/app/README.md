# `app/` — 封存中的 LINE Bot 後端

**現行產品請使用 [`web/`](../web/)（Next.js on Vercel）。**

此套件為歷史 **LINE Messaging API + FastAPI** 實作：webhook、Flex Message、佇列 worker、Playwright 海報等。

- 部署與指令說明：[`docs/LEGACY_LINE_BOT.md`](../docs/LEGACY_LINE_BOT.md)
- 入口：[`main.py`](../main.py)

新功能預設不再擴充此路徑；共用邏輯以 Web TypeScript 為準。
