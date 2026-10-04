"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { Modalidade, TipoGado, TipoLote } from "@/lib/api/types";

export type NegocioFlowData = {
  fazendaId: number | null;
  fazendaNome: string;
  vendedorId: number | null;
  vendedorNome: string;
  compradorId: number | null;
  compradorNome: string;
  modalidade: Modalidade | "";
  tipoGado: TipoGado | "";
  tipoLote: TipoLote | "";
  valorUnidade: number | null;
  /** Percentual (0 a 100). */
  porcentagemComissao: number | null;
  /** yyyy-mm-dd vindo de um <input type="date">. */
  dataNegocio: string;
  observacao: string;
  /** Setado assim que POST /negocios é bem-sucedido — a partir daí o negócio já existe de verdade. */
  negocioId: number | null;
};

export const { Provider: NegocioFlowProvider, useFlow: useNegocioFlow } =
  createFlowContext<NegocioFlowData>("castilho:negocio-novo", {
    fazendaId: null,
    fazendaNome: "",
    vendedorId: null,
    vendedorNome: "",
    compradorId: null,
    compradorNome: "",
    modalidade: "",
    tipoGado: "",
    tipoLote: "",
    valorUnidade: null,
    porcentagemComissao: null,
    dataNegocio: "",
    observacao: "",
    negocioId: null,
  });
