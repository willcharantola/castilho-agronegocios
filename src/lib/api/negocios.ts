/**
 * Shapes returned by /api/negocios and /api/negocios/[id]. Numeric/decimal
 * database columns are normalized to plain `number` here so the frontend
 * never has to know how the DB driver represents them.
 */
export type NegocioListItem = {
  negocioId: number;
  fazenda: string;
  vendedor: string;
  dataNegocio: string;
  comissao: number;
  qtdAnimais: number | null;
};

export type GadoItem = {
  gadoId: number;
  denominacao: string;
  genero: string;
  pesoTotal: number;
  pesoCalculo: number;
  pesoArroba: number;
  valorTotal: number | null;
};

export type NegocioDetail = NegocioListItem & {
  merchant: string;
  comprador: string | null;
  rendimentoCarcaca: number;
  valorArroba: number;
  modalidade: string;
  valorTotal: number | null;
  valorMedio: number | null;
  gados: GadoItem[];
};
