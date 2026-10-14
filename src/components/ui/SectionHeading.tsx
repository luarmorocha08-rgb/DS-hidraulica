import { clsx } from "clsx";
import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal className={clsx("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={clsx("eyebrow mb-4 flex items-center gap-3", align === "center" && "justify-center")}>
          <span aria-hidden className="h-px w-8 bg-orange" />
          {eyebrow}
        </p>
      )}
      <Tag className="font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.05] text-paper">{title}</Tag>
      {description && <p className="mt-5 text-[1.05rem] leading-relaxed text-silver">{description}</p>}
    </Reveal>
  );
}
