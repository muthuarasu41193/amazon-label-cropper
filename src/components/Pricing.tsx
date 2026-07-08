import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for solo sellers getting started with thermal printing.",
    features: [
      "Up to 50 labels per day",
      "All 12 platform presets",
      "4×6 thermal export",
      "Browser-side processing",
    ],
    cta: "Start free",
    href: "#upload",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For growing brands and ops teams with higher daily volume.",
    features: [
      "Unlimited label crops",
      "Invoice text extraction",
      "Batch PDF processing",
      "Priority preset updates",
      "Email support",
    ],
    cta: "Get Pro",
    href: "#upload",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$39",
    period: "/month",
    description: "For warehouses and 3PLs managing multiple seller accounts.",
    features: [
      "Everything in Pro",
      "Up to 10 team seats",
      "Shared preset library",
      "Usage analytics",
      "Dedicated onboarding",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-surface/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          description="Start free with no credit card. Upgrade when your shipping volume grows."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-[var(--radius-card)] border p-6 sm:p-8 ${
                plan.highlighted
                  ? "border-primary/30 bg-card shadow-[var(--shadow-glow)] ring-1 ring-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}

              <div>
                <h3 className="text-base font-semibold text-text">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.02em] text-text">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{plan.description}</p>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <LinkButton
                href={plan.href}
                variant={plan.highlighted ? "primary" : "outline"}
                size="md"
                className="mt-8 w-full"
              >
                {plan.cta}
              </LinkButton>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
