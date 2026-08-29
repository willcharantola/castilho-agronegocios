"use client";

import { createFlowContext } from "@/lib/create-flow-context";

export type RecuperarSenhaFlowData = {
  email: string;
  codigo: string;
};

export const { Provider: RecuperarSenhaFlowProvider, useFlow: useRecuperarSenhaFlow } =
  createFlowContext<RecuperarSenhaFlowData>("castilho:recuperar-senha", {
    email: "",
    codigo: "",
  });
