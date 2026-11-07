import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type { CreateFazendaInput, Fazenda, OrigemOffline, UpdateFazendaInput } from "@/lib/api/types";

/** Sem rede, devolve a última lista salva no aparelho (ver lib/offline/cache). */
export function fetchFazendas() {
  return comCache("fazendas", () => apiFetch<Fazenda[]>("/fazendas"));
}

export function fetchFazenda(id: number | string) {
  return apiFetch<Fazenda>(`/fazendas/${id}`);
}

export function createFazenda(input: CreateFazendaInput & OrigemOffline) {
  return apiFetch<Fazenda>("/fazendas", { method: "POST", body: JSON.stringify(input) });
}

export function updateFazenda(id: number | string, input: UpdateFazendaInput) {
  return apiFetch<Fazenda>(`/fazendas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** A API recusa (409) enquanto houver negócios ligados. */
export function deleteFazenda(id: number | string) {
  return apiFetch<Fazenda>(`/fazendas/${id}`, { method: "DELETE" });
}

/** Link completo por trás de um link curto do Google Maps (a API segue o redirecionamento); null se não conseguir. */
export async function expandirLinkMapa(link: string) {
  const { link: completo } = await apiFetch<{ link: string | null }>(
    `/fazendas/mapa/expandir?link=${encodeURIComponent(link)}`
  );
  return completo;
}
