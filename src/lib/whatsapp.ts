/** Links "clique para conversar" (wa.me). Não exige integração com a API. */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_MESSAGES = {
  general: "Olá! Conheci a DS Hidráulica pelo site e gostaria de mais informações.",
  visit: "Olá! Gostaria de solicitar uma visita técnica ao meu local.",
  quote: "Olá! Gostaria de receber um orçamento para meu veículo.",
  specialist: "Olá! Fiz o diagnóstico preliminar no site e gostaria de conversar com um especialista.",
  service: (serviceName: string) =>
    `Olá! Conheci a DS Hidráulica pelo site e gostaria de informações sobre ${serviceName.toLowerCase()}.`,
};
