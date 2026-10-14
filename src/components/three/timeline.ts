/**
 * Roteiro da intro em função do progresso do scroll (0 → 1).
 * Compartilhado entre a cena 3D, os textos sobrepostos e a sequência de imagens.
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const STAGE = {
  introEnd: 0.12, // 1. apresentação
  approachEnd: 0.32, // 2. aproximação + cabine levantando
  revealEnd: 0.45, // 3. revelação/destaque da caixa de direção
  explodeFull: 0.68, // 4. desmontagem técnica
  holdEnd: 0.76,
  reassembleEnd: 0.9, // 5. reconstrução
  // 0.9 → 1: frase final
} as const;

/** Quanto a caixa está desmontada (0 = montada, 1 = vista explodida). */
export function explodeAmount(p: number) {
  if (p < STAGE.revealEnd) return 0;
  if (p < STAGE.explodeFull) return smoother(ramp(p, STAGE.revealEnd, STAGE.explodeFull));
  if (p < STAGE.holdEnd) return 1;
  return 1 - smoother(ramp(p, STAGE.holdEnd, STAGE.reassembleEnd));
}

/** Destaque laranja da caixa de direção e escurecimento do restante. */
export function highlightAmount(p: number) {
  return smooth(ramp(p, STAGE.approachEnd - 0.04, STAGE.revealEnd)) * (1 - 0.6 * smooth(ramp(p, STAGE.reassembleEnd, 1)));
}

/** Levantamento da cabine (modo caminhão): sobe na etapa 2 e desce na conclusão. */
export function cabLiftAmount(p: number) {
  return smooth(ramp(p, STAGE.introEnd, STAGE.approachEnd)) * (1 - smooth(ramp(p, STAGE.reassembleEnd, 0.99)));
}

/** Caixa saindo do chassi para a posição de exibição (modo caminhão). */
export function showcaseAmount(p: number) {
  return smoother(ramp(p, STAGE.approachEnd + 0.02, STAGE.revealEnd + 0.02)) * (1 - smoother(ramp(p, STAGE.reassembleEnd, 0.985)));
}

/** Opacidade de um bloco de texto visível entre a e b. */
export function band(p: number, a: number, b: number, fade = 0.035) {
  if (p <= a - fade || p >= b + fade) return 0;
  if (p < a) return smooth(ramp(p, a - fade, a));
  if (p > b) return 1 - smooth(ramp(p, b, b + fade));
  return 1;
}

export interface CameraKey {
  p: number;
  pos: [number, number, number];
  target: [number, number, number];
}

export function sampleKeys(keys: CameraKey[], p: number) {
  if (p <= keys[0].p) return { pos: keys[0].pos, target: keys[0].target };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p <= b.p) {
      const t = smooth(ramp(p, a.p, b.p));
      const mix = (u: number[], v: number[]) => u.map((x, k) => x + (v[k] - x) * t) as [number, number, number];
      return { pos: mix(a.pos, b.pos), target: mix(a.target, b.target) };
    }
  }
  const last = keys[keys.length - 1];
  return { pos: last.pos, target: last.target };
}

/** Câmera do modo "somente caixa de direção" (sem modelo de caminhão). */
export const GEAR_CAMERA: CameraKey[] = [
  { p: 0, pos: [7.2, 2.9, 9.6], target: [0.4, 0.45, 0] },
  { p: STAGE.introEnd, pos: [6.2, 2.6, 8.4], target: [0.4, 0.45, 0] },
  { p: STAGE.approachEnd, pos: [4.2, 1.6, 6.0], target: [0.5, 0.45, 0] },
  { p: STAGE.revealEnd, pos: [2.9, 1.3, 5.4], target: [0.5, 0.5, 0] },
  { p: STAGE.explodeFull, pos: [1.4, 9.4, 12.4], target: [0.8, -0.2, 1.0] },
  { p: STAGE.holdEnd, pos: [-0.2, 9.0, 12.8], target: [0.8, -0.2, 1.0] },
  { p: STAGE.reassembleEnd, pos: [5.6, 2.4, 7.8], target: [0.4, 0.5, 0] },
  { p: 1, pos: [6.8, 2.7, 9.0], target: [0.4, 0.5, 0] },
];

/**
 * Deslocamento horizontal do enquadramento (fração da largura) para abrir
 * espaço aos textos à esquerda no desktop.
 */
export function viewShift(p: number) {
  const s = (a: number, b: number) => smooth(ramp(p, a, b));
  const intro = 0.17;
  const explode = -0.07;
  // intro → aproximação → explodida (quase centralizada) → final
  let v = intro;
  v += (explode - intro) * s(STAGE.revealEnd - 0.02, STAGE.explodeFull - 0.08);
  v += (0.14 - explode) * s(STAGE.holdEnd, STAGE.reassembleEnd);
  return v;
}

/** Legendas da narrativa (HTML sobreposto). */
export const CAPTIONS = [
  { id: "approach", a: STAGE.introEnd + 0.03, b: STAGE.approachEnd - 0.02, compact: false, kicker: "Etapa 02", title: "Sob a cabine, o sistema que conduz cada tonelada.", text: "Direção hidráulica: força, precisão e segurança em cada manobra." },
  { id: "reveal", a: STAGE.approachEnd + 0.01, b: STAGE.revealEnd + 0.02, compact: false, kicker: "Etapa 03", title: "O coração do sistema: a caixa de direção hidráulica.", text: "Transforma o giro do volante em força para esterçar as rodas, com assistência do óleo sob pressão." },
  { id: "explode", a: STAGE.revealEnd + 0.06, b: STAGE.holdEnd, compact: true, kicker: "Etapa 04", title: "Engenharia em detalhe.", text: "Carcaça, sem-fim de esferas recirculantes, pistão-cremalheira, eixo setor, válvula rotativa e vedações trabalham juntos sob pressão." },
  { id: "rebuild", a: STAGE.holdEnd + 0.02, b: STAGE.reassembleEnd - 0.01, compact: false, kicker: "Etapa 05", title: "Montagem com critério técnico.", text: "Cada componente volta ao seu lugar — inspecionado, ajustado e testado." },
] as const;
