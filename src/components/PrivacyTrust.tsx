import { EyeOff, FileKey2, Lock, ServerOff, Shield } from "lucide-react";
import Link from "next/link";
import { SITE } from "@/lib/site";

const privacyPoints = [
  {
    icon: ServerOff,
    title: "Zero server uploads",
    description: "PDFs never leave your device. Processing runs entirely in your browser using WebAssembly.",
  },
  {
    icon: EyeOff,
    title: "No tracking of label content",
    description: "We don't read, store, or analyze your shipping addresses, SKUs, or customer data.",
  },
  {
    icon: FileKey2,
    title: "Automatic session cleanup",
    description: "Files are deleted from memory after processing. Close the tab and everything is gone.",
  },
];

export function PrivacyTrust() {
  return (
    <section className="border-y border-border bg-surface/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              Privacy-first by design
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-text sm:text-4xl">
              Enterprise-grade security, without the enterprise price
            </h2>

            <p className="mt-4 text-base leading-relaxed text-muted">
              {SITE.name} was built for sellers who handle sensitive customer data daily. Your PDFs are processed
              securely in-browser — we never see your files, and we never will.
            </p>

            <ul className="mt-8 space-y-5">
              {privacyPoints.map((point) => (
                <li key={point.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-border bg-card text-primary">
                    <point.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{point.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/privacy"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Read our Privacy Policy
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft-md)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="mt-5 text-lg font-semibold text-text">256-bit SSL Encrypted</p>
              <p className="mt-2 text-sm text-muted">
                All connections to {SITE.name} are secured with HTTPS and TLS 1.3 encryption.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3 border-t border-border pt-6">
                <div className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2">
                  <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-text">SSL Secured</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-text">HTTPS</span>
                </div>
              </div>
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              {[
                { title: "GDPR aligned", detail: "EU privacy standards" },
                { title: "No watermark", detail: "Clean output always" },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="rounded-[11px] border border-border bg-card px-4 py-3 text-center"
                >
                  <p className="text-xs font-semibold text-text">{badge.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{badge.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
