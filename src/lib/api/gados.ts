import { apiFetch } from "@/lib/api-client";
import type { CreateGadoOfflineInput, Gado, UpdateGadoInput } from "@/lib/api/types";

/**
 * A API serializa colunas Decimal/Numeric do Postgres como STRING no JSON
 * (confirmado batendo direto em /negocios — ex: "comissao": "6500"), mesmo
 * as colunas Int vindo como number de verdade. Normalizamos aqui pra todo
 * consumidor já receber `number` de verdade — sem isso, somas viram
 * concatenação de string (`0 + "6500"` = `"06500"`) e `toLocaleString`
 * de moeda silenciosamente vira no-op em cima de uma string.
 */
export function normalizeGado(raw: Gado): Gado {
  return {
    ...raw,
    peso_total: Number(raw.peso_total),
    peso_calculo: Number(raw.peso_calculo),
    peso_arroba: Number(raw.peso_arroba),
    valor_total: raw.valor_total === null ? null : Number(raw.valor_total),
  };
}

export async function createGado(input: CreateGadoOfflineInput) {
  const gado = await apiFetch<Gado>("/gados", { method: "POST", body: JSON.stringify(input) });
  return normalizeGado(gado);
}

/**
 * A API recalcula peso_calculo/peso_arroba/valor_total e os agregados do lote e do
 * negócio. Trocar `lote_id` move a cabeça (só para lote do mesmo negócio).
 */
export async function updateGado(id: number | string, input: UpdateGadoInput) {
  const gado = await apiFetch<Gado>(`/gados/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalizeGado(gado);
}

export async function deleteGado(id: number | string) {
  await apiFetch<Gado>(`/gados/${id}`, { method: "DELETE" });
}
