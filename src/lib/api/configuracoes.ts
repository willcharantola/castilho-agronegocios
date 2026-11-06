import { apiFetch } from "@/lib/api-client";
import type { DadosEmpresa, Impostos } from "@/lib/api/types";
import { comCache } from "@/lib/offline/cache";

/** Alíquotas de Funrural e Senar da empresa do usuário logado. */
export function fetchImpostos() {
  return comCache("impostos", () => apiFetch<Impostos>("/configuracoes/impostos"));
}

/** Só Admin (a API responde 403 aos demais). Vale para os negócios criados depois. */
export function updateImpostos(input: Impostos) {
  return apiFetch<Impostos>("/configuracoes/impostos", { method: "PATCH", body: JSON.stringify(input) });
}

/** Nome, CNPJ, CRECI e dados bancários da empresa do usuário logado. */
export function fetchDadosEmpresa() {
  return comCache("dados-empresa", () => apiFetch<DadosEmpresa>("/configuracoes/empresa"));
}

/** Só Admin (a API responde 403 aos demais). */
export function updateDadosEmpresa(input: DadosEmpresa) {
  return apiFetch<DadosEmpresa>("/configuracoes/empresa", { method: "PATCH", body: JSON.stringify(input) });
}
