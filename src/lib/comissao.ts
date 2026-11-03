/**
 * Regra da comissão, idêntica à da API (api-castilho-agronegocios/src/negocios/calculo.util.ts).
 * No front serve só para formatar e para a prévia: o valor oficial é o `comissao` da API.
 * Sem imports, para os testes rodarem direto no Node (comissao.test.mjs).
 *
 * `porcentagem_comissao` guarda:
 * - "por_arroba": gado Gordo em "arroba" ou "kg" — R$ por arroba de peso vivo;
 * - "percentual": demais casos (Gordo por cabeça e Reposição) — % do valor total.
 */
export type ModoComissao = "por_arroba" | "percentual";

const KG_POR_ARROBA = 15;

export function modoComissao(tipoGado: string, modalidade: string): ModoComissao {
  return tipoGado === "Gordo" && (modalidade === "arroba" || modalidade === "kg") ? "por_arroba" : "percentual";
}

/** R$ com 2 casas, ROUND_HALF_UP (toPrecision tira o ruído do ponto flutuante: 5,005 → 5,01). */
function arredondarCentavos(valor: number) {
  return Math.round(Number((valor * 100).toPrecision(12))) / 100;
}

/**
 * Comissão em R$. Por arroba usa o peso vivo (peso total ÷ 15) sem arredondar a arroba:
 * 2,00 × 350 ÷ 15 = 46,666… → 46,67. Sem valor informado → null; sem cabeças → 0.
 */
export function calcularComissao(p: {
  tipoGado: string;
  modalidade: string;
  valorTotal: number;
  pesoTotalQuilos: number;
  valorInformado: number | null;
}): number | null {
  if (p.valorInformado == null) return null;
  const bruto =
    modoComissao(p.tipoGado, p.modalidade) === "por_arroba"
      ? (p.valorInformado * p.pesoTotalQuilos) / KG_POR_ARROBA
      : (p.valorTotal * p.valorInformado) / 100;
  return arredondarCentavos(bruto);
}

/** Modo do negócio: o que a API mandou (`modo_comissao`) ou, offline/pendente, a regra local. */
export function modoDoNegocio(negocio: {
  modo_comissao?: ModoComissao | null;
  tipo_gado: string;
  modalidade: string;
}): ModoComissao {
  return negocio.modo_comissao ?? modoComissao(negocio.tipo_gado, negocio.modalidade);
}

/** Critério informado, formatado: "R$ 2,00/@" (por arroba) ou "1,50%" (percentual). */
export function formatarCriterioComissao(valor: number, modo: ModoComissao) {
  const numero = valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return modo === "por_arroba" ? `R$ ${numero}/@` : `${numero}%`;
}
