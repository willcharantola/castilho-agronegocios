import { apiFetch } from "@/lib/api-client";
import { decimalOuNull, normalizeAgregadosPeso, normalizeLoteDetail } from "@/lib/api/lotes";
import { comCache, descartarPesagensForaDaLista } from "@/lib/offline/cache";
import type {
  CreateNegocioInput,
  GadoPesagem,
  ItemMinhasPesagens,
  Negocio,
  NegocioDetail,
  NegocioPesagem,
  OrigemOffline,
  ResumoNegocios,
  StatusVisualizacao,
  UpdateNegocioInput,
} from "@/lib/api/types";

/** Ver comentário em `gados.ts#normalizeGado` — mesma questão de Decimal-como-string. */
function normalizeNegocio(raw: Negocio): Negocio {
  return {
    ...raw,
    ...normalizeAgregadosPeso(raw),
    // Respostas guardadas no aparelho antes do bd-12 não têm o comprador unificado.
    comprador: raw.comprador ?? null,
    comprador_pecuarista_id: raw.comprador_pecuarista_id ?? null,
    valor_total_bruto: decimalOuNull(raw.valor_total_bruto),
    valor_total_liquido: decimalOuNull(raw.valor_total_liquido),
    valor_medio: decimalOuNull(raw.valor_medio),
    porcentagem_comissao: decimalOuNull(raw.porcentagem_comissao),
    comissao: decimalOuNull(raw.comissao),
    funrural: decimalOuNull(raw.funrural),
    senar: decimalOuNull(raw.senar),
    aliquota_funrural: decimalOuNull(raw.aliquota_funrural),
    aliquota_senar: decimalOuNull(raw.aliquota_senar),
  };
}

/**
 * Payload da fila/fluxo → formato da API: as colunas planas do comprador (`comprador_id`
 * de frigorífico ou `comprador_pecuarista_id`, já resolvidas pela fila offline) viram
 * `comprador: { tipo, id }`. Sem nenhuma das duas, o comprador fica como está.
 */
export function compradorParaApi(payload: Record<string, unknown>): Record<string, unknown> {
  const { comprador_id, comprador_pecuarista_id, ...resto } = payload;
  if (comprador_pecuarista_id != null) {
    return { ...resto, comprador: { tipo: "pecuarista", id: comprador_pecuarista_id } };
  }
  if (comprador_id != null) return { ...resto, comprador: { tipo: "frigorifico", id: comprador_id } };
  return resto;
}

export async function fetchNegocios(params?: FiltrosNegocios) {
  const qs = filtrosNegocios(params);
  const negocios = await comCache(`negocios${qs}`, () => apiFetch<Negocio[]>(`/negocios${qs}`));
  return negocios.map(normalizeNegocio);
}

/** Filtros de GET /negocios (responsável e visualização só na listagem do Admin). */
export type FiltrosNegocios = {
  fazenda_id?: number;
  data_inicio?: string;
  data_fim?: string;
  responsavel_id?: number;
  status_visualizacao?: StatusVisualizacao;
};

/** Query string dos filtros da listagem (só os informados). */
function filtrosNegocios(params?: FiltrosNegocios) {
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

/**
 * PATCH /negocios/:id. Mudar o tipo_negocio recalcula Funrural, Senar e o valor líquido; o
 * preço por unidade é de cada lote (PATCH /lotes/:id).
 */
export async function updateNegocio(id: number | string, input: UpdateNegocioInput) {
  const negocio = await apiFetch<Negocio>(`/negocios/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalizeNegocio(negocio);
}

/** Só Admin (a API responde 403 para Normal). Lotes e cabeças saem junto. */
export async function deleteNegocio(id: number | string) {
  await apiFetch<unknown>(`/negocios/${id}`, { method: "DELETE" });
}

// Pesagem (usuário Normal responsável). Visão reduzida: a API não envia comprador, valores
// nem comissão. As leituras ficam no aparelho para pesar sem internet.

function normalizePesagemGado(g: GadoPesagem): GadoPesagem {
  return { ...g, peso_total: Number(g.peso_total) };
}

/**
 * Negócios "Publico" sob a responsabilidade do usuário. Online, também apaga do aparelho a
 * leitura dos negócios que deixaram de ser dele (outro responsável ou "Privado").
 */
export async function fetchMinhasPesagens(): Promise<ItemMinhasPesagens[]> {
  const itens = await comCache("minhas-pesagens", () => apiFetch<ItemMinhasPesagens[]>("/negocios/minhas-pesagens"));
  if (navigator.onLine) await descartarPesagensForaDaLista(itens.map((i) => i.negocio_id));
  return itens;
}

export async function fetchNegocioPesagem(id: number | string): Promise<NegocioPesagem> {
  const negocio = await comCache(`pesagem:${id}`, () => apiFetch<NegocioPesagem>(`/negocios/${id}/pesagem`));
  return {
    ...negocio,
    lotes: negocio.lotes.map((l) => ({
      ...l,
      rendimento_carcaca: Number(l.rendimento_carcaca),
      gados: l.gados.map(normalizePesagemGado),
    })),
  };
}
