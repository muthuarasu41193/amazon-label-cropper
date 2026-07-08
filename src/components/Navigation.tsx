"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { href: "#platforms", label: "Platforms" },
  { href: "#features", label: "Features" },
  { href: "#testimonials", label: "Customers" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo href="/" size="md" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LinkButton href="/crop" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Open dashboard
          </LinkButton>
          <LinkButton href="#upload" size="sm" className="hidden sm:inline-flex">
            Get started
          </LinkButton>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-[10px] p-2 text-muted hover:bg-surface hover:text-text md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-border bg-background px-4 py-4 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-text"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                href="/crop"
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] px-3 py-2.5 text-sm font-medium text-text hover:bg-surface"
              >
                Open dashboard
              </Link>
              <Link
                href="#upload"
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] bg-primary px-3 py-2.5 text-center text-sm font-medium text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
