"use client";

import { createFlowContext } from "@/lib/create-flow-context";

export type PecuaristaFlowData = {
  fazendaId: number | null;
  fazendaNome: string;
  /** Rota para onde voltar após o cadastro, quando iniciado a partir de outro fluxo (ex: assistente de negócio). */
  returnTo: string | null;
};

export const { Provider: PecuaristaFlowProvider, useFlow: usePecuaristaFlow } =
  createFlowContext<PecuaristaFlowData>("castilho:pecuarista-novo", {
    fazendaId: null,
    fazendaNome: "",
    returnTo: null,
  });
