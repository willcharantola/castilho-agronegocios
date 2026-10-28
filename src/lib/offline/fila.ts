"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb, type EntidadeOffline, type RegistroPendente } from "./db";
import { ehErroDeRede, novoUuid, semConexao } from "./rede";

export type RegistroSalvo = RegistroPendente & { id: number };

/**
 * Registros pendentes aparecem nas telas com id NEGATIVO (−id local), para conviver
 * com os ids reais (sempre positivos) nos selects e no estado dos fluxos.
 */
export function idTemporario(registro: RegistroSalvo): number {
  return -registro.id;
}

export function ehIdTemporario(id: number | null | undefined): boolean {
  return typeof id === "number" && id < 0;
}

/**
 * Fazendas novas cadastradas dentro de um pecuarista ainda na fila não são registros
 * próprios: ganham um id local derivado do registro do pecuarista e da posição em
 * `payload.fazendas`, numa faixa que não colide com os ids dos registros da fila.
 */
const BASE_FAZENDA_ANINHADA = 1_000_000;
const MAX_FAZENDAS_POR_PECUARISTA = 100;

export function idTemporarioFazendaAninhada(registroId: number, indice: number): number {
  return -(BASE_FAZENDA_ANINHADA + registroId * MAX_FAZENDAS_POR_PECUARISTA + indice);
}

function fazendaAninhada(idLocal: number): { registroId: number; indice: number } | null {
  if (idLocal < BASE_FAZENDA_ANINHADA) return null;
  const resto = idLocal - BASE_FAZENDA_ANINHADA;
  return {
    registroId: Math.floor(resto / MAX_FAZENDAS_POR_PECUARISTA),
    indice: resto % MAX_FAZENDAS_POR_PECUARISTA,
  };
}

export async function enfileirar(
  entidade: EntidadeOffline,
  payload: Record<string, unknown>,
  opcoes: { uuid?: string; exibicao?: Record<string, unknown> } = {}
): Promise<RegistroSalvo> {
  const registro: RegistroPendente = {
    uuid: opcoes.uuid ?? novoUuid(),
    entidade,
    payload,
    exibicao: opcoes.exibicao,
    status: "pendente",
    criadoEm: Date.now(),
  };
  const id = await offlineDb.pendentes.add(registro);
  return { ...registro, id };
}

/**
 * Edita um registro ainda na fila (ex.: gado cadastrado offline, corrigido no modal).
 * Um registro com erro volta a "pendente" para ser reenviado com os dados corrigidos.
 */
export async function atualizarPendente(
  idLocal: number,
  payload: Record<string, unknown>,
  exibicao?: Record<string, unknown>
) {
  await offlineDb.transaction("rw", offlineDb.pendentes, async () => {
    const registro = await offlineDb.pendentes.get(idLocal);
    if (!registro) throw new Error("Este cadastro já foi sincronizado. Recarregue a tela para editá-lo.");
    if (registro.status === "sincronizando") {
      throw new Error("Este cadastro está sendo sincronizado agora. Tente de novo em instantes.");
    }
    await offlineDb.pendentes.put({
      ...registro,
      payload: { ...registro.payload, ...payload },
      exibicao: { ...registro.exibicao, ...exibicao },
      status: "pendente",
      erroMensagem: undefined,
    });
  });
}

type CampoReferencia = "fazenda" | "pecuarista" | "comprador" | "negocio";

/**
 * Converte o id escolhido na tela (real ou temporário) nos campos do payload:
 * `{ fazenda_id: 7 }` ou `{ fazenda_id: null, fazenda_uuid_local: "…" }`.
 */
export async function referencia(campo: CampoReferencia, id: number): Promise<Record<string, unknown>> {
  if (!ehIdTemporario(id)) return { [`${campo}_id`]: id, [`${campo}_uuid_local`]: null };
  const idLocal = -id;
  const aninhada = campo === "fazenda" ? fazendaAninhada(idLocal) : null;
  if (aninhada) {
    // Fazenda nova dentro de um pecuarista pendente: referenciada pelo uuid_origem dela.
    const pecuarista = await offlineDb.pendentes.get(aninhada.registroId);
    const item = (pecuarista?.payload.fazendas as Record<string, unknown>[] | undefined)?.[aninhada.indice];
    if (item?.uuid_origem) return { fazenda_id: null, fazenda_uuid_local: item.uuid_origem };
  } else {
    const pendente = await offlineDb.pendentes.get(idLocal);
    if (pendente) return { [`${campo}_id`]: null, [`${campo}_uuid_local`]: pendente.uuid };
  }
  // Já sincronizado depois que a tela carregou: usa o id real.
  const mapeado = await offlineDb.mapeamentos.where("idLocal").equals(idLocal).first();
  if (mapeado) return { [`${campo}_id`]: mapeado.idReal, [`${campo}_uuid_local`]: null };
  throw new Error(`O cadastro local de ${campo} não foi encontrado neste aparelho.`);
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === "object" && !Array.isArray(valor);

/**
 * uuids de cadastros locais referenciados pelo payload, inclusive dentro de listas de
 * objetos (ex.: `fazendas: [{ fazenda_id: null, fazenda_uuid_local: "…" }]`).
 */
export function uuidsReferenciados(payload: Record<string, unknown>): string[] {
  return Object.entries(payload).flatMap(([chave, valor]) => {
    if (chave.endsWith("_uuid_local")) return valor != null ? [valor as string] : [];
    if (chave.endsWith("_uuids_locais") && Array.isArray(valor)) return valor as string[];
    if (Array.isArray(valor)) return valor.filter(ehObjeto).flatMap(uuidsReferenciados);
    return [];
  });
}

function temReferenciaPendente(payload: Record<string, unknown>): boolean {
  return uuidsReferenciados(payload).length > 0;
}

/** A dependência ainda não foi sincronizada — tentar de novo numa próxima rodada. */
export class DependenciaPendenteError extends Error {}

async function idReal(uuid: string): Promise<number> {
  const mapeado = await offlineDb.mapeamentos.get(uuid);
  if (!mapeado) throw new DependenciaPendenteError(uuid);
  return mapeado.idReal;
}

/** Troca os `*_uuid_local`/`*_uuids_locais` pelos ids reais já sincronizados. */
export async function resolverReferencias(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolvido: Record<string, unknown> = { ...payload };
  for (const [chave, valor] of Object.entries(payload)) {
    if (chave.endsWith("_uuid_local")) {
      delete resolvido[chave];
      if (valor != null) resolvido[`${chave.slice(0, -"_uuid_local".length)}_id`] = await idReal(valor as string);
    } else if (chave.endsWith("_uuids_locais")) {
      delete resolvido[chave];
      const base = chave.slice(0, -"_uuids_locais".length);
      const ids = await Promise.all((valor as string[]).map(idReal));
      resolvido[`${base}_ids`] = [...((payload[`${base}_ids`] as number[] | undefined) ?? []), ...ids];
    } else if (Array.isArray(valor) && valor.some(ehObjeto)) {
      resolvido[chave] = await Promise.all(valor.map((item) => (ehObjeto(item) ? resolverReferencias(item) : item)));
    }
  }
  return resolvido;
}

export type ResultadoEnvio<T> =
  | { sincronizado: true; resultado: T }
  | { sincronizado: false; registro: RegistroSalvo };

/**
 * Envia direto à API quando possível; sem conexão (ou se a requisição falhar por
 * rede, ou se o payload depende de um cadastro ainda pendente), guarda na fila.
 * O mesmo uuid vai como `uuid_origem` no envio online, para uma eventual reenvio
 * pela fila não duplicar o registro caso a resposta tenha se perdido.
 */
export async function enviarOuEnfileirar<T>(
  entidade: EntidadeOffline,
  payload: Record<string, unknown>,
  enviar: (payload: Record<string, unknown>, uuid: string) => Promise<T>,
  opcoes: { exibicao?: Record<string, unknown>; extrasFila?: Record<string, unknown> } = {}
): Promise<ResultadoEnvio<T>> {
  const uuid = novoUuid();
  if (!semConexao() && !temReferenciaPendente(payload)) {
    try {
      return { sincronizado: true, resultado: await enviar(await resolverReferencias(payload), uuid) };
    } catch (err) {
      if (!ehErroDeRede(err)) throw err;
    }
  }
  const registro = await enfileirar(entidade, { ...payload, ...opcoes.extrasFila }, { uuid, exibicao: opcoes.exibicao });
  return { sincronizado: false, registro };
}

/** Registros da fila (atualiza sozinho quando a fila muda). */
export function usePendentes(entidade?: EntidadeOffline): RegistroSalvo[] {
  const registros = useLiveQuery(
    () =>
      entidade
        ? offlineDb.pendentes.where("entidade").equals(entidade).sortBy("id")
        : offlineDb.pendentes.orderBy("id").toArray(),
    [entidade]
  );
  return (registros ?? []) as RegistroSalvo[];
}

export const EVENTO_SINCRONIZADO = "castilho:sincronizado";

/** Muda a cada sincronização concluída — use como dependência para recarregar dados da API. */
export function useVersaoSincronizacao(): number {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const aoSincronizar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_SINCRONIZADO, aoSincronizar);
    return () => window.removeEventListener(EVENTO_SINCRONIZADO, aoSincronizar);
  }, []);
  return versao;
}
