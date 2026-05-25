export type QuickChip = {
  id: string;
  label: string;
  insert: string;
};

export const QUICK_CHIPS: readonly QuickChip[] = [
  { id: "clean-fridge", label: "清冰箱", insert: "清冰箱的菜，" },
  { id: "kids", label: "兒童餐", insert: "小孩吃的（不辣），" },
  { id: "30min", label: "30分鐘", insert: "30 分鐘內完成，" },
  { id: "one-pot", label: "一鍋完成", insert: "一鍋完成，" },
  { id: "rice-cooker", label: "電鍋", insert: "用電鍋做，" },
  { id: "no-spicy", label: "不辣", insert: "不辣，" },
  { id: "meal-prep", label: "常備菜", insert: "可以備起來放的常備菜，" },
] as const;

/** Rush-hour default chip ids (17:00–19:00 Taipei). */
export const RUSH_HOUR_CHIP_IDS = ["30min"] as const;
