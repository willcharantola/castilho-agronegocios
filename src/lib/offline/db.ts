import Dexie, { type Table } from "dexie";

/**
 * Tipos de registro da fila offline, na ordem em que precisam ser sincronizados
 * (cada um pode referenciar os anteriores):
 * - `negocio_atualizacao`: PATCH /negocios/:id feito offline (qtd/valor na modalidade "cabeca").
 * - `conclusao`: PATCH /negocios/:id/concluir feito offline (hora_fim_pesagem do aparelho).
 */
export const ORDEM_SINCRONIZACAO = [
  "fazenda",
  "vendedor",
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
  /** Ex.: "fazendas", "vendedores", "negocio:12". */
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
  }
}

export const offlineDb = new OfflineDB();
