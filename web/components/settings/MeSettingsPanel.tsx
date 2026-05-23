"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { UserSettings } from "@chef/shared-types";
import { QuotaIndicator } from "@/components/patterns/QuotaIndicator";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { useToast } from "@/components/providers/ToastProvider";
import { syncAnalyticsOptIn } from "@/components/analytics/PostHogProvider";
import {
  deleteAccount,
  fetchUserSettings,
  updateUserSettings,
} from "@/lib/api/settings";
import {
  applySettingsToDocument,
  saveLocalSettings,
} from "@/lib/settings/apply";
import { FLAGS } from "@/lib/flags";

export function MeSettingsPanel() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [sharedCount, setSharedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserSettings();
      setSettings(res.settings);
      setRecipeCount(res.recipe_count);
      setSharedCount(res.shared_count);
      applySettingsToDocument(res.settings);
      saveLocalSettings(res.settings);
      syncAnalyticsOptIn(res.settings.analytics_opt);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (partial: Partial<UserSettings>) => {
      if (!settings) return;
      setSaving(true);
      const optimistic = { ...settings, ...partial };
      setSettings(optimistic);
      applySettingsToDocument(optimistic);
      saveLocalSettings(optimistic);
      if (partial.theme) setTheme(partial.theme);
      if (partial.analytics_opt != null) syncAnalyticsOptIn(partial.analytics_opt);

      try {
        const res = await updateUserSettings(partial);
        setSettings(res.settings);
        saveLocalSettings(res.settings);
      } catch (e) {
        toast({
          title: "設定未儲存",
          description: e instanceof Error ? e.message : "請稍後再試",
          variant: "error",
        });
        void load();
      } finally {
        setSaving(false);
      }
    },
    [settings, setTheme, toast, load],
  );

  const onDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      localStorage.clear();
      router.push("/");
      router.refresh();
    } catch (e) {
      toast({
        title: "刪除失敗",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [router, toast]);

  if (loading && !settings) {
    return <p className="text-sm text-text-muted">載入設定…</p>;
  }

  const s = settings ?? {
    theme: "system" as const,
    font_scale: 100,
    locale: "zh-Hant-TW",
    voice_enabled: false,
    analytics_opt: true,
    hero_auto_generate: true,
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">帳戶概覽</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-text-muted">食譜數</dt>
            <dd className="font-medium text-text-ink">{recipeCount}</dd>
          </div>
          <div>
            <dt className="text-text-muted">公開分享</dt>
            <dd className="font-medium text-text-ink">{sharedCount}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">今日配額</h2>
        <div className="mt-4">
          <QuotaIndicator refreshIntervalMs={15_000} />
        </div>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">外觀</h2>
        <p className="mt-1 text-sm text-text-muted">跟隨系統或手動切換淺色／深色</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <Button
              key={t}
              variant={(theme ?? s.theme) === t ? "primary" : "secondary"}
              size="sm"
              disabled={saving}
              onClick={() => patch({ theme: t })}
            >
              {t === "light" ? "淺色" : t === "dark" ? "深色" : "系統"}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">字級</h2>
        <p className="mt-1 text-sm text-text-muted">{s.font_scale}%</p>
        <input
          type="range"
          min={80}
          max={150}
          step={5}
          value={s.font_scale}
          disabled={saving}
          className="mt-3 w-full accent-brand-primary"
          onChange={(e) => patch({ font_scale: Number(e.target.value) })}
        />
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">語言</h2>
        <select
          className="mt-2 w-full rounded-md border border-border-default bg-surface-muted px-3 py-2 text-sm"
          value={s.locale}
          disabled={saving}
          onChange={(e) => patch({ locale: e.target.value })}
        >
          <option value="zh-Hant-TW">繁體中文</option>
          <option value="en">English</option>
        </select>
      </section>

      {FLAGS.analytics && (
        <section className="rounded-lg border border-border-default bg-surface-default p-4">
          <h2 className="font-medium text-text-ink">使用分析</h2>
          <p className="mt-1 text-sm text-text-muted">
            協助改善產品；可隨時關閉，不影響核心功能。
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.analytics_opt}
              disabled={saving}
              onChange={(e) => patch({ analytics_opt: e.target.checked })}
            />
            允許匿名事件分析
          </label>
        </section>
      )}

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium text-text-ink">自動生成主圖</h2>
            <p className="mt-1 text-sm text-text-muted">
              每道新食譜會自動配一張 AI 成品圖（使用每日圖片配額，每道僅生成一次）
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.hero_auto_generate}
              disabled={saving}
              onChange={(e) => patch({ hero_auto_generate: e.target.checked })}
            />
            開啟
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4">
        <h2 className="font-medium text-text-ink">語音（烹飪模式）</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.voice_enabled}
            disabled={saving}
            onChange={(e) => patch({ voice_enabled: e.target.checked })}
          />
          預設開啟步驟朗讀
        </label>
      </section>

      <section className="rounded-lg border border-border-default bg-surface-default p-4 text-sm">
        <h2 className="font-medium text-text-ink">法律與隱私</h2>
        <ul className="mt-2 space-y-2 text-brand-primary">
          <li>
            <Link href="/legal/privacy" className="hover:underline">
              隱私權政策
            </Link>
          </li>
          <li>
            <Link href="/legal/disclaimer" className="hover:underline">
              免責聲明
            </Link>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-danger/30 bg-surface-default p-4">
        <h2 className="font-medium text-danger">危險區域</h2>
        <p className="mt-1 text-sm text-text-muted">
          刪除帳戶將移除所有食譜、設定與分享連結，且無法復原。
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 border-danger text-danger"
          onClick={() => setConfirmDelete(true)}
        >
          刪除帳戶與所有資料
        </Button>
      </section>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="確定刪除帳戶？"
        description="此操作無法復原，所有食譜與公開連結將一併刪除。"
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={deleting}
            onClick={() => void onDelete()}
          >
            {deleting ? "刪除中…" : "確認刪除"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
