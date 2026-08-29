"use client";

import { createFlowContext } from "@/lib/create-flow-context";

export type LoginFlowData = {
  email: string;
};

export const { Provider: LoginFlowProvider, useFlow: useLoginFlow } =
  createFlowContext<LoginFlowData>("castilho:login", { email: "" });
