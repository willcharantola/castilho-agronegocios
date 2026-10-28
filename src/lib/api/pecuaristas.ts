import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type {
  CreatePecuaristaInput,
  FazendaDoPecuaristaInput,
  OrigemOffline,
  UpdatePecuaristaInput,
  Pecuarista,
} from "@/lib/api/types";

/**
 * GET /pecuaristas não aceita query params. Cada pecuarista vem com
 * `pecuarista_fazenda` (N:N) — para listar os pecuaristas de uma fazenda,
 * filtre no cliente com `v.pecuarista_fazenda?.some(a => a.fazenda_id === id)`.
 */
export function fetchPecuaristas() {
  return comCache("pecuaristas", () => apiFetch<Pecuarista[]>("/pecuaristas"));
}

export function fetchPecuarista(id: number | string) {
  return apiFetch<Pecuarista>(`/pecuaristas/${id}`);
}

/** Pecuarista e fazendas (novas ou já cadastradas) numa única transação. */
export function createPecuarista(input: CreatePecuaristaInput & OrigemOffline) {
  return apiFetch<Pecuarista>("/pecuaristas", { method: "POST", body: JSON.stringify(input) });
}

export function updatePecuarista(id: number | string, input: UpdatePecuaristaInput) {
  return apiFetch<Pecuarista>(`/pecuaristas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Cria uma fazenda nova já vinculada ao pecuarista, ou vincula uma existente. */
export function adicionarFazenda(pecuaristaId: number | string, fazenda: FazendaDoPecuaristaInput) {
  return apiFetch<Pecuarista>(`/pecuaristas/${pecuaristaId}/fazendas`, {
    method: "POST",
    body: JSON.stringify(fazenda),
  });
}

/** A API responde 409 se houver negócio do pecuarista com essa fazenda. */
export function desvincularFazenda(pecuaristaId: number | string, fazendaId: number) {
  return apiFetch<Pecuarista>(`/pecuaristas/${pecuaristaId}/fazendas/${fazendaId}`, { method: "DELETE" });
}
