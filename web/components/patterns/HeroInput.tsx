"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQuota } from "@/lib/api/recipes";
import { QUICK_PROMPTS } from "@/lib/prompts/quick";
import { Kbd } from "@/components/primitives/Kbd";
import { cn } from "@/lib/utils/cn";

export type HeroInputProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
};

export function HeroInput({
  onSubmit,
  disabled,
  streaming = false,
  placeholder = "今晚想吃什麼？冰箱有什麼？想試試什麼風味？",
  className,
  defaultValue = "",
}: HeroInputProps) {
  const [text, setText] = useState(defaultValue);
  const [textQuotaRemaining, setTextQuotaRemaining] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (defaultValue) setText(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = await fetchQuota();
        if (!cancelled) setTextQuotaRemaining(q.text.remaining);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const quotaExhausted = textQuotaRemaining === 0;
  const inputDisabled = disabled || streaming;
  const submitDisabled = inputDisabled || !text.trim() || quotaExhausted;

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || inputDisabled || quotaExhausted) return;
    onSubmit(trimmed);
  }, [text, inputDisabled, quotaExhausted, onSubmit]);

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

  const insertPrefix = (prefix: string) => {
    setText((prev) => prefix + prev);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(prefix.length, prefix.length);
    });
  };

  const modKey =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  return (
    <form
      className={cn(
        "overflow-hidden rounded-xl border-2 border-border-default bg-surface-default shadow-card transition-[border-color,box-shadow] focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15",
        className,
      )}
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
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={inputDisabled || quotaExhausted}
        rows={3}
        className="w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3 text-base text-text-ink placeholder:text-text-muted focus:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={inputDisabled || quotaExhausted}
            onClick={() => insertPrefix(p.value)}
            className="rounded-full border border-border-default bg-canvas px-2.5 py-1 text-xs text-text-body transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-0 flex items-center justify-between gap-3 border-t border-border-default bg-surface-muted px-4 py-2.5">
        <span className="text-xs text-text-muted">
          {streaming ? (
            "生成中…"
          ) : (
            <>
              <Kbd>{modKey}</Kbd> + <Kbd>↵</Kbd> 送出 · 約 6 秒
            </>
          )}
        </span>
        <button
          type="submit"
          disabled={submitDisabled}
          title={quotaExhausted ? "今日配額已用完，明日 0 點重置" : undefined}
          className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-brand-greenText transition-colors hover:bg-brand-primaryDark disabled:cursor-not-allowed disabled:bg-text-muted disabled:text-surface-default"
        >
          {streaming ? "生成中…" : "生成食譜 →"}
        </button>
      </div>
    </form>
  );
}
