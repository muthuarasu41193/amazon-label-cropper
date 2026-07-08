import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type ButtonBaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[var(--shadow-soft)] hover:bg-primary-hover hover:shadow-[var(--shadow-glow)]",
  secondary: "bg-surface text-text border border-border hover:bg-card hover:border-border-strong",
  ghost: "text-muted hover:text-text hover:bg-surface",
  outline: "border border-border bg-card text-text hover:bg-surface hover:border-border-strong",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[10px]",
  md: "px-4 py-2 text-sm rounded-[11px]",
  lg: "px-5 py-2.5 text-sm rounded-[12px]",
};

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = ButtonBaseProps & ComponentPropsWithoutRef<"button">;
type LinkButtonProps = ButtonBaseProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
