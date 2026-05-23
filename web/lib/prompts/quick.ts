export type QuickPrompt = {
  key: string;
  label: string;
  value: string;
};

export const QUICK_PROMPTS: QuickPrompt[] = [
  { key: "fridge", label: "清冰箱", value: "冰箱裡有 " },
  { key: "kids", label: "兒童餐", value: "小孩不吃辣的 " },
  { key: "quick", label: "30 分鐘", value: "30 分鐘內可以完成的 " },
  { key: "guests", label: "招待客人", value: "招待 4 個人的 " },
  { key: "one-pot", label: "一鍋料理", value: "一鍋到底的 " },
  { key: "healthy", label: "低油", value: "低油少鹽的 " },
];
