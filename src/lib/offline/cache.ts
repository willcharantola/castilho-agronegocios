import { offlineDb } from "./db";
import { ehErroDeRede } from "./rede";

export const MENSAGEM_SEM_DADOS =
  "Sem conexão com a internet e nenhum dado salvo neste aparelho ainda. Conecte-se uma vez para carregar os dados.";

/**
 * Leitura com cache local: online, busca na API e guarda o resultado no IndexedDB;
 * sem rede, devolve a última cópia salva (ou um erro claro se nunca houve uma).
 */
export async function comCache<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  try {
    const dados = await buscar();
    try {
      await offlineDb.cache.put({ chave, dados, atualizadoEm: Date.now() });
    } catch {
      // IndexedDB indisponível (ex.: navegação privada) — segue sem cache.
    }
    return dados;
  } catch (err) {
    if (!ehErroDeRede(err)) throw err;
    let salvo;
    try {
      salvo = await offlineDb.cache.get(chave);
    } catch {
      salvo = undefined;
    }
    if (salvo) return salvo.dados as T;
    throw new Error(MENSAGEM_SEM_DADOS);
  }
}

/**
 * Apaga as leituras guardadas para uso offline (não mexe na fila de envio). Chamado ao
 * entrar e ao sair: o cache tem os dados como a API mandou para o usuário anterior — um
 * Admin recebe a comissão, um Normal não —, e não pode vazar para o próximo.
 */
export async function limparCacheDeLeitura() {
  try {
    await offlineDb.cache.clear();
  } catch {
    // IndexedDB indisponível — não há o que limpar.
  }
}

/** Apaga as leituras "pesagem:<id>" dos negócios que não estão mais liberados para o usuário. */
export async function descartarPesagensForaDaLista(liberados: number[]) {
  try {
    const manter = new Set(liberados.map((id) => `pesagem:${id}`));
    await offlineDb.cache
      .where("chave")
      .startsWith("pesagem:")
      .filter((item) => !manter.has(item.chave))
      .delete();
  } catch {
    // IndexedDB indisponível — nada guardado.
  }
}

const DONO_KEY = "offline_dono";

/**
 * Chamado ao entrar: se o aparelho guarda dados de OUTRO usuário (leituras e fila), apaga
 * tudo antes da nova sessão — um Normal não pode ver o que um Admin deixou (nem enviar a
 * fila dele com a própria conta). O mesmo usuário entrando de novo (ex.: sessão expirada)
 * mantém a fila.
 */
export async function prepararAparelhoParaUsuario(usuarioId: number) {
  let dono: string | null = null;
  try {
    dono = localStorage.getItem(DONO_KEY);
  } catch {
    // localStorage indisponível — trata como outro usuário.
  }
  try {
    // Sem dono gravado (aparelho vindo da versão anterior): a fila é mantida.
    if (dono !== null && dono !== String(usuarioId)) {
      await offlineDb.transaction("rw", offlineDb.pendentes, offlineDb.mapeamentos, offlineDb.cache, async () => {
        await offlineDb.pendentes.clear();
        await offlineDb.mapeamentos.clear();
        await offlineDb.cache.clear();
      });
    } else {
      await offlineDb.cache.clear();
    }
  } catch {
    // IndexedDB indisponível — não há o que limpar.
  }
  try {
    localStorage.setItem(DONO_KEY, String(usuarioId));
  } catch {
    // Sem localStorage: na próxima entrada limpa de novo.
  }
}

/** Itens na fila que ainda não foram enviados (para avisar antes de sair). */
export async function contarPendentesNaFila() {
  try {
    return await offlineDb.pendentes.count();
  } catch {
    return 0;
  }
}
