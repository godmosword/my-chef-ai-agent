import type { Metadata } from "next";
import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";
import { BackLink } from "@/components/patterns/BackLink";

export const metadata: Metadata = {
  title: "偏好 · 職人料理大腦",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/app" label="返回今晚吃什麼" className="md:hidden" />
      <header>
        <h1 className="font-serif text-2xl text-text-ink">偏好</h1>
        <p className="mt-1 text-sm text-text-muted">飲食偏好、外觀、語音與帳號設定</p>
      </header>
      <MeSettingsPanel />
    </div>
  );
}
