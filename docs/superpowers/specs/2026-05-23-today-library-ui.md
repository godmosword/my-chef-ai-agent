# Today + Library UI（Prompt 3）

**狀態**：已實作（feature flag）  
**旗標**：`NEXT_PUBLIC_NEW_UI=1` 啟用 Landing + `/app` shell；預設 `0` 維持根路徑經典 `ChatPanel`。

## 路由

| 路徑 | 說明 |
|------|------|
| `/` | `newUI=1` → Marketing；否則 `ChatPanel` |
| `/legacy` | 經典聊天（永遠可用） |
| `/app` | Today（HeroInput + fake stream + 最近食譜） |
| `/app/library` | Library（搜尋、菜系 Chip、圖庫／表格） |
| `/app/library/[id]` | 詳情（食材／步驟） |
| `/app/me` | 配額、主題、法律連結 |
| `/showcase` | Primitives 展示（dev） |

## 技術約束

- Tailwind + `@chef/design-tokens`；`components/` 內禁 hardcode hex
- 串流：`lib/api/streaming.ts` 的 `fakeRecipeStream`（POST 仍 one-shot；真 SSE → Prompt 2.5）
- **不修改** `web/app/api/*`

## 已知缺口（TODO）

- Filter 菜系計數：API 無 aggregate → UI 由列表推算
- `GET /api/favorites` 無 limit → client slice
- CommandBar、Plan、Shopping：佔位
- Detail：版本史、主圖編輯 → 後續 Prompt
