import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for solo sellers getting started with thermal printing.",
    features: [
      "Up to 50 labels per day",
      "All marketplace presets",
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
      "Priority preset updates",
      "Batch PDF processing",
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
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted">
            Start free with no credit card. Upgrade when your shipping volume grows.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-[var(--radius-card)] border p-6 sm:p-8 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-[var(--shadow-soft-lg)] ring-1 ring-primary/10"
                  : "border-border bg-card shadow-[var(--shadow-soft)]"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-text">{plan.price}</span>
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

              <Link
                href={plan.href}
                className={`mt-8 inline-flex items-center justify-center rounded-[12px] px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-white shadow-[var(--shadow-soft)] hover:bg-primary-hover"
                    : "border border-border bg-card text-text hover:bg-surface"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
