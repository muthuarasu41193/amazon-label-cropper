import { ArrowRight, Check, Shield } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { LinkButton } from "@/components/ui/Button";
import { PLATFORM_DISPLAY_NAMES, FEATURED_PLATFORMS } from "@/lib/platforms";
import { SITE } from "@/lib/site";

const platformList = FEATURED_PLATFORMS.map((id) => PLATFORM_DISPLAY_NAMES[id]).join(", ");

const trustPoints = ["100% browser-side", "No account required", "No watermark"];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 gradient-mesh" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />

      <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            Enterprise-grade · Private by design
          </div>

          <h1 className="animate-fade-up animate-delay-1 text-4xl font-semibold tracking-[-0.03em] text-text sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            Crop shipping labels
            <span className="block bg-gradient-to-r from-primary to-[#7c3aed] bg-clip-text text-transparent">
              in seconds, not hours
            </span>
          </h1>

          <p className="animate-fade-up animate-delay-2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {SITE.name} turns multi-label PDFs into clean 4×6 thermal prints for{" "}
            <span className="font-medium text-text">{platformList}</span> — fast, private, and
            production-ready.
          </p>

          <div className="animate-fade-up animate-delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="#upload" size="lg">
              Start cropping free
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/crop" variant="outline" size="lg">
              Open dashboard
            </LinkButton>
          </div>
        </div>

        <div className="animate-fade-up animate-delay-3 mx-auto mt-12 max-w-2xl lg:mt-14">
          <UploadZone />
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
            {trustPoints.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
