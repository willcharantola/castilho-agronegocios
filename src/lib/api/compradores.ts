import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type {
  Comprador,
  CompradorDoNegocio,
  CreateCompradorInput,
  OrigemOffline,
  UpdateCompradorInput,
} from "@/lib/api/types";

export function fetchCompradores() {
  return comCache("compradores", () => apiFetch<Comprador[]>("/compradores"));
}

/**
 * Frigoríficos e pecuaristas juntos (GET /compradores/opcoes), em ordem alfabética.
 * A tela do novo negócio monta a mesma lista no aparelho para incluir os cadastros
 * pendentes; esta busca serve às telas só online.
 */
export function fetchOpcoesComprador(busca?: string) {
  const qs = busca ? `?${new URLSearchParams({ busca }).toString()}` : "";
  return apiFetch<{ itens: CompradorDoNegocio[]; total: number }>(`/compradores/opcoes${qs}`);
}

export function fetchComprador(id: number | string) {
  return apiFetch<Comprador>(`/compradores/${id}`);
}

export function createComprador(input: CreateCompradorInput & OrigemOffline) {
  return apiFetch<Comprador>("/compradores", { method: "POST", body: JSON.stringify(input) });
}

export function updateComprador(id: number | string, input: UpdateCompradorInput) {
  return apiFetch<Comprador>(`/compradores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** A API recusa (409) enquanto houver negócios ligados. */
export function deleteComprador(id: number | string) {
  return apiFetch<Comprador>(`/compradores/${id}`, { method: "DELETE" });
}
