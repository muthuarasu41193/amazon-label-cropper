import Link from "next/link";
import { Crop } from "lucide-react";
import { SITE } from "@/lib/site";

type LogoProps = {
  href?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { icon: "h-7 w-7", iconInner: "h-3.5 w-3.5", text: "text-sm" },
  md: { icon: "h-8 w-8", iconInner: "h-4 w-4", text: "text-[15px]" },
  lg: { icon: "h-9 w-9", iconInner: "h-5 w-5", text: "text-base" },
};

export function Logo({ href = "/", showText = true, size = "md", className = "" }: LogoProps) {
  const s = sizes[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`${s.icon} flex shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-[#7c3aed] text-white shadow-[var(--shadow-soft)]`}
        aria-hidden
      >
        <Crop className={s.iconInner} strokeWidth={2.25} />
      </span>
      {showText && (
        <span className={`${s.text} font-semibold tracking-tight text-text`}>{SITE.name}</span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="group transition-opacity hover:opacity-90" aria-label={`${SITE.name} home`}>
        {content}
      </Link>
    );
  }

  return content;
}
