import { apiFetch } from "@/lib/api-client";
import type { CreateFazendaInput, Fazenda, UpdateFazendaInput } from "@/lib/api/types";

export function fetchFazendas() {
  return apiFetch<Fazenda[]>("/fazendas");
}

export function fetchFazenda(id: number | string) {
  return apiFetch<Fazenda>(`/fazendas/${id}`);
}

export function createFazenda(input: CreateFazendaInput) {
  return apiFetch<Fazenda>("/fazendas", { method: "POST", body: JSON.stringify(input) });
}

export function updateFazenda(id: number | string, input: UpdateFazendaInput) {
  return apiFetch<Fazenda>(`/fazendas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
