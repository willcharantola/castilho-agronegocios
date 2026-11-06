import type { Genero, Modalidade, TipoComprador, TipoGado, TipoLote, TipoNegocio } from "@/lib/api/types";

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  arroba: "Por @/RC",
  cabeca: "Por Cabeça",
  kg: "Por Kg",
};

/** Rótulo do valor da unidade do negócio, conforme a modalidade. */
export const VALOR_UNIDADE_LABELS: Record<Modalidade, string> = {
  arroba: "Valor por arroba",
  kg: "Valor por kg",
  cabeca: "Valor por cabeça",
};

/** Rótulo discreto que distingue a origem do comprador. */
export const TIPO_COMPRADOR_LABELS: Record<TipoComprador, string> = {
  frigorifico: "Frigorífico",
  pecuarista: "Pecuarista",
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

export const TIPO_LOTE_LABELS: Record<TipoLote, string> = {
  Vaca: "Vaca",
  Boi: "Boi",
  Novilha: "Novilha",
  Garrote: "Garrote",
  Bezerro: "Bezerro",
  Variados: "Variados",
};

/** O banco grava sem acento ("Femea"). */
export const GENERO_LABELS: Record<Genero, string> = {
  Macho: "Macho",
  Femea: "Fêmea",
};

export const FISICO_JURIDICO_LABELS: Record<"fisico" | "juridico", string> = {
  fisico: "Pessoa Física",
  juridico: "Pessoa Jurídica",
};
