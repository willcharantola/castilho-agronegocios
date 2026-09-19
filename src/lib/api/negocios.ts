import { apiFetch } from "@/lib/api-client";
import { normalizeGado } from "@/lib/api/gados";
import type { CreateNegocioInput, Negocio, NegocioDetail } from "@/lib/api/types";

/** Ver comentário em `gados.ts#normalizeGado` — mesma questão de Decimal-como-string. */
function normalizeNegocio(raw: Negocio): Negocio {
  return {
    ...raw,
    valor_total: raw.valor_total === null ? null : Number(raw.valor_total),
    valor_medio: raw.valor_medio === null ? null : Number(raw.valor_medio),
    rendimento_carcaca: Number(raw.rendimento_carcaca),
    mais_pesado: raw.mais_pesado === null ? null : Number(raw.mais_pesado),
    mais_leve: raw.mais_leve === null ? null : Number(raw.mais_leve),
    comissao: Number(raw.comissao),
    valor_arroba: Number(raw.valor_arroba),
  };
}

export async function fetchNegocios(params?: {
  fazenda_id?: number;
  data_inicio?: string;
  data_fim?: string;
}) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined);
  const qs = entries.length > 0
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`
    : "";
  const negocios = await apiFetch<Negocio[]>(`/negocios${qs}`);
  return negocios.map(normalizeNegocio);
}

export async function fetchNegocio(id: number | string) {
  const negocio = await apiFetch<NegocioDetail>(`/negocios/${id}`);
  return { ...normalizeNegocio(negocio), gados: negocio.gados.map(normalizeGado) };
}

export async function createNegocio(input: CreateNegocioInput) {
  const negocio = await apiFetch<Negocio>("/negocios", { method: "POST", body: JSON.stringify(input) });
  return normalizeNegocio(negocio);
}
