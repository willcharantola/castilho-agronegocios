"use client";

import { createFlowContext } from "@/lib/create-flow-context";

export type CadastroFlowData = {
  nome: string;
  sobrenome: string;
  email: string;
};

export const { Provider: CadastroFlowProvider, useFlow: useCadastroFlow } =
  createFlowContext<CadastroFlowData>("castilho:cadastro", {
    nome: "",
    sobrenome: "",
    email: "",
  });
