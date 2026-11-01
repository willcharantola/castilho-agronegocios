import { apiFetch } from "@/lib/api-client";
import { normalizeGado } from "@/lib/api/gados";
import type {
  AgregadosPeso,
  CreateLoteInput,
  Lote,
  LoteDetail,
  OrigemOffline,
  UpdateLoteInput,
} from "@/lib/api/types";

/** Decimal opcional da API → number; ausente → null. */
export function decimalOuNull(valor: number | string | null | undefined) {
  return valor === null || valor === undefined ? null : Number(valor);
}

/** Campos de AgregadosPeso (Decimal como string na API) → number | null. */
export function normalizeAgregadosPeso(raw: AgregadosPeso): AgregadosPeso {
  return {
    peso_total_quilos: decimalOuNull(raw.peso_total_quilos),
    peso_total_arroba: decimalOuNull(raw.peso_total_arroba),
    peso_medio_quilos: decimalOuNull(raw.peso_medio_quilos),
    peso_medio_arroba: decimalOuNull(raw.peso_medio_arroba),
    mais_pesado_quilos: decimalOuNull(raw.mais_pesado_quilos),
    mais_leve_quilos: decimalOuNull(raw.mais_leve_quilos),
    mais_pesado_arroba: decimalOuNull(raw.mais_pesado_arroba),
    mais_leve_arroba: decimalOuNull(raw.mais_leve_arroba),
    rendimento_medio: decimalOuNull(raw.rendimento_medio),
  };
}

/** Ver `gados.ts#normalizeGado` — mesma questão de Decimal-como-string. */
export function normalizeLote(raw: Lote): Lote {
  return {
    ...raw,
    ...normalizeAgregadosPeso(raw),
    valor_unidade: Number(raw.valor_unidade),
    rendimento_carcaca: Number(raw.rendimento_carcaca),
    valor_total_lote: Number(raw.valor_total_lote),
    valor_medio_cabeca_lote: decimalOuNull(raw.valor_medio_cabeca_lote),
  };
}

export function normalizeLoteDetail(raw: LoteDetail): LoteDetail {
  return { ...normalizeLote(raw), gados: (raw.gados ?? []).map(normalizeGado) };
}

export async function createLote(negocioId: number | string, input: CreateLoteInput & OrigemOffline) {
  const lote = await apiFetch<Lote>(`/negocios/${negocioId}/lotes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeLote(lote);
}

/** Mudar rendimento ou valor da unidade faz a API recalcular as cabeças, o lote e o negócio. */
export async function updateLote(id: number | string, input: UpdateLoteInput) {
  const lote = await apiFetch<Lote>(`/lotes/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalizeLote(lote);
}

/** A API responde 409 se o lote tiver cabeças pesadas. */
export async function deleteLote(id: number | string) {
  await apiFetch<Lote>(`/lotes/${id}`, { method: "DELETE" });
}
