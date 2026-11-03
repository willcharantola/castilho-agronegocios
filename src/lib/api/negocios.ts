import { apiFetch } from "@/lib/api-client";
import { decimalOuNull, normalizeAgregadosPeso, normalizeLoteDetail } from "@/lib/api/lotes";
import { comCache } from "@/lib/offline/cache";
import type {
  CreateNegocioInput,
  Negocio,
  NegocioDetail,
  OrigemOffline,
  ResumoNegocios,
  UpdateNegocioInput,
} from "@/lib/api/types";

/** Ver comentário em `gados.ts#normalizeGado` — mesma questão de Decimal-como-string. */
function normalizeNegocio(raw: Negocio): Negocio {
  return {
    ...raw,
    ...normalizeAgregadosPeso(raw),
    valor_total: decimalOuNull(raw.valor_total),
    valor_medio: decimalOuNull(raw.valor_medio),
    porcentagem_comissao: decimalOuNull(raw.porcentagem_comissao),
    comissao: decimalOuNull(raw.comissao),
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
  const qs = filtrosNegocios(params);
  const negocios = await comCache(`negocios${qs}`, () => apiFetch<Negocio[]>(`/negocios${qs}`));
  return negocios.map(normalizeNegocio);
}

/** Query string dos filtros da listagem (só os informados). */
function filtrosNegocios(params?: { fazenda_id?: number; data_inicio?: string; data_fim?: string }) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined);
  return entries.length > 0 ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : "";
}

/**
 * Métricas da Home e do Dashboard no período. Para usuário Normal a API devolve as três
 * `null` (o front mostra "-").
 */
export async function fetchResumoNegocios(params?: { fazenda_id?: number; data_inicio?: string; data_fim?: string }) {
  const qs = filtrosNegocios(params);
  const resumo = await comCache(`negocios-resumo${qs}`, () => apiFetch<ResumoNegocios>(`/negocios/resumo${qs}`));
  return { ...resumo, comissao_total: decimalOuNull(resumo.comissao_total) };
}

/** Negócio com os lotes (ordem de cadastro), cada um com suas cabeças. */
export async function fetchNegocio(id: number | string): Promise<NegocioDetail> {
  const negocio = await comCache(`negocio:${id}`, () => apiFetch<NegocioDetail>(`/negocios/${id}`));
  return {
    ...negocio,
    ...normalizeNegocio(negocio),
    // Cache gravado antes dos lotes não tem a lista.
    lotes: (negocio.lotes ?? []).map(normalizeLoteDetail),
  };
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

/** PATCH /negocios/:id. Mudar o tipo_negocio recalcula Funrural e Senar. */
export async function updateNegocio(id: number | string, input: UpdateNegocioInput) {
  const negocio = await apiFetch<Negocio>(`/negocios/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalizeNegocio(negocio);
}
