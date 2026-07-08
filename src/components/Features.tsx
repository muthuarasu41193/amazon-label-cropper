import { Crop, FileOutput, Layers, ListOrdered, Printer, Sparkles, Zap } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

const features = [
  {
    icon: Crop,
    title: "Smart crop detection",
    description:
      "Automatically splits 2-up label sheets into individual 4×6 thermal pages with tuned presets per platform.",
  },
  {
    icon: Layers,
    title: "Multi-platform support",
    description:
      "Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, DHL, FedEx, UPS, USPS and custom PDFs.",
  },
  {
    icon: Sparkles,
    title: "Invoice text extraction",
    description: "Pull product name and quantity from invoice columns and print them below each label.",
  },
  {
    icon: ListOrdered,
    title: "Batch processing",
    description: "Queue multiple PDFs and process them all at once with per-file progress tracking.",
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
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to ship faster"
          description="A focused toolkit built for marketplace sellers, 3PL teams, and D2C brands who print labels daily."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card-hover rounded-[var(--radius-card)] border border-border bg-card p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[11px] border border-primary/15 bg-primary/8 text-primary">
                <feature.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-text">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
