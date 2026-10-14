export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06] pb-12 pt-32 md:pb-16 md:pt-40">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgb(244_119_18/0.16),transparent_60%)]" />
      <div aria-hidden className="bg-blueprint absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-ds relative">
        <p className="eyebrow mb-4 flex items-center gap-3">
          <span aria-hidden className="h-px w-8 bg-orange" /> {eyebrow}
        </p>
        <h1 className="max-w-3xl font-display text-[clamp(2rem,5vw,3.6rem)] leading-[1.04]">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-[1.05rem] text-silver">{description}</p>}
      </div>
    </header>
  );
}
