"use client";

import { createFlowContext } from "@/lib/create-flow-context";
import type { CreateFazendaInput, DadosPecuaristaInput, Fazenda } from "@/lib/api/types";

/** Fazenda adicionada na etapa 2: nova (com o uuid que vira uuid_origem) ou já cadastrada. */
export type FazendaNoCadastro =
  | { tipo: "nova"; uuid: string; dados: CreateFazendaInput }
  | { tipo: "existente"; fazenda: Pick<Fazenda, "fazenda_id" | "nome_fazenda" | "municipio" | "inscricao_estadual"> };

export type PecuaristaFlowData = {
  /** Etapa 1 — guardados para voltar e editar sem perder o que foi digitado. */
  dados: DadosPecuaristaInput | null;
  /** Etapa 2 — pelo menos uma para concluir. */
  fazendas: FazendaNoCadastro[];
  /** Rota para onde voltar após o cadastro, quando iniciado a partir de outro fluxo (ex: assistente de negócio). */
  returnTo: string | null;
};

export const { Provider: PecuaristaFlowProvider, useFlow: usePecuaristaFlow } =
  createFlowContext<PecuaristaFlowData>("castilho:pecuarista-novo", {
    dados: null,
    fazendas: [],
    returnTo: null,
  });
