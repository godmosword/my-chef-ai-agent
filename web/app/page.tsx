import type { Metadata } from "next";
import { FLAGS } from "@/lib/flags";
import { LandingPage } from "@/components/marketing/LandingPage";
import { ChatPanel } from "@/components/ChatPanel";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "職人料理大腦 — 用一句話，換一桌剛好的晚餐",
  description:
    "告訴 AI 冰箱裡有什麼、家裡誰要吃，得到完整食譜、主圖與採買清單。每一道都會留在你的料理書裡。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "職人料理大腦",
    description: "用一句話，換一桌剛好的晚餐",
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
    description: "用一句話，換一桌剛好的晚餐",
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  if (FLAGS.newUI) {
    return <LandingPage />;
  }
  return <ChatPanel />;
}
