import { Globe, Lock, ShieldCheck, Trash2 } from "lucide-react";

const items = [
  {
    icon: Lock,
    title: "Processed securely in-browser",
    description: "256-bit encryption — your PDFs never leave your device",
  },
  {
    icon: Trash2,
    title: "Auto-deleted after use",
    description: "Session data clears when you close the tab or finish cropping",
  },
  {
    icon: ShieldCheck,
    title: "Zero watermark",
    description: "Print-ready output with no branding or quality loss",
  },
  {
    icon: Globe,
    title: "Trusted in 50+ countries",
    description: "Used by marketplace sellers, 3PLs, and D2C brands worldwide",
  },
];

export function TrustBar() {
  return (
    <section id="trust" className="scroll-mt-20 border-y border-border bg-surface/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-border bg-card text-primary">
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
