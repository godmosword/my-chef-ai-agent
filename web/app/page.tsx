import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/LandingPage";
import { getSiteUrl } from "@/platform/config/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "職人料理大腦 — 冰箱有什麼，今晚就煮什麼",
  description:
    "忙碌家庭的 30 分鐘晚餐 AI 助手。輸入食材、孩子口味與時間，快速得到今天煮得出來的一餐。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "職人料理大腦",
    description: "冰箱有什麼，今晚就煮什麼 — 30 分鐘家庭晚餐",
    type: "website",
    url: siteUrl,
    locale: "zh_TW",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "職人料理大腦 App 介面預覽",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "職人料理大腦",
    description: "冰箱有什麼，今晚就煮什麼 — 30 分鐘家庭晚餐",
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
