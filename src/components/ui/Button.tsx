import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-heading font-bold uppercase tracking-[0.08em] transition-[background,color,border-color,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-orange text-ink shadow-[0_10px_30px_-10px_rgb(244_119_18/0.8)] hover:bg-orange-hot hover:shadow-[0_14px_40px_-8px_rgb(244_119_18/0.9)]",
  secondary:
    "border border-silver/25 bg-white/[0.03] text-paper backdrop-blur hover:border-orange/70 hover:bg-orange/10",
  ghost: "text-silver hover:text-orange",
  danger: "border border-danger/50 bg-danger/10 text-[#ff8f92] hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-[0.82rem]",
  md: "min-h-12 px-5 text-[0.95rem]",
  lg: "min-h-14 px-7 text-[1.02rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  external,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; external?: boolean }) {
  if (external) {
    const { href, ...rest } = props;
    return (
      <a
        href={String(href)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass(variant, size, className)}
        {...(rest as ComponentProps<"a">)}
      />
    );
  }
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
