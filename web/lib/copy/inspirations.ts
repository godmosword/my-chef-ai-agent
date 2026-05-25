export type InspirationItem = {
  id: string;
  tag: string;
  title: string;
  description: string;
  prefill: string;
};

export const INSPIRATIONS: readonly InspirationItem[] = [
  {
    id: "clean-fridge",
    tag: "清冰箱",
    title: "番茄炒蛋",
    description: "冰箱有番茄、洋蔥跟雞蛋",
    prefill: "冰箱有番茄、洋蔥跟雞蛋",
  },
  {
    id: "kids-meal",
    tag: "兒童餐",
    title: "蔬菜雞肉炊飯",
    description: "四歲孩子不吃辣的晚餐",
    prefill: "四歲孩子不吃辣的晚餐",
  },
  {
    id: "family",
    tag: "兩大一小",
    title: "電鍋雞肉蔬菜炊飯",
    description: "30 分鐘內的一鍋晚餐",
    prefill: "兩大一小的晚餐，30 分鐘，不辣，一鍋完成",
  },
] as const;
