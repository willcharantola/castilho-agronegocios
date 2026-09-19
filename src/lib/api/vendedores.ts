import { apiFetch } from "@/lib/api-client";
import type { CreateVendedorInput, UpdateVendedorInput, Vendedor } from "@/lib/api/types";

/**
 * GET /vendedores não aceita nenhum query param (confirmado no Swagger ao
 * vivo) — para listar os vendedores de uma fazenda, busque todos e filtre
 * o array no cliente (`v => v.fazenda_id === fazendaId`). Não existe um
 * `?fazenda_id=` para adicionar aqui.
 */
export function fetchVendedores() {
  return apiFetch<Vendedor[]>("/vendedores");
}

export function fetchVendedor(id: number | string) {
  return apiFetch<Vendedor>(`/vendedores/${id}`);
}

export function createVendedor(input: CreateVendedorInput) {
  return apiFetch<Vendedor>("/vendedores", { method: "POST", body: JSON.stringify(input) });
}

export function updateVendedor(id: number | string, input: UpdateVendedorInput) {
  return apiFetch<Vendedor>(`/vendedores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
