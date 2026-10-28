import type { Modalidade, RacaRendimento, RendimentosNegocio, TipoGado, TipoLote, TipoNegocio } from "@/lib/api/types";

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  arroba: "Por @/RC",
  cabeca: "Por Cabeça",
  kg: "Por Kg",
};

export const TIPO_GADO_LABELS: Record<TipoGado, string> = {
  Gordo: "Gordo",
  Reposicao: "Reposição",
};

export const TIPO_NEGOCIO_LABELS: Record<TipoNegocio, string> = {
  "Desconto em folha": "Desconto em folha",
  Livre: "Livre",
  Funrural: "Funrural",
};

/** Na ordem dos botões do cadastro de cabeça. */
export const RACAS_RENDIMENTO: RacaRendimento[] = ["Nelore", "Anelorado", "Angus", "Composto"];

/** Campo do negócio com o percentual de rendimento de cada categoria. */
export const CAMPO_RENDIMENTO: Record<RacaRendimento, keyof RendimentosNegocio> = {
  Nelore: "porcentagem_rendimento_nelore",
  Anelorado: "porcentagem_rendimento_anelorado",
  Angus: "porcentagem_rendimento_angus",
  Composto: "porcentagem_rendimento_composto",
};

export const TIPO_LOTE_LABELS: Record<TipoLote, string> = {
  Vaca: "Vaca",
  Boi: "Boi",
  Novilha: "Novilha",
  Garrote: "Garrote",
  Bezerro: "Bezerro",
  Variados: "Variados",
};

export const FISICO_JURIDICO_LABELS: Record<"fisico" | "juridico", string> = {
  fisico: "Pessoa Física",
  juridico: "Pessoa Jurídica",
};
