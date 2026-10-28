import Dexie, { type Table } from "dexie";

/**
 * Tipos de registro da fila offline, na ordem em que precisam ser sincronizados
 * (cada um pode referenciar os anteriores):
 * - `fazenda`: só cadastros antigos — hoje a fazenda nasce dentro do `pecuarista`
 *   (payload.fazendas), num único item da fila, para sincronizar na mesma transação.
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

/**
 * `revisao`: item gravado antes de uma mudança no modelo de dados que ficou incompleto
 * (ver migração v3). Não é enviado; o usuário corrige (gado, no modal de edição) ou descarta.
 */
export type StatusPendente = "pendente" | "sincronizando" | "erro" | "revisao";

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
  /**
   * `id` do RegistroPendente de origem (para quem ainda guarda o id negativo). Fazendas
   * novas cadastradas dentro de um pecuarista usam o id local delas (ver fila.ts,
   * `idTemporarioFazendaAninhada`).
   */
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
    // v3: novo modelo de dados (atualizacoes-novoBD.md). Converte a fila gravada no formato
    // antigo; o que não dá para completar sozinho fica como "revisao" em vez de ir incompleto.
    this.version(3)
      .stores({
        pendentes: "++id, uuid, entidade, status, [entidade+status]",
        cache: "chave",
        mapeamentos: "uuid, idLocal",
      })
      .upgrade(async (tx) => {
        await tx.table<RegistroPendente, number>("pendentes").toCollection().modify(migrarParaNovoModelo);
      });
  }
}

const RACAS = ["Nelore", "Anelorado", "Angus", "Composto"];
const CAMPOS_RENDIMENTO = [
  "porcentagem_rendimento_nelore",
  "porcentagem_rendimento_anelorado",
  "porcentagem_rendimento_angus",
  "porcentagem_rendimento_composto",
];

function marcarRevisao(registro: RegistroPendente, faltando: string[]) {
  registro.status = "revisao";
  registro.erroMensagem =
    `Cadastro feito antes da atualização do sistema — falta: ${faltando.join(", ")}. ` +
    (registro.entidade === "gado" ? "Edite a cabeça para corrigir ou descarte." : "Descarte e cadastre de novo.");
}

/** Migração v3 de um item da fila. */
export function migrarParaNovoModelo(registro: RegistroPendente) {
  const p = registro.payload;
  switch (registro.entidade) {
    case "gado": {
      // Rendimento agora é por negócio (pela categoria do animal); carimbo por animal deixou de existir.
      delete p.rendimento_carcaca;
      delete p.carimbo;
      if (!RACAS.includes(p.denominacao as string)) {
        marcarRevisao(registro, ["categoria de rendimento (Nelore, Anelorado, Angus ou Composto)"]);
      }
      break;
    }
    case "negocio": {
      if (p.tipo_gado === "Magro") p.tipo_gado = "Reposicao";
      const faltando: string[] = [];
      if (!p.tipo_negocio) faltando.push("tipo de negócio");
      if (!p.media_carimbo) faltando.push("média do carimbo");
      if (p.modalidade === "arroba" && CAMPOS_RENDIMENTO.some((campo) => p[campo] == null)) {
        faltando.push("rendimentos por raça");
      }
      if (faltando.length > 0) marcarRevisao(registro, faltando);
      break;
    }
    case "pecuarista": {
      // fazenda_ids / fazenda_uuids_locais → fazendas: [{ fazenda_id }] (POST aninhado).
      if (Array.isArray(p.fazendas)) break;
      const ids = (p.fazenda_ids as number[] | undefined) ?? [];
      const uuids = (p.fazenda_uuids_locais as string[] | undefined) ?? [];
      p.fazendas = [
        ...ids.map((fazenda_id) => ({ fazenda_id })),
        ...uuids.map((uuid) => ({ fazenda_id: null, fazenda_uuid_local: uuid })),
      ];
      delete p.fazenda_ids;
      delete p.fazenda_uuids_locais;
      if (ids.length + uuids.length === 0) marcarRevisao(registro, ["ao menos uma fazenda"]);
      break;
    }
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
