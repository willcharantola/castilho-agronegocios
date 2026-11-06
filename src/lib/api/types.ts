/**
 * Shapes returned by the Castilho Agronegócios REST API (NestJS backend,
 * see INTEGRACAO-FRONTEND.md). Field names are snake_case because they come
 * straight from the database columns — do not convert to camelCase.
 */

import type { ModoComissao } from "@/lib/comissao";

export type NivelAcesso = "Admin" | "Normal";

export type Usuario = {
  usuario_id: number;
  empresa_id: number;
  nome: string;
  sobrenome: string;
  email: string;
  nivel_acesso: NivelAcesso;
};

export type CreateUsuarioInput = Omit<Usuario, "usuario_id" | "empresa_id"> & { senha: string };
/** `senha` só é enviada quando preenchida (redefine a senha). */
export type UpdateUsuarioInput = Partial<CreateUsuarioInput>;

export type Empresa = {
  empresa_id: number;
  cnpj: string;
  creci: string;
  nome: string;
  banco: string;
  chave_pix: string;
  agencia: string;
  conta: string;
};

export type Fazenda = {
  fazenda_id: number;
  nome_fazenda: string;
  municipio: string;
  /** CNPJ próprio da fazenda (00.000.000/0000-00), opcional. */
  cnpj?: string | null;
  inscricao_estadual: string;
  marca_url: string | null;
  marca_escrita: string | null;
  /** Endereço livre (até 200). */
  endereco_fazenda?: string | null;
  /** Link do Google Maps ou coordenadas "lat,lng" (até 500) — ver lib/mapa. */
  localizacao_google?: string | null;
  /** Só vem em GET /fazendas/:id. */
  pecuarista_fazenda?: { fazenda_id: number; pecuarista_id: number; pecuarista: Pecuarista }[];
};

export type Pecuarista = {
  pecuarista_id: number;
  nome_pecuarista: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
  /** Vínculos N:N com fazendas (tabela vendedor_fazenda). */
  pecuarista_fazenda?: { fazenda_id: number; pecuarista_id: number; fazenda: Fazenda }[];
};

/** Frigorífico (tabela comprador, CRUD em /compradores). */
export type Comprador = {
  comprador_id: number;
  nome_empresa: string;
  cnpj: string;
  /** Obrigatória; texto livre até 12 caracteres (ex.: "ISENTO"). */
  inscricao_estadual: string;
  municipio: string;
};

/** Quem compra num negócio: um frigorífico ou um pecuarista. */
export type TipoComprador = "frigorifico" | "pecuarista";

/**
 * Comprador do negócio como a API devolve, igual para frigorífico e pecuarista. Do
 * pecuarista: `documento` é o CPF/CNPJ, `municipio` vem da primeira fazenda dele e
 * `inscricao_estadual` é null.
 */
export type CompradorDoNegocio = {
  tipo: TipoComprador;
  id: number;
  nome: string;
  documento: string;
  municipio: string | null;
  inscricao_estadual: string | null;
};

/** Nome sugerido para os lotes (Configurações → Tipos de gado). Não é o `tipo_gado` do negócio. */
export type TipoGadoCatalogo = {
  tipo_gado_id: number;
  empresa_id: number;
  nome_gado: string;
};

export type Modalidade = "arroba" | "kg" | "cabeca";
export type TipoGado = "Gordo" | "Reposicao";
/** Grafias exatas do CHECK no banco. Define o cálculo de Funrural e Senar. */
export type TipoNegocio = "Desconto em folha" | "Livre" | "Funrural";
export type TipoLote = "Vaca" | "Boi" | "Novilha" | "Garrote" | "Bezerro" | "Variados";
export type Genero = "Macho" | "Femea";

/** Pesos, médias, extremos e rendimento médio — calculados pela API (null sem cabeças). */
export type AgregadosPeso = {
  /** Soma de `gado.peso_total`. */
  peso_total_quilos: number | null;
  /** Soma de `gado.peso_arroba`. */
  peso_total_arroba: number | null;
  peso_medio_quilos: number | null;
  peso_medio_arroba: number | null;
  mais_pesado_quilos: number | null;
  mais_leve_quilos: number | null;
  mais_pesado_arroba: number | null;
  mais_leve_arroba: number | null;
  /** Ponderado pelo peso: soma(peso_calculo) / soma(peso_total) × 100 — use `formatPercent`. */
  rendimento_medio: number | null;
};

export type Negocio = {
  negocio_id: number;
  empresa_id: number;
  fazenda_id: number;
  pecuarista_id: number;
  /** Exatamente um dos dois: frigorífico ou pecuarista comprador. Prefira `comprador`. */
  comprador_id: number | null;
  comprador_pecuarista_id: number | null;
  /** Comprador unificado (null em respostas antigas guardadas no aparelho). */
  comprador: CompradorDoNegocio | null;
  /**
   * TIME do Postgres, serializado como ISO em 1970-01-01 — use `formatHora`. Registrados
   * pela API (início: 1º gado cadastrado; fim: PATCH /negocios/:id/concluir). NULL na
   * modalidade "cabeca".
   */
  hora_inicio_pesagem: string | null;
  hora_fim_pesagem: string | null;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_negocio: TipoNegocio;
  data_negocio: string;
  /**
   * Valor da comissão informado pelo Admin (0 a 100): R$ por arroba de peso vivo no gado
   * Gordo em "arroba"/"kg", percentual nos demais casos — ver `modo_comissao` e
   * lib/comissao (`formatarCriterioComissao`). null para usuário Normal.
   */
  porcentagem_comissao: number | null;
  /** Comissão em R$, calculada pela API conforme `modo_comissao`. null para usuário Normal. */
  comissao: number | null;
  /** Derivado pela API (não é coluna, não é enviado). null para Normal; ausente em pendentes. */
  modo_comissao?: ModoComissao | null;
  observacao: string | null;
  // Calculados pela API a partir dos lotes e das cabeças de todos os lotes — não enviar.
  /** Soma de `lote.qtd_animais`. */
  qtd_animais: number | null;
  /** Soma de `lote.valor_total_lote`. */
  valor_total_bruto: number | null;
  /** Bruto − Funrural − Senar (a comissão não entra). */
  valor_total_liquido: number | null;
  valor_medio: number | null;
  /**
   * R$, calculados pela API conforme o tipo_negocio: "Funrural" → valor_total_bruto ×
   * aliquota_funrural / 100 (senar 0); "Desconto em folha" → só senar; "Livre" → ambos 0.
   */
  funrural: number | null;
  senar: number | null;
  /**
   * Alíquotas (%) usadas por este negócio, copiadas da empresa na criação — use
   * `formatPercent`. null em negócios ainda só no aparelho.
   */
  aliquota_funrural: number | null;
  aliquota_senar: number | null;
} & AgregadosPeso;

/**
 * Lote do negócio: preço por unidade, gênero, rendimento, carimbo e tipo de lote são do
 * lote (lotes do mesmo negócio podem ter preços diferentes). Na modalidade "cabeca" há um
 * único lote ("Lote único"), sem cabeças pesadas.
 */
export type Lote = {
  lote_id: number;
  negocio_id: number;
  nome_lote: string;
  tipo_lote: TipoLote;
  /** R$ por arroba, por kg ou por cabeça, conforme a modalidade do negócio. */
  valor_unidade: number;
  genero: Genero;
  /** % (0 a 100). 100 nas modalidades "kg" e "cabeca". */
  rendimento_carcaca: number;
  /** Texto livre (ex.: "8,9 e 10"), opcional. */
  media_carimbo: string | null;
  /** 4 dígitos, opcional. */
  ano_carimbo: string | null;
  // Calculados pela API. Em "cabeca", qtd_animais é a informada.
  qtd_animais: number;
  valor_total_lote: number;
  valor_medio_cabeca_lote: number | null;
} & AgregadosPeso;

export type Gado = {
  gado_id: number;
  lote_id: number;
  peso_total: number;
  data_pesagem: string;
  /** Registrado pela API no cadastro — use `formatHora`. */
  horario_pesagem: string | null;
  // Calculadas pela API a partir de peso_total e do lote.
  peso_calculo: number;
  peso_arroba: number;
  valor_total: number | null;
};

export type LoteDetail = Lote & { gados: Gado[] };

/** GET /negocios/resumo — métricas da Home e do Dashboard; `null` para usuário Normal. */
export type ResumoNegocios = {
  negocios_realizados: number | null;
  comissao_total: number | null;
  total_cabecas: number | null;
};

export type NegocioDetail = Negocio & {
  /** Em ordem de cadastro; as cabeças de cada lote também. */
  lotes: LoteDetail[];
  pecuarista: Pecuarista;
  fazenda?: Fazenda;
};

/** Configurações > Dados da empresa: todos consultam, só Admin altera. */
export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  creci: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
};

/** Configurações > Impostos e taxas: alíquotas em % (1.5 = 1,5%). */
export type Impostos = {
  aliquota_funrural: number;
  aliquota_senar: number;
};

export type LoginResponse = {
  access_token: string;
  usuario: Usuario;
};

// Inputs para POST/PATCH — campos e limites conferidos no Swagger ao vivo
// (localhost:3001/docs-json), não apenas em INTEGRACAO-FRONTEND.md.

/**
 * Aceito só nos POST de criação: identificador gerado no aparelho, para a API não
 * duplicar um cadastro reenviado pela fila offline (ver lib/offline).
 */
export type OrigemOffline = { uuid_origem?: string };

export type CreateFazendaInput = {
  nome_fazenda: string;
  municipio: string;
  /** Opcional; '' ou null limpa. A API valida os dígitos verificadores. */
  cnpj?: string | null;
  inscricao_estadual: string;
  /** finalUrl de POST /uploads/marca-fazenda; `null` remove a imagem (PATCH). */
  marca_url?: string | null;
  marca_escrita?: string;
  endereco_fazenda?: string | null;
  localizacao_google?: string | null;
};
export type UpdateFazendaInput = Partial<CreateFazendaInput>;

export type DadosPecuaristaInput = {
  nome_pecuarista: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
};

/**
 * Fazenda no cadastro de pecuarista: uma já cadastrada (`{ fazenda_id }`) ou uma nova,
 * criada junto (com o próprio `uuid_origem`, para o reenvio offline não duplicá-la).
 */
export type FazendaDoPecuaristaInput = { fazenda_id: number } | (CreateFazendaInput & OrigemOffline);

/** POST /pecuaristas: pecuarista e pelo menos uma fazenda, numa única transação. */
export type CreatePecuaristaInput = DadosPecuaristaInput & { fazendas: FazendaDoPecuaristaInput[] };
/** Só os dados: vínculos por POST/DELETE /pecuaristas/:id/fazendas. */
export type UpdatePecuaristaInput = Partial<DadosPecuaristaInput>;

export type CreateCompradorInput = Omit<Comprador, "comprador_id">;
export type UpdateCompradorInput = Partial<CreateCompradorInput>;

/** Comprador na entrada: a API grava o id na coluna do tipo e deixa a outra null. */
export type CompradorDoNegocioInput = { tipo: TipoComprador; id: number };

export type CreateNegocioInput = {
  empresa_id: number;
  fazenda_id: number;
  pecuarista_id: number;
  /** Um pecuarista não pode comprar do próprio negócio (400). */
  comprador: CompradorDoNegocioInput;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_negocio: TipoNegocio;
  data_negocio: string;
  /** Percentual (0 a 100); a API calcula `comissao` em R$. */
  porcentagem_comissao?: number;
  observacao?: string;
};
export type UpdateNegocioInput = Partial<CreateNegocioInput>;

/**
 * POST /negocios/:id/lotes e PATCH /lotes/:id. Regras da modalidade: "arroba" exige
 * nome e rendimento; "kg" exige nome (rendimento 100); "cabeca" exige qtd_animais e a API
 * grava "Lote único" e rendimento 100.
 */
export type CreateLoteInput = {
  nome_lote?: string;
  tipo_lote: TipoLote;
  /** Preço por unidade do lote (2 casas); alterá-lo recalcula as cabeças do lote. */
  valor_unidade: number;
  genero: Genero;
  rendimento_carcaca?: number;
  /** Opcionais: null (ou '') limpa. */
  media_carimbo?: string | null;
  ano_carimbo?: string | null;
  /** Só na modalidade "cabeca". */
  qtd_animais?: number;
};
export type UpdateLoteInput = Partial<CreateLoteInput>;

export type CreateGadoInput = {
  lote_id: number;
  peso_total: number;
  /** Omitida, a API usa a data atual. */
  data_pesagem?: string;
};

/** Trocar `lote_id` move a cabeça para outro lote do mesmo negócio. */
export type UpdateGadoInput = Partial<CreateGadoInput>;

/** Só para gados vindos da fila offline: hora local da pesagem no aparelho ("HH:mm:ss"). */
export type CreateGadoOfflineInput = CreateGadoInput & OrigemOffline & { horario_pesagem?: string };
