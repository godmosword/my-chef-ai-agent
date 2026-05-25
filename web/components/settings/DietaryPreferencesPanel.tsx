"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DIETARY_PRESET_OPTIONS,
  type DietaryPreferences,
  type DietaryPresetKey,
} from "@/lib/db/dietary-preferences";
import { useToast } from "@/components/providers/ToastProvider";

export function DietaryPreferencesPanel() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<DietaryPreferences>({ tags: [], avoid_custom: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/dietary-preferences");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { preferences: DietaryPreferences };
      setPrefs(data.preferences);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: DietaryPreferences) => {
    setSaving(true);
    setPrefs(next);
    try {
      const res = await fetch("/api/me/dietary-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      toast({ title: "偏好未儲存", variant: "error" });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (key: DietaryPresetKey) => {
    const tags = prefs.tags.includes(key)
      ? prefs.tags.filter((t) => t !== key)
      : [...prefs.tags, key];
    void save({ ...prefs, tags });
  };

  if (loading) {
    return <p className="text-sm text-text-muted">載入飲食偏好…</p>;
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border-default bg-surface-default p-4"
      aria-labelledby="dietary-prefs-heading"
    >
      <div>
        <h2 id="dietary-prefs-heading" className="font-serif text-lg text-text-ink">
          家庭飲食偏好與需避開食材
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          之後生成食譜時會自動套用，不會用於廣告分析。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETARY_PRESET_OPTIONS.map((opt) => {
          const on = prefs.tags.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              disabled={saving}
              aria-pressed={on}
              onClick={() => toggleTag(opt.key)}
              className={
                on
                  ? "rounded-full border border-brand-primary bg-brand-primaryLight px-3 py-1.5 text-xs font-medium text-brand-primaryDark"
                  : "rounded-full border border-border-default bg-surface-default px-3 py-1.5 text-xs text-text-body hover:border-brand-primary"
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <label className="block text-sm text-text-body">
        自訂需避開食材
        <textarea
          className="mt-1 w-full rounded-lg border border-border-default bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          rows={2}
          placeholder="例如：香菜、蝦（以逗號或頓號分隔）"
          value={prefs.avoid_custom}
          disabled={saving}
          onChange={(e) => setPrefs({ ...prefs, avoid_custom: e.target.value })}
          onBlur={() => void save(prefs)}
        />
      </label>
    </section>
  );
}
