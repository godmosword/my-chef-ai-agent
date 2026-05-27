"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  patchPersonalization,
  setOnboardingStatusApi,
} from "@/application/api/personalization";
import { Button } from "@/components/primitives/Button";
import { Chip } from "@/components/primitives/Chip";
import { Input } from "@/components/primitives/Input";
import { useToast } from "@/components/providers/ToastProvider";

const SPICE = ["不吃辣", "微辣", "中辣", "嗜辣"] as const;
const SPICE_VALUES = [0, 1, 2, 4] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [spice, setSpice] = useState<number>(2);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [household, setHousehold] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      await patchPersonalization({
        spice_tolerance: spice,
        allergies,
      });
      if (household === "child" || household === "senior" || household === "both") {
        await import("@/application/api/personalization").then((m) =>
          m.createHouseholdMember({
            name: household === "senior" ? "長輩" : "家人",
            relation: household === "child" ? "child" : "parent",
            age_group: household === "senior" ? "senior" : "child",
          }),
        );
      }
      await setOnboardingStatusApi("completed");
      toast({ title: "已記住你的偏好" });
      router.push("/app");
    } catch (e) {
      toast({
        title: "儲存失敗",
        description: e instanceof Error ? e.message : "",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    await setOnboardingStatusApi("declined");
    router.push("/app");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <header>
        <p className="text-xs text-text-muted">快速口味設定 · {step + 1} / 3</p>
        <h1 className="mt-1 font-serif text-2xl text-text-ink">認識你的口味</h1>
      </header>

      {step === 0 ? (
        <section className="space-y-3">
          <p className="text-sm text-text-body">你的辣度偏好是？</p>
          <div className="flex flex-wrap gap-2">
            {SPICE.map((label, i) => (
              <Chip
                key={label}
                label={label}
                selected={spice === SPICE_VALUES[i]}
                onClick={() => setSpice(SPICE_VALUES[i] ?? 2)}
              />
            ))}
          </div>
          <Button type="button" onClick={() => setStep(1)}>
            下一步
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-3">
          <p className="text-sm text-text-body">有任何過敏或不吃的食材嗎？</p>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="花生過敏"
              selected={allergies.includes("花生")}
              onClick={() =>
                setAllergies((a) =>
                  a.includes("花生") ? a.filter((x) => x !== "花生") : [...a, "花生"],
                )
              }
            />
            <Chip
              label="海鮮過敏"
              selected={allergies.includes("蝦")}
              onClick={() =>
                setAllergies((a) =>
                  a.includes("蝦") ? a.filter((x) => x !== "蝦") : [...a, "蝦"],
                )
              }
            />
            <Chip
              label="都沒有"
              selected={allergies.length === 0}
              onClick={() => setAllergies([])}
            />
          </div>
          <Input
            placeholder="其他：香菜, 茄子（逗號分隔）"
            value={customAllergy}
            onChange={setCustomAllergy}
            onBlur={() => {
              if (!customAllergy.trim()) return;
              const extra = customAllergy
                .split(/[,，、]/)
                .map((s) => s.trim())
                .filter(Boolean);
              setAllergies((a) => [...new Set([...a, ...extra])]);
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              上一步
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              下一步
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3">
          <p className="text-sm text-text-body">家裡誰一起吃？</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["solo", "自己一人"],
                ["partner", "跟伴侶"],
                ["child", "有小孩"],
                ["senior", "有長輩"],
                ["both", "都有"],
              ] as const
            ).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={household === key}
                onClick={() => setHousehold(key)}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted">
            之後可在「口味檔案」補充更詳細的家庭成員資訊。
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button type="button" disabled={busy} onClick={() => void finish()}>
              完成
            </Button>
          </div>
        </section>
      ) : null}

      <Button type="button" variant="ghost" className="text-sm" onClick={() => void decline()}>
        暫時不要
      </Button>
    </div>
  );
}
