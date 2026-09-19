"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { Modalidade, TipoGado, TipoLote } from "@/lib/api/types";

export type NegocioFlowData = {
  fazendaId: number | null;
  fazendaNome: string;
  vendedorId: number | null;
  marchante: string;
  comprador: string;
  modalidade: Modalidade | "";
  tipoGado: TipoGado | "";
  tipoLote: TipoLote | "";
  tipoPrecificacao: string;
  rendimentoCarcaca: number | null;
  valorArroba: number | null;
  comissao: number | null;
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
    marchante: "",
    comprador: "",
    modalidade: "",
    tipoGado: "",
    tipoLote: "",
    tipoPrecificacao: "",
    rendimentoCarcaca: null,
    valorArroba: null,
    comissao: null,
    dataNegocio: "",
    observacao: "",
    negocioId: null,
  });
