"use client";

import { useMemo } from "react";
import type {
  Comprador,
  CreateCompradorInput,
  CreateFazendaInput,
  CreateNegocioInput,
  CreateVendedorInput,
  Fazenda,
  Gado,
  Genero,
  Negocio,
  NegocioDetail,
  Vendedor,
} from "@/lib/api/types";
import type { RegistroPendente } from "./db";
import { idTemporario, usePendentes, type RegistroSalvo } from "./fila";

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
    pendente: info(r),
  };
}

export function vendedorDePendente(r: RegistroSalvo): ComPendencia<Vendedor> {
  const p = r.payload as CreateVendedorInput;
  // Fazendas como aparecem na tela (ids reais ou temporários), guardadas ao enfileirar.
  const fazendas = (r.exibicao?.fazendas as { fazenda_id: number; nome_fazenda: string }[] | undefined) ?? [];
  const vendedorId = idTemporario(r);
  return {
    vendedor_id: vendedorId,
    nome_vendedor: p.nome_vendedor,
    fisico_juridico: p.fisico_juridico,
    cpf_cnpj: p.cpf_cnpj,
    banco: p.banco,
    agencia: p.agencia,
    conta: p.conta,
    chave_pix: p.chave_pix,
    vendedor_fazenda: fazendas.map((f) => ({
      fazenda_id: f.fazenda_id,
      vendedor_id: vendedorId,
      fazenda: { fazenda_id: f.fazenda_id, nome_fazenda: f.nome_fazenda } as Fazenda,
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
  vendedor_id: number;
  comprador_id: number;
  fazendaNome: string;
  vendedorNome: string;
  compradorNome: string;
};

export function negocioDePendente(r: RegistroSalvo): ComPendencia<Negocio> {
  const p = r.payload as unknown as CreateNegocioInput;
  const e = r.exibicao as ExibicaoNegocio;
  return {
    negocio_id: idTemporario(r),
    empresa_id: p.empresa_id,
    fazenda_id: e.fazenda_id,
    vendedor_id: e.vendedor_id,
    comprador_id: e.comprador_id,
    hora_inicio_pesagem: null,
    hora_fim_pesagem: null,
    modalidade: p.modalidade,
    tipo_gado: p.tipo_gado,
    tipo_lote: p.tipo_lote,
    data_negocio: p.data_negocio,
    porcentagem_comissao: p.porcentagem_comissao ?? null,
    comissao: null,
    valor_unidade: p.valor_unidade,
    observacao: p.observacao ?? null,
    valor_total: null,
    valor_medio: null,
    qtd_animais: null,
    mais_pesado: null,
    mais_leve: null,
    pendente: info(r),
  };
}

/** Valores estimados e o negócio como aparece na tela, guardados ao enfileirar um gado. */
export type ExibicaoGado = {
  negocio_id: number;
  peso_calculo: number;
  peso_arroba: number;
  valor_total: number;
};

export function gadoDePendente(r: RegistroSalvo): ComPendencia<Gado> {
  const p = r.payload;
  const e = r.exibicao as ExibicaoGado;
  return {
    gado_id: idTemporario(r),
    negocio_id: e.negocio_id,
    peso_total: p.peso_total as number,
    data_pesagem: p.data_pesagem as string,
    genero: p.genero as Genero,
    denominacao: p.denominacao as string,
    rendimento_carcaca: p.rendimento_carcaca as number,
    // Mesmo formato das colunas TIME vindas da API, para `formatHora`.
    horario_pesagem: p.horario_pesagem ? `1970-01-01T${p.horario_pesagem as string}.000Z` : null,
    carimbo: p.carimbo as number,
    ano_carimbo: p.ano_carimbo as string,
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

export function useFazendasPendentes() {
  const registros = usePendentes("fazenda");
  return useMemo(() => registros.map(fazendaDePendente), [registros]);
}

export function useVendedoresPendentes() {
  const registros = usePendentes("vendedor");
  return useMemo(() => registros.map(vendedorDePendente), [registros]);
}

export function useCompradoresPendentes() {
  const registros = usePendentes("comprador");
  return useMemo(() => registros.map(compradorDePendente), [registros]);
}

export function useNegociosPendentes() {
  const registros = usePendentes("negocio");
  return useMemo(() => registros.map(negocioDePendente), [registros]);
}

/** Gados na fila de um negócio (id real ou temporário, como aparece na tela). */
export function useGadosPendentes(negocioId: number | null | undefined) {
  const registros = usePendentes("gado");
  return useMemo(
    () =>
      registros
        .filter((r) => (r.exibicao as ExibicaoGado | undefined)?.negocio_id === negocioId)
        .map(gadoDePendente),
    [registros, negocioId]
  );
}

/**
 * Soma os gados pendentes ao negócio para exibição (cabeças, valor total e médio
 * estimados). A API recalcula os valores reais na sincronização.
 */
export function comGadosPendentes(
  negocio: NegocioDetail,
  pendentes: ComPendencia<Gado>[]
): Omit<NegocioDetail, "gados"> & { gados: ComPendencia<Gado>[] } {
  if (pendentes.length === 0) return negocio;
  const gados: ComPendencia<Gado>[] = [...negocio.gados, ...pendentes];
  const valorTotal = gados.reduce((soma, g) => soma + (g.valor_total ?? 0), 0);
  return {
    ...negocio,
    gados,
    qtd_animais: gados.length,
    valor_total: valorTotal,
    valor_medio: valorTotal / gados.length,
  };
}
