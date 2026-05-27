"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CookingRecipe } from "@/domain/cook/types";
import { recordRecipeCook } from "@/application/api/recipes";
import {
  clearCookingSession,
  loadCookingSession,
  saveCookingSession,
} from "@/domain/cook/session";
import { dequeuePendingRating } from "@/domain/cook/ratingQueue";
import { enqueueMutation } from "@/platform/sync/mutations";
import { useWakeLock } from "./hooks/useWakeLock";
import { useFullscreen } from "./hooks/useFullscreen";
import { useSpeech } from "./hooks/useSpeech";
import { useSwipe } from "./hooks/useSwipe";
import { useAudioContext } from "./hooks/useAudioContext";
import { CookingHeader } from "./CookingHeader";
import { StepCard } from "./StepCard";
import { TimerSlot } from "./TimerSlot";
import { StepNav } from "./StepNav";
import { OnboardingOverlay, hasCookingOnboarded } from "./OnboardingOverlay";
import { CompletionScreen } from "./CompletionScreen";
import { ExitConfirmDialog } from "./ExitConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/primitives/Button";
import {
  capture,
  cookDurationBucket,
  cookRatingBucket,
} from "@/platform/analytics/events";
import type { CookAnalyticsSource } from "@/domain/cook/cook-source";

export type CookingModeClientProps = {
  recipe: CookingRecipe;
  initialStep?: number;
  initialVoice?: boolean;
  cookSource?: CookAnalyticsSource;
};

export function CookingModeClient({
  recipe,
  initialStep = 0,
  initialVoice = false,
  cookSource = "detail",
}: CookingModeClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { bannerMessage, request: requestWakeLock } = useWakeLock();
  const { enter: enterFullscreen, exit: exitFullscreen } = useFullscreen();
  const { enabled: voiceEnabled, setEnabled: setVoiceEnabled, speak } =
    useSpeech(initialVoice);
  const { unlock: unlockAudio, chime } = useAudioContext();

  const totalSteps = recipe.steps.length;
  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(0, initialStep), Math.max(0, totalSteps - 1)),
  );
  const [completed, setCompleted] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [flash, setFlash] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const recordToastShown = useRef(false);
  const startedAtRef = useRef<number>(Date.now());
  const lastRatingRef = useRef<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState<number | null>(null);

  const showRecordToast = useCallback(() => {
    if (recordToastShown.current) return;
    recordToastShown.current = true;
    toast({
      title: "已記錄完成",
      description: "這道菜已加入你的料理書紀錄",
    });
  }, [toast]);

  const syncUrl = useCallback(
    (step: number, voice: boolean) => {
      const params = new URLSearchParams();
      if (step > 0) params.set("step", String(step));
      if (voice) params.set("voice", "1");
      if (cookSource) params.set("source", cookSource);
      const qs = params.toString();
      router.replace(`/app/library/${recipe.id}/cook${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [recipe.id, router, cookSource],
  );

  useEffect(() => {
    enterFullscreen();
    capture("cooking_mode_started", {
      is_demo: recipe.id === "demo",
      source: cookSource,
    });
    const snap = loadCookingSession(recipe.id);
    if (snap?.startedAt) {
      startedAtRef.current = snap.startedAt;
    } else {
      startedAtRef.current = Date.now();
    }
    if (snap && snap.currentStep > 0) {
      setResumePrompt(true);
    }
    if (!hasCookingOnboarded()) {
      setShowOnboard(true);
    }
    return () => {
      exitFullscreen();
    };
  }, [recipe.id, cookSource, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    if (!completed) return;
    const mins = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 60_000),
    );
    capture("cooking_mode_completed", {
      is_demo: recipe.id === "demo",
      source: cookSource,
      duration_bucket: cookDurationBucket(mins),
      rating_bucket: cookRatingBucket(lastRatingRef.current),
    });
    showRecordToast();
  }, [completed, recipe.id, cookSource, showRecordToast]);

  useEffect(() => {
    syncUrl(currentStep, voiceEnabled);
    saveCookingSession(recipe.id, {
      currentStep,
      voiceEnabled,
      timers: [],
      savedAt: Date.now(),
      startedAt: startedAtRef.current,
    });
  }, [currentStep, voiceEnabled, recipe.id, syncUrl]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= totalSteps - 1) {
        const mins = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 60_000),
        );
        setElapsedMinutes(mins);
        setCompleted(true);
        clearCookingSession(recipe.id);
        return s;
      }
      return Math.min(totalSteps - 1, s + 1);
    });
  }, [recipe.id, totalSteps]);

  useEffect(() => {
    if (completed || showOnboard || resumePrompt) return;
    const step = recipe.steps[currentStep];
    if (!step) return;
    speak(`第 ${currentStep + 1} 步。${step.text}`);
  }, [currentStep, voiceEnabled, completed, showOnboard, resumePrompt, recipe.steps, speak]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showExit || showOnboard || resumePrompt) return;
      if (e.key === "Escape") {
        setShowExit(true);
        return;
      }
      if (completed) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "t" || e.key === "T") {
        setVoiceEnabled(!voiceEnabled);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showExit,
    showOnboard,
    resumePrompt,
    completed,
    goPrev,
    goNext,
    voiceEnabled,
    setVoiceEnabled,
  ]);

  const swipeRef = useSwipe((dir) => {
    if (completed) return;
    if (dir === "prev") goPrev();
    else goNext();
  });

  const handleRate = async (stars: number) => {
    lastRatingRef.current = stars;
    try {
      await recordRecipeCook(recipe.id, { rating: stars, record_cook: true });
      dequeuePendingRating(recipe.id);
      showRecordToast();
    } catch {
      await enqueueMutation({
        type: "rating",
        payload: { recipe_id: recipe.id, rating: stars },
      });
      toast({
        title: "評分稍後同步",
        description: "已暫存，連線後會自動送出",
        variant: "error",
      });
    }
  };

  const vibrate = () => {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    setFlash(true);
  };

  if (resumePrompt) {
    const snap = loadCookingSession(recipe.id);
    return (
      <div className="cooking-mode flex min-h-screen flex-col items-center justify-center p-6">
        <p className="text-center text-lg text-text-ink">要繼續上次的烹飪嗎？</p>
        <p className="mt-2 text-center text-text-muted">
          上次停在第 {(snap?.currentStep ?? 0) + 1} 步
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={() => {
              if (snap) setCurrentStep(snap.currentStep);
              setVoiceEnabled(snap?.voiceEnabled ?? false);
              setResumePrompt(false);
            }}
          >
            繼續烹飪
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearCookingSession(recipe.id);
              setResumePrompt(false);
            }}
          >
            重新開始
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cooking-mode fixed inset-0 z-[9999] flex h-[100dvh] flex-col ${flash ? "cooking-flash" : ""}`}
    >
      <OnboardingOverlay
        open={showOnboard}
        onComplete={() => {
          unlockAudio();
          setShowOnboard(false);
          void requestWakeLock();
        }}
        onSkip={() => {
          unlockAudio();
          setShowOnboard(false);
        }}
      />

      <ExitConfirmDialog
        open={showExit}
        stepsRemaining={Math.max(0, totalSteps - currentStep - 1)}
        onContinue={() => {
          setShowExit(false);
          void requestWakeLock();
          enterFullscreen();
        }}
        onLeave={() => {
          router.push(`/app/library/${recipe.id}`);
        }}
      />

      {!completed && (
        <>
          <CookingHeader
            currentStep={currentStep}
            totalSteps={totalSteps}
            voiceEnabled={voiceEnabled}
            onVoiceChange={setVoiceEnabled}
            onExitRequest={() => setShowExit(true)}
            onJumpToStep={totalSteps > 15 ? setCurrentStep : undefined}
            wakeBanner={bannerMessage}
          />
          <StepCard
            step={recipe.steps[currentStep] ?? { index: 0, text: "" }}
            stepIndex={currentStep}
            totalSteps={totalSteps}
            swipeRef={swipeRef}
          />
          <TimerSlot
            currentStep={recipe.steps[currentStep] ?? { index: 0, text: "" }}
            onTimerDone={(label) => speak(`${label}計時器到了`)}
            onChime={chime}
            onVibrate={vibrate}
            flashClass={flash}
            onDismissFlash={() => setFlash(false)}
          />
          <StepNav
            canPrev={currentStep > 0}
            canNext={currentStep < totalSteps - 1}
            onPrev={goPrev}
            onNext={goNext}
            isLastStep={currentStep >= totalSteps - 1}
          />
        </>
      )}

      {completed && (
        <CompletionScreen
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          elapsedMinutes={elapsedMinutes}
          onRate={handleRate}
          onCookAgain={() => {
            router.push("/app");
          }}
        />
      )}
    </div>
  );
}
