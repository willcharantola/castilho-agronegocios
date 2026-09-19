import type { Modalidade, TipoGado, TipoLote } from "@/lib/api/types";

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  arroba: "Por @/RC",
  cabeca: "Por Cabeça",
  kg: "Por Kg",
};

export const TIPO_GADO_LABELS: Record<TipoGado, string> = {
  Gordo: "Gordo",
  Magro: "Magro",
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
