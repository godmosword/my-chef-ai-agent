type Props = {
  avoidLabels?: string[];
  className?: string;
};

export function RecipeSafetyNotice({ avoidLabels, className }: Props) {
  return (
    <div className={className ?? "mt-4 space-y-2 text-sm text-text-body"}>
      {avoidLabels && avoidLabels.length > 0 && (
        <p className="rounded-lg bg-brand-primaryLight px-3 py-2">
          已依你的設定避開：{avoidLabels.join("、")}
        </p>
      )}
      <p className="rounded-lg border border-border-default px-3 py-2 text-text-muted">
        此食譜由 AI 生成，下廚前請再次確認過敏原、食材新鮮度與肉類熟度。兒童食用時，請依年齡調整食材大小與軟硬度。
      </p>
    </div>
  );
}
