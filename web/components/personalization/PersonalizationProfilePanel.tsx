"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createHouseholdMember,
  deleteHouseholdMemberApi,
  deletePersonalization,
  fetchPersonalization,
  patchPersonalization,
} from "@/application/api/personalization";
import type { HouseholdMember, TasteProfile } from "@/domain/personalization/profile-types";
import {
  CUISINE_OPTIONS,
  DIETARY_RESTRICTION_OPTIONS,
  SCALE_LABELS_ZH,
  SKILL_LABELS,
  COOK_TIME_OPTIONS,
} from "@/domain/personalization/profile-options";
import { Button } from "@/components/primitives/Button";
import { Chip } from "@/components/primitives/Chip";
import { Dialog } from "@/components/primitives/Dialog";
import { Input } from "@/components/primitives/Input";
import { ProgressBar } from "@/components/primitives/ProgressBar";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useToast } from "@/components/providers/ToastProvider";
import { useMountAsync } from "@/hooks/useMountAsync";

function parseTags(text: string): string[] {
  return text
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">
        {SCALE_LABELS_ZH.map((name, i) => (
          <Chip
            key={name}
            label={name}
            selected={value === i}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function PersonalizationProfilePanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipePhrase, setWipePhrase] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    try {
      const data = await fetchPersonalization();
      if (!isActive()) return;
      setProfile(data.taste_profile);
      setMembers(data.household_members);
    } catch (e) {
      if (!isActive()) return;
      toast({
        title: "無法載入口味檔案",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [toast]);

  useMountAsync((isActive) => load(isActive), [load]);

  const scheduleSave = useCallback(
    (patch: Partial<TasteProfile>) => {
      if (!profile) return;
      const optimistic = { ...profile, ...patch };
      setProfile(optimistic);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await patchPersonalization(patch);
          setProfile(res.taste_profile);
          setLastSaved(new Date());
          toast({ title: "已儲存" });
        } catch (e) {
          toast({
            title: "儲存失敗",
            description: e instanceof Error ? e.message : "",
            variant: "error",
          });
        }
      }, 800);
    },
    [profile, toast],
  );

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ taste_profile: profile, household_members: members }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personalization-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wipeAll = async () => {
    try {
      await deletePersonalization("all");
      toast({ title: "已清除所有個人化資料" });
      router.push("/app");
    } catch (e) {
      toast({
        title: "清除失敗",
        description: e instanceof Error ? e.message : "",
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const confidence = profile?.confidence_score ?? 0;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border-default bg-surface-default p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-text-ink">完成度</h2>
          {lastSaved ? (
            <span className="text-xs text-text-muted">
              上次儲存 {lastSaved.toLocaleTimeString("zh-TW")}
            </span>
          ) : null}
        </div>
        <ProgressBar value={confidence * 100} max={100} className="mt-3" />
        <p className="mt-1 text-sm text-text-muted">
          {Math.round(confidence * 100)}% — 資料越完整，推薦越貼近你
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-default p-4">
        <h2 className="font-serif text-lg text-text-ink">個人偏好</h2>
        <ScaleRow
          label="辣度"
          value={profile?.spice_tolerance ?? null}
          onChange={(v) => scheduleSave({ spice_tolerance: v })}
        />
        <ScaleRow
          label="鹹度"
          value={profile?.saltiness_preference ?? null}
          onChange={(v) => scheduleSave({ saltiness_preference: v })}
        />
        <ScaleRow
          label="甜度"
          value={profile?.sweetness_preference ?? null}
          onChange={(v) => scheduleSave({ sweetness_preference: v })}
        />
        <ScaleRow
          label="油膩度"
          value={profile?.oil_preference ?? null}
          onChange={(v) => scheduleSave({ oil_preference: v })}
        />

        <TagField
          label="過敏"
          placeholder="花生, 蝦"
          values={profile?.allergies ?? []}
          onBlur={(tags) => scheduleSave({ allergies: tags })}
          emptyHint="還沒有設定 — 加入過敏食材，下次推薦就會自動避開"
        />
        <TagField
          label="不愛食材"
          placeholder="香菜, 苦瓜"
          values={profile?.dislikes ?? []}
          onBlur={(tags) => scheduleSave({ dislikes: tags })}
        />
        <TagField
          label="愛吃食材"
          values={profile?.loved_ingredients ?? []}
          onBlur={(tags) => scheduleSave({ loved_ingredients: tags })}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-text-ink">飲食限制</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTION_OPTIONS.map((opt) => {
              const active = profile?.dietary_restrictions?.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onClick={() => {
                    const cur = profile?.dietary_restrictions ?? [];
                    const next = active
                      ? cur.filter((x) => x !== opt.value)
                      : [...cur, opt.value];
                    scheduleSave({ dietary_restrictions: next });
                  }}
                />
              );
            })}
          </div>
        </div>

        <CuisineColumns
          preferred={profile?.preferred_cuisines ?? []}
          avoided={profile?.disliked_cuisines ?? []}
          onChangePreferred={(v) => scheduleSave({ preferred_cuisines: v })}
          onChangeAvoided={(v) => scheduleSave({ disliked_cuisines: v })}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-text-ink">烹飪程度</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_LABELS.map((label, i) => (
              <Chip
                key={label}
                label={label}
                selected={profile?.cooking_skill_level === i}
                onClick={() => scheduleSave({ cooking_skill_level: i })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-ink">偏好烹飪時間</p>
          <div className="flex flex-wrap gap-2">
            {COOK_TIME_OPTIONS.map((min) => (
              <Chip
                key={min}
                label={min >= 90 ? "90+ 分" : `${min} 分`}
                selected={profile?.typical_cooking_time_min === min}
                onClick={() => scheduleSave({ typical_cooking_time_min: min })}
              />
            ))}
          </div>
        </div>
      </section>

      <HouseholdSection
        members={members}
        onRefresh={load}
        toast={toast}
      />

      <section className="space-y-3 rounded-xl border border-border-default bg-surface-default p-4">
        <h2 className="font-serif text-lg text-text-ink">隱私</h2>
        <p className="text-sm text-text-muted">
          你的過敏與家庭成員資訊僅用於個人化推薦，不會出現在公開食譜頁。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={exportJson}>
            匯出我的資料
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => setConfirmWipe(true)}
          >
            清除所有個人化資料
          </Button>
        </div>
        <p className="text-xs text-text-muted">
          也可在
          <Link href="/app/settings" className="mx-1 text-brand-primary underline">
            偏好設定
          </Link>
          管理飲食限制（舊版欄位）。
        </p>
      </section>

      <Dialog
        open={confirmWipe}
        onOpenChange={setConfirmWipe}
        title="清除所有個人化資料？"
        description="此動作無法復原，包含口味檔案與家庭成員。"
      >
        <p className="text-sm text-text-muted">
          請輸入 <strong>刪除我的偏好</strong> 以確認：
        </p>
        <Input
          value={wipePhrase}
          onChange={setWipePhrase}
          className="mt-2"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={wipePhrase !== "刪除我的偏好"}
            onClick={() => void wipeAll()}
          >
            確認清除
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function TagField({
  label,
  placeholder,
  values,
  onBlur,
  emptyHint,
}: {
  label: string;
  placeholder?: string;
  values: string[];
  onBlur: (tags: string[]) => void;
  emptyHint?: string;
}) {
  const [text, setText] = useState(values.join("、"));

  useEffect(() => {
    setText(values.join("、"));
  }, [values]);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-ink">{label}</label>
      {values.length === 0 && emptyHint ? (
        <p className="mb-1 text-xs text-text-muted">{emptyHint}</p>
      ) : null}
      <Input
        placeholder={placeholder}
        value={text}
        onChange={setText}
        onBlur={() => onBlur(parseTags(text))}
      />
      {values.length > 0 ? (
        <p className="mt-1 text-xs text-text-muted">{values.join("、")}</p>
      ) : null}
    </div>
  );
}

function CuisineColumns({
  preferred,
  avoided,
  onChangePreferred,
  onChangeAvoided,
}: {
  preferred: string[];
  avoided: string[];
  onChangePreferred: (v: string[]) => void;
  onChangeAvoided: (v: string[]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium text-text-ink">偏好菜系</p>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <Chip
              key={`p-${c}`}
              label={c}
              selected={preferred.includes(c)}
              onClick={() => {
                onChangePreferred(
                  preferred.includes(c)
                    ? preferred.filter((x) => x !== c)
                    : [...preferred, c],
                );
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-text-ink">避免菜系</p>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <Chip
              key={`a-${c}`}
              label={c}
              selected={avoided.includes(c)}
              onClick={() => {
                onChangeAvoided(
                  avoided.includes(c)
                    ? avoided.filter((x) => x !== c)
                    : [...avoided, c],
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HouseholdSection({
  members,
  onRefresh,
  toast,
}: {
  members: HouseholdMember[];
  onRefresh: () => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try {
      await createHouseholdMember({ name: name.trim(), relation: "other", age_group: "adult" });
      setName("");
      await onRefresh();
      toast({ title: "已新增家庭成員" });
    } catch (e) {
      toast({
        title: "新增失敗",
        description: e instanceof Error ? e.message : "",
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border-default bg-surface-default p-4">
      <h2 className="font-serif text-lg text-text-ink">家庭成員</h2>
      {members.length === 0 ? (
        <p className="text-sm text-text-muted">
          你還沒有設定家庭成員 — 新增後會在推薦時考慮他們的需求。
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-border-default/80 p-3 text-sm"
            >
              <p className="font-medium text-text-ink">
                {m.name}
                {m.relation ? `（${m.relation}）` : ""}
              </p>
              {m.age_group ? (
                <p className="text-text-muted">年齡層：{m.age_group}</p>
              ) : null}
              {m.allergies.length ? (
                <p>過敏：{m.allergies.join("、")}</p>
              ) : null}
              {m.dislikes.length ? <p>不愛：{m.dislikes.join("、")}</p> : null}
              {/* medical_conditions: user volunteered; never log — render only on own profile */}
              {m.medical_conditions.length ? (
                <p className="text-text-muted">健康注意：已記錄（詳情僅你可見）</p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-danger"
                onClick={async () => {
                  await deleteHouseholdMemberApi(m.id);
                  await onRefresh();
                }}
              >
                刪除
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="成員名稱"
          value={name}
          onChange={setName}
        />
        <Button type="button" onClick={() => void add()}>
          新增
        </Button>
      </div>
    </section>
  );
}
