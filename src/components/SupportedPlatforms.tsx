import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPlatform, SUPPORTED_PLATFORM_IDS } from "@/lib/platforms";

export function SupportedPlatforms() {
  const platforms = SUPPORTED_PLATFORM_IDS.map((id) => getPlatform(id));

  return (
    <section id="platforms" className="scroll-mt-20 bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Platforms"
          title="12 presets, one-click setup"
          description="Pick your marketplace or carrier — each card loads a tuned crop preset so you can start immediately."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {platforms.map((platform) => (
            <article
              key={platform.id}
              className="card-hover group flex flex-col rounded-[var(--radius-card)] border border-border bg-card p-5"
              style={{ "--card-accent": platform.accent, "--card-accent-rgb": platform.accentRgb } as CSSProperties}
            >
              <div className="flex items-start gap-3">
                <PlatformLogo id={platform.id} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text">{platform.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-2">{platform.tagline}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Label sizes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {platform.labelSizes.map((size) => (
                      <span
                        key={size}
                        className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Preset</p>
                  <p className="mt-1 text-xs font-medium text-text">{platform.presetLabel}</p>
                </div>
              </div>

              <Link
                href={`/crop?p=${platform.id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[11px] border border-border bg-surface px-4 py-2.5 text-xs font-medium text-text transition-all group-hover:border-[color:var(--card-accent)] group-hover:bg-[color:rgb(var(--card-accent-rgb)/0.06)] group-hover:text-[color:var(--card-accent)]"
              >
                Use {platform.name} preset
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
