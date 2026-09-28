"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { Modalidade, TipoGado, TipoLote } from "@/lib/api/types";

export type NegocioFlowData = {
  fazendaId: number | null;
  fazendaNome: string;
  vendedorId: number | null;
  compradorId: number | null;
  compradorNome: string;
  modalidade: Modalidade | "";
  tipoGado: TipoGado | "";
  tipoLote: TipoLote | "";
  tipoPrecificacao: string;
  valorUnidade: number | null;
  /** HH:mm vindo de um <input type="time">. */
  horaInicioPesagem: string;
  horaFimPesagem: string;
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
    compradorId: null,
    compradorNome: "",
    modalidade: "",
    tipoGado: "",
    tipoLote: "",
    tipoPrecificacao: "",
    valorUnidade: null,
    horaInicioPesagem: "",
    horaFimPesagem: "",
    comissao: null,
    dataNegocio: "",
    observacao: "",
    negocioId: null,
  });
