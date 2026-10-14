/**
 * Diagnóstico preliminar: orientações gerais, nunca um diagnóstico definitivo.
 * As causas listadas são possibilidades comuns em sistemas de direção hidráulica
 * de veículos pesados e servem apenas para o cliente descrever melhor o problema.
 */

export const SYMPTOMS = [
  {
    id: "pesada",
    label: "Direção pesada",
    hint: "Exige mais força que o normal para esterçar.",
    possibilities: [
      "nível ou condição do fluido hidráulico",
      "desempenho da bomba hidráulica",
      "válvula de controle da caixa de direção",
      "correia ou acionamento da bomba",
    ],
  },
  {
    id: "vazamento",
    label: "Vazamento de óleo",
    hint: "Manchas de óleo sob o veículo ou componentes molhados.",
    possibilities: ["vedações e retentores", "mangueiras e conexões", "reservatório", "carcaça da caixa ou da bomba"],
  },
  {
    id: "ruido",
    label: "Ruídos ao esterçar",
    hint: "Chiado, zumbido ou estalos ao girar o volante.",
    possibilities: ["ar no sistema hidráulico", "nível de fluido baixo", "desgaste da bomba", "folgas em articulações"],
  },
  {
    id: "vibracao",
    label: "Vibração no volante",
    hint: "Trepidação sentida nas mãos.",
    possibilities: ["componentes de direção com folga", "terminais e barras", "balanceamento e alinhamento", "pressão irregular no sistema"],
  },
  {
    id: "folga",
    label: "Folga na direção",
    hint: "O volante gira um pouco sem que as rodas respondam.",
    possibilities: ["ajuste interno da caixa de direção", "barras e terminais", "coluna e cruzetas", "fixação da caixa no chassi"],
  },
  {
    id: "dificuldade",
    label: "Dificuldade para virar",
    hint: "Travamentos, pontos duros ou retorno irregular.",
    possibilities: ["mecanismo interno da caixa", "coluna de direção", "bomba hidráulica", "articulações e terminais"],
  },
  {
    id: "outros",
    label: "Outros sintomas",
    hint: "Descreva com suas palavras.",
    possibilities: [],
  },
] as const;

export type SymptomId = (typeof SYMPTOMS)[number]["id"];

export const SEVERE_FLAGS = [
  { id: "perda_controle", label: "Perdi o controle da direção ou ela travou em movimento" },
  { id: "vazamento_intenso", label: "Vazamento intenso (o óleo escorre ou pinga continuamente)" },
  { id: "direcao_solta", label: "A direção ficou solta / sem resposta" },
] as const;

export type SevereFlagId = (typeof SEVERE_FLAGS)[number]["id"];

export interface DiagnosisResult {
  severe: boolean;
  headline: string;
  message: string;
  possibilities: string[];
  safety: string | null;
  summary: string;
}

export function runPreliminaryDiagnosis(input: {
  symptoms: SymptomId[];
  severe: SevereFlagId[];
  vehicle?: string;
  notes?: string;
}): DiagnosisResult {
  const selected = SYMPTOMS.filter((s) => input.symptoms.includes(s.id));
  const possibilities = Array.from(new Set(selected.flatMap((s) => [...s.possibilities])));
  const severe = input.severe.length > 0;

  const safety = severe
    ? "Por segurança, não continue dirigindo o veículo. Estacione em local seguro e procure assistência profissional — se necessário, solicite guincho ou uma visita técnica."
    : null;

  const headline = severe
    ? "Atenção: sintoma potencialmente grave"
    : selected.length > 1
      ? "Esses sintomas merecem uma avaliação técnica"
      : "Esse sintoma merece uma avaliação técnica";

  const message =
    selected.length === 0 && !severe
      ? "Selecione os sintomas para receber orientações gerais."
      : "Esses sintomas podem estar relacionados a diferentes componentes do sistema hidráulico. Recomendamos uma avaliação técnica para identificar a causa. As possibilidades abaixo são apenas orientações gerais e não substituem o diagnóstico de um mecânico.";

  const lines = [
    input.vehicle ? `Veículo: ${input.vehicle}` : null,
    selected.length ? `Sintomas: ${selected.map((s) => s.label.toLowerCase()).join(", ")}` : null,
    severe
      ? `Sinais graves: ${input.severe
          .map((id) => SEVERE_FLAGS.find((f) => f.id === id)?.label.toLowerCase())
          .join("; ")}`
      : null,
    input.notes ? `Observações: ${input.notes}` : null,
  ].filter(Boolean);

  return {
    severe,
    headline,
    message,
    possibilities,
    safety,
    summary: lines.join("\n"),
  };
}
