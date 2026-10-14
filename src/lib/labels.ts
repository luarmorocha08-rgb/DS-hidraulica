import type { AppointmentStatus, QuoteStatus, VisitStatus } from "@/db/schema";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone; customer: string }> = {
  pending: {
    label: "Aguardando confirmação",
    tone: "warning",
    customer: "Recebemos sua solicitação. O horário está reservado e aguarda confirmação da equipe.",
  },
  confirmed: { label: "Confirmado", tone: "success", customer: "Seu atendimento está confirmado." },
  rejected: {
    label: "Não aprovado",
    tone: "danger",
    customer: "Não foi possível aprovar este horário. Escolha outra data ou fale conosco.",
  },
  cancelled: { label: "Cancelado", tone: "muted", customer: "Este agendamento foi cancelado." },
  completed: { label: "Concluído", tone: "info", customer: "Atendimento concluído. Obrigado pela confiança!" },
  no_show: { label: "Não compareceu", tone: "muted", customer: "O atendimento não foi realizado." },
};

export const VISIT_STATUS: Record<VisitStatus, { label: string; tone: Tone }> = {
  received: { label: "Recebida", tone: "info" },
  in_review: { label: "Em análise", tone: "warning" },
  awaiting_confirmation: { label: "Aguardando confirmação", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  in_progress: { label: "Em atendimento", tone: "info" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "muted" },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  new: { label: "Novo orçamento", tone: "info" },
  in_review: { label: "Em análise", tone: "warning" },
  pending_info: { label: "Informações pendentes", tone: "warning" },
  sent: { label: "Orçamento enviado", tone: "info" },
  approved: { label: "Aprovado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
  finished: { label: "Finalizado", tone: "muted" },
};

export type Tone = "success" | "warning" | "danger" | "info" | "muted";

export const MODALITY_LABEL = { workshop: "Atendimento na oficina", onsite: "Visita ao local" } as const;

export const VEHICLE_TYPES = [
  { value: "caminhao", label: "Caminhão" },
  { value: "onibus", label: "Ônibus" },
  { value: "utilitario", label: "Utilitário / van" },
  { value: "maquina", label: "Máquina / implemento" },
  { value: "outro", label: "Outro" },
] as const;

export const VEHICLE_TYPE_LABEL = Object.fromEntries(VEHICLE_TYPES.map((v) => [v.value, v.label])) as Record<
  (typeof VEHICLE_TYPES)[number]["value"],
  string
>;

export const URGENCY = [
  { value: "low", label: "Sem pressa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta — veículo com restrição" },
  { value: "urgent", label: "Urgente — veículo parado" },
] as const;

export const URGENCY_LABEL = Object.fromEntries(URGENCY.map((u) => [u.value, u.label])) as Record<
  (typeof URGENCY)[number]["value"],
  string
>;

export const GALLERY_CATEGORIES = [
  { value: "caixas", label: "Caixas de direção" },
  { value: "bombas", label: "Bombas hidráulicas" },
  { value: "caminhoes", label: "Caminhões" },
  { value: "componentes", label: "Componentes" },
  { value: "oficina", label: "Oficina" },
  { value: "antes_depois", label: "Antes e depois" },
] as const;

export const VISIT_PERIODS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "qualquer", label: "Qualquer horário" },
] as const;

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
