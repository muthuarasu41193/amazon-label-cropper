import { Globe, Lock, ShieldCheck, Trash2 } from "lucide-react";

const items = [
  {
    icon: Lock,
    title: "Your PDFs are processed securely",
    description: "256-bit encryption in your browser — nothing is uploaded to our servers",
  },
  {
    icon: Trash2,
    title: "Files automatically deleted after processing",
    description: "Session data is cleared the moment you close the tab or finish cropping",
  },
  {
    icon: ShieldCheck,
    title: "No watermark",
    description: "Print-ready output with zero branding, overlays, or quality loss",
  },
  {
    icon: Globe,
    title: "Used by eCommerce sellers worldwide",
    description: "Trusted by Amazon, Shopify, and marketplace sellers in 50+ countries",
  },
];

export function TrustBar() {
  return (
    <section id="trust" className="scroll-mt-20 border-y border-border bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-card text-primary shadow-[var(--shadow-soft)]">
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
