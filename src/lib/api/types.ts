/**
 * Shapes returned by the Castilho Agronegócios REST API (NestJS backend,
 * see INTEGRACAO-FRONTEND.md). Field names are snake_case because they come
 * straight from the database columns — do not convert to camelCase.
 */

export type NivelAcesso = "Admin" | "Normal";

export type Usuario = {
  usuario_id: number;
  empresa_id: number;
  nome: string;
  sobrenome: string;
  email: string;
  nivel_acesso: NivelAcesso;
  /** true → precisa definir uma nova senha antes de usar o sistema (/primeiro-acesso). */
  primeiro_acesso: boolean;
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
  inscricao_estadual: string;
  marca_url: string | null;
  marca_escrita: string | null;
  /** Só vem em GET /fazendas/:id. */
  vendedor_fazenda?: { fazenda_id: number; vendedor_id: number; vendedor: Vendedor }[];
};

export type Vendedor = {
  vendedor_id: number;
  nome_vendedor: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
  /** Associações N:N com fazendas (tabela vendedor_fazenda). */
  vendedor_fazenda?: { fazenda_id: number; vendedor_id: number; fazenda: Fazenda }[];
};

export type Comprador = {
  comprador_id: number;
  nome_empresa: string;
  cnpj: string;
  telefone: string;
  municipio: string;
  pessoa_contato: string;
};

export type Modalidade = "arroba" | "kg" | "cabeca";
export type TipoGado = "Gordo" | "Magro";
export type TipoLote = "Vaca" | "Boi" | "Novilha" | "Garrote" | "Bezerro" | "Variados";
export type Genero = "Macho" | "Femea";

export type Negocio = {
  negocio_id: number;
  empresa_id: number;
  fazenda_id: number;
  vendedor_id: number;
  comprador_id: number;
  /**
   * TIME do Postgres, serializado como ISO em 1970-01-01 — use `formatHora`. Registrados
   * pela API (início: 1º gado cadastrado; fim: PATCH /negocios/:id/concluir). NULL na
   * modalidade "cabeca".
   */
  hora_inicio_pesagem: string | null;
  hora_fim_pesagem: string | null;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_lote: TipoLote;
  data_negocio: string;
  /** Percentual de comissão (0 a 100), definido pelo usuário — use `formatPercent`. */
  porcentagem_comissao: number | null;
  /** Comissão em R$, calculada pela API (valor_total × porcentagem_comissao / 100). */
  comissao: number | null;
  valor_unidade: number;
  observacao: string | null;
  // Calculadas pela API a partir dos `gados` vinculados — não enviar no POST/PATCH.
  // Exceção: na modalidade "cabeca" qtd_animais é informado via PATCH e valor_total
  // é recalculado pela API (qtd_animais × valor_unidade); valor_medio, mais_pesado e
  // mais_leve ficam null.
  valor_total: number | null;
  valor_medio: number | null;
  qtd_animais: number | null;
  mais_pesado: number | null;
  mais_leve: number | null;
};

export type Gado = {
  gado_id: number;
  negocio_id: number;
  peso_total: number;
  data_pesagem: string;
  genero: Genero;
  denominacao: string;
  rendimento_carcaca: number;
  /** Registrado pela API no cadastro — use `formatHora`. */
  horario_pesagem: string | null;
  /** Mês (1 a 12). */
  carimbo: number;
  /** Ano do carimbo, ex: "2025". */
  ano_carimbo: string;
  // Calculadas pela API a partir de peso_total e do rendimento_carcaca do próprio gado.
  peso_calculo: number;
  peso_arroba: number;
  valor_total: number | null;
};

export type NegocioDetail = Negocio & {
  gados: Gado[];
  comprador: Comprador;
  vendedor: Vendedor;
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
  inscricao_estadual: string;
  /** finalUrl de POST /uploads/marca-fazenda; `null` remove a imagem (PATCH). */
  marca_url?: string | null;
  marca_escrita?: string;
};
export type UpdateFazendaInput = Partial<CreateFazendaInput>;

export type CreateVendedorInput = {
  nome_vendedor: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
  fazenda_ids?: number[];
};
export type UpdateVendedorInput = Partial<CreateVendedorInput>;

export type CreateCompradorInput = Omit<Comprador, "comprador_id">;
export type UpdateCompradorInput = Partial<CreateCompradorInput>;

export type CreateNegocioInput = {
  empresa_id: number;
  fazenda_id: number;
  vendedor_id: number;
  comprador_id: number;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_lote: TipoLote;
  data_negocio: string;
  /** Percentual (0 a 100); a API calcula `comissao` em R$. */
  porcentagem_comissao?: number;
  valor_unidade: number;
  observacao?: string;
};
export type UpdateNegocioInput = Partial<CreateNegocioInput> & {
  /** Só aceito pela API para negócios da modalidade "cabeca". */
  qtd_animais?: number;
  /** Ignorado pela API (recalculado no servidor) — enviado só como referência. */
  valor_total?: number;
};

export type CreateGadoInput = {
  negocio_id: number;
  peso_total: number;
  rendimento_carcaca: number;
  data_pesagem: string;
  genero: Genero;
  denominacao: string;
  carimbo: number;
  ano_carimbo: string;
};

export type UpdateGadoInput = Partial<CreateGadoInput>;

/** Só para gados vindos da fila offline: hora local da pesagem no aparelho ("HH:mm:ss"). */
export type CreateGadoOfflineInput = CreateGadoInput & OrigemOffline & { horario_pesagem?: string };
