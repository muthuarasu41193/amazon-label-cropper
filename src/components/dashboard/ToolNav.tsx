"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClipboardList, Scissors } from "lucide-react";

export function ToolNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const platform = searchParams.get("p") || "amazon";
  const cropHref = `/crop/?p=${encodeURIComponent(platform)}`;
  const onManifest = pathname.includes("/manifest");

  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2.5 py-2 text-[12px] font-semibold transition-all ${
      active ? "bg-card text-text shadow-[var(--shadow-soft)] ring-1 ring-border" : "text-muted hover:bg-card/60 hover:text-text"
    }`;

  return (
    <nav className="px-2.5 pb-3" aria-label="App tools">
      <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Tools</p>
      <div className="flex gap-1 rounded-[12px] border border-border bg-background/70 p-1">
        <Link href={cropHref} className={tabClass(!onManifest)} aria-current={!onManifest ? "page" : undefined}>
          <Scissors className="h-3.5 w-3.5" />
          Label Cropper
        </Link>
        <Link href="/crop/manifest/" className={tabClass(onManifest)} aria-current={onManifest ? "page" : undefined}>
          <ClipboardList className="h-3.5 w-3.5" />
          Manifest
        </Link>
      </div>
    </nav>
  );
}

export function ToolHeaderTabs({ platformId }: { platformId?: string }) {
  const pathname = usePathname() ?? "";
  const onManifest = pathname.includes("/manifest");
  const cropHref = `/crop/${platformId ? `?p=${encodeURIComponent(platformId)}` : ""}`;

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
      active ? "bg-primary text-white shadow-[var(--shadow-soft)]" : "text-muted hover:bg-surface hover:text-text"
    }`;

  return (
    <nav className="flex items-center rounded-xl border border-border bg-surface p-0.5" aria-label="Switch tool">
      <Link href={cropHref} className={tabClass(!onManifest)}>
        <Scissors className="h-3.5 w-3.5" />
        Label Cropper
      </Link>
      <Link href="/crop/manifest/" className={tabClass(onManifest)}>
        <ClipboardList className="h-3.5 w-3.5" />
        Manifest Creator
      </Link>
    </nav>
  );
}
