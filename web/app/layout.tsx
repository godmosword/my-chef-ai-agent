import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "職人料理大腦",
  description: "AI 食譜助理 — 網頁版",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
