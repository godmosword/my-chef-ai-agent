import type { Metadata } from "next";
import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";

export const metadata: Metadata = {
  title: "偏好 · 職人料理大腦",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">偏好</h1>
        <p className="mt-1 text-sm text-text-muted">外觀、語音、帳號設定</p>
      </header>
      <MeSettingsPanel />
    </div>
  );
}
