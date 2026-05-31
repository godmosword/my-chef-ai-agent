/** UI option lists for personalization profile forms (no I/O). */

export const DIETARY_RESTRICTION_OPTIONS = [
  { value: "vegetarian", label: "奶蛋素" },
  { value: "vegan", label: "全素" },
  { value: "halal", label: "清真" },
  { value: "kosher", label: "猶太飲食" },
  { value: "keto", label: "生酮" },
  { value: "low_carb", label: "低碳水" },
  { value: "low_sodium", label: "低鈉" },
  { value: "diabetic_friendly", label: "糖尿病友善" },
  { value: "gluten_free", label: "無麩質" },
  { value: "dairy_free", label: "無乳製品" },
] as const;

export const CUISINE_OPTIONS = [
  "台式",
  "日式",
  "韓式",
  "泰式",
  "義式",
  "法式",
  "中式",
  "美式",
  "印度",
  "墨西哥",
  "越式",
] as const;

export const SCALE_LABELS_ZH = [
  "不吃辣",
  "微辣",
  "標準",
  "偏辣",
  "嗜辣",
] as const;

export const SKILL_LABELS = ["新手", "中等", "進階"] as const;

export const COOK_TIME_OPTIONS = [15, 30, 45, 60, 90] as const;
