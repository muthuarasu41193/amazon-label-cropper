type ProgressBarProps = {
  value: number;
  label?: string;
  showPercent?: boolean;
  striped?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function ProgressBar({
  value,
  label,
  showPercent = true,
  striped = false,
  size = "md",
  className = "",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-muted">{label}</span>}
          {showPercent && <span className="font-medium text-text">{clamped}%</span>}
        </div>
      )}
      <div className={`overflow-hidden rounded-full bg-surface ${height} ${striped ? "progress-striped" : ""}`}>
        <div
          className={`${height} rounded-full bg-primary transition-all duration-300 ease-out`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
