import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type { TipoGadoCatalogo } from "@/lib/api/types";

/** Nomes sugeridos para os lotes, da empresa do usuário. Guardados para uso offline (só leitura). */
export function fetchTiposGado() {
  return comCache("tipos-gado", () => apiFetch<TipoGadoCatalogo[]>("/tipos-gado"));
}

/** Só Admin (Normal → 403). Nome repetido, ignorando maiúsculas → 409. */
export function createTipoGado(nome_gado: string) {
  return apiFetch<TipoGadoCatalogo>("/tipos-gado", { method: "POST", body: JSON.stringify({ nome_gado }) });
}

/** Renomear não altera os lotes que já usaram o nome. */
export function updateTipoGado(id: number, nome_gado: string) {
  return apiFetch<TipoGadoCatalogo>(`/tipos-gado/${id}`, { method: "PATCH", body: JSON.stringify({ nome_gado }) });
}

export function deleteTipoGado(id: number) {
  return apiFetch<TipoGadoCatalogo>(`/tipos-gado/${id}`, { method: "DELETE" });
}
