"use client";

import { MeProfileSection } from "@/components/profile/MeProfileSection";
import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";
import { QuotaIndicator } from "@/components/patterns/QuotaIndicator";
import { DinnerReminderCard } from "@/components/me/DinnerReminderCard";

export default function MePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">你</h1>
        <p className="mt-1 text-sm text-text-muted">
          紀錄你的下廚旅程、解鎖成就，調整你的偏好
        </p>
      </header>

      <MeProfileSection />

      <section aria-label="今日配額">
        <h2 className="mb-3 font-serif text-lg text-text-ink">今日配額</h2>
        <QuotaIndicator />
      </section>

      <DinnerReminderCard />

      <div>
        <h2 className="mb-4 font-serif text-lg text-text-ink">偏好設定</h2>
        <MeSettingsPanel />
      </div>
    </div>
  );
}
