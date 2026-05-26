import type { DecisionSummary } from "@/lib/recipe/decision-summary";
import { cn } from "@/lib/utils/cn";

export type RecipeDecisionCardProps = {
  summary: DecisionSummary;
  className?: string;
};

function formatParts(summary: DecisionSummary): string[] {
  const parts: string[] = [];
  if (summary.totalMinutes != null && summary.totalMinutes > 0) {
    parts.push(`${summary.totalMinutes} 分鐘`);
  }
  if (summary.servings != null && summary.servings > 0) {
    parts.push(`${summary.servings} 人份`);
  }
  if (summary.shoppingCount === 0) {
    parts.push("不必採買");
  } else {
    parts.push(`需買 ${summary.shoppingCount} 樣`);
  }
  return parts;
}

export function RecipeDecisionCard({ summary, className }: RecipeDecisionCardProps) {
  const parts = formatParts(summary);
  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap gap-2 rounded-lg bg-surface-muted/80 px-3 py-2",
        className,
      )}
      aria-label="今晚決策摘要"
    >
      {parts.map((label) => (
        <span
          key={label}
          className="rounded-full bg-surface-default px-2.5 py-0.5 text-xs font-medium text-text-body"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
