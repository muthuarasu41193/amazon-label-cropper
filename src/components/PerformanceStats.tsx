import { SectionHeader } from "@/components/ui/SectionHeader";
import { SITE } from "@/lib/site";

const stats = [
  { value: "2.4M+", label: "Labels cropped", detail: "and counting" },
  { value: "<3s", label: "Avg. processing time", detail: "per PDF batch" },
  { value: "50+", label: "Countries", detail: "active sellers" },
  { value: "99.9%", label: "Uptime", detail: "always available" },
];

export function PerformanceStats() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[var(--radius-card)] border border-border bg-gradient-to-br from-primary/[0.05] via-card to-card p-8 shadow-[var(--shadow-soft)] sm:p-10">
          <SectionHeader
            eyebrow="Performance"
            title="Built for high-volume shipping teams"
            description={`Sellers processing hundreds of labels a day rely on ${SITE.name} for speed, accuracy, and privacy.`}
          />

          <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="text-3xl font-semibold tracking-[-0.02em] text-primary sm:text-4xl">{stat.value}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-text">{stat.label}</dd>
                <dd className="mt-0.5 text-xs text-muted">{stat.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
