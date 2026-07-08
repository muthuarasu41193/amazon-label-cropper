"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PlatformLogo } from "@/components/PlatformLogo";
import { SIDEBAR_GROUPS, SIDEBAR_LABELS, getPlatform, type Platform } from "@/lib/platforms";

type SidebarProps = {
  activePlatformId: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function PlatformNavItem({
  platform,
  isActive,
  onSelect,
}: {
  platform: Platform;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const label = SIDEBAR_LABELS[platform.id] ?? platform.name;

  return (
    <button
      type="button"
      onClick={() => onSelect(platform.id)}
      className={`group flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm transition-all ${
        isActive
          ? "bg-card shadow-[var(--shadow-soft)] ring-1 ring-border"
          : "text-muted hover:bg-card/60 hover:text-text"
      }`}
      style={isActive ? { borderLeft: `2px solid ${platform.accent}` } : { borderLeft: "2px solid transparent" }}
      aria-current={isActive ? "page" : undefined}
    >
      <PlatformLogo id={platform.id} className="h-6 w-6 shrink-0" />
      <span className={`truncate text-[13px] font-medium ${isActive ? "text-text" : ""}`}>{label}</span>
    </button>
  );
}

export function Sidebar({ activePlatformId, mobileOpen, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectPlatform = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", id);
    router.push(`/crop?${params.toString()}`);
    onMobileClose();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <Logo href="/" size="sm" />
        <button
          type="button"
          onClick={onMobileClose}
          className="rounded-[10px] p-1.5 text-muted hover:bg-surface lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Platform presets">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.platforms.map((id) => {
                const platform = getPlatform(id);
                return (
                  <PlatformNavItem
                    key={id}
                    platform={platform}
                    isActive={activePlatformId === id}
                    onSelect={selectPlatform}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3.5">
        <p className="text-[11px] leading-relaxed text-muted">
          All processing runs locally in your browser. Files never leave your device.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface lg:block">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Platform menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-label="Close overlay"
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-surface shadow-2xl">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] p-2 text-muted hover:bg-surface lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
