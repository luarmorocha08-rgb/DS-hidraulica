/** Nível de qualidade da experiência 3D conforme o dispositivo. */
export type Quality = "high" | "medium" | "low" | "static";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "static";
  const forced = new URLSearchParams(window.location.search).get("3d");
  if (forced === "high" || forced === "medium" || forced === "low" || forced === "static") return forced;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  if (!hasWebGL()) return "low";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const saveData = nav.connection?.saveData === true;
  const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;

  if (saveData || slowNet || memory <= 2 || (coarse && cores <= 4)) return "low";
  if (coarse || small || cores <= 6 || memory <= 4) return "medium";
  return "high";
}
