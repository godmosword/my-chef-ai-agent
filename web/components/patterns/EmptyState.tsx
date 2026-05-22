import { cn } from "@/lib/utils/cn";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, body, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-muted/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 text-brand-primary">{icon}</div>}
      <h3 className="font-serif text-xl text-text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-text-muted">{body}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
