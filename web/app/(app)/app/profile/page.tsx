import type { Metadata } from "next";
import { PersonalizationProfilePanel } from "@/components/personalization/PersonalizationProfilePanel";
import { BackLink } from "@/components/patterns/BackLink";

export const metadata: Metadata = {
  title: "口味檔案 · 職人料理大腦",
};

export default function TasteProfilePage() {
  return (
    <div className="space-y-6">
      <BackLink href="/app" label="返回今晚吃什麼" className="md:hidden" />
      <header>
        <h1 className="font-serif text-2xl text-text-ink">口味檔案</h1>
        <p className="mt-1 text-sm text-text-muted">
          管理過敏、偏好與家庭成員 — 推薦會依此調整
        </p>
      </header>
      <PersonalizationProfilePanel />
    </div>
  );
}
