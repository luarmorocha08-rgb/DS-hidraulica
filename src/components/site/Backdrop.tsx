"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo temático do site: desenhos técnicos (blueprint) de caminhão, caixa de
 * direção e circuito hidráulico, com paralaxe leve e "óleo" correndo nas
 * mangueiras. Somente SVG + CSS (transform/opacity) para não pesar no celular.
 */
export function Backdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // na página inicial, os desenhos começam depois da intro 3D (que é opaca)
    const placeAfterHero = () => {
      const hero = document.getElementById("inicio");
      el.style.top = hero ? `${hero.offsetHeight}px` : "0px";
    };
    placeAfterHero();
    window.addEventListener("resize", placeAfterHero);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => window.removeEventListener("resize", placeAfterHero);
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-speed]"));
    const visible = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement))),
      { rootMargin: "200px" },
    );
    items.forEach((i) => io.observe(i));
    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      visible.forEach((item) => {
        const r = item.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) * Number(item.dataset.speed);
        item.style.setProperty("--py", `${offset.toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", placeAfterHero);
    };
  }, []);

  return (
    <>
      {/* camada fixa: brilhos laranja e grão */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="backdrop-glow backdrop-glow--a" />
        <div className="backdrop-glow backdrop-glow--b" />
        <div className="backdrop-grain absolute inset-0" />
      </div>

      {/* camada ao longo da página: desenhos técnicos */}
      <div ref={root} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10 overflow-hidden">
        <div className="bg-blueprint absolute inset-0 opacity-[0.55] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]" />

        <Drawing top="14%" side="right" width="min(62vw,760px)" speed={0.12}>
          <TruckBlueprint />
        </Drawing>
        <Drawing top="27%" side="left" width="min(48vw,520px)" speed={-0.08}>
          <HydraulicCircuit />
        </Drawing>
        <Drawing top="40%" side="right" width="min(34vw,380px)" speed={0.1} spin>
          <Cog />
        </Drawing>
        <Drawing top="52%" side="left" width="min(58vw,640px)" speed={0.1}>
          <GearSection />
        </Drawing>
        <Drawing top="68%" side="right" width="min(52vw,600px)" speed={-0.1}>
          <HydraulicCircuit flip />
        </Drawing>
        <Drawing top="83%" side="left" width="min(60vw,720px)" speed={0.08}>
          <TruckBlueprint />
        </Drawing>
      </div>
    </>
  );
}

function Drawing({ top, side, width, speed, spin, children }: { top: string; side: "left" | "right"; width: string; speed: number; spin?: boolean; children: React.ReactNode }) {
  return (
    <div
      data-speed={speed}
      className="backdrop-drawing absolute"
      style={{ top, [side]: "-4%", width, transform: "translate3d(0, var(--py, 0px), 0)" }}
    >
      <div className={spin ? "backdrop-spin" : undefined}>{children}</div>
    </div>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, vectorEffect: "non-scaling-stroke" as const };

/** Vista lateral de cavalo mecânico com cotas, estilo desenho técnico. */
function TruckBlueprint() {
  return (
    <svg viewBox="0 0 640 260" className="w-full text-silver">
      <g {...stroke}>
        {/* cabine */}
        <path d="M60 60 Q60 40 80 38 L170 34 Q190 34 196 50 L204 150 L60 150 Z" />
        <path d="M74 56 L150 52 L150 100 L74 104 Z" />
        <path d="M160 52 L188 52 L194 98 L160 98 Z" />
        <path d="M80 38 Q120 14 176 22 L182 34" />
        <path d="M120 104 L120 150 M196 120 L222 120" />
        {/* chassi */}
        <path d="M40 150 L600 150 L600 166 L40 166 Z" />
        <path d="M56 136 L40 136 L40 172 L70 172" />
        {/* tanque e quinta roda */}
        <rect x="230" y="152" width="96" height="34" rx="16" />
        <path d="M430 150 L430 138 L510 138 L510 150" />
        {/* escapamento */}
        <path d="M206 150 L206 40 L214 40 L214 150" />
        {/* rodas */}
        {[[110, 196], [450, 196], [520, 196]].map(([cx, cy]) => (
          <g key={cx}>
            <circle cx={cx} cy={cy} r="34" />
            <circle cx={cx} cy={cy} r="20" />
            <circle cx={cx} cy={cy} r="5" />
          </g>
        ))}
        <path d="M68 196 Q68 150 110 150 Q152 150 152 196" />
        <path d="M408 196 Q408 150 485 150 Q562 150 562 196" />
        {/* caixa de direção destacada */}
        <rect x="132" y="156" width="26" height="18" rx="3" className="text-orange" stroke="currentColor" />
      </g>
      {/* cotas */}
      <g fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.7">
        <path d="M40 240 L600 240 M40 232 L40 248 M600 232 L600 248" />
        <path d="M624 22 L624 230 M616 22 L632 22 M616 230 L632 230" />
        <path d="M110 214 L110 240 M520 214 L520 240" />
      </g>
      <g fill="currentColor" fontFamily="var(--font-tech)" fontSize="11" letterSpacing="2">
        <text x="300" y="256">6 800</text>
        <text x="602" y="130" transform="rotate(-90 612 130)">3 950</text>
        <text x="300" y="232">ENTRE-EIXOS 3 800</text>
        <text x="122" y="150" className="fill-orange" fill="currentColor">CX. DIREÇÃO</text>
      </g>
    </svg>
  );
}

/** Corte esquemático da caixa de direção. */
function GearSection() {
  return (
    <svg viewBox="0 0 560 300" className="w-full text-silver">
      <g {...stroke}>
        <rect x="60" y="110" width="330" height="96" rx="14" />
        <rect x="390" y="122" width="90" height="72" rx="10" />
        <circle cx="300" cy="80" r="62" />
        <circle cx="300" cy="80" r="20" />
        {/* setor dentado */}
        <path d="M262 118 L268 132 L278 124 L286 140 L296 128 L304 144 L314 128 L322 140 L330 124 L338 132 L344 118" className="text-orange" stroke="currentColor" />
        {/* pistão e sem-fim */}
        <rect x="90" y="124" width="220" height="68" rx="8" />
        <path d="M110 158 L460 158" strokeDasharray="2 6" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${130 + i * 20} 146 L${140 + i * 20} 170`} />
        ))}
        {/* conexões */}
        <path d="M420 122 L420 90 M450 122 L450 90" />
        <rect x="410" y="78" width="20" height="12" />
        <rect x="440" y="78" width="20" height="12" />
        <path d="M480 158 L540 158" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.8">
        <path d="M300 18 L360 4 L470 4" />
        <path d="M200 192 L170 250 L60 250" />
        <path d="M435 84 L500 40 L550 40" />
      </g>
      <g fill="currentColor" fontFamily="var(--font-tech)" fontSize="11" letterSpacing="2">
        <text x="364" y="0">A — EIXO SETOR</text>
        <text x="62" y="266">B — PISTÃO / SEM-FIM</text>
        <text x="470" y="34">C — PRESSÃO / RETORNO</text>
      </g>
    </svg>
  );
}

/** Circuito hidráulico com fluxo animado (bomba → caixa → reservatório). */
function HydraulicCircuit({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 520 280" className="w-full text-silver" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <g {...stroke}>
        {/* bomba */}
        <circle cx="80" cy="200" r="38" />
        <circle cx="80" cy="200" r="12" />
        <path d="M80 162 L80 150 M42 200 L30 200" />
        {/* reservatório */}
        <rect x="40" y="40" width="80" height="70" rx="8" />
        <path d="M40 70 L120 70" strokeDasharray="3 4" />
        {/* caixa de direção */}
        <rect x="360" y="150" width="120" height="70" rx="10" />
        <circle cx="420" cy="150" r="26" />
      </g>
      {/* mangueiras */}
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5">
        <path id="h1" d="M118 200 C 200 200, 230 120, 360 175" />
        <path d="M360 205 C 250 260, 160 120, 120 80" />
        <path d="M80 110 L80 162" />
      </g>
      {/* óleo correndo */}
      <g fill="none" stroke="var(--color-orange)" strokeWidth="3" strokeLinecap="round" className="backdrop-flow">
        <path d="M118 200 C 200 200, 230 120, 360 175" />
        <path d="M360 205 C 250 260, 160 120, 120 80" style={{ animationDelay: "-1.2s" }} />
        <path d="M80 110 L80 162" style={{ animationDelay: "-0.6s" }} />
      </g>
      <g fill="currentColor" fontFamily="var(--font-tech)" fontSize="11" letterSpacing="2">
        <text x="34" y="30">RESERVATÓRIO</text>
        <text x="34" y="262">BOMBA</text>
        <text x="352" y="242">CAIXA DE DIREÇÃO</text>
        <text x="230" y="140">PRESSÃO</text>
        <text x="190" y="236">RETORNO</text>
      </g>
    </svg>
  );
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function Cog() {
  const teeth = 18;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 100 : 86;
    const a2 = a + Math.PI / (teeth * 2);
    pts.push(`${r2(100 + Math.cos(a) * r)},${r2(100 + Math.sin(a) * r)}`, `${r2(100 + Math.cos(a2) * r)},${r2(100 + Math.sin(a2) * r)}`);
  }
  return (
    <svg viewBox="-4 -4 208 208" className="w-full text-silver">
      <g {...stroke}>
        <polygon points={pts.join(" ")} />
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="22" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <circle key={i} cx={r2(100 + Math.cos(a) * 42)} cy={r2(100 + Math.sin(a) * 42)} r="8" />;
        })}
      </g>
    </svg>
  );
}
