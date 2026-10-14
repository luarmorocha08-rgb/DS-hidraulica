export interface CoverageConfig {
  /** Cidades atendidas (comparação sem acento e sem caixa). */
  cities: string[];
  /** Centro e raio opcionais (km), usados quando há coordenadas. */
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
}

export type CoverageResult = "inside" | "outside" | "unknown";

export function normalizeCity(city: string) {
  return city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Verifica se o endereço está na área atendida.
 * Sem configuração da empresa, o resultado é "unknown" (depende de avaliação).
 */
export function checkCoverage(
  config: CoverageConfig,
  address: { city?: string | null; latitude?: number | null; longitude?: number | null },
): CoverageResult {
  const hasRadius =
    config.centerLat != null && config.centerLng != null && config.radiusKm != null && config.radiusKm > 0;
  if (hasRadius && address.latitude != null && address.longitude != null) {
    const d = haversineKm(config.centerLat!, config.centerLng!, address.latitude, address.longitude);
    return d <= config.radiusKm! ? "inside" : "outside";
  }
  if (config.cities.length > 0 && address.city) {
    const target = normalizeCity(address.city);
    return config.cities.some((c) => normalizeCity(c) === target) ? "inside" : "outside";
  }
  return "unknown";
}
