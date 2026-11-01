"use client";

import { useMemo } from "react";
import type {
  AgregadosPeso,
  Comprador,
  CreateCompradorInput,
  CreateFazendaInput,
  CreateLoteInput,
  CreateNegocioInput,
  DadosPecuaristaInput,
  Fazenda,
  Gado,
  LoteDetail,
  Negocio,
  NegocioDetail,
  Pecuarista,
  UpdateLoteInput,
} from "@/lib/api/types";
import type { RegistroPendente } from "./db";
import { idTemporario, idTemporarioFazendaAninhada, usePendentes, type RegistroSalvo } from "./fila";

/**
 * Registros da fila offline no mesmo formato das entidades da API (com id negativo,
 * ver `idTemporario`), para as telas os exibirem junto com os dados do servidor.
 */
export type InfoPendente = Pick<RegistroPendente, "status" | "erroMensagem">;
export type ComPendencia<T> = T & { pendente?: InfoPendente };

const info = (r: RegistroSalvo): InfoPendente => ({ status: r.status, erroMensagem: r.erroMensagem });

export function fazendaDePendente(r: RegistroSalvo): ComPendencia<Fazenda> {
  const p = r.payload as CreateFazendaInput;
  return {
    fazenda_id: idTemporario(r),
    nome_fazenda: p.nome_fazenda,
    municipio: p.municipio,
    inscricao_estadual: p.inscricao_estadual,
    marca_url: p.marca_url ?? null,
    marca_escrita: p.marca_escrita ?? null,
    endereco_fazenda: p.endereco_fazenda ?? null,
    localizacao_google: p.localizacao_google ?? null,
    pendente: info(r),
  };
}

/**
 * Fazendas do pecuarista como aparecem nas telas, na mesma ordem de `payload.fazendas`
 * (guardadas ao enfileirar). As novas ganham o id temporário de fazenda aninhada; as já
 * cadastradas mantêm o id com que foram escolhidas (real ou de outro cadastro pendente).
 */
export type ExibicaoPecuarista = {
  fazendas: (Partial<Fazenda> & { fazenda_id?: number; nome_fazenda: string })[];
};

function fazendasDoPecuarista(r: RegistroSalvo): ComPendencia<Fazenda>[] {
  const itens = (r.payload.fazendas as Record<string, unknown>[] | undefined) ?? [];
  const exibicao = (r.exibicao as ExibicaoPecuarista | undefined)?.fazendas ?? [];
  return itens.map((item, indice) => {
    const nova = item.uuid_origem != null;
    const e = exibicao[indice] ?? { nome_fazenda: "" };
    return {
      fazenda_id: nova ? idTemporarioFazendaAninhada(r.id, indice) : (e.fazenda_id ?? (item.fazenda_id as number)),
      nome_fazenda: (item.nome_fazenda as string | undefined) ?? e.nome_fazenda,
      municipio: (item.municipio as string | undefined) ?? e.municipio ?? "",
      inscricao_estadual: (item.inscricao_estadual as string | undefined) ?? e.inscricao_estadual ?? "",
      marca_url: (item.marca_url as string | undefined) ?? e.marca_url ?? null,
      marca_escrita: (item.marca_escrita as string | undefined) ?? e.marca_escrita ?? null,
      endereco_fazenda: (item.endereco_fazenda as string | undefined) ?? e.endereco_fazenda ?? null,
      localizacao_google: (item.localizacao_google as string | undefined) ?? e.localizacao_google ?? null,
      // Só as criadas junto com o pecuarista estão pendentes; as vinculadas já existem.
      ...(nova ? { pendente: info(r) } : {}),
    };
  });
}

export function pecuaristaDePendente(r: RegistroSalvo): ComPendencia<Pecuarista> {
  const p = r.payload as DadosPecuaristaInput;
  const fazendas = fazendasDoPecuarista(r);
  const pecuaristaId = idTemporario(r);
  return {
    pecuarista_id: pecuaristaId,
    nome_pecuarista: p.nome_pecuarista,
    fisico_juridico: p.fisico_juridico,
    cpf_cnpj: p.cpf_cnpj,
    banco: p.banco,
    agencia: p.agencia,
    conta: p.conta,
    chave_pix: p.chave_pix,
    pecuarista_fazenda: fazendas.map((fazenda) => ({
      fazenda_id: fazenda.fazenda_id,
      pecuarista_id: pecuaristaId,
      fazenda,
    })),
    pendente: info(r),
  };
}

export function compradorDePendente(r: RegistroSalvo): ComPendencia<Comprador> {
  const p = r.payload as CreateCompradorInput;
  return {
    comprador_id: idTemporario(r),
    nome_empresa: p.nome_empresa,
    cnpj: p.cnpj,
    telefone: p.telefone,
    municipio: p.municipio,
    pessoa_contato: p.pessoa_contato,
    pendente: info(r),
  };
}

/** Nomes/ids como aparecem na tela, guardados ao enfileirar um negócio. */
export type ExibicaoNegocio = {
  fazenda_id: number;
  pecuarista_id: number;
  comprador_id: number;
  fazendaNome: string;
  pecuaristaNome: string;
  compradorNome: string;
};

const SEM_PESOS: AgregadosPeso = {
  peso_total_quilos: null,
  peso_total_arroba: null,
  peso_medio_quilos: null,
  peso_medio_arroba: null,
  mais_pesado_quilos: null,
  mais_leve_quilos: null,
  mais_pesado_arroba: null,
  mais_leve_arroba: null,
  rendimento_medio: null,
};

export function negocioDePendente(r: RegistroSalvo): ComPendencia<Negocio> {
  const p = r.payload as unknown as CreateNegocioInput;
  const e = r.exibicao as ExibicaoNegocio;
  return {
    negocio_id: idTemporario(r),
    empresa_id: p.empresa_id,
    fazenda_id: e.fazenda_id,
    pecuarista_id: e.pecuarista_id,
    comprador_id: e.comprador_id,
    hora_inicio_pesagem: null,
    hora_fim_pesagem: null,
    modalidade: p.modalidade,
    tipo_gado: p.tipo_gado,
    tipo_negocio: p.tipo_negocio,
    data_negocio: p.data_negocio,
    porcentagem_comissao: p.porcentagem_comissao ?? null,
    comissao: null,
    observacao: p.observacao ?? null,
    // Agregados, Funrural, Senar e alíquotas: só existem após a sincronização (calculados pela API).
    qtd_animais: null,
    valor_total: null,
    valor_medio: null,
    funrural: null,
    senar: null,
    aliquota_funrural: null,
    aliquota_senar: null,
    ...SEM_PESOS,
    pendente: info(r),
  };
}

/** Negócio criado offline (ainda só no aparelho) no formato do detalhe, ainda sem lotes. */
export function negocioDetailDePendente(r: RegistroSalvo): NegocioDetail & { pendente: InfoPendente } {
  const e = r.exibicao as ExibicaoNegocio;
  return {
    ...negocioDePendente(r),
    lotes: [],
    pecuarista: { nome_pecuarista: e.pecuaristaNome } as NegocioDetail["pecuarista"],
    comprador: { nome_empresa: e.compradorNome } as NegocioDetail["comprador"],
    fazenda: { fazenda_id: e.fazenda_id, nome_fazenda: e.fazendaNome } as Fazenda,
    pendente: info(r),
  };
}

/** Negócio do lote como aparece na tela (id real ou temporário), guardado ao enfileirá-lo. */
export type ExibicaoLote = { negocio_id: number; modalidade: Negocio["modalidade"] };

export function loteDePendente(r: RegistroSalvo): ComPendencia<LoteDetail> {
  const p = r.payload as unknown as CreateLoteInput;
  const e = r.exibicao as ExibicaoLote;
  const porCabeca = e.modalidade === "cabeca";
  const qtd = porCabeca ? (p.qtd_animais ?? 0) : 0;
  return {
    lote_id: idTemporario(r),
    negocio_id: e.negocio_id,
    // Em "cabeca" a API grava o nome e o rendimento sozinha.
    nome_lote: porCabeca ? "Lote único" : (p.nome_lote ?? ""),
    valor_unidade: p.valor_unidade,
    tipo_lote: p.tipo_lote,
    genero: p.genero,
    rendimento_carcaca: e.modalidade === "arroba" ? (p.rendimento_carcaca ?? 100) : 100,
    media_carimbo: p.media_carimbo,
    ano_carimbo: p.ano_carimbo,
    qtd_animais: qtd,
    valor_total_lote: porCabeca ? p.valor_unidade * qtd : 0,
    valor_medio_cabeca_lote: porCabeca && qtd > 0 ? p.valor_unidade : null,
    ...SEM_PESOS,
    gados: [],
    pendente: info(r),
  };
}

/** Lote alterado/excluído offline: o lote e o negócio como aparecem na tela. */
export type ExibicaoLoteAlteracao = { negocio_id: number; lote_id: number };

/** Valores estimados e o lote/negócio como aparecem na tela, guardados ao enfileirar um gado. */
export type ExibicaoGado = {
  negocio_id: number;
  lote_id: number;
  peso_calculo: number;
  peso_arroba: number;
  valor_total: number;
};

export function gadoDePendente(r: RegistroSalvo): ComPendencia<Gado> {
  const p = r.payload;
  const e = r.exibicao as ExibicaoGado;
  return {
    gado_id: idTemporario(r),
    lote_id: e.lote_id,
    peso_total: p.peso_total as number,
    data_pesagem: (p.data_pesagem as string | undefined) ?? new Date(r.criadoEm).toISOString(),
    // Mesmo formato das colunas TIME vindas da API, para `formatHora`.
    horario_pesagem: p.horario_pesagem ? `1970-01-01T${p.horario_pesagem as string}.000Z` : null,
    peso_calculo: e.peso_calculo,
    peso_arroba: e.peso_arroba,
    valor_total: e.valor_total,
    pendente: info(r),
  };
}

/** Pendentes primeiro, depois a lista do servidor (`null` enquanto não há nada para mostrar). */
export function mesclarPendentes<T>(lista: T[] | null, pendentes: ComPendencia<T>[]): ComPendencia<T>[] | null {
  if (lista === null && pendentes.length === 0) return null;
  return [...pendentes, ...((lista ?? []) as ComPendencia<T>[])];
}

/**
 * Fazendas ainda só no aparelho: as cadastradas sozinhas (fila antiga) e as novas
 * cadastradas dentro de um pecuarista pendente.
 */
export function useFazendasPendentes() {
  const avulsas = usePendentes("fazenda");
  const pecuaristas = usePendentes("pecuarista");
  return useMemo(
    () => [
      ...avulsas.map(fazendaDePendente),
      ...pecuaristas.flatMap((r) => fazendasDoPecuarista(r).filter((f) => f.pendente)),
    ],
    [avulsas, pecuaristas]
  );
}

export function usePecuaristasPendentes() {
  const registros = usePendentes("pecuarista");
  return useMemo(() => registros.map(pecuaristaDePendente), [registros]);
}

export function useCompradoresPendentes() {
  const registros = usePendentes("comprador");
  return useMemo(() => registros.map(compradorDePendente), [registros]);
}

export function useNegociosPendentes() {
  const registros = usePendentes("negocio");
  return useMemo(() => registros.map(negocioDePendente), [registros]);
}

/** Pendências de um negócio (id real ou temporário, como aparece na tela). */
export type PendenciasNegocio = {
  lotes: ComPendencia<LoteDetail>[];
  /** lote_id (como na tela) → campos alterados offline. */
  alteracoes: Map<number, { campos: UpdateLoteInput; pendente: InfoPendente }>;
  /** lote_id (como na tela) dos lotes excluídos offline. */
  exclusoes: Set<number>;
  gados: ComPendencia<Gado>[];
};

export function usePendenciasNegocio(negocioId: number | null | undefined): PendenciasNegocio {
  const lotes = usePendentes("lote");
  const alteracoes = usePendentes("lote_atualizacao");
  const exclusoes = usePendentes("lote_exclusao");
  const gados = usePendentes("gado");
  return useMemo(() => {
    const doNegocio = (r: RegistroSalvo) =>
      (r.exibicao as { negocio_id?: number } | undefined)?.negocio_id === negocioId;
    const loteDe = (r: RegistroSalvo) => (r.exibicao as ExibicaoLoteAlteracao).lote_id;
    // Vários PATCH do mesmo lote: aplicados em ordem (o último vence).
    const mapaAlteracoes = new Map<number, { campos: UpdateLoteInput; pendente: InfoPendente }>();
    for (const r of alteracoes.filter(doNegocio)) {
      const anterior = mapaAlteracoes.get(loteDe(r))?.campos ?? {};
      // O payload também traz o lote_id (referência), que não é campo do lote a sobrepor.
      const campos: Record<string, unknown> = { ...r.payload };
      delete campos.lote_id;
      mapaAlteracoes.set(loteDe(r), { campos: { ...anterior, ...campos }, pendente: info(r) });
    }
    return {
      lotes: lotes.filter(doNegocio).map(loteDePendente),
      alteracoes: mapaAlteracoes,
      exclusoes: new Set(exclusoes.filter(doNegocio).map(loteDe)),
      gados: gados.filter(doNegocio).map(gadoDePendente),
    };
  }, [lotes, alteracoes, exclusoes, gados, negocioId]);
}

/** Estimativa local (só para exibir pendências) dos agregados de peso de um conjunto de cabeças. */
function estimarPesos(gados: Gado[]): AgregadosPeso {
  if (gados.length === 0) return SEM_PESOS;
  const quilos = gados.map((g) => g.peso_total);
  const arrobas = gados.map((g) => g.peso_arroba);
  const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
  const totalKg = soma(quilos);
  const totalArroba = soma(arrobas);
  return {
    peso_total_quilos: totalKg,
    peso_total_arroba: totalArroba,
    peso_medio_quilos: totalKg / gados.length,
    peso_medio_arroba: totalArroba / gados.length,
    mais_pesado_quilos: Math.max(...quilos),
    mais_leve_quilos: Math.min(...quilos),
    mais_pesado_arroba: Math.max(...arrobas),
    mais_leve_arroba: Math.min(...arrobas),
    rendimento_medio: totalKg > 0 ? (soma(gados.map((g) => g.peso_calculo)) / totalKg) * 100 : null,
  };
}

export type LoteComPendencia = ComPendencia<Omit<LoteDetail, "gados"> & { gados: ComPendencia<Gado>[] }>;
export type NegocioComPendencias = Omit<NegocioDetail, "lotes"> & {
  lotes: LoteComPendencia[];
  pendente?: InfoPendente;
};

/**
 * Junta ao negócio do servidor (ou ao criado offline) os lotes, alterações, exclusões e
 * cabeças ainda na fila. Os agregados dos lotes/negócio com pendências são estimados aqui
 * só para exibição; a API recalcula os valores reais na sincronização.
 */
export function comPendencias(
  negocio: NegocioDetail & { pendente?: InfoPendente },
  pendencias: PendenciasNegocio
): NegocioComPendencias {
  const { lotes, alteracoes, exclusoes, gados } = pendencias;
  if (lotes.length + alteracoes.size + exclusoes.size + gados.length === 0) return negocio;

  const porCabeca = negocio.modalidade === "cabeca";
  const todosLotes: LoteComPendencia[] = [...(negocio.lotes as LoteComPendencia[]), ...lotes]
    .filter((lote) => !exclusoes.has(lote.lote_id))
    .map((lote) => {
      const alteracao = alteracoes.get(lote.lote_id);
      const novosGados = gados.filter((g) => g.lote_id === lote.lote_id);
      if (!alteracao && novosGados.length === 0) return lote;
      const atualizado = { ...lote, ...alteracao?.campos };
      const gadosDoLote: ComPendencia<Gado>[] = [...lote.gados, ...novosGados];
      const qtd = porCabeca ? atualizado.qtd_animais : gadosDoLote.length;
      const valorTotal = porCabeca
        ? atualizado.valor_unidade * qtd
        : gadosDoLote.reduce((soma, g) => soma + (g.valor_total ?? 0), 0);
      return {
        ...atualizado,
        ...(porCabeca ? {} : estimarPesos(gadosDoLote)),
        gados: gadosDoLote,
        qtd_animais: qtd,
        valor_total_lote: valorTotal,
        valor_medio_cabeca_lote: qtd > 0 ? valorTotal / qtd : null,
        pendente: lote.pendente ?? alteracao?.pendente ?? novosGados[0]?.pendente,
      };
    });

  const qtd = todosLotes.reduce((soma, l) => soma + l.qtd_animais, 0);
  const valorTotal = todosLotes.reduce((soma, l) => soma + l.valor_total_lote, 0);
  return {
    ...negocio,
    ...(porCabeca ? {} : estimarPesos(todosLotes.flatMap((l) => l.gados))),
    lotes: todosLotes,
    qtd_animais: qtd,
    valor_total: valorTotal,
    valor_medio: qtd > 0 ? valorTotal / qtd : null,
  };
}
