import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo href="/" size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Enterprise shipping label tools for marketplace sellers and logistics teams. Private by design.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-12 gap-y-6" aria-label="Footer navigation">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Legal</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-text transition-colors hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-text transition-colors hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-text transition-colors hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Product</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#features" className="text-sm text-text transition-colors hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-text transition-colors hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/crop" className="text-sm text-text transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="text-xs text-muted">Built for sellers worldwide · 12 platforms · 50+ countries</p>
        </div>
      </div>
    </footer>
  );
}
