"use client";

import { createFlowContext } from "@/lib/create-flow-context";

export type Modalidade = "arroba" | "cabeca" | "kg";

export type NegocioFlowData = {
  vendedor: string;
  fazenda: string;
  rendimentoCarcaca: number | null;
  modalidade: Modalidade | "";
  valorArroba: number | null;
};

export type GadoEntry = {
  id: string;
  denominacao: string;
  genero: "Macho" | "Fêmea" | "";
  valor: number | null;
  pesoTotal: number | null;
  pesoCalculo: number | null;
  pesoArroba: number;
  valorTotal: number;
};

export type NegocioFlowFullData = NegocioFlowData & {
  gados: GadoEntry[];
};

export const { Provider: NegocioFlowProvider, useFlow: useNegocioFlow } =
  createFlowContext<NegocioFlowFullData>("castilho:negocio-novo", {
    vendedor: "",
    fazenda: "",
    rendimentoCarcaca: null,
    modalidade: "",
    valorArroba: null,
    gados: [],
  });

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  arroba: "Por @/RC",
  cabeca: "Por Cabeça",
  kg: "Por Kg",
};
