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
};

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
};

export type Vendedor = {
  vendedor_id: number;
  fazenda_id: number;
  nome_vendedor: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
};

export type Modalidade = "arroba" | "kg" | "cabeca";
export type TipoGado = "Gordo" | "Magro";
export type TipoLote = "Vaca" | "Boi" | "Novilha" | "Garrote" | "Bezerro" | "Variados";
export type Genero = "Macho" | "Femea";

export type Negocio = {
  negocio_id: number;
  empresa_id: number;
  fazenda_id: number;
  marchante: string;
  comprador: string | null;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_lote: TipoLote;
  tipo_precificacao: string;
  rendimento_carcaca: number;
  data_negocio: string;
  comissao: number;
  valor_arroba: number;
  observacao: string | null;
  // Calculadas pela API a partir dos `gados` vinculados — não enviar no POST/PATCH.
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
  era: number;
  carimbo: number;
  // Calculadas pela API a partir de peso_total e do rendimento_carcaca do negócio pai.
  peso_calculo: number;
  peso_arroba: number;
  valor_total: number | null;
};

export type NegocioDetail = Negocio & {
  gados: Gado[];
};

export type LoginResponse = {
  access_token: string;
  usuario: Usuario;
};

// Inputs para POST/PATCH — campos e limites conferidos no Swagger ao vivo
// (localhost:3001/docs-json), não apenas em INTEGRACAO-FRONTEND.md.

export type CreateFazendaInput = {
  nome_fazenda: string;
  municipio: string;
  inscricao_estadual: string;
};
export type UpdateFazendaInput = Partial<CreateFazendaInput>;

export type CreateVendedorInput = {
  fazenda_id: number;
  nome_vendedor: string;
  fisico_juridico: "fisico" | "juridico";
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  chave_pix: string;
};
export type UpdateVendedorInput = Partial<CreateVendedorInput>;

export type CreateNegocioInput = {
  empresa_id: number;
  fazenda_id: number;
  marchante: string;
  comprador: string;
  modalidade: Modalidade;
  tipo_gado: TipoGado;
  tipo_lote: TipoLote;
  tipo_precificacao: string;
  rendimento_carcaca: number;
  data_negocio: string;
  comissao: number;
  valor_arroba: number;
  observacao: string;
};
export type UpdateNegocioInput = Partial<CreateNegocioInput>;

export type CreateGadoInput = {
  negocio_id: number;
  peso_total: number;
  data_pesagem: string;
  genero: Genero;
  denominacao: string;
  era: number;
  carimbo: number;
};
