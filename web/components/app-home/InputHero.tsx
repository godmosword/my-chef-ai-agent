"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQuota } from "@/application/api/recipes";
import { INPUT_PLACEHOLDERS } from "@/lib/copy/placeholders";
import { QUICK_CHIPS, RUSH_HOUR_CHIP_IDS } from "@/lib/copy/quick-chips";
import { usePlaceholderRotator } from "@/hooks/usePlaceholderRotator";
import { useChipState } from "@/hooks/useChipState";
import { isRushHour } from "@/lib/utils/greeting";
import { QuickChips } from "@/components/app-home/QuickChips";
import { Kbd } from "@/components/primitives/Kbd";
import { GenerationError } from "@/components/error-states/GenerationError";
import type { GenerationErrorView } from "@/application/api/error-types";
import { QuotaExhausted } from "@/components/error-states/QuotaExhausted";
import { isBrowserOnline } from "@/platform/sync/network";
import { cn } from "@/lib/utils/cn";

export type InputHeroProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  error?: string | null;
  errorView?: GenerationErrorView | null;
  className?: string;
  defaultValue?: string;
};

export function InputHero({
  onSubmit,
  disabled,
  streaming = false,
  error = null,
  errorView = null,
  className,
  defaultValue = "",
}: InputHeroProps) {
  const [text, setText] = useState(defaultValue);
  const [textQuotaRemaining, setTextQuotaRemaining] = useState<number | null>(null);
  const [textQuota, setTextQuota] = useState({ used: 0, limit: 20, remaining: 20 });
  const [imageQuota, setImageQuota] = useState({ used: 0, limit: 5, remaining: 5 });
  const rushApplied = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPaused = text.length > 0;
  const { text: placeholderText, opacity } = usePlaceholderRotator(
    INPUT_PLACEHOLDERS,
    isPaused,
  );
  const { selected, toggleChip, onTextChange, setSelectedIds } = useChipState(
    QUICK_CHIPS,
    text,
    setText,
  );

  useEffect(() => {
    if (defaultValue) setText(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = await fetchQuota();
        if (!cancelled) {
          setTextQuotaRemaining(q.text.remaining);
          setTextQuota(q.text);
          setImageQuota(q.image);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (rushApplied.current) return;
    if (isRushHour()) {
      rushApplied.current = true;
      setSelectedIds(RUSH_HOUR_CHIP_IDS);
    }
  }, [setSelectedIds]);

  const quotaExhausted = textQuotaRemaining === 0;
  const offline = typeof navigator !== "undefined" && !isBrowserOnline();
  const inputDisabled = disabled || streaming || offline;
  const submitDisabled = inputDisabled || !text.trim() || quotaExhausted;

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || inputDisabled || quotaExhausted) return;
    onSubmit(trimmed);
  }, [text, inputDisabled, quotaExhausted, onSubmit]);

  useEffect(() => {
    if (errorView?.focusInput) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [errorView?.focusInput, errorView?.kind]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  const modKey =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  if (quotaExhausted) {
    return (
      <QuotaExhausted
        textUsed={textQuota.used}
        textLimit={textQuota.limit}
        imageUsed={imageQuota.used}
        imageLimit={imageQuota.limit}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {error ? (
        <GenerationError
          message={error}
          onRetry={errorView?.retry ? submit : undefined}
          onClearInput={
            errorView?.clearInput
              ? () => {
                  setText("");
                  onTextChange("");
                  textareaRef.current?.focus();
                }
              : undefined
          }
        />
      ) : null}
      <form
        className="overflow-hidden rounded-xl border-2 border-border-default bg-surface-default shadow-card transition-[border-color,box-shadow] focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="hero-prompt">
          描述你想吃的料理
        </label>
        <textarea
          ref={textareaRef}
          id="hero-prompt"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={isPaused ? "" : placeholderText}
          disabled={inputDisabled}
          rows={4}
          style={{ opacity: isPaused ? 1 : opacity }}
          className="w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3 text-base text-text-ink placeholder:text-text-muted transition-opacity duration-200 focus:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        />
        <div className="px-4 pb-3">
          <QuickChips
            selected={selected}
            onToggle={toggleChip}
            disabled={inputDisabled || quotaExhausted}
          />
        </div>
        {isRushHour() && !text.trim() ? (
          <p className="px-4 pb-2 text-xs text-text-muted">
            最快的家庭晚餐，從 30 分鐘開始
          </p>
        ) : null}
        <div className="mt-0 flex items-center justify-between gap-3 border-t border-border-default bg-surface-muted px-4 py-2.5">
          <span className="hidden text-xs text-text-muted sm:inline">
            {streaming ? (
              "生成中…"
            ) : (
              <>
                <Kbd>{modKey}</Kbd> + <Kbd>↵</Kbd> 送出
              </>
            )}
          </span>
          <button
            type="submit"
            disabled={submitDisabled}
            className="ml-auto w-full rounded-xl bg-brand-primary px-4 py-3 text-base font-medium text-brand-greenText transition-colors hover:bg-brand-primaryDark disabled:cursor-not-allowed disabled:bg-text-muted disabled:text-surface-default sm:w-auto sm:py-2 sm:text-sm"
          >
            {streaming ? "生成中…" : offline ? "需要連網才能生成" : "生成食譜"}
          </button>
        </div>
      </form>
    </div>
  );
}
