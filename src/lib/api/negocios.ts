import { apiFetch } from "@/lib/api-client";
import { normalizeGado } from "@/lib/api/gados";
import { comCache } from "@/lib/offline/cache";
import type { CreateNegocioInput, Negocio, NegocioDetail, OrigemOffline, UpdateNegocioInput } from "@/lib/api/types";

/** Decimal opcional da API → number; ausente (ex.: listagem, cache antigo) → null. */
function decimalOuNull(valor: number | string | null | undefined) {
  return valor === null || valor === undefined ? null : Number(valor);
}

/** Ver comentário em `gados.ts#normalizeGado` — mesma questão de Decimal-como-string. */
function normalizeNegocio(raw: Negocio): Negocio {
  return {
    ...raw,
    valor_total: raw.valor_total === null ? null : Number(raw.valor_total),
    valor_medio: raw.valor_medio === null ? null : Number(raw.valor_medio),
    mais_pesado: raw.mais_pesado === null ? null : Number(raw.mais_pesado),
    mais_leve: raw.mais_leve === null ? null : Number(raw.mais_leve),
    porcentagem_comissao: raw.porcentagem_comissao === null ? null : Number(raw.porcentagem_comissao),
    comissao: raw.comissao === null ? null : Number(raw.comissao),
    valor_unidade: Number(raw.valor_unidade),
    peso_total_quilos: decimalOuNull(raw.peso_total_quilos),
    peso_total_arroba: decimalOuNull(raw.peso_total_arroba),
    rendimento_medio: decimalOuNull(raw.rendimento_medio),
    peso_medio_arroba: decimalOuNull(raw.peso_medio_arroba),
    peso_medio_quilos: decimalOuNull(raw.peso_medio_quilos),
    funrural: decimalOuNull(raw.funrural),
    senar: decimalOuNull(raw.senar),
    aliquota_funrural: decimalOuNull(raw.aliquota_funrural),
    aliquota_senar: decimalOuNull(raw.aliquota_senar),
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
  const negocios = await comCache(`negocios${qs}`, () => apiFetch<Negocio[]>(`/negocios${qs}`));
  return negocios.map(normalizeNegocio);
}

export async function fetchNegocio(id: number | string) {
  const negocio = await comCache(`negocio:${id}`, () => apiFetch<NegocioDetail>(`/negocios/${id}`));
  return { ...negocio, ...normalizeNegocio(negocio), gados: negocio.gados.map(normalizeGado) };
}

export async function createNegocio(input: CreateNegocioInput & OrigemOffline) {
  const negocio = await apiFetch<Negocio>("/negocios", { method: "POST", body: JSON.stringify(input) });
  return normalizeNegocio(negocio);
}

/**
 * Finaliza o cadastro: a API registra hora_fim_pesagem com o horário do servidor, ou com
 * `horaFim` (hora local do aparelho, "HH:mm:ss") quando vem da fila offline.
 */
export async function concluirNegocio(id: number | string, horaFim?: string) {
  const negocio = await apiFetch<Negocio>(`/negocios/${id}/concluir`, {
    method: "PATCH",
    body: JSON.stringify(horaFim ? { hora_fim_pesagem: horaFim } : {}),
  });
  return normalizeNegocio(negocio);
}

export async function updateNegocio(id: number | string, input: UpdateNegocioInput) {
  const negocio = await apiFetch<Negocio>(`/negocios/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalizeNegocio(negocio);
}
