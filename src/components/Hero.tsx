import { Check } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { PLATFORM_DISPLAY_NAMES, FEATURED_PLATFORMS } from "@/lib/platforms";

const platformList = FEATURED_PLATFORMS.map((id) => PLATFORM_DISPLAY_NAMES[id]).join(", ");

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            100% browser-side · No account required
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Crop &amp; Convert Shipping Labels in Seconds
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Turn multi-label PDFs into clean 4×6 thermal prints for{" "}
            <span className="text-text">{platformList}</span> — fast, private, and free to start.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl lg:mt-12">
          <UploadZone />
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
            {["Secure processing", "Auto-deleted after use", "No watermark"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
