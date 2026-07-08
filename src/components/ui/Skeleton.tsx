type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden />;
}

export function PdfPreviewSkeleton() {
  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-36 rounded-xl" />
      </div>
      <div className="flex gap-2 border-b border-border px-4 py-2">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-preview p-8">
        <Skeleton className="h-[420px] w-full max-w-md rounded-xl" />
      </div>
    </div>
  );
}

export function CropDashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-14 w-full shrink-0" />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-full space-y-4 border-r border-border bg-panel p-5 lg:w-[380px]">
            <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
          </div>
          <div className="hidden flex-1 p-5 lg:block">
            <PdfPreviewSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
