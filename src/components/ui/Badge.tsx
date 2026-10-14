import { clsx } from "clsx";
import type { Tone } from "@/lib/labels";

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-tech text-[0.8rem] font-semibold uppercase tracking-wider",
        tone === "success" && "border-success/40 bg-success/10 text-[#7fdcb0]",
        tone === "warning" && "border-warning/40 bg-warning/10 text-[#ffd27a]",
        tone === "danger" && "border-danger/40 bg-danger/10 text-[#ff9ea1]",
        tone === "info" && "border-info/40 bg-info/10 text-[#9fd0ff]",
        tone === "muted" && "border-silver/20 bg-white/5 text-silver",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
