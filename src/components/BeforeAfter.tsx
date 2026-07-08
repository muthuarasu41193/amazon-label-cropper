import { ArrowRight } from "lucide-react";

function LabelSheetMock({ variant }: { variant: "before" | "after" }) {
  if (variant === "before") {
    return (
      <div className="aspect-[8.5/11] w-full rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-soft-md)]">
        <div className="mb-2 h-2 w-16 rounded bg-muted/30" />
        <div className="grid h-[calc(100%-1rem)] grid-cols-2 gap-2">
          <div className="space-y-2 rounded border border-dashed border-border bg-surface/80 p-2">
            <div className="h-1.5 w-3/4 rounded bg-text/20" />
            <div className="h-8 rounded bg-text/10" />
            <div className="space-y-1">
              <div className="h-1 w-full rounded bg-muted/40" />
              <div className="h-1 w-5/6 rounded bg-muted/40" />
              <div className="h-1 w-4/6 rounded bg-muted/40" />
            </div>
            <div className="mt-auto h-6 rounded bg-text/15" />
          </div>
          <div className="space-y-1 rounded border border-dashed border-border bg-surface/50 p-2">
            <div className="h-1 w-2/3 rounded bg-muted/30" />
            <div className="h-1 w-full rounded bg-muted/25" />
            <div className="h-1 w-full rounded bg-muted/25" />
            <div className="h-1 w-4/5 rounded bg-muted/25" />
            <div className="h-1 w-full rounded bg-muted/25" />
            <div className="h-1 w-3/5 rounded bg-muted/25" />
          </div>
          <div className="space-y-2 rounded border border-dashed border-border bg-surface/80 p-2">
            <div className="h-1.5 w-3/4 rounded bg-text/20" />
            <div className="h-8 rounded bg-text/10" />
            <div className="space-y-1">
              <div className="h-1 w-full rounded bg-muted/40" />
              <div className="h-1 w-5/6 rounded bg-muted/40" />
            </div>
            <div className="mt-auto h-6 rounded bg-text/15" />
          </div>
          <div className="space-y-1 rounded border border-dashed border-border bg-surface/50 p-2">
            <div className="h-1 w-2/3 rounded bg-muted/30" />
            <div className="h-1 w-full rounded bg-muted/25" />
            <div className="h-1 w-full rounded bg-muted/25" />
            <div className="h-1 w-4/5 rounded bg-muted/25" />
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium text-muted">2-up PDF with invoice columns</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="aspect-[2/3] w-full max-w-[140px] mx-auto rounded-lg border-2 border-primary/20 bg-card p-2.5 shadow-[var(--shadow-soft-md)]"
        >
          <div className="h-1.5 w-2/3 rounded bg-primary/30" />
          <div className="mt-2 h-10 rounded bg-text/10" />
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-muted/35" />
            <div className="h-1 w-4/5 rounded bg-muted/35" />
            <div className="h-1 w-3/5 rounded bg-muted/35" />
          </div>
          <div className="mt-3 h-5 rounded bg-text/15" />
        </div>
      ))}
      <p className="text-center text-[10px] font-medium text-primary">Clean 4×6 thermal labels</p>
    </div>
  );
}

export function BeforeAfter() {
  return (
    <section className="border-y border-border bg-surface/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            From messy PDFs to print-ready labels
          </h2>
          <p className="mt-4 text-base text-muted">
            See how LabelForge transforms multi-label marketplace exports into individual thermal pages — no manual
            cropping in Acrobat.
          </p>
        </div>

        <div className="mt-14 flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-12">
          <div className="w-full max-w-[220px]">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Before</p>
            <LabelSheetMock variant="before" />
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </div>

          <div className="w-full max-w-[180px]">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-primary">After</p>
            <LabelSheetMock variant="after" />
          </div>
        </div>

        <ul className="mx-auto mt-12 flex max-w-xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Invoice columns removed
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Barcodes preserved
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            4×6 thermal sizing
          </li>
        </ul>
      </div>
    </section>
  );
}
