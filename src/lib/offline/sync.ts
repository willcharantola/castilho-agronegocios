"use client";

import { ApiError, PRIMEIRO_ACESSO_PENDENTE } from "@/lib/api-client";
import { createComprador } from "@/lib/api/compradores";
import { createFazenda } from "@/lib/api/fazendas";
import { createGado } from "@/lib/api/gados";
import { concluirNegocio, createNegocio, updateNegocio } from "@/lib/api/negocios";
import { createVendedor } from "@/lib/api/vendedores";
import type {
  CreateCompradorInput,
  CreateFazendaInput,
  CreateGadoOfflineInput,
  CreateNegocioInput,
  CreateVendedorInput,
  UpdateNegocioInput,
} from "@/lib/api/types";
import { offlineDb, ORDEM_SINCRONIZACAO, type EntidadeOffline, type RegistroPendente } from "./db";
import { DependenciaPendenteError, EVENTO_SINCRONIZADO, resolverReferencias, type RegistroSalvo } from "./fila";
import { ehErroDeRede, semConexao } from "./rede";

type Payload = Record<string, unknown>;

/** Envia um registro já com as referências resolvidas; devolve o id real criado (se houver). */
const ENVIAR: Record<EntidadeOffline, (payload: Payload, uuid: string) => Promise<number | null>> = {
  fazenda: async (p, uuid) =>
    (await createFazenda({ ...(p as CreateFazendaInput), uuid_origem: uuid })).fazenda_id,
  vendedor: async (p, uuid) =>
    (await createVendedor({ ...(p as CreateVendedorInput), uuid_origem: uuid })).vendedor_id,
  comprador: async (p, uuid) =>
    (await createComprador({ ...(p as CreateCompradorInput), uuid_origem: uuid })).comprador_id,
  negocio: async (p, uuid) =>
    (await createNegocio({ ...(p as CreateNegocioInput), uuid_origem: uuid })).negocio_id,
  // PATCH e conclusão regravam os mesmos valores — reenviar é inofensivo.
  negocio_atualizacao: async (p) => {
    const { negocio_id, ...campos } = p;
    await updateNegocio(negocio_id as number, campos as UpdateNegocioInput);
    return null;
  },
  gado: async (p, uuid) =>
    (await createGado({ ...(p as CreateGadoOfflineInput), uuid_origem: uuid })).gado_id,
  conclusao: async (p) => {
    await concluirNegocio(p.negocio_id as number, p.hora_fim_pesagem as string);
    return null;
  },
};

type ResultadoRegistro = "enviado" | "aguardando" | "erro" | "parar";

async function enviarRegistro(registro: RegistroSalvo): Promise<ResultadoRegistro> {
  await offlineDb.pendentes.update(registro.id, { status: "sincronizando" });

  let payload: Payload;
  try {
    payload = await resolverReferencias(registro.payload);
  } catch (err) {
    // A fazenda/negócio de que este registro depende ainda não subiu (ex.: falhou).
    // Fica pendente e é tentado de novo quando a dependência sincronizar.
    if (err instanceof DependenciaPendenteError) {
      await offlineDb.pendentes.update(registro.id, { status: "pendente" });
      return "aguardando";
    }
    throw err;
  }

  try {
    const idReal = await ENVIAR[registro.entidade](payload, registro.uuid);
    await offlineDb.transaction("rw", offlineDb.pendentes, offlineDb.mapeamentos, async () => {
      if (idReal != null) {
        await offlineDb.mapeamentos.put({
          uuid: registro.uuid,
          idLocal: registro.id,
          entidade: registro.entidade,
          idReal,
        });
      }
      await offlineDb.pendentes.delete(registro.id);
    });
    return "enviado";
  } catch (err) {
    // Sem rede, sessão expirada ou primeiro acesso pendente (apiFetch já redireciona): o registro volta
    // para a fila intacto e a rodada para — tentar o resto agora só falharia igual.
    if (
      ehErroDeRede(err) ||
      (err instanceof ApiError && (err.status === 401 || err.code === PRIMEIRO_ACESSO_PENDENTE))
    ) {
      await offlineDb.pendentes.update(registro.id, { status: "pendente" });
      return "parar";
    }
    // Rejeitado pelo servidor (ex.: dado inválido): fica com o motivo para o usuário
    // corrigir ou descartar; não bloqueia os demais itens.
    await offlineDb.pendentes.update(registro.id, {
      status: "erro",
      erroMensagem: err instanceof Error ? err.message : "Erro desconhecido",
    });
    return "erro";
  }
}

export type ResumoSincronizacao = { enviados: number; erros: number; interrompida: boolean };

async function executar(): Promise<ResumoSincronizacao> {
  const resumo: ResumoSincronizacao = { enviados: 0, erros: 0, interrompida: false };
  if (semConexao()) return { ...resumo, interrompida: true };

  // Uma rodada anterior pode ter sido cortada no meio (app fechado): como a API é
  // idempotente via uuid_origem, é seguro reenviar o que ficou "sincronizando".
  await offlineDb.pendentes.where("status").equals("sincronizando").modify({ status: "pendente" });

  try {
    for (const entidade of ORDEM_SINCRONIZACAO) {
      const registros = (await offlineDb.pendentes
        .where("[entidade+status]")
        .equals([entidade, "pendente"])
        .sortBy("id")) as RegistroSalvo[];
      for (const registro of registros) {
        const resultado = await enviarRegistro(registro);
        if (resultado === "enviado") resumo.enviados++;
        if (resultado === "erro") resumo.erros++;
        if (resultado === "parar") return { ...resumo, interrompida: true };
      }
    }
    return resumo;
  } finally {
    if (resumo.enviados > 0) window.dispatchEvent(new CustomEvent(EVENTO_SINCRONIZADO));
  }
}

let emAndamento: Promise<ResumoSincronizacao> | null = null;

/** Envia a fila à API, na ordem de dependência. Chamadas simultâneas compartilham a mesma rodada. */
export function sincronizar(): Promise<ResumoSincronizacao> {
  if (!emAndamento) {
    emAndamento = executar().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

export async function tentarNovamente(id: number) {
  await offlineDb.pendentes.update(id, { status: "pendente", erroMensagem: undefined });
  return sincronizar();
}

/** Registros pendentes que dependem (direta ou indiretamente) de `registro`. */
async function dependentes(registro: RegistroPendente): Promise<RegistroSalvo[]> {
  const todos = (await offlineDb.pendentes.toArray()) as RegistroSalvo[];
  const encontrados: RegistroSalvo[] = [];
  const fila = [registro.uuid];
  while (fila.length > 0) {
    const uuid = fila.shift()!;
    for (const r of todos) {
      if (encontrados.includes(r)) continue;
      const referencia = Object.entries(r.payload).some(
        ([chave, valor]) =>
          (chave.endsWith("_uuid_local") && valor === uuid) ||
          (chave.endsWith("_uuids_locais") && Array.isArray(valor) && valor.includes(uuid))
      );
      if (referencia) {
        encontrados.push(r);
        fila.push(r.uuid);
      }
    }
  }
  return encontrados;
}

export async function contarDependentes(id: number) {
  const registro = await offlineDb.pendentes.get(id);
  return registro ? (await dependentes(registro)).length : 0;
}

/** Remove o registro da fila, junto com o que depende dele (ex.: gados de um negócio descartado). */
export async function descartar(id: number) {
  const registro = await offlineDb.pendentes.get(id);
  if (!registro) return;
  const ids = [id, ...(await dependentes(registro)).map((r) => r.id)];
  await offlineDb.pendentes.bulkDelete(ids);
}
