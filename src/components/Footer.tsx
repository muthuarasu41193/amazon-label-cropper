import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-white">
                LF
              </span>
              <span className="text-[15px] font-semibold text-text">LabelForge</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Premium shipping label tools for marketplace sellers and logistics teams. Private by design.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Legal</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-text hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-text hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-text hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Product</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#features" className="text-sm text-text hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-text hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/crop" className="text-sm text-text hover:text-primary">
                    Label cropper
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-sm text-muted">© {new Date().getFullYear()} LabelForge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
