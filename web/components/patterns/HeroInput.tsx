"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Textarea } from "@/components/primitives/Textarea";
import { cn } from "@/lib/utils/cn";

export type HeroInputProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** From landing ?prefill=… */
  defaultValue?: string;
};

export function HeroInput({
  onSubmit,
  disabled,
  placeholder = "今晚想吃什麼？例如：清淡、30 分鐘內、兩人份…",
  className,
  defaultValue = "",
}: HeroInputProps) {
  const [text, setText] = useState(defaultValue);

  useEffect(() => {
    if (defaultValue) setText(defaultValue);
  }, [defaultValue]);

  return (
    <form
      className={cn("rounded-lg border border-border-default bg-surface-default p-4 shadow-card", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSubmit(trimmed);
      }}
    >
      <label className="sr-only" htmlFor="hero-prompt">
        描述你想吃的料理
      </label>
      <Textarea
        id="hero-prompt"
        value={text}
        onChange={setText}
        placeholder={placeholder}
        disabled={disabled}
        minRows={3}
        className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
      />
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={disabled || !text.trim()}>
          <Sparkles className="size-4" aria-hidden />
          生成食譜
        </Button>
      </div>
    </form>
  );
}
