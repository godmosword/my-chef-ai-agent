import type { Metadata } from "next";
import { DemoRecipeView } from "@/components/demo/DemoRecipeView";

export const metadata: Metadata = {
  title: "示範食譜 — 電鍋雞肉蔬菜炊飯｜職人料理大腦",
  description:
    "看看 30 分鐘內能完成的家庭晚餐示範食譜，不消耗配額。",
  robots: { index: true, follow: true },
};

export default function DemoRecipePage() {
  return <DemoRecipeView />;
}
