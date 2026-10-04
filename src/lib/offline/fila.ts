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

type CampoReferencia = "fazenda" | "vendedor" | "comprador" | "negocio";

/**
 * Converte o id escolhido na tela (real ou temporário) nos campos do payload:
 * `{ fazenda_id: 7 }` ou `{ fazenda_id: null, fazenda_uuid_local: "…" }`.
 */
export async function referencia(campo: CampoReferencia, id: number): Promise<Record<string, unknown>> {
  if (!ehIdTemporario(id)) return { [`${campo}_id`]: id, [`${campo}_uuid_local`]: null };
  const idLocal = -id;
  const pendente = await offlineDb.pendentes.get(idLocal);
  if (pendente) return { [`${campo}_id`]: null, [`${campo}_uuid_local`]: pendente.uuid };
  // Já sincronizado depois que a tela carregou: usa o id real.
  const mapeado = await offlineDb.mapeamentos.where("idLocal").equals(idLocal).first();
  if (mapeado) return { [`${campo}_id`]: mapeado.idReal, [`${campo}_uuid_local`]: null };
  throw new Error(`O cadastro local de ${campo} não foi encontrado neste aparelho.`);
}

/** Versão para listas: `{ fazenda_ids: [7], fazenda_uuids_locais: ["…"] }`. */
export async function referencias(campo: CampoReferencia, ids: number[]): Promise<Record<string, unknown>> {
  const reais: number[] = [];
  const uuids: string[] = [];
  for (const id of ids) {
    const ref = await referencia(campo, id);
    const uuid = ref[`${campo}_uuid_local`] as string | null;
    if (uuid) uuids.push(uuid);
    else reais.push(ref[`${campo}_id`] as number);
  }
  return { [`${campo}_ids`]: reais, [`${campo}_uuids_locais`]: uuids };
}

function temReferenciaPendente(payload: Record<string, unknown>): boolean {
  return Object.entries(payload).some(
    ([chave, valor]) =>
      (chave.endsWith("_uuid_local") && valor != null) ||
      (chave.endsWith("_uuids_locais") && Array.isArray(valor) && valor.length > 0)
  );
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
