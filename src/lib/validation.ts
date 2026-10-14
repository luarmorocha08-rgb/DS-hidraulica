import { z } from "zod";
import { normalizePhone } from "./phone";
import { SEVERE_FLAGS, SYMPTOMS } from "./diagnosis";

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `Informe ${label}.` })
    .trim()
    .min(min, min <= 1 ? `Informe ${label}.` : `${label[0].toUpperCase()}${label.slice(1)}: mínimo de ${min} caracteres.`)
    .max(max, `Máximo de ${max} caracteres.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneField = z
  .string({ error: "Informe o telefone/WhatsApp." })
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número, ex.: (11) 99999-8888." });
      return z.NEVER;
    }
    return n;
  });

const emailField = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined))
  .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido.");

const currentYear = new Date().getFullYear();

const yearField = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1950 || n > currentYear + 1) {
      ctx.addIssue({ code: "custom", message: "Ano inválido." });
      return z.NEVER;
    }
    return n;
  });

export const vehicleTypeField = z.enum(["caminhao", "onibus", "utilitario", "maquina", "outro"], {
  error: "Selecione o tipo de veículo.",
});

const consentField = z
  .string()
  .optional()
  .refine((v) => v === "on" || v === "true", "É preciso concordar com a política de privacidade.");

const customerFields = {
  name: text(3, 120, "o nome completo"),
  phone: phoneField,
  email: emailField,
  consent: consentField,
};

const vehicleFields = {
  vehicleType: vehicleTypeField,
  vehicleBrand: text(2, 60, "a marca"),
  vehicleModel: text(1, 80, "o modelo"),
  vehicleYear: yearField,
};

const addressFields = {
  street: text(3, 160, "a rua / avenida"),
  number: text(1, 20, "o número"),
  complement: optionalText(80),
  district: text(2, 80, "o bairro"),
  city: text(2, 80, "a cidade"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Informe a UF (ex.: SP)."),
  postalCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : undefined))
    .refine((v) => !v || v.length === 8, "CEP inválido."),
  reference: optionalText(200),
  latitude: z.coerce.number().min(-90).max(90).optional().catch(undefined),
  longitude: z.coerce.number().min(-180).max(180).optional().catch(undefined),
};

export const appointmentSchema = z
  .object({
    bookingTypeId: z.uuid("Selecione o tipo de atendimento."),
    serviceId: z.uuid().optional().catch(undefined),
    modality: z.enum(["workshop", "onsite"], { error: "Selecione a modalidade." }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione a data."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Selecione o horário."),
    problemDescription: text(10, 2000, "a descrição do problema"),
    customerNotes: optionalText(1000),
    ...customerFields,
    ...vehicleFields,
    // endereço só é obrigatório para visita ao local (validado abaixo)
    street: optionalText(160),
    number: optionalText(20),
    complement: optionalText(80),
    district: optionalText(80),
    city: optionalText(80),
    state: optionalText(2),
    postalCode: optionalText(9),
    reference: optionalText(200),
    latitude: addressFields.latitude,
    longitude: addressFields.longitude,
  })
  .superRefine((v, ctx) => {
    if (v.modality !== "onsite") return;
    const required: Array<[keyof typeof v, string]> = [
      ["street", "Informe a rua / avenida."],
      ["number", "Informe o número."],
      ["district", "Informe o bairro."],
      ["city", "Informe a cidade."],
      ["state", "Informe a UF."],
    ];
    for (const [key, message] of required) {
      if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message });
    }
  });

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const visitSchema = z.object({
  ...customerFields,
  ...vehicleFields,
  ...addressFields,
  problemDescription: text(10, 2000, "a descrição do problema"),
  preferredDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida."),
  preferredPeriod: z.enum(["manha", "tarde", "qualquer"]).default("qualquer"),
});

export type VisitInput = z.infer<typeof visitSchema>;

export const quoteSchema = z.object({
  ...customerFields,
  vehicleType: vehicleTypeField,
  vehicleBrand: text(2, 60, "a marca"),
  vehicleModel: text(1, 80, "o modelo"),
  vehicleYear: yearField,
  serviceType: text(2, 120, "o tipo de serviço"),
  problemDescription: text(10, 2000, "a descrição do problema"),
  urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const trackSchema = z.object({
  protocol: z.string().trim().min(8, "Informe o protocolo.").max(20),
  phone: phoneField,
});

export const diagnosisSchema = z.object({
  symptoms: z.array(z.enum(SYMPTOMS.map((s) => s.id) as [string, ...string[]])).default([]),
  severe: z.array(z.enum(SEVERE_FLAGS.map((s) => s.id) as [string, ...string[]])).default([]),
  vehicle: optionalText(120),
  notes: optionalText(600),
});

export type FieldErrors = Record<string, string>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData → objeto simples (ignora arquivos). */
export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
