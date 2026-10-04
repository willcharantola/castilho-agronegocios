import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type { CreateVendedorInput, OrigemOffline, UpdateVendedorInput, Vendedor } from "@/lib/api/types";

/**
 * GET /vendedores não aceita query params. Cada vendedor vem com
 * `vendedor_fazenda` (N:N) — para listar os vendedores de uma fazenda,
 * filtre no cliente com `v.vendedor_fazenda?.some(a => a.fazenda_id === id)`.
 */
export function fetchVendedores() {
  return comCache("vendedores", () => apiFetch<Vendedor[]>("/vendedores"));
}

export function fetchVendedor(id: number | string) {
  return apiFetch<Vendedor>(`/vendedores/${id}`);
}

export function createVendedor(input: CreateVendedorInput & OrigemOffline) {
  return apiFetch<Vendedor>("/vendedores", { method: "POST", body: JSON.stringify(input) });
}

export function updateVendedor(id: number | string, input: UpdateVendedorInput) {
  return apiFetch<Vendedor>(`/vendedores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
