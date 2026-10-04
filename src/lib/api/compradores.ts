import { apiFetch } from "@/lib/api-client";
import { comCache } from "@/lib/offline/cache";
import type { Comprador, CreateCompradorInput, OrigemOffline, UpdateCompradorInput } from "@/lib/api/types";

export function fetchCompradores() {
  return comCache("compradores", () => apiFetch<Comprador[]>("/compradores"));
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
