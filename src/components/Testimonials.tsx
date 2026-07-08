import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "We ship 200+ Amazon orders daily. LabelForge cut our label prep from 45 minutes to under 5. The invoice text extraction alone saves our packers hours every week.",
    name: "Priya Sharma",
    role: "Operations Manager",
    company: "D2C apparel brand · Mumbai",
    platform: "Amazon India",
  },
  {
    quote:
      "Finally a tool that doesn't upload our customer data anywhere. Our compliance team approved it immediately — browser-side processing is exactly what we needed.",
    name: "James Mitchell",
    role: "Fulfillment Lead",
    company: "Multi-channel seller · Austin, TX",
    platform: "Shopify & eBay",
  },
  {
    quote:
      "Switched from manual PDF cropping in Preview. FedEx and UPS bulk labels now print perfectly on our Zebra printers. No watermarks, no nonsense.",
    name: "Sarah Chen",
    role: "Warehouse Supervisor",
    company: "3PL logistics · Singapore",
    platform: "FedEx & UPS",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Loved by sellers who ship at scale
          </h2>
          <p className="mt-4 text-base text-muted">
            eCommerce teams worldwide trust LabelForge for secure, watermark-free label cropping.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="flex flex-col rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <Quote className="h-8 w-8 text-primary/20" strokeWidth={1.5} />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-text">&ldquo;{item.quote}&rdquo;</blockquote>
              <footer className="mt-6 border-t border-border pt-4">
                <p className="text-sm font-semibold text-text">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted">{item.role}</p>
                <p className="mt-0.5 text-xs text-muted">{item.company}</p>
                <span className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {item.platform}
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
