import { Clock, Flame, Users } from "lucide-react";

type RecipeStatsProps = {
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
};

function formatMinutes(n: number): string {
  if (n < 60) return `${n} 分`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h} 時` : `${h} 時 ${m} 分`;
}

export function RecipeStats({ prepMinutes, cookMinutes, servings }: RecipeStatsProps) {
  const items: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
  if (prepMinutes && prepMinutes > 0) {
    items.push({
      icon: <Clock className="size-4" aria-hidden />,
      label: "備料",
      value: formatMinutes(prepMinutes),
    });
  }
  if (cookMinutes && cookMinutes > 0) {
    items.push({
      icon: <Flame className="size-4" aria-hidden />,
      label: "烹調",
      value: formatMinutes(cookMinutes),
    });
  }
  if (servings && servings > 0) {
    items.push({
      icon: <Users className="size-4" aria-hidden />,
      label: "份量",
      value: `${servings} 人`,
    });
  }
  if (items.length === 0) return null;
  return (
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border-default bg-surface-muted/40 px-4 py-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-sm">
          <span className="text-brand-primary">{it.icon}</span>
          <dt className="text-xs uppercase tracking-wide text-text-muted">{it.label}</dt>
          <dd className="font-medium text-text-ink tabular-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
