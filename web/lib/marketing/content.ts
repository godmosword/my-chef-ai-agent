/** Marketing landing copy and asset paths (static files under /public/marketing). */

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
      image: "/marketing/hero-three-cup-chicken.jpg",
      imageAlt: "三杯雞成品示意",
    },
    demoPrefill: "台式三杯雞，30 分鐘內",
  },
  useCases: [
    {
      id: "fridge",
      label: "清冰箱",
      title: "番茄炒蛋",
      quote: "冰箱有番茄、洋蔥跟雞蛋",
      prefill: "冰箱有番茄、洋蔥跟雞蛋",
      image: "/marketing/usecase-fridge-tomato-eggs.jpg",
      gradient: ["#E5A33D", "#C8881A"] as [string, string],
    },
    {
      id: "kids",
      label: "兒童餐",
      title: "蔬菜雞肉炊飯",
      quote: "四歲孩子不吃辣的晚餐",
      prefill: "四歲孩子不吃辣的晚餐",
      image: "/marketing/usecase-kids-rice-bowl.jpg",
      gradient: ["#F5C4B3", "#D85A30"] as [string, string],
    },
    {
      id: "guests",
      label: "招待客人",
      title: "紅酒燉牛肉",
      quote: "週末 6 個人的晚餐",
      prefill: "週末 6 個人的晚餐",
      image: "/marketing/usecase-guest-beef-stew.jpg",
      gradient: ["#B5D4F4", "#378ADD"] as [string, string],
    },
  ],
  features: {
    library: {
      title: "你的料理書",
      body: "累積每道做過的食譜，可搜尋、可標籤，下次重做不必重問 AI。",
      screenshot: "/marketing/screenshot-library.png",
    },
    cooking: {
      title: "廚房模式",
      body: "大字步驟、內建計時器、螢幕保持常亮——手上沾油也能看。",
      screenshot: "/marketing/screenshot-cooking-mode.png",
    },
  },
  pills: [
    {
      icon: "chef-hat" as const,
      title: "不是聊天機器人",
      body: "你只需要食譜，不需要來回對話。",
    },
    {
      icon: "book" as const,
      title: "會記住的料理書",
      body: "你做過的每一道都會留下。",
    },
    {
      icon: "zap" as const,
      title: "離線可看",
      body: "廚房訊號差也讀得到已快取的食譜。",
    },
    {
      icon: "utensils" as const,
      title: "廚房模式",
      body: "大字、計時器、螢幕常亮，專為灶台設計。",
    },
  ],
} as const;

export function appPrefillHref(prefill: string): string {
  return `/app?prefill=${encodeURIComponent(prefill)}`;
}
