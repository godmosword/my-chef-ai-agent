export type StarterPrompt = {
  key: string;
  label: string;
  value: string;
};

/** Full sentences for empty-state onboarding (tap to generate). */
export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    key: "fridge",
    label: "清冰箱",
    value: "冰箱有番茄、洋蔥跟雞蛋，幫我想一道簡單的",
  },
  {
    key: "quick",
    label: "30 分鐘內",
    value: "30 分鐘內可以完成的兩人晚餐",
  },
  {
    key: "kids",
    label: "兒童餐",
    value: "四歲小孩不吃辣，想來點營養均衡的",
  },
];
