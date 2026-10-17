import Dexie, { type Table } from "dexie";

/**
 * Tipos de registro da fila offline, na ordem em que precisam ser sincronizados
 * (cada um pode referenciar os anteriores):
 * - `negocio_atualizacao`: PATCH /negocios/:id feito offline (qtd/valor na modalidade "cabeca").
 * - `conclusao`: PATCH /negocios/:id/concluir feito offline (hora_fim_pesagem do aparelho).
 */
export const ORDEM_SINCRONIZACAO = [
  "fazenda",
  "pecuarista",
  "comprador",
  "negocio",
  "negocio_atualizacao",
  "gado",
  "conclusao",
] as const;

export type EntidadeOffline = (typeof ORDEM_SINCRONIZACAO)[number];

export type StatusPendente = "pendente" | "sincronizando" | "erro";

export interface RegistroPendente {
  /** Chave local autoincrementada (nunca reutilizada). Exposta nas telas como id negativo. */
  id?: number;
  /** Identificador da entidade; vai para a API como `uuid_origem` (idempotência). */
  uuid: string;
  entidade: EntidadeOffline;
  /**
   * Dados do formulário. Referências a registros ainda pendentes ficam em campos
   * `<x>_uuid_local` (ou `<x>_uuids_locais` para listas), resolvidos na sincronização.
   */
  payload: Record<string, unknown>;
  /**
   * Dados só para exibir o registro nas telas enquanto pendente (nomes, valores
   * estimados, ids como aparecem na tela). Nunca enviado à API.
   */
  exibicao?: Record<string, unknown>;
  status: StatusPendente;
  criadoEm: number;
  erroMensagem?: string;
}

export interface CacheLeitura {
  /** Ex.: "fazendas", "pecuaristas", "negocio:12". */
  chave: string;
  dados: unknown;
  atualizadoEm: number;
}

/** uuid local → id real no banco, gravado quando o registro é sincronizado. */
export interface Mapeamento {
  uuid: string;
  /** `id` do RegistroPendente de origem (para quem ainda guarda o id negativo). */
  idLocal: number;
  entidade: EntidadeOffline;
  idReal: number;
}

class OfflineDB extends Dexie {
  pendentes!: Table<RegistroPendente, number>;
  cache!: Table<CacheLeitura, string>;
  mapeamentos!: Table<Mapeamento, string>;

  constructor() {
    super("castilho-offline-db");
    this.version(1).stores({
      pendentes: "++id, uuid, entidade, status, [entidade+status]",
      cache: "chave",
      mapeamentos: "uuid, idLocal",
    });
    // v2: o cadastro passou a se chamar "pecuarista". O schema dos índices não muda;
    // a versão nova existe para converter, uma única vez, o que já está no aparelho.
    this.version(2)
      .stores({
        pendentes: "++id, uuid, entidade, status, [entidade+status]",
        cache: "chave",
        mapeamentos: "uuid, idLocal",
      })
      .upgrade(async (tx) => {
        await tx
          .table<RegistroPendente, number>("pendentes")
          .toCollection()
          .modify((registro) => {
            registro.entidade = renomearTermoAntigo(registro.entidade) as EntidadeOffline;
            registro.payload = renomearChaves(registro.payload) as Record<string, unknown>;
            if (registro.exibicao) {
              registro.exibicao = renomearChaves(registro.exibicao) as Record<string, unknown>;
            }
          });
        await tx
          .table<Mapeamento, string>("mapeamentos")
          .toCollection()
          .modify((mapeamento) => {
            mapeamento.entidade = renomearTermoAntigo(mapeamento.entidade) as EntidadeOffline;
          });
        // `chave` é a chave primária (ex.: a lista de pecuaristas): regrava os itens em vez de alterá-los.
        const cache = tx.table<CacheLeitura, string>("cache");
        const itens = await cache.toArray();
        await cache.clear();
        await cache.bulkPut(
          itens.map((item) => ({
            ...item,
            chave: renomearTermoAntigo(item.chave),
            dados: renomearChaves(item.dados),
          }))
        );
      });
  }
}

/** Migração v2: troca o termo antigo pelo novo (singular/plural, minúscula/maiúscula). */
const TERMO_ANTIGO = /(v|V)endedor(es)?/g;

function renomearTermoAntigo(texto: string): string {
  return texto.replace(TERMO_ANTIGO, (_, inicial: string, plural?: string) =>
    `${inicial === "V" ? "P" : "p"}ecuarista${plural ? "s" : ""}`
  );
}

/** Renomeia as chaves de objetos (em qualquer nível); os valores não são alterados. */
function renomearChaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(renomearChaves);
  if (valor !== null && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, v]) => [renomearTermoAntigo(chave), renomearChaves(v)])
    );
  }
  return valor;
}

export const offlineDb = new OfflineDB();
