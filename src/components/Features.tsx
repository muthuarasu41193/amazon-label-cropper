import { Crop, FileOutput, Layers, Printer, Sparkles, Zap } from "lucide-react";

const features = [
  {
    icon: Crop,
    title: "Smart crop detection",
    description: "Automatically splits 2-up label sheets into individual 4×6 thermal pages with tuned presets per platform.",
  },
  {
    icon: Layers,
    title: "Multi-platform support",
    description: "Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, DHL, FedEx, UPS, USPS and more.",
  },
  {
    icon: Sparkles,
    title: "Invoice text extraction",
    description: "Pull product name and quantity from invoice columns and print them below each label.",
  },
  {
    icon: Printer,
    title: "Thermal-ready output",
    description: "Export perfectly sized 4×6 PDFs ready for Zebra, Rollo, and standard thermal printers.",
  },
  {
    icon: Zap,
    title: "Instant processing",
    description: "Crop hundreds of labels in seconds — entirely in your browser with zero upload latency.",
  },
  {
    icon: FileOutput,
    title: "One-click download",
    description: "Preview cropped output and download a print-ready PDF immediately after processing.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-base text-muted">
            A focused toolkit built for marketplace sellers, 3PL teams, and D2C brands who print labels daily.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-soft-md)]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-text">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
