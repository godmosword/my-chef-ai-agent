/** Marketing landing copy (static UI mocks; no landing image assets). */

export const MARKETING_SECTION = {
  hero: {
    eyebrow: "AI · 料理書 · 廚房模式",
    headline: "用一句話，換一桌剛好的晚餐",
    body: "告訴 AI 冰箱裡有什麼、家裡誰要吃，得到完整食譜、主圖與採買清單。每一道都會留在你的料理書裡。",
    demoRecipe: {
      title: "三杯雞",
      cuisine: "台式",
      ingredientCount: 4,
      stepCount: 5,
    },
    demoPrefill: "台式三杯雞，30 分鐘內",
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
        body: "累積每道做過的食譜，可搜尋、可標籤，下次重做不必重問 AI。",
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
      label: "招待客人",
      title: "紅酒燉牛肉",
      quote: "週末 6 個人的晚餐",
      prefill: "週末 6 個人的晚餐",
      gradient: ["#FAC775", "#BA7517"] as [string, string],
    },
  ],
  features: {
    library: {
      title: "你的料理書",
      body: "累積每道做過的食譜，可搜尋、可標籤，下次重做不必重問 AI。",
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
