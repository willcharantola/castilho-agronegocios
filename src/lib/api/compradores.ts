import { apiFetch } from "@/lib/api-client";
import type { Comprador, CreateCompradorInput, UpdateCompradorInput } from "@/lib/api/types";

export function fetchCompradores() {
  return apiFetch<Comprador[]>("/compradores");
}

export function fetchComprador(id: number | string) {
  return apiFetch<Comprador>(`/compradores/${id}`);
}

export function createComprador(input: CreateCompradorInput) {
  return apiFetch<Comprador>("/compradores", { method: "POST", body: JSON.stringify(input) });
}

export function updateComprador(id: number | string, input: UpdateCompradorInput) {
  return apiFetch<Comprador>(`/compradores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
