/**
 * Conteúdo inicial. Os serviços são SUGESTÕES do briefing e entram com
 * `reviewed = false` até a DS Hidráulica confirmar cada um no painel.
 */
export const SEED_SERVICES = [
  {
    slug: "manutencao-caixa-de-direcao-hidraulica",
    name: "Manutenção de caixas de direção hidráulica",
    icon: "steering",
    shortDescription: "Diagnóstico, reparo e recondicionamento da caixa de direção.",
    description:
      "Desmontagem técnica, inspeção dos componentes internos, substituição de vedações e peças desgastadas, montagem e teste da caixa de direção hidráulica de caminhões e ônibus.",
    benefits: ["Direção leve e precisa", "Fim de vazamentos internos e externos", "Mais segurança na estrada"],
    symptoms: ["Direção pesada", "Folga no volante", "Vazamento na caixa", "Retorno irregular"],
  },
  {
    slug: "diagnostico-de-sistemas-de-direcao",
    name: "Diagnóstico de sistemas de direção",
    icon: "gauge",
    shortDescription: "Avaliação completa para identificar a causa do problema.",
    description:
      "Avaliação do conjunto de direção — bomba, caixa, mangueiras, coluna e articulações — para identificar a origem do sintoma antes de qualquer troca de peça.",
    benefits: ["Evita troca desnecessária de peças", "Orçamento baseado na causa real", "Relatório claro do que foi encontrado"],
    symptoms: ["Ruídos ao esterçar", "Vibração", "Direção dura em manobras"],
  },
  {
    slug: "manutencao-bomba-hidraulica",
    name: "Manutenção de bombas hidráulicas",
    icon: "pump",
    shortDescription: "Reparo e teste da bomba de direção.",
    description:
      "Revisão da bomba hidráulica da direção: verificação de vazão e pressão, substituição de componentes internos e vedações, montagem e teste.",
    benefits: ["Pressão correta no sistema", "Menos ruído", "Maior vida útil do conjunto"],
    symptoms: ["Chiado ao esterçar", "Direção pesada em baixa rotação", "Espuma no reservatório"],
  },
  {
    slug: "reparo-mangueiras-hidraulicas",
    name: "Reparos em mangueiras hidráulicas",
    icon: "hose",
    shortDescription: "Fabricação, prensagem e troca de mangueiras.",
    description:
      "Substituição e fabricação de mangueiras de pressão e retorno do sistema de direção, com terminais e conexões adequados à aplicação.",
    benefits: ["Fim de vazamentos", "Mangueiras dimensionadas para a pressão de trabalho", "Conexões seguras"],
    symptoms: ["Óleo nas mangueiras", "Mangueira ressecada ou estufada", "Perda de fluido"],
  },
  {
    slug: "inspecao-componentes-de-direcao",
    name: "Inspeção de componentes de direção",
    icon: "search",
    shortDescription: "Checagem preventiva de todo o conjunto.",
    description:
      "Inspeção visual e funcional de terminais, barras, coluna, fixações e componentes hidráulicos, com indicação do que precisa de atenção.",
    benefits: ["Previne paradas inesperadas", "Identifica desgaste no início", "Mais segurança"],
    symptoms: ["Revisão periódica", "Antes de viagens longas"],
  },
  {
    slug: "substituicao-componentes-hidraulicos",
    name: "Substituição de componentes hidráulicos",
    icon: "cog",
    shortDescription: "Troca de peças com montagem e teste.",
    description:
      "Substituição de componentes do sistema de direção hidráulica — reservatório, filtros, válvulas, vedações e conexões — com montagem e teste de funcionamento.",
    benefits: ["Peças adequadas à aplicação", "Montagem correta", "Teste após o serviço"],
    symptoms: ["Componente danificado", "Vazamento localizado"],
  },
  {
    slug: "manutencao-preventiva-direcao",
    name: "Manutenção preventiva",
    icon: "shield",
    shortDescription: "Plano de cuidados para frota e autônomos.",
    description:
      "Troca de fluido, verificação de filtros, mangueiras, bomba e caixa de direção em intervalos programados, reduzindo o risco de quebra.",
    benefits: ["Menos tempo parado", "Custo previsível", "Maior vida útil dos componentes"],
    symptoms: ["Fluido escurecido", "Quilometragem de revisão"],
  },
  {
    slug: "avaliacao-vazamentos-hidraulicos",
    name: "Avaliação de vazamentos hidráulicos",
    icon: "droplet",
    shortDescription: "Localização da origem do vazamento.",
    description:
      "Limpeza, inspeção e teste para localizar a origem exata do vazamento — retentores, conexões, mangueiras, bomba ou caixa.",
    benefits: ["Reparo direto no ponto certo", "Evita perda de fluido e contaminação", "Previne danos à bomba"],
    symptoms: ["Manchas de óleo no chão", "Nível do reservatório baixando"],
  },
  {
    slug: "atendimento-caminhoes-e-onibus",
    name: "Atendimento para caminhões e ônibus",
    icon: "truck",
    shortDescription: "Especialização em veículos pesados.",
    description:
      "Atendimento dedicado a caminhões, ônibus e veículos pesados, com conhecimento dos sistemas de direção usados nessas aplicações.",
    benefits: ["Equipe especializada em pesados", "Atendimento na oficina ou no local", "Agendamento online"],
    symptoms: [],
  },
  {
    slug: "avaliacao-barras-e-colunas-de-direcao",
    name: "Avaliação de barras e colunas de direção",
    icon: "link",
    shortDescription: "Barra curta, barra longa, terminais e coluna.",
    description:
      "Verificação de folgas e desgaste em barra curta, barra longa, terminais, coluna e cruzetas, com indicação de manutenção ou troca.",
    benefits: ["Direção firme e sem folgas", "Desgaste uniforme dos pneus", "Mais controle do veículo"],
    symptoms: ["Folga na direção", "Volante desalinhado", "Barulho em buracos"],
  },
] as const;

export const SEED_BOOKING_TYPES = [
  { slug: "diagnostico", name: "Diagnóstico", description: "Avaliação para identificar a causa do problema.", durationMinutes: 60, allowWorkshop: true, allowOnsite: true },
  { slug: "manutencao", name: "Manutenção", description: "Serviço de manutenção já combinado ou recomendado.", durationMinutes: 120, allowWorkshop: true, allowOnsite: false },
  { slug: "avaliacao-tecnica", name: "Avaliação técnica", description: "Inspeção do sistema de direção.", durationMinutes: 60, allowWorkshop: true, allowOnsite: true },
  { slug: "atendimento-no-local", name: "Atendimento no local", description: "A equipe vai até o veículo (sujeito à área atendida).", durationMinutes: 120, allowWorkshop: false, allowOnsite: true },
  { slug: "outro", name: "Outro serviço", description: "Descreva o que precisa.", durationMinutes: 60, allowWorkshop: true, allowOnsite: true },
] as const;

/** Horário padrão até a empresa configurar o real (seg–sex 8h–18h, almoço 12h–13h; sáb 8h–12h). */
export const SEED_BUSINESS_HOURS = [
  { weekday: 0, isOpen: false, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
  { weekday: 1, isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { weekday: 2, isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { weekday: 3, isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { weekday: 4, isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { weekday: 5, isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { weekday: 6, isOpen: true, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
];
