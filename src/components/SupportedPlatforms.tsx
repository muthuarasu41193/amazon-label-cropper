import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import { getPlatform, SUPPORTED_PLATFORM_IDS } from "@/lib/platforms";

export function SupportedPlatforms() {
  const platforms = SUPPORTED_PLATFORM_IDS.map((id) => getPlatform(id));

  return (
    <section id="platforms" className="scroll-mt-20 bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Supported Platforms</h2>
          <p className="mt-4 text-base text-muted">
            Pick your marketplace or carrier — each card loads a tuned crop preset so you can start in one click.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <article
              key={platform.id}
              className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-soft-md)]"
              style={{ "--card-accent": platform.accent, "--card-accent-rgb": platform.accentRgb } as CSSProperties}
            >
              <div className="flex items-start gap-3">
                <PlatformLogo id={platform.id} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-text">{platform.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{platform.tagline}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Label sizes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {platform.labelSizes.map((size) => (
                      <span
                        key={size}
                        className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Preset</p>
                  <p className="mt-1 text-sm font-medium text-text">{platform.presetLabel}</p>
                </div>
              </div>

              <Link
                href={`/crop?p=${platform.id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-card px-4 py-2.5 text-sm font-medium text-text shadow-[var(--shadow-soft)] transition-all group-hover:border-[color:var(--card-accent)] group-hover:text-[color:var(--card-accent)]"
              >
                Use {platform.name} preset
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
