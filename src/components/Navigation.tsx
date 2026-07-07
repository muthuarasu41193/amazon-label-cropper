import Link from "next/link";

const navLinks = [
  { href: "#platforms", label: "Platforms" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-white shadow-[var(--shadow-soft)]">
            LF
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-text">LabelForge</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/crop"
            className="hidden rounded-[12px] px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-text sm:inline-flex"
          >
            Open tool
          </Link>
          <a
            href="#upload"
            className="inline-flex items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-primary-hover"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
