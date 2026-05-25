export type QuickPrompt = {
  key: string;
  label: string;
  value: string;
};

/** Tonight quick chips — family dinner oriented. */
export const QUICK_PROMPTS: QuickPrompt[] = [
  { key: "time-20", label: "我只有 20 分鐘", value: "我只有 20 分鐘，" },
  { key: "no-spicy", label: "孩子不吃辣", value: "孩子不吃辣，" },
  { key: "fridge", label: "冰箱剩蛋與青菜", value: "冰箱有雞蛋和青菜，" },
  { key: "one-pot", label: "少洗鍋子", value: "想少洗鍋子，一鍋完成，" },
  { key: "lunchbox", label: "明天帶便當", value: "明天要帶便當，" },
  { key: "family", label: "兩大一小的晚餐", value: "兩大一小的晚餐，" },
  { key: "light", label: "低油低鹽", value: "低油低鹽，" },
  { key: "allergy", label: "避開過敏食材", value: "請避開過敏食材，" },
];
