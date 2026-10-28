import { apiFetch } from "@/lib/api-client";
import type { Impostos } from "@/lib/api/types";
import { comCache } from "@/lib/offline/cache";

/** Alíquotas de Funrural e Senar da empresa do usuário logado. */
export function fetchImpostos() {
  return comCache("impostos", () => apiFetch<Impostos>("/configuracoes/impostos"));
}

/** Só Admin (a API responde 403 aos demais). Vale para os negócios criados depois. */
export function updateImpostos(input: Impostos) {
  return apiFetch<Impostos>("/configuracoes/impostos", { method: "PATCH", body: JSON.stringify(input) });
}
