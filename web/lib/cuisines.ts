/** Cuisine carousel keys (mirrors app/config.py CUISINE_LABELS). */

const CUISINE_LABELS: Record<string, string> = {
  taiwanese: "台灣小吃",
  thai: "泰式料理",
  japanese_ramen: "日式拉麵與定食",
  european_american: "歐美家常菜",
  kids_meal: "兒童專屬特餐",
};

export const CUISINE_OPTIONS = Object.entries(CUISINE_LABELS).map(
  ([key, label]) => ({ key, label }),
);

export function cuisineLabel(key: string | null | undefined): string {
  if (!key) return "不拘";
  return CUISINE_LABELS[key] ?? key;
}
