"use client";

import { MeProfileSection } from "@/components/profile/MeProfileSection";
import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";

export default function MePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">我的</h1>
        <p className="mt-1 text-sm text-text-muted">
          紀錄你的下廚旅程、解鎖成就，調整你的偏好
        </p>
      </header>

      <MeProfileSection />

      <div>
        <h2 className="mb-4 font-serif text-lg text-text-ink">偏好設定</h2>
        <MeSettingsPanel />
      </div>
    </div>
  );
}
