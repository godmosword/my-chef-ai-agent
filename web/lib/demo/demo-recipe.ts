import type { RecipePayload } from "@chef/shared-types";

/** Static demo — no API, no quota, no DB write. */
export const DEMO_RECIPE_ID = "demo-rice-cooker-dinner";

export const DEMO_RECIPE: RecipePayload = {
  id: DEMO_RECIPE_ID,
  recipe_name: "電鍋雞肉蔬菜炊飯",
  cuisine: "家常",
  theme: "兒童友善",
  summary:
    "一鍋完成、不辣、約 30 分鐘，適合兩大一小。食材超市好買，可替換蔬菜與肉類。",
  photo_url: "/marketing/hero-three-cup-chicken.jpg",
  hero_status: "ready",
  prep_minutes: 10,
  cook_minutes: 25,
  servings: 3,
  ingredients: [
    { name: "白米", amount: "1.5", unit: "杯" },
    { name: "雞腿肉", amount: "300", unit: "g" },
    { name: "紅蘿蔔", amount: "1", unit: "根" },
    { name: "玉米", amount: "半", unit: "根" },
    { name: "青豆", amount: "50", unit: "g" },
    { name: "香菇", amount: "3", unit: "朵" },
    { name: "醬油", amount: "2", unit: "大匙" },
    { name: "米酒", amount: "1", unit: "大匙" },
    { name: "白胡椒", amount: "少許", unit: "" },
  ],
  steps: [
    {
      text: "米洗淨瀝乾，雞腿切塊用醬油、米酒抓醃 10 分鐘。",
      step_tip: "米洗到水變清即可，勿搓揉過度",
    },
    "紅蘿蔔、玉米切小丁，香菇切片。",
    "電鍋內鍋舖米與水（約米上 1 指節），鋪上蔬菜與雞肉。",
    "外鍋加 1 杯水，按下開關，跳起後悶 10 分鐘。",
    "打開拌勻，試味道可加少許白胡椒。",
    "盛碗前確認雞肉全熟、蔬菜軟爛適合孩子咀嚼。",
  ],
  kitchen_talk: [
    { role: "主廚", content: "這道用電鍋最省心，雞肉記得切小塊確保熟透。" },
    { role: "營養師", content: "可多加綠色蔬菜；若孩子怕香菇可省略或替換。" },
  ],
  tags: [{ tag: "demo", source: "ai" as const }],
};

export const DEMO_CHILD_TIP =
  "兒童餐提醒：雞肉與蔬菜請切小塊，確認熟透且軟爛；可依年齡調整鹹度。";

export const DEMO_SAFETY_TIP =
  "此為示範食譜。下廚前請確認過敏原、食材新鮮度與肉類熟度。兒童食用時，請依年齡調整食材大小與軟硬度。";

export const DEMO_SWAP_TIP =
  "可替換：雞腿→雞胸；蔬菜→花椰菜、高麗菜；無電鍋可用鍋煮飯後拌炒。";
