"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { Modalidade, RendimentosNegocio, TipoGado, TipoLote, TipoNegocio } from "@/lib/api/types";

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
  tipoLote: TipoLote | "";
  tipoNegocio: TipoNegocio | "";
  /** Texto livre (ex.: "8,9 e 10"). */
  mediaCarimbo: string;
  valorUnidade: number | null;
  /** Percentual (0 a 100). */
  porcentagemComissao: number | null;
  /** yyyy-mm-dd vindo de um <input type="date">. */
  dataNegocio: string;
  observacao: string;
  /** Rendimentos por categoria — só na modalidade "arroba" (tela /negocios/novo/rendimentos). */
  rendimentos: RendimentosNegocio | null;
  /** Setado assim que POST /negocios é bem-sucedido — a partir daí o negócio já existe de verdade. */
  negocioId: number | null;
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
    tipoLote: "",
    tipoNegocio: "",
    mediaCarimbo: "",
    valorUnidade: null,
    porcentagemComissao: null,
    dataNegocio: "",
    observacao: "",
    rendimentos: null,
    negocioId: null,
  });
