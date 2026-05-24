"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { appPrefillHref } from "@/lib/marketing/content";

type Idea = { title: string; hint: string; prefill: string };

const IDEAS: Idea[] = [
  { title: "番茄炒蛋", hint: "三樣食材，五分鐘上桌", prefill: "番茄炒蛋，蛋要嫩" },
  { title: "蒜香奶油義大利麵", hint: "一鍋到底，洗一個鍋子", prefill: "蒜香奶油義大利麵，一個鍋子做完" },
  { title: "韓式泡菜豆腐鍋", hint: "冷天暖身，配白飯剛好", prefill: "韓式泡菜豆腐鍋，配白飯" },
  { title: "日式照燒雞腿", hint: "便當主菜，冷掉也好吃", prefill: "日式照燒雞腿，適合帶便當" },
  { title: "蛤蜊絲瓜麵線", hint: "清爽，30 分鐘搞定", prefill: "蛤蜊絲瓜麵線" },
  { title: "三杯雞", hint: "招待客人不會出錯", prefill: "台式三杯雞，週末晚餐" },
  { title: "麻婆豆腐", hint: "下飯神器，微辣", prefill: "麻婆豆腐，微辣下飯" },
  { title: "南瓜濃湯", hint: "暖胃前菜或輕食午餐", prefill: "南瓜濃湯，奶油基底" },
  { title: "雞肉親子丼", hint: "電鍋也能做，懶人友善", prefill: "雞肉親子丼" },
  { title: "蒜泥白肉", hint: "夏天開胃，配涼麵", prefill: "蒜泥白肉，搭涼麵" },
];

function pickThree(): Idea[] {
  const now = new Date();
  const dayKey = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  const start = dayKey % IDEAS.length;
  return [0, 1, 2].map((i) => IDEAS[(start + i) % IDEAS.length]!);
}

export function InspirationCard() {
  const picks = useMemo(pickThree, []);
  return (
    <aside
      aria-label="今日靈感"
      className="rounded-xl border border-border-default bg-surface-muted/40 p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
        <Sparkles className="size-4 text-brand-primary" aria-hidden />
        <span>今日靈感</span>
      </div>
      <ul className="space-y-2">
        {picks.map((idea) => (
          <li key={idea.title}>
            <Link
              href={appPrefillHref(idea.prefill)}
              className="group flex items-start justify-between gap-3 rounded-lg border border-transparent bg-surface-default/60 px-3 py-2 transition-colors hover:border-brand-primary hover:bg-brand-primaryLight"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-base text-text-ink">{idea.title}</p>
                <p className="truncate text-xs text-text-muted">{idea.hint}</p>
              </div>
              <ArrowUpRight
                className="mt-0.5 size-4 shrink-0 text-text-muted group-hover:text-brand-primaryDark"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
