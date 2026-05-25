/** Marketing landing copy (static UI mocks; no landing image assets). */

export const MARKETING_SECTION = {
  hero: {
    eyebrow: "30 分鐘 · 家庭晚餐 · AI 助手",
    headline: "冰箱有什麼，今晚就煮什麼",
    body: "輸入食材、孩子口味與時間限制，快速得到今天真的煮得出來的一餐。生成的食譜會保存在這台裝置的料理書中，方便下次查看。",
    demoRecipe: {
      title: "電鍋雞肉蔬菜炊飯",
      cuisine: "家常",
      ingredientCount: 9,
      stepCount: 6,
    },
    demoPrefill: "電鍋雞肉蔬菜炊飯，兩大一小，30 分鐘，不辣",
    primaryCta: "用冰箱食材生成晚餐",
    secondaryCta: "先看看完成的食譜",
    secondaryHref: "/demo/recipe",
  },
  howItWorks: {
    heading: "從一句話到上桌",
    subheading: "輸入想法、存入料理書、進廚房跟著做——不必來回聊天。",
    steps: [
      {
        title: "輸入想法",
        body: "描述冰箱食材、口味或時間，一次送出就開始生成。",
      },
      {
        title: "存入料理書",
        body: "食譜會留在這台裝置，可搜尋、可重做，不必重問 AI。",
      },
      {
        title: "廚房模式",
        body: "大字步驟、內建計時器、螢幕保持常亮——手上沾油也能看。",
      },
    ],
  },
  useCases: [
    {
      id: "fridge",
      label: "清冰箱",
      title: "番茄炒蛋",
      quote: "冰箱有番茄、洋蔥跟雞蛋",
      prefill: "冰箱有番茄、洋蔥跟雞蛋",
      gradient: ["#F5C4B3", "#D85A30"] as [string, string],
    },
    {
      id: "kids",
      label: "兒童餐",
      title: "蔬菜雞肉炊飯",
      quote: "四歲孩子不吃辣的晚餐",
      prefill: "四歲孩子不吃辣的晚餐",
      gradient: ["#9FE1CB", "#1D9E75"] as [string, string],
    },
    {
      id: "guests",
      label: "兩大一小",
      title: "電鍋雞肉蔬菜炊飯",
      quote: "30 分鐘內的一鍋晚餐",
      prefill: "兩大一小的晚餐，30 分鐘，不辣",
      gradient: ["#FAC775", "#BA7517"] as [string, string],
    },
  ],
  features: {
    library: {
      title: "你的料理書",
      body: "食譜會留在這台裝置，可搜尋、可標籤，下次重做不必重問 AI。",
    },
    cooking: {
      title: "廚房模式",
      body: "大字步驟、內建計時器、螢幕保持常亮——手上沾油也能看。",
    },
  },
} as const;

export function appPrefillHref(prefill: string): string {
  return `/app?prefill=${encodeURIComponent(prefill)}`;
}
