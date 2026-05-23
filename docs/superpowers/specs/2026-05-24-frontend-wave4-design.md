# 前端第四波：整體精緻化（Wave 4）

**狀態**：設計已核准（方向 OK）  
**前置**：Prompt 8（主圖自動化）、9（Landing）、10（Today polish）已 merge  
**策略**：旅程切片（Vertical Slice）；設計系統 B 為薄橫切，最後 Wave 4c 收斂  
**約束**：不改 API、不改路由、不改資料模型；不引入動畫庫

---

## 1. 北極星與成功指標

### 北極星

> 打開 App 5 秒內知道要幹嘛；生成後 10 秒內看到像雜誌的成品圖；任何頁面都不像工程師頁面。

### 成功指標（可驗收）

| 指標 | 目標 |
|------|------|
| 新用戶首次生成完成率 | 輸入 → 看到完整食譜（含占位/主圖）→ 可點進詳情，無 500 |
| 視覺錨點 | 詳情與列表卡片主圖風格一致；公開頁 `/r/:token` 有 hero |
| 設計一致性 | App 路徑無新增 hardcode 色（烹飪模式 scoped 除外） |
| 暗色模式 | `data-theme="dark"` 下背景/表面/文字可辨，對比 ≥ WCAG AA |
| 次要頁 | Plan / Shopping / Me 空狀態、標題階層與 Today 同語言 |

### 明確不做（YAGNI）

- 重做 IA（不新增第 6 個 Tab）
- framer-motion / 複雜 scroll animation
- 步驟配圖、主圖風格選擇、圖片持久化 GCS（另立 Prompt）
- 後端 schema / 新 API endpoint
- 重做 legacy `ChatPanel`（僅 footer 連結維持）

---

## 2. Workstream 對照（ABCD）

| ID | 名稱 | Wave 4a | Wave 4b | Wave 4c |
|----|------|---------|---------|---------|
| **A** | 核心轉化 | 主 | 輔（Cook 入口） | — |
| **B** | 設計系統 | 薄（dark 最小集） | 中（公開頁 token） | 主（hardcode 清掃） |
| **C** | 內容頁深度 | 主（詳情 v1） | 主（Cook + `/r/:token`） | 輔 |
| **D** | 次要頁齊平 | — | — | 主 |

---

## 3. Wave 4a —「第一次成功生成」

### 3.1 範圍

**使用者故事**：從 Landing prefill 或 Tonight 輸入 → 生成 → 理解結果 → 進料理書。

### 3.2 A · 核心轉化

| 項目 | 說明 |
|------|------|
| `StreamingRecipe` 升級 | 欄位漸進時顯示骨架；完成後區塊含標題、菜系 chip、主圖區（`hero_status` polling） |
| 成功態 CTA | 主：`查看詳情`；次：`再做一道`；配額將盡時 Hero 內提示，不蓋過結果 |
| 錯誤態 | Playbook 文案；保留 textarea 內容；429 導向配額說明（`/app/me` 或 inline） |
| 生成中 | 禁用 quick prompts；footer 顯示「生成中…」取代按鈕 |

**檔案**：`components/patterns/StreamingRecipe.tsx`、`app/(app)/app/page.tsx`

### 3.3 C · 料理書詳情 v1

| 項目 | 說明 |
|------|------|
| Layout | 頂部全寬 hero（沿用 `RecipeDetailHero`）；標題 + 菜系；固定底欄「進廚房模式」（flag） |
| 內容區 | 食材 / 步驟 section 標題 14px medium；間距對齊 Today「最近做過」 |
| 分享 | 既有 `RecipeShareMenu` 保留於標題列 |

**檔案**：`app/(app)/app/library/[id]/page.tsx`、可抽 `components/recipe/RecipeDetailLayout.tsx`

### 3.4 B · 薄切（4a）

| 項目 | 說明 |
|------|------|
| Dark token 最小集 | `packages/design-tokens/src/tokens.json`：`background`、`surface`、`text`、`border` 的 dark 值 ≠ light |
| 建置 | `pnpm tokens:build` |
| 驗證 | `/app`、`/app/library/[id]` 在 `data-theme="dark"` 下可讀 |

### 3.5 驗收（4a）

- [ ] 生成成功後 10s 內可見主圖或占位→ready
- [ ] 詳情頁 hero-first，手機無破版
- [ ] dark 模式下 Today + 詳情可讀
- [ ] 無新 API；`pnpm -F @chef/web build` / test 通過

### 3.6 建議 commits

1. `feat(web): streaming recipe result panel with hero polling (4a-A)`
2. `feat(web): recipe detail hero-first layout (4a-C)`
3. `feat(web): design tokens dark palette minimal (4a-B)`

---

## 4. Wave 4b —「做完一道菜 + 分享出去」

### 4.1 範圍

詳情 → 烹飪模式 → 評分；公開頁與 OG 對齊品牌。

### 4.2 C · 烹飪 + 公開頁

| 項目 | 說明 |
|------|------|
| Cooking Mode | 步驟字級/對比與 token 對齊；計時器視覺與 Playbook 一致；結束後回詳情 |
| `/r/[token]` | hero 區、標題 serif、食材/步驟排版同詳情；noindex 不變 |
| OG | 既有 `opengraph-image`；有 `hero_url` 時優先使用（可選，不阻塞） |

**檔案**：`app/(cooking)/...`、`app/r/[token]/page.tsx`

### 4.3 A · 轉化（輔）

| 項目 | 說明 |
|------|------|
| Cook 完成 | 「記錄完成」toast + 可選「回到 Tonight」 |
| Library 列表 | 卡片 hover / 主圖狀態已具備；確認 `lastCookedAt` meta 顯示 |

### 4.4 B · 中等

- 公開頁、烹飪 scoped theme 與 global dark 不衝突
- `HeroPlaceholder` 菜系色保留（產品識別），文件註記例外

### 4.5 驗收（4b）

- [ ] Cook 全流程可完成；Wake Lock / 計時器可用
- [ ] 公開頁在 mobile 可讀；分享連結 preview 正常
- [ ] dark：Cook 仍用 `.cooking-mode`；公開頁隨 global theme

### 4.6 建議 commits

1. `polish(web): cooking mode typography and tokens (4b-C)`
2. `polish(web): public recipe page layout parity (4b-C)`
3. `polish(web): post-cook feedback and library meta (4b-A)`

---

## 5. Wave 4c —「全站齊平 + 設計債」

### 5.1 D · Plan / Shopping / Me

| 頁面 | 改動 |
|------|------|
| `/app/plan` | Week grid 間距、空格子狀態、PickRecipeSheet 與 RecipeCard 一致 |
| `/app/shopping` | 列表分組標題階層、列印樣式不影響螢幕 |
| `/app/me` | 設定區塊標題統一；配額區塊為 mobile 主入口（已存在，強化視覺） |

**檔案**：`app/(app)/app/plan/**`、`shopping/**`、`me/**`

### 5.2 B · 設計債清掃

| 項目 | 說明 |
|------|------|
| Hardcode 色 | 清 App 路徑；marketing mock 保留並註記 |
| 元件 | 補 `components/patterns/SectionHeader.tsx`（title + optional action） |
| Focus / disabled | 與 globals 一致；抽查 Tab 鍵路徑 |
| 文件 | 更新 `UX_PLAYBOOK.md` 新增 Web 表面 |

### 5.3 微互動（全站，若未在 4a 完成）

- `page-enter` 可擴至 `(app)/layout` 子頁（可選）
- RecipeCard hover 陰影（Prompt 10 已部分完成）

### 5.4 驗收（4c）

- [ ] Plan / Shopping / Me 三頁 mobile + desktop 無破版
- [ ] Lighthouse A11y ≥ 95 on `/app`（mobile）
- [ ] grep 無 App 路徑新增 `#hex`（允許 cuisine 漸層表）

### 5.5 建議 commits

1. `polish(web): plan and shopping visual parity (4c-D)`
2. `polish(web): shared SectionHeader and token cleanup (4c-B)`
3. `docs: UX playbook web surfaces update (4c)`

---

## 6. 元件與目錄邊界

```
web/components/
├── patterns/
│   ├── StreamingRecipe.tsx      # 4a 升級
│   ├── SectionHeader.tsx        # 4c 新增
│   └── ...
├── recipe/
│   ├── RecipeDetailLayout.tsx   # 4a 可選抽取
│   ├── RecipeDetailHero.tsx     # 已有
│   └── RecipeCardWithHero.tsx   # 已有
packages/design-tokens/
└── src/tokens.json              # 4a dark 值
```

**依賴規則**：

- patterns 可依賴 primitives、recipe；recipe 不依賴 patterns（除既有例外）
- 頁面只做編排，邏輯放 hooks / lib

---

## 7. 資料流與錯誤處理

| 場景 | 行為 |
|------|------|
| 生成中 | `streaming=true`；HeroInput disabled |
| 429 文字配額 | StreamingRecipe 顯示訊息；Hero 按鈕 disabled（已有） |
| 主圖失敗 | 詳情/卡片顯示 `HeroPlaceholder` failed；可「重生主圖」 |
| 離線 | 沿用 OfflineProvider；不新增流程 |
| DB 未設定 | 無 polling；占位 skipped |

**不新增** API route。

---

## 8. 測試策略

| 類型 | 內容 |
|------|------|
| 單元 | `greeting.ts`、`recipe-payload` 既有；新增 `SectionHeader` snapshot（可選） |
| 建置 | `pnpm -F @chef/web build` 每 wave |
| 手動 | 各 wave 驗收 checklist + 三視口截圖 |
| 暗色 | DevTools + Me 頁切 dark |

---

## 9. 風險與緩解

| 風險 | 緩解 |
|------|------|
| dark token 影響 landing | 4a 後跑 `/` 視覺 smoke |
| StreamingRecipe 與 fake stream 不同步 | 對齊 `useRecipeGeneration` 事件 |
| 4c 範圍膨脹 | D 僅視覺，不改 Plan DnD 邏輯 |
| 公開頁 hero 為 data URL 過大 | 不阻塞；沿用現有 URL |
| `subscriptions` 等 DB 缺表 | 與 UI 無關；確保 `db:migrate` 至 0007 |

---

## 10. 與里程碑文件同步

每 wave 收尾更新：`CHANGELOG.md`、`TODOS.md`、`README.md`（見 `CONTRIBUTING.md`）。

---

## 11. 實作計畫

已產出：[`docs/superpowers/plans/2026-05-24-frontend-wave4-plan.md`](../plans/2026-05-24-frontend-wave4-plan.md)
