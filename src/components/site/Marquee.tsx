const ITEMS = [
  "Caixa de direção",
  "Bomba hidráulica",
  "Mangueiras",
  "Diagnóstico",
  "Barra e coluna de direção",
  "Vazamentos",
  "Manutenção preventiva",
  "Caminhões e ônibus",
];

/** Faixa industrial com letreiro rolante entre seções. */
export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((t) => (
        <span key={t} className="flex items-center gap-6 px-6 font-display text-xl uppercase tracking-wide text-paper/90 md:text-2xl">
          {t}
          <span aria-hidden className="inline-block size-2.5 rotate-45 bg-orange" />
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden className="relative border-y border-white/[0.06] bg-ink-2/80 backdrop-blur-sm">
      <div className="hazard" />
      <div className="marquee overflow-hidden py-4">
        <div className="marquee__track">
          {row}
          {row}
        </div>
      </div>
      <div className="hazard" />
    </div>
  );
}
