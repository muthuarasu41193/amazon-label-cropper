import { BarChart3, Lock, ShieldOff } from "lucide-react";

const items = [
  {
    icon: BarChart3,
    title: "10,000+ labels processed",
    description: "Trusted by sellers and ops teams worldwide",
  },
  {
    icon: Lock,
    title: "Secure PDF processing",
    description: "Encrypted in-browser — files never touch our servers",
  },
  {
    icon: ShieldOff,
    title: "No data stored",
    description: "Your labels stay on your device, always",
  },
];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-primary shadow-[var(--shadow-soft)]">
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
