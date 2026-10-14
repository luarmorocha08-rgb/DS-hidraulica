/** Normaliza telefones brasileiros para dígitos com DDI 55 (ex.: 5511999998888). */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith("55")) return null;
  } else if (digits.length === 10 || digits.length === 11) {
    if (digits.startsWith("0")) return null;
    digits = `55${digits}`;
  } else {
    return null;
  }
  const ddd = Number(digits.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  const local = digits.slice(4);
  // celular: 9 dígitos começando com 9; fixo: 8 dígitos começando com 2–5
  if (local.length === 9 && local[0] !== "9") return null;
  if (local.length === 8 && !/[2-5]/.test(local[0])) return null;
  return digits;
}

export function formatPhone(normalized: string): string {
  const d = normalized.replace(/\D/g, "");
  const local = d.startsWith("55") ? d.slice(2) : d;
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return normalized;
}

/** Compara apenas os últimos dígitos, tolerando formatações diferentes. */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return !!na && !!nb && na === nb;
}
