"use client";

import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";

export default function MePage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">我的</h1>
        <p className="mt-1 text-sm text-text-muted">配額、外觀、隱私與帳戶</p>
      </header>
      <MeSettingsPanel />
    </div>
  );
}
