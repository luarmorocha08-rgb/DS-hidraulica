import { useId } from "react";

/**
 * Logotipo vetorial inspirado na identidade da DS Hidráulica.
 * Para usar o arquivo oficial, substitua por <Image src="/brand/logo.png" …/>.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={compact ? "0 0 120 70" : "0 0 300 118"}
      className={className}
      role="img"
      aria-label="DS Hidráulica — Direção Hidráulica"
    >
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.42" stopColor="#d4d6d9" />
          <stop offset="0.55" stopColor="#7d8085" />
          <stop offset="0.75" stopColor="#e8e9eb" />
          <stop offset="1" stopColor="#9a9da2" />
        </linearGradient>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a64613" />
          <stop offset="0.5" stopColor="#f47712" />
          <stop offset="1" stopColor="#ffb066" />
        </linearGradient>
      </defs>
      <g transform={compact ? "translate(6 0)" : "translate(48 0)"}>
        <g transform="skewX(-14)">
          <text
            x="18"
            y="58"
            fontFamily="'Russo One', sans-serif"
            fontSize="66"
            fill={`url(#m${id})`}
            letterSpacing="-3"
          >
            DS
          </text>
        </g>
        {/* tubo hidráulico estilizado saindo do S */}
        <path
          d="M78 16 C 98 6, 116 12, 108 26"
          fill="none"
          stroke={`url(#o${id})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="106" cy="27" r="5.5" fill="#0a0a0a" stroke="#c5c7c9" strokeWidth="2.5" />
      </g>
      {!compact && (
        <>
          <g transform="skewX(-12)">
            <text
              x="38"
              y="94"
              fontFamily="'Russo One', sans-serif"
              fontSize="31"
              fill={`url(#m${id})`}
              letterSpacing="0.5"
            >
              HIDRÁULICA
            </text>
          </g>
          <line x1="16" y1="108" x2="76" y2="108" stroke="#f47712" strokeWidth="2" />
          <line x1="224" y1="108" x2="284" y2="108" stroke="#f47712" strokeWidth="2" />
          <text
            x="150"
            y="112"
            textAnchor="middle"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="600"
            fontSize="11"
            letterSpacing="3.2"
            fill="#c5c7c9"
          >
            DIREÇÃO HIDRÁULICA
          </text>
        </>
      )}
    </svg>
  );
}
