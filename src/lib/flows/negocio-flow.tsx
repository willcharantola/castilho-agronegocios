"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { Modalidade, TipoGado, TipoNegocio } from "@/lib/api/types";

/**
 * Fluxo do novo negócio: pecuarista → fazenda → comprador → modalidade → informações →
 * lotes ("arroba"/"kg") ou lote único ("cabeca") → pesagem (exceto "cabeca") → revisão.
 */
export type NegocioFlowData = {
  pecuaristaId: number | null;
  pecuaristaNome: string;
  /** Só fazendas vinculadas ao pecuarista escolhido; trocar o pecuarista limpa a fazenda. */
  fazendaId: number | null;
  fazendaNome: string;
  compradorId: number | null;
  compradorNome: string;
  modalidade: Modalidade | "";
  tipoGado: TipoGado | "";
  tipoNegocio: TipoNegocio | "";
  /** Percentual (0 a 100). */
  porcentagemComissao: number | null;
  /** yyyy-mm-dd vindo de um <input type="date">. */
  dataNegocio: string;
  observacao: string;
  /** Setado assim que POST /negocios é bem-sucedido (negativo se ficou na fila offline). */
  negocioId: number | null;
  /** Último lote usado na pesagem — fica pré-selecionado na próxima cabeça. */
  ultimoLoteId: number | null;
};

export const { Provider: NegocioFlowProvider, useFlow: useNegocioFlow } =
  createFlowContext<NegocioFlowData>("castilho:negocio-novo", {
    pecuaristaId: null,
    pecuaristaNome: "",
    fazendaId: null,
    fazendaNome: "",
    compradorId: null,
    compradorNome: "",
    modalidade: "",
    tipoGado: "",
    tipoNegocio: "",
    porcentagemComissao: null,
    dataNegocio: "",
    observacao: "",
    negocioId: null,
    ultimoLoteId: null,
  });

/** Total de passos da barra de progresso do novo negócio. */
export const PASSOS_NOVO_NEGOCIO = 8;
