# 職人料理大腦 — UX/UI 完整實作規格

> **版本**：v1.0（2026-05-25）
> **用途**：作為後續 `MODE: IMPLEMENT` 的唯一規格依據
> **狀態**：已實作（Phase 1–7）；2026-05-26 補齊規格缺口（sticky CTA、錯誤分類、推播排程等，見 CHANGELOG）

---

## 📐 規格通用約定

### 命名規則
- React Component：PascalCase（`InputHero`、`QuickChips`）
- 檔案：與 component 同名（`InputHero.tsx`）
- Hook：`use` 開頭（`usePlaceholderRotator`）
- 工具函式：camelCase（`getGreeting`）
- CSS class：Tailwind utility first，必要時用 `@apply` 抽出
- Data attribute：kebab-case（`data-chip-id`）

### TypeScript 約定
- 所有 component props 用 `type` 定義（不用 interface，除非要 extend）
- Props type 命名：`<ComponentName>Props`
- 嚴禁 `any`；不確定型別用 `unknown` + type guard

### 響應式 breakpoint
沿用 Tailwind 預設：
- `sm`: 640px（小手機 → 大手機）
- `md`: 768px（平板）
- `lg`: 1024px（小桌面）
- `xl`: 1280px（桌面）

Mobile-first：預設樣式為 mobile，往上加 `sm:` `md:` `lg:`

### 動效原則
- 進場：200ms ease-out
- 離場：150ms ease-in
- 微互動（hover、tap）：100-150ms
- 嚴禁 spinner 超過 300ms 才出現（用 skeleton）
- `prefers-reduced-motion` 一律尊重

---

# 🔴 P0-1｜App 主頁新用戶引導

## 1. Placeholder 輪播

### 文案清單（最終版）

```ts
// lib/copy/placeholders.ts
export const INPUT_PLACEHOLDERS = [
  '冰箱有番茄、洋蔥跟蛋…',
  '四歲孩子不吃辣的晚餐…',
  '兩大一小，30 分鐘內，一鍋完成…',
  '用電鍋做的雞肉炊飯…',
  '只有醬油、米酒，能做什麼…',
  '剩半顆高麗菜，要清掉…',
] as const;
```

### 時序規格

| 項目 | 值 | 備註 |
|------|---|------|
| 切換間隔 | 4000ms | 從上一句完全消失算起 |
| 淡出 | 200ms ease-in | opacity 1 → 0 |
| 停留（空白） | 150ms | 避免太快 |
| 淡入 | 250ms ease-out | opacity 0 → 1 |
| 用戶開始輸入 | 立即停止輪播 | textarea `value.length > 0` |
| 用戶清空 | 1500ms 後恢復輪播 | 從清單下一句開始，不從頭 |
| 用戶 focus 但沒打字 | 繼續輪播 | 不停 |
| `prefers-reduced-motion` | 不淡入淡出，直接切 | 仍輪播 |

### Hook 實作骨架（參考）

```ts
// hooks/usePlaceholderRotator.ts ⚠ 參考用 snippet，請勿 apply
function usePlaceholderRotator(
  placeholders: readonly string[],
  isPaused: boolean,
  intervalMs = 4000
) {
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIndex((i) => (i + 1) % placeholders.length);
        setOpacity(1);
      }, 200 + 150); // fade-out + gap
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPaused, intervalMs, placeholders.length]);

  return { text: placeholders[index], opacity };
}
```

### 無障礙
- `aria-live="polite"` 不要設（避免讀屏狂念）
- placeholder 本身不需要 `aria-label`，screen reader 不應該唸 placeholder

---

## 2. Quick Chips

### Chip 清單

```ts
// lib/copy/quick-chips.ts
export const QUICK_CHIPS = [
  { id: 'clean-fridge', label: '清冰箱', insert: '清冰箱的菜，' },
  { id: 'kids', label: '兒童餐', insert: '小孩吃的（不辣），' },
  { id: '30min', label: '30分鐘', insert: '30 分鐘內完成，' },
  { id: 'one-pot', label: '一鍋完成', insert: '一鍋完成，' },
  { id: 'rice-cooker', label: '電鍋', insert: '用電鍋做，' },
  { id: 'no-spicy', label: '不辣', insert: '不辣，' },
  { id: 'meal-prep', label: '常備菜', insert: '可以備起來放的常備菜，' },
] as const;
```

### 互動行為

| 行為 | 規格 |
|------|------|
| 點擊未選中 chip | append `insert` 到 textarea 結尾 + 該 chip 進入「已選中」視覺態 |
| 點擊已選中 chip | 從 textarea 移除該段文字 + 視覺態變回未選 |
| Append 時 | 自動處理重複空格、結尾逗號 |
| Textarea 內容被手動清空 | 所有 chip 視覺態回到未選 |
| 點擊後 | textarea 不要 auto-focus（避免手機鍵盤彈出干擾） |

### 視覺規格

| 狀態 | 樣式 |
|------|------|
| 未選 | 邊框 1px `border-fg-tertiary/30`、背景透明、文字 `fg-secondary` |
| Hover（desktop） | 邊框變 `fg-secondary`、背景 `bg-raised` |
| 已選 | 背景 `accent-100`、文字 `accent-700`、邊框 `accent-200` |
| Tap（mobile） | 短暫 `scale-95` 100ms |
| 字體 | `text-sm`，圓角 `rounded-full`，內距 `px-3 py-1.5` |

### 排列方式
- Mobile：橫向滑動（`overflow-x-auto`），無滾動條（`scrollbar-hide`），左右各 `px-4` 空白
- Desktop：自然 wrap，間距 `gap-2`

---

## 3. 「今晚靈感」情境卡片

### Data

```ts
// lib/copy/inspirations.ts
export const INSPIRATIONS = [
  {
    id: 'clean-fridge',
    tag: '清冰箱',
    title: '番茄炒蛋',
    description: '冰箱有番茄、洋蔥跟雞蛋',
    prefill: '冰箱有番茄、洋蔥跟雞蛋',
  },
  {
    id: 'kids-meal',
    tag: '兒童餐',
    title: '蔬菜雞肉炊飯',
    description: '四歲孩子不吃辣的晚餐',
    prefill: '四歲孩子不吃辣的晚餐',
  },
  {
    id: 'family',
    tag: '兩大一小',
    title: '電鍋雞肉蔬菜炊飯',
    description: '30 分鐘內的一鍋晚餐',
    prefill: '兩大一小的晚餐，30 分鐘，不辣，一鍋完成',
  },
] as const;
```

### 互動
- 點擊卡片 → prefill 到 textarea + scroll 回頁面頂部 + textarea focus（**desktop 才 focus**，mobile 不 focus）
- **不直接 submit**，留編輯空間

### 視覺
- Mobile：直向排列、卡片全寬
- Desktop（≥ md）：3 欄 grid
- 卡片內容由上而下：tag（小、accent 色）→ 料理名（h3）→ 描述（灰色小字）→ 右下角 `→` 圖示
- 卡片 hover：陰影加深 + 輕微上移 `-translate-y-0.5`

---

## 4. 涉及檔案完整清單

```
新建：
  components/app-home/InputHero.tsx
  components/app-home/QuickChips.tsx
  components/app-home/InspirationCards.tsx
  hooks/usePlaceholderRotator.ts
  hooks/useChipState.ts
  lib/copy/placeholders.ts
  lib/copy/quick-chips.ts
  lib/copy/inspirations.ts

修改：
  app/(app)/app/page.tsx  ← 重組頁面結構
```

---

## 5. 驗收 Checklist

- [ ] 第一次進 `/app` 看到輪播 placeholder、chips、靈感卡
- [ ] Placeholder 在輸入時立即停止、清空後 1.5 秒恢復
- [ ] Chip 點擊 append 不取代原內容
- [ ] 重複點同一 chip 會撤銷
- [ ] 靈感卡 mobile 點擊不彈出鍵盤
- [ ] `prefers-reduced-motion` 下無淡入淡出但仍輪播
- [ ] 鍵盤可 tab 到所有 chip 與卡片

---

# 🔴 P0-2｜App 主頁資訊架構重組

## 1. 新版頁面結構

```
┌─────────────────────────────────────┐
│ TopBar                              │ ← 56px
│ [Logo] ················ [Me icon]   │
├─────────────────────────────────────┤
│                                     │
│ 「今晚想吃什麼？」    H1            │ ← 32-40px 字
│ 2026/5/23 · 星期六 · 深夜好         │ ← 小字、次要色
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Textarea（4 行）                │ │ ← 主輸入區
│ │ Placeholder 輪播…               │ │
│ └─────────────────────────────────┘ │
│ [#清冰箱][#兒童餐][#30分鐘][#…]    │ ← chips
│                                     │
│ [          生成食譜          ]      │ ← 主按鈕
│   ⌘+↵（desktop only）              │
│                                     │
├─────────────────────────────────────┤
│ 最近                       全部 →   │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ →              │ ← 橫向滑動
│ │  │ │  │ │  │ │  │                │
│ └──┘ └──┘ └──┘ └──┘                │
├─────────────────────────────────────┤
│ 今晚靈感                            │
│ ┌──────────────┐                    │
│ │ 情境卡片 1   │                    │
│ └──────────────┘                    │
│ ┌──────────────┐                    │
│ │ 情境卡片 2   │                    │
│ └──────────────┘                    │
│ ┌──────────────┐                    │
│ │ 情境卡片 3   │                    │
│ └──────────────┘                    │
├─────────────────────────────────────┤
│ Bottom Tab Bar（mobile only）       │
│ [今晚][料理書][週曆][採買][我的]    │
└─────────────────────────────────────┘
```

## 2. TopBar 規格

| 元素 | 規格 |
|------|------|
| 高度 | `h-14`（56px） |
| 背景 | `bg-base/80 backdrop-blur-md`、scroll 時加 `border-b border-fg-tertiary/10` |
| Logo | 左側、`text-base font-medium`、文字「職人料理」（不要重複大字版） |
| 右側 icon | 用戶頭像 / 預設 user icon，連到 `/app/me` |
| 配額顯示 | **完全移除**（移到 `/app/me`） |
| 搜尋 `⌘K` | **暫時移除**，本次不做（除非當前已實作了功能） |

## 3. 問候 + 日期區塊

### 問候邏輯

```ts
// lib/copy/greeting.ts
function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return '早安';
  if (hour >= 11 && hour < 14) return '中午好';
  if (hour >= 14 && hour < 17) return '午後好';
  if (hour >= 17 && hour < 19) return '快下班了';     // ← P2-1 會強化這段
  if (hour >= 19 && hour < 22) return '晚上好';
  return '深夜好';
}
```

### 排版

```
[H1] 今晚想吃什麼？
[小字] 2026/5/23 · 星期六 · 深夜好
```

| 元素 | 樣式 |
|------|------|
| H1 | `text-3xl sm:text-4xl font-semibold tracking-tight` |
| 日期+問候 | `text-sm text-fg-secondary mt-1` |
| 間距 | 容器 `pt-8 pb-6` |

## 4. 「最近」區塊

### 卡片內容
- 縮圖（若無 → 用料理分類色 + emoji fallback）
- 料理名（一行截斷）
- Tag（家常 / 西式 / 日式…）
- 時間（如「30 分」）

### 互動
- 點卡片 → 進該食譜頁
- 右上「全部 →」→ 進 `/app/library`

### 排版
- 卡片寬度：mobile `w-40`、desktop `w-48`
- 橫向滑動：`overflow-x-auto snap-x snap-mandatory scrollbar-hide`
- 左右 `px-4` 空白、卡片間 `gap-3`
- 最多顯示 8 張，超過提示「全部 →」

### 空狀態
```
還沒有食譜
從上方輸入你今晚想吃的，AI 會幫你想出可行的一餐
```
插畫建議：簡單線條的鍋具圖（用 emoji 也可：🍳）

## 5. 涉及檔案

```
新建：
  components/app-home/AppTopBar.tsx
  components/app-home/GreetingHeader.tsx
  components/app-home/RecentRecipes.tsx
  lib/copy/greeting.ts

修改：
  app/(app)/app/page.tsx       ← 重組順序
  app/(app)/app/me/page.tsx    ← 接收配額顯示
  components/app-home/QuotaCard.tsx ← 從原本的 TopBar 抽出來

可能影響（需檢查）：
  components/AppLayout.tsx 或 app/(app)/layout.tsx
```

## 6. 驗收 Checklist

- [ ] `/app` 頂部不再出現 `文字配額 20/20`
- [ ] `/app/me` 能看到配額卡片
- [ ] 品牌名只出現一次
- [ ] 「最近」橫向滑動順暢、snap 對齊
- [ ] 「最近」空狀態正確顯示
- [ ] 不同時段問候不同（先實作通用版，P2-1 再強化下班時段）

---

# 🟡 P1-1｜食譜頁 CTA 收斂

## 1. Mobile Sticky Bottom Bar 規格

### 視覺
```
┌─────────────────────────────────────┐
│  [    進入烹飪模式  →    ]          │
│  pb-safe                            │
└─────────────────────────────────────┘
```

| 屬性 | 值 |
|------|---|
| Position | `fixed bottom-0 left-0 right-0` |
| 背景 | `bg-base/95 backdrop-blur-md` |
| 上邊框 | `border-t border-fg-tertiary/10` |
| 內距 | `px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]` |
| 按鈕 | 全寬、`h-12`、主色、`text-base font-medium`、圓角 `rounded-xl` |
| 出現條件 | scroll past hero 圖後（mobile 才 sticky；desktop 不固定） |
| 滾動隱藏 | 向下 scroll 時顯示、向上快速 scroll 時短暫隱藏？→ **本版不做**，固定顯示 |

### Desktop 版
- 不 sticky
- 放在食譜內容下方第一個位置
- 按鈕視覺權重最重
- 寬度 `w-full md:w-auto md:min-w-[280px]`

## 2. Overflow Menu 規格

### 觸發
- 食譜頁頂部右上角 `⋯` icon button
- `h-9 w-9`、圓形、`hover:bg-bg-raised`

### Menu 項目

```ts
const RECIPE_ACTIONS = [
  { id: 'remake', label: '用我的食材生成類似料理', icon: 'sparkles' },
  { id: 'shopping', label: '加入採買清單', icon: 'shopping-cart' },
  { id: 'copy', label: '複製食材清單', icon: 'copy' },
  { id: 'share', label: '分享', icon: 'share' },
  { id: 'home', label: '回到首頁', icon: 'home', variant: 'divider-above' },
];
```

### 視覺
- Mobile：底部彈出 sheet（最高 `60vh`）
- Desktop：dropdown menu，寬 `w-56`
- 用 shadcn/ui 的 `DropdownMenu` + `Sheet`（依現有 stack 而定）
- 各項 hover 反白

### 互動細節

| 動作 | 行為 |
|------|------|
| 用我的食材生成類似 | 跳到 `/app?prefill=<該食譜名稱>` |
| 加入採買清單 | 把食材清單寫入 local storage 的採買清單 + toast「已加入採買清單」 |
| 複製食材清單 | `navigator.clipboard.writeText()` + toast「已複製」 |
| 分享 | `navigator.share()`（有 fallback 到複製連結） |
| 回到首頁 | 跳到 `/app` |

## 3. 涉及檔案

```
新建：
  components/recipe/StickyCookCTA.tsx
  components/recipe/RecipeActionsMenu.tsx
  hooks/useToast.ts（若無）
  lib/recipe/share.ts
  lib/shopping/add-from-recipe.ts

修改：
  app/demo/recipe/page.tsx
  app/(app)/app/recipe/[id]/page.tsx  ← 真實食譜頁（推測路徑）
  components/recipe/RecipeView.tsx    ← 共用 component 移除舊的並排按鈕
```

## 4. 驗收

- [ ] Mobile sticky bar 不被 iOS home indicator 遮擋
- [ ] Mobile sticky bar 在 demo 頁也出現
- [ ] Overflow menu 在 mobile 為 bottom sheet、desktop 為 dropdown
- [ ] 複製、分享、加入採買都有 toast 回饋
- [ ] 鍵盤 `Esc` 能關閉 menu

---

# 🟡 P1-2｜食譜頁細節優化

## 1. 份量切換器（Segmented Control）

### 視覺

```
┌─────────────────────────────────┐
│ 0.5x │  1x  │  2x  │  4x        │
│      │ ███  │      │            │
└─────────────────────────────────┘
```

| 屬性 | 值 |
|------|---|
| 容器 | `inline-flex bg-bg-raised rounded-lg p-1` |
| 每段 | `px-4 py-1.5 text-sm rounded-md transition-all` |
| 選中 | `bg-base shadow-sm text-fg-primary font-medium` |
| 未選 | `text-fg-secondary hover:text-fg-primary` |
| 動畫 | 100ms ease |

### 互動
- 點擊切換倍數
- 食材數量同步更新（保留 1 位小數，無小數就不顯示）
- 切換後 scroll position 不變

## 2. Checkbox 完成態

### 食材 checkbox

| 狀態 | 樣式 |
|------|------|
| 未勾 | 邊框 `border-fg-tertiary`、背景透明 |
| Hover | 邊框 `border-fg-secondary` |
| 已勾 | 背景 accent、白色勾、文字 `line-through text-fg-tertiary` |
| 動畫 | 文字劃線 200ms ease；勾號 fade-in 150ms |

### 步驟 checkbox
- 樣式同上
- 勾完整步走後 → 自動 scroll 到下一步（smooth scroll、offset 留 top 80px）

## 3. 食材單位修補

### 檢查項目
- 確認 `Recipe.ingredients[].unit` 在 type 內
- 確認 data 來源（demo 是 hardcoded？API 回傳？）
- 前端 render fallback：若 `unit` 為空，僅顯示數字（不顯示破折號後的單位區）

### 顯示格式
```
白米 ── 1.5 杯
雞腿肉 ── 300 g
紅蘿蔔 ── 1 根
青豆 ── 50 g
白胡椒 ── 少許          ← unit 為「少許」這種特殊值
```

## 4. 步驟區塊改造

### 移除「看完整 6 步」折疊
- 預設展開所有步驟
- 移除「展開」按鈕

### 步驟編號 Badge

```
┌──┐
│ 1│  米洗淨瀝乾，雞腿切塊用醬油、米酒抓醃 10 分鐘。
└──┘
```

| 屬性 | 值 |
|------|---|
| Badge | `h-8 w-8 rounded-full bg-accent-100 text-accent-700 font-medium flex items-center justify-center` |
| 字體 | `text-sm` |
| 與步驟文字間距 | `gap-3` |
| 步驟文字 | `text-base leading-relaxed` |
| 已完成步驟 | 文字 `line-through text-fg-tertiary`、badge 變灰 |

## 5. 涉及檔案

```
新建：
  components/recipe/ServingToggle.tsx
  components/recipe/IngredientItem.tsx
  components/recipe/StepItem.tsx

修改：
  components/recipe/IngredientList.tsx
  components/recipe/StepList.tsx
  lib/recipe/types.ts          ← 確認 unit 欄位
  lib/recipe/scale.ts          ← 倍數計算
  app/demo/recipe/page.tsx     ← demo data 補單位
```

## 6. 驗收

- [ ] 份量切換有明確選中態（不只是文字）
- [ ] 切換後食材數字正確 scale
- [ ] Checkbox 勾選有劃線 + 顏色變化
- [ ] 食材全部有單位
- [ ] 步驟一進頁面就全部展開
- [ ] 步驟左側有圓形編號 badge

---

# 🟡 P1-3｜烹飪模式

## 1. 整體 Layout

```
┌─────────────────────────────────────┐
│ [×]        ⏱ 07:42         [👁]    │ ← 50px top bar
├─────────────────────────────────────┤
│                                     │
│   步驟 2 / 6                        │ ← 小字
│                                     │
│   中火下鍋，                        │ ← 巨大字（核心）
│   煎至兩面金黃                      │
│                                     │
│   [🔊 念給我聽]   [⏱ 開始 8 分鐘]   │ ← 按鈕區
│                                     │
├─────────────────────────────────────┤
│   ●  ●  ○  ○  ○  ○                  │ ← 進度圓點
├─────────────────────────────────────┤
│ [←  上一步]      [下一步  →]        │ ← 底部導航
└─────────────────────────────────────┘
```

## 2. 視覺規格

### 主步驟文字
| 屬性 | Mobile | Desktop |
|------|--------|---------|
| 字體大小 | `text-3xl`（30px） | `text-5xl`（48px） |
| 行高 | `leading-tight` | `leading-tight` |
| 字重 | `font-medium` | `font-medium` |
| 顏色 | `text-fg-primary` | 同 |

### 計時器（top bar）
- 字體 `font-mono text-lg`
- 倒數中：`text-accent-600`
- 剩餘 < 60 秒：閃爍 + 變紅 `text-danger`
- 結束時：響鈴 + 振動（mobile） + toast「⏱ 時間到」

## 3. 互動

### Mobile
| 手勢 | 行為 |
|------|------|
| 左滑 | 下一步 |
| 右滑 | 上一步 |
| 點主文字區 | 啟用 TTS（若有設定 single-tap-tts） |
| 雙擊主文字區 | 重複念當前步驟 |

### Desktop
| 鍵 | 行為 |
|----|------|
| `→` `Space` | 下一步 |
| `←` | 上一步 |
| `T` | TTS toggle |
| `Esc` | 離開烹飪模式（先問是否確定） |

### Wake Lock
- 進入烹飪模式 → 立即請求 `navigator.wakeLock.request('screen')`
- 離開（pagehide / visibilitychange hidden）→ 自動 release
- 失敗 → toast「⚠ 螢幕可能會自動關閉，建議到系統設定調整」
- 視覺化：top bar 右側 `👁` icon 表示常亮中（accent 色），未啟用為灰色

## 4. TTS 規格

### 設定
- 語言：`zh-TW`
- 速率：1.0（可在 `/app/me` 調整 0.8-1.5）
- 音調：1.0
- 用 `window.speechSynthesis`

### 行為
- 按「念給我聽」→ 念當前步驟全文
- 念到一半再按 → 停止
- 切換步驟自動停止前一步的念
- iOS Safari：第一次需用戶手勢觸發（已用 button 點擊滿足）
- 不支援的瀏覽器：button 隱藏 + console.warn

## 5. 步驟完成 / 結束流程

### 最後一步「下一步」→ 完成頁

```
┌─────────────────────────────────────┐
│                                     │
│          🎉                         │
│                                     │
│       完成了！                      │
│   電鍋雞肉蔬菜炊飯                  │
│                                     │
│   實際花了 32 分鐘                  │ ← 用時統計
│                                     │
│   下次再煮這道嗎？                  │
│   [👍 會]  [👎 不會]  [稍後再說]    │
│                                     │
│   [回到食譜]  [回到首頁]            │
│                                     │
└─────────────────────────────────────┘
```

- 評分存到該食譜的 metadata
- 「會」→ 加入「再做一次」候選池（之後用在「最近」推薦）
- 「不會」→ 不推薦該食譜

## 6. 涉及檔案

```
新建：
  app/demo/recipe/cook/page.tsx        ← 若還沒有
  app/(app)/app/recipe/[id]/cook/page.tsx
  components/cook/CookLayout.tsx
  components/cook/StepDisplay.tsx
  components/cook/CookTopBar.tsx
  components/cook/CookBottomNav.tsx
  components/cook/Timer.tsx
  components/cook/StepDots.tsx
  components/cook/CookComplete.tsx
  hooks/useWakeLock.ts
  hooks/useTTS.ts
  hooks/useCookSwipe.ts
  hooks/useCookKeyboard.ts
  lib/cook/timer-parse.ts              ← 從步驟文字抓「8 分鐘」等
```

## 7. 驗收

- [ ] 進入烹飪模式螢幕不自動鎖（實機驗證 iOS / Android）
- [ ] 字體大小在 1 公尺外可讀
- [ ] 左右滑切步驟順暢
- [ ] TTS 在 iOS Safari 與 Android Chrome 都能用
- [ ] 計時器切換步驟後正確重置
- [ ] 計時結束有聲音 + 振動回饋
- [ ] 最後一步完成有慶祝動畫 + 評分
- [ ] `prefers-reduced-motion` 下無慶祝動畫但仍可評分

---

# 🟡 P1-4｜Design Tokens

## 1. 色彩 Tokens

### 三個主色方案候選

#### 方案 A：醬油棕（溫暖踏實）
```css
--accent-50:  #FAF3EB;
--accent-100: #F0E0CC;
--accent-200: #DCC09A;
--accent-500: #A0673B;  /* primary */
--accent-600: #864F2A;
--accent-700: #6B3D1F;
```
**情緒**：家常、溫暖、可信  
**對比度**（vs `#FFFAF5`）：500 達 5.8:1 ✅ AA

#### 方案 B：磚紅 / 朱泥（食慾、餐廳感）
```css
--accent-50:  #FCEFEC;
--accent-100: #F7D5CB;
--accent-200: #ECA192;
--accent-500: #C04D32;  /* primary */
--accent-600: #A53A22;
--accent-700: #872D1A;
```
**情緒**：食慾、活力、餐廳感  
**對比度**：500 達 5.2:1 ✅ AA

#### 方案 C：靛藍 / 藏青（靜謐、職人感）
```css
--accent-50:  #EEF2F6;
--accent-100: #D5DEE9;
--accent-200: #9DB1C8;
--accent-500: #355886;  /* primary */
--accent-600: #284670;
--accent-700: #1E365A;
```
**情緒**：日式、職人、冷靜  
**對比度**：500 達 7.8:1 ✅ AAA

**推薦**：方案 A，最契合「家庭、職人、料理」三個關鍵字。

### 完整色彩 token 結構

```css
/* app/globals.css 或 lib/design-tokens.css ⚠ 參考用 snippet */
:root {
  /* Background */
  --bg-base: #FFFAF5;
  --bg-raised: #F7F0E7;
  --bg-sunken: #F0E8DC;

  /* Foreground */
  --fg-primary: #1F1812;
  --fg-secondary: #5C4F42;
  --fg-tertiary: #998874;
  --fg-inverse: #FFFAF5;

  /* Accent（方案 A 為例）*/
  --accent-50:  #FAF3EB;
  --accent-100: #F0E0CC;
  --accent-200: #DCC09A;
  --accent-500: #A0673B;
  --accent-600: #864F2A;
  --accent-700: #6B3D1F;

  /* Semantic */
  --success: #4A7C59;
  --warning: #C08A2E;
  --danger:  #B54848;
  --info:    #4A6FA5;

  /* Cuisine */
  --cuisine-homestyle: #A0673B;
  --cuisine-western:   #C08A2E;
  --cuisine-japanese:  #355886;
  --cuisine-korean:    #B54848;
  --cuisine-chinese:   #884A20;
}
```

## 2. 字體 Tokens

```css
:root {
  /* Sans 字族（建議 Inter + 思源黑體 Noto Sans TC fallback）*/
  --font-sans: 'Inter', 'Noto Sans TC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type scale */
  --text-display: 2.5rem;  /* 40px Landing H1 */
  --text-h1: 2rem;          /* 32px */
  --text-h2: 1.5rem;        /* 24px */
  --text-h3: 1.25rem;       /* 20px */
  --text-body: 1rem;        /* 16px */
  --text-body-sm: 0.875rem; /* 14px */
  --text-caption: 0.75rem;  /* 12px */

  /* Line heights */
  --leading-tight: 1.15;
  --leading-snug: 1.35;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
}
```

## 3. 間距 / 圓角 / 陰影

```css
:root {
  /* Spacing (8pt grid) */
  --space-1: 0.25rem;  /* 4 */
  --space-2: 0.5rem;   /* 8 */
  --space-3: 0.75rem;  /* 12 */
  --space-4: 1rem;     /* 16 */
  --space-6: 1.5rem;   /* 24 */
  --space-8: 2rem;     /* 32 */
  --space-12: 3rem;    /* 48 */
  --space-16: 4rem;    /* 64 */

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(31,24,18,0.04);
  --shadow-md: 0 4px 12px rgba(31,24,18,0.08);
  --shadow-lg: 0 12px 32px rgba(31,24,18,0.12);
}
```

## 4. Tailwind config 整合

```ts
// tailwind.config.ts ⚠ 參考用 snippet，需明確授權才能改
export default {
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          raised: 'var(--bg-raised)',
          sunken: 'var(--bg-sunken)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          tertiary: 'var(--fg-tertiary)',
          inverse: 'var(--fg-inverse)',
        },
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
        },
      },
    },
  },
};
```

## 5. 涉及檔案

```
新建：
  lib/design-tokens.css          （或併入 globals.css）
  docs/design-tokens.md          （token 文件）

修改（需明確授權）：
  tailwind.config.ts             ← 引用 CSS variables
  app/globals.css                ← import tokens
  app/layout.tsx                 ← 引入字體
```

## 6. 驗收

- [ ] 全站無 hardcoded hex（grep 檢查）
- [ ] 主色在 `#FFFAF5` 對比度通過 WCAG AA
- [ ] Landing H1 與 App H1 視覺權重對齊
- [ ] Dark mode 預留 token slot（不實作，但結構支援）

---

# 🟢 P2-1｜時間感知強化

## 1. 時段問候完整 mapping

```ts
// lib/copy/greeting.ts
const TIME_GREETINGS = [
  { range: [5, 11],  text: '早安' },
  { range: [11, 14], text: '中午好' },
  { range: [14, 17], text: '午後好' },
  { range: [17, 19], text: '快下班了', highlight: true }, // ← 核心時段
  { range: [19, 22], text: '晚上好' },
  { range: [22, 24], text: '深夜好' },
  { range: [0, 5],   text: '深夜好' },
];
```

## 2. 17:00–19:00 強化引導

### 觸發
- 進入 `/app` 時時間判斷
- 該時段：
  - 問候字加重 + 加 emoji「⏰ 快下班了，今晚想吃什麼？」
  - 自動把 `#30分鐘` chip 預設選中
  - 在主輸入區下方加一行小提示：「最快的家庭晚餐，從 30 分鐘開始」

### 不要做
- 不要強制 prefill textarea（用戶可能想自己想）
- 不要彈 modal

## 3. PWA 推播

### 設定位置
- `/app/me` 頁面
- 卡片標題：「晚餐提醒」
- 預設關閉
- 開啟流程：
  1. 用戶 toggle on
  2. 呼叫 `Notification.requestPermission()`
  3. 拒絕 → 顯示說明 + 系統設定連結
  4. 同意 → 註冊每日 17:30 排程
  5. 可調整時間（17:00 / 17:30 / 18:00 三選一）

### 推播內容
```
標題：今晚想吃什麼？
內文：點開職人料理，3 分鐘內想出晚餐
動作：[ 開啟 App ]
```

### 技術注意
- iOS PWA 推播需 16.4+ 且需用戶把 PWA 加到主螢幕
- 使用 Service Worker + Periodic Background Sync（fallback：本地 setTimeout 不可靠，要 SW）

## 4. 涉及檔案

```
新建：
  hooks/useTimeGreeting.ts
  lib/notifications/dinner-reminder.ts
  lib/notifications/permission.ts
  public/sw.js                          ← service worker（若無）
  components/me/DinnerReminderCard.tsx

修改：
  lib/copy/greeting.ts                  ← 加 highlight 邏輯
  components/app-home/GreetingHeader.tsx
  components/app-home/QuickChips.tsx    ← 該時段自動選中
  app/(app)/app/me/page.tsx             ← 加入提醒設定
```

## 5. 驗收

- [ ] 17:30 進入 `/app` 顯示「快下班了」+ `#30分鐘` 預選
- [ ] 19:01 進入 `/app` 不再有該強化
- [ ] PWA 推播在 iOS（加到主螢幕）與 Android 都能觸發
- [ ] 用戶能調整推播時間
- [ ] 用戶能關閉

---

# 🟢 P2-2｜Landing 與 App 視覺一致性

## 1. 沿用主色

- App 內所有 accent 用色與 Landing 一致（P1-4 統一 tokens 後自動達成）
- Button 樣式跨頁面統一

## 2. 食物攝影 / 視覺元素

### 最近食譜卡片
- 優先顯示實圖（從食譜 `image_url` 欄位）
- 無圖時 fallback：
  - 用料理分類色作為背景
  - 中央放對應 emoji（家常 🍚 / 西式 🍝 / 日式 🍣 / 韓式 🥘 / 中式 🥢）
  - emoji 大小 `text-5xl`，置中

### Landing hero 圖延伸
- App 內「今晚靈感」卡片可選用 Landing 的圖庫風格（同攝影師 / 同色調）

## 3. 字體一致性

### 檢查項目
- Landing 是否使用 serif 標題？
- App 是否同樣使用？
- 中英文混排對齊？

### 標準
- 標題類（display / h1 / h2）：建議統一 sans-serif（清晰、現代）
- 食譜步驟、body：sans-serif
- 數字（時間、份量）：mono（更易讀）

## 4. 涉及檔案

```
新建：
  components/recipe/RecipeImageFallback.tsx
  lib/recipe/cuisine-meta.ts            ← 分類 → 顏色 + emoji mapping

修改：
  components/RecipeCard.tsx
  app/layout.tsx                         ← 字體載入統一
  components/app-home/InspirationCards.tsx
```

## 5. 驗收

- [ ] Landing → App 切換感覺是同一產品
- [ ] 食譜卡片無圖時有美觀 fallback
- [ ] 全站字體統一

---

# 🟢 P2-3｜空狀態與錯誤狀態

## 1. 料理書空狀態

```
        🍳
   還沒有食譜

從今晚生成你的第一道菜
  [ 去今晚生成 ]
```

| 元素 | 規格 |
|------|---|
| 插畫 | emoji `text-6xl` 或 SVG（簡單線稿鍋具） |
| 標題 | `text-xl font-medium` |
| 副文 | `text-sm text-fg-secondary` |
| CTA | 主色按鈕、連到 `/app` |
| 容器 | `min-h-[60vh] flex flex-col items-center justify-center` |

## 2. 生成失敗錯誤

### 場景分類
| 場景 | 訊息 | 行動 |
|------|------|------|
| 網路失敗 | 「網路怪怪的，試試重新生成」 | [重試] |
| API 超時 | 「AI 還在想，再給它一次機會」 | [重試] |
| 輸入太短 | 「多給一點線索，AI 才好幫你想」 | 留在輸入框、focus textarea |
| 內容違規 | 「這個我幫不上忙，試試其他食材組合」 | [重新輸入] |
| 配額用完 | 見下方 P2-3.3 | |
| 其他 | 「出了點小問題，請稍後再試」+ 顯示 error id | [重試] |

### 視覺
- 不用 modal，用 inline alert 在輸入框上方
- 紅色邊框 `border-danger/30`、淺紅背景 `bg-danger/5`
- 圖示 + 訊息 + 行動按鈕

## 3. 配額用完

```
┌─────────────────────────────────────┐
│ 今天的生成次數用完了                │
│                                     │
│ 文字 20/20 · 圖片 5/5               │
│                                     │
│ 明天 00:00（台北時間）重置          │
│                                     │
│ 在這之前，可以：                    │
│ • 看看你的料理書                    │
│ • 重看 demo 食譜                    │
│                                     │
│ [ 看料理書 ]  [ 看 demo ]           │
└─────────────────────────────────────┘
```

- 不要罵用戶 / 不要急著要錢
- 提供有用的替代行動

## 4. 離線狀態

### 偵測
- `navigator.onLine` + `online` / `offline` event

### 行為
- 頂部黃色 banner：「目前離線。已存的食譜仍可查看」
- 「生成食譜」按鈕停用，顯示「需要連網才能生成」
- 烹飪模式不受影響（已載入的食譜可繼續）

## 5. 涉及檔案

```
新建：
  components/empty-states/LibraryEmpty.tsx
  components/empty-states/RecipeEmpty.tsx
  components/error-states/GenerationError.tsx
  components/error-states/QuotaExhausted.tsx
  components/error-states/OfflineBanner.tsx
  lib/api/error-types.ts
  lib/api/error-handler.ts
  hooks/useOnlineStatus.ts

修改：
  app/(app)/app/library/page.tsx
  app/(app)/app/page.tsx                ← 整合錯誤顯示
  app/(app)/layout.tsx                  ← 全域 offline banner
```

## 6. 驗收

- [ ] 料理書空時顯示專屬畫面
- [ ] 生成失敗六種情境都有對應訊息
- [ ] 配額用完不會讓用戶覺得被刁難
- [ ] 飛航模式下能進料理書看舊食譜
- [ ] 飛航模式下生成按鈕停用

---

# 📋 全域驗收 Checklist（所有 Phase 完成後）

## 功能性
- [ ] 新用戶 3 秒內知道在 `/app` 要做什麼
- [ ] 回訪用戶 1 tap 能回到最近食譜
- [ ] 食譜頁主 CTA 一眼可辨識
- [ ] 烹飪模式螢幕不會自動鎖
- [ ] 所有錯誤狀態有對應設計

## 視覺一致性
- [ ] 全站無 hardcoded 顏色
- [ ] Landing → App 視覺連續
- [ ] 字體層級在所有頁面對齊

## 無障礙
- [ ] 所有互動元素可用鍵盤操作
- [ ] 對比度通過 WCAG AA
- [ ] `prefers-reduced-motion` 被尊重
- [ ] Screen reader 不唸 placeholder

## 響應式
- [ ] Mobile（375px）無水平滾動
- [ ] Tablet（768px）布局合理
- [ ] Desktop（1280px+）不會空白過大

## 效能
- [ ] 首次進 `/app` LCP < 2.5s
- [ ] 互動延遲 < 100ms
- [ ] 圖片 lazy load

---

# 🎯 建議實作順序（修訂版）

| Phase | 項目 | 預估時間 | 風險 | 前置依賴 |
|-------|------|---------|------|---------|
| **Phase 1** | P1-4 Design Tokens | 1 天 | 中 | 無 |
| **Phase 2** | P0-1 + P0-2 | 2 天 | 低 | Phase 1 |
| **Phase 3** | P1-1 + P1-2 | 1.5 天 | 低 | Phase 1 |
| **Phase 4** | P2-3 錯誤 / 空狀態 | 1 天 | 低 | Phase 1 |
| **Phase 5** | P1-3 烹飪模式 | 2-3 天 | 中 | Phase 3 |
| **Phase 6** | P2-1 時間感知 | 1 天 | 中 | Phase 2 |
| **Phase 7** | P2-2 視覺一致性收尾 | 0.5 天 | 低 | 所有前面 |

**為什麼改成 P1-4 在最前面**：原本建議先做 P0，但展開規格後發現 P0 重組必然會用到顏色 token，先建 tokens 後續所有 Phase 都能直接引用，重工最少。

---

# ⚠️ 仍需 EVAL 才能確認的盲區

以下展開規格時憑推測，**正式實作前需先 EVAL 對應頁面**確認：

1. `/app/library` — 料理書頁面結構與 component 命名
2. `/app/plan` — 週曆頁
3. `/app/shopping` — 採買清單頁（P1-1 會寫入這裡，要先看現有結構）
4. `/app/me` — 我的頁（P0-2 要把配額移到這裡）
5. `/demo/recipe/cook` — 現有烹飪模式（P1-3 要重做）
6. **現有 stack 確認**：
   - 是否用 shadcn/ui？
   - 是否用 React Query / SWR？
   - 是否有現成的 toast / sheet / dropdown？
7. **現有 data structure**：
   - `Recipe` type 是否有 `image_url`、`unit`、`cuisine`、`rating`？
   - 「最近」資料來源是 local storage 還是 DB？

建議下一輪 `MODE: EVAL` 時，請我檢視這些頁面與相關 type 定義，再回頭修正規格。

---

這份規格夠完整可以當作後續所有 IMPLEMENT 的依據。要開工時：

```
MODE: IMPLEMENT
授權實作項目編號：P1-4
授權修改檔案：
- lib/design-tokens.css
- app/globals.css
- tailwind.config.ts
- docs/design-tokens.md
```

按建議順序從 Phase 1 開始即可。
