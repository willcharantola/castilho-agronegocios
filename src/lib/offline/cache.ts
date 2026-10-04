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
