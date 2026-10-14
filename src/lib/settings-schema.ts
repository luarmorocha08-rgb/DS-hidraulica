import { z } from "zod";

/**
 * Configurações editáveis da empresa (tabela site_settings, chave "site").
 * Campos vazios significam "ainda não informado pela empresa" — o site não
 * inventa valores para eles.
 */
export const siteSettingsSchema = z.object({
  companyName: z.string().default("DS Hidráulica"),
  legalName: z.string().default(""),
  cnpj: z.string().default(""),
  tagline: z.string().default("Direção Hidráulica"),
  yearsOfExperience: z.number().int().min(0).max(100).default(6),
  /** WhatsApp com DDI (somente dígitos). Vazio = botão mostra aviso de configuração. */
  whatsappNumber: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  instagramUrl: z.string().default("https://www.instagram.com/ds.hidraulica/"),
  facebookUrl: z.string().default(""),
  youtubeUrl: z.string().default(""),
  address: z
    .object({
      street: z.string().default(""),
      number: z.string().default(""),
      complement: z.string().default(""),
      district: z.string().default(""),
      city: z.string().default(""),
      state: z.string().default(""),
      postalCode: z.string().default(""),
      mapsUrl: z.string().default(""),
      latitude: z.number().nullable().default(null),
      longitude: z.number().nullable().default(null),
      /** Só exibir endereço publicamente quando confirmado. */
      confirmed: z.boolean().default(false),
    })
    .prefault({}),
  hoursText: z.string().default(""),
  hero: z
    .object({
      title: z.string().default("ESPECIALISTAS EM DIREÇÃO HIDRÁULICA"),
      subtitle: z
        .string()
        .default("Há 6 anos oferecendo precisão, segurança e confiança para quem movimenta o Brasil."),
    })
    .prefault({}),
  about: z
    .object({
      title: z.string().default("6 ANOS MOVIMENTANDO CONFIANÇA."),
      text: z
        .string()
        .default(
          "A DS Hidráulica atua há 6 anos oferecendo soluções especializadas em sistemas de direção hidráulica. Nosso compromisso é proporcionar serviços de qualidade, atendimento transparente e soluções eficientes para manter seu veículo trabalhando com segurança e desempenho.",
        ),
      photos: z
        .array(z.object({ url: z.string(), alt: z.string(), isDemo: z.boolean().default(false) }))
        .default([]),
    })
    .prefault({}),
  coverage: z
    .object({
      cities: z.array(z.string()).default([]),
      centerLat: z.number().nullable().default(null),
      centerLng: z.number().nullable().default(null),
      radiusKm: z.number().nullable().default(null),
      description: z.string().default(""),
    })
    .prefault({}),
  /** Texto sobre custo de deslocamento. Vazio = "a combinar" (nunca um valor inventado). */
  visitFeeNote: z.string().default(""),
  seo: z
    .object({
      city: z.string().default(""),
      region: z.string().default(""),
      description: z
        .string()
        .default(
          "Especialistas em direção hidráulica para caminhões, ônibus e veículos pesados. Manutenção de caixa de direção, bomba hidráulica, mangueiras e diagnóstico. Agende online.",
        ),
    })
    .prefault({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function parseSiteSettings(value: unknown): SiteSettings {
  const result = siteSettingsSchema.safeParse(value ?? {});
  return result.success ? result.data : DEFAULT_SITE_SETTINGS;
}

export function publicAddress(s: SiteSettings): string | null {
  const a = s.address;
  if (!a.confirmed || !a.street || !a.city) return null;
  return [
    `${a.street}${a.number ? `, ${a.number}` : ""}${a.complement ? ` – ${a.complement}` : ""}`,
    a.district,
    `${a.city}${a.state ? `/${a.state}` : ""}`,
    a.postalCode ? `CEP ${a.postalCode}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
