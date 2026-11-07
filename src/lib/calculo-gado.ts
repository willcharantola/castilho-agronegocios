import type { Lote, Modalidade, TipoGado, TipoNegocio } from "@/lib/api/types";

const KG_PER_ARROBA = 15;

/** Quilos por arroba: 30 para Reposição na modalidade "kg"; 15 nos demais casos (como a API). */
export function kgPorArroba(modalidade: Modalidade, tipoGado: TipoGado) {
  return modalidade === "kg" && tipoGado === "Reposicao" ? 30 : KG_PER_ARROBA;
}

/**
 * Prévia dos valores calculados de uma cabeça — mesma fórmula do backend (calcularGado),
 * que continua sendo a fonte autoritativa ao salvar. `rendimento` e `valorUnidade` são os do
 * lote escolhido. Usada no formulário (tempo real) e para exibir
 * cabeças ainda pendentes de sincronização.
 */
export function estimarValoresGado(
  modalidade: Modalidade,
  pesoTotal: number,
  rendimento: number,
  valorUnidade: number,
  tipoGado: TipoGado
) {
  // Valores exatos, sem arredondamento (a pedido do cliente).
  switch (modalidade) {
    case "arroba": {
      const pesoCalculo = (pesoTotal * rendimento) / 100;
      const pesoArroba = pesoCalculo / KG_PER_ARROBA;
      return { pesoCalculo, pesoArroba, valorTotal: pesoArroba * valorUnidade };
    }
    case "kg":
      // Sem rendimento: o peso de cálculo é o próprio peso. A arroba é só informativa.
      return {
        pesoCalculo: pesoTotal,
        pesoArroba: pesoTotal / kgPorArroba(modalidade, tipoGado),
        valorTotal: pesoTotal * valorUnidade,
      };
    case "cabeca":
      return { pesoCalculo: 0, pesoArroba: 0, valorTotal: valorUnidade };
  }
}

/**
 * Prévia de uma cabeça no formato gravado (guardada também para cabeças na fila offline):
 * rendimento e preço do lote, modalidade e tipo de gado do negócio.
 */
export function estimarGado(
  negocio: { modalidade: Modalidade; tipo_gado: TipoGado },
  lote: Pick<Lote, "rendimento_carcaca" | "valor_unidade">,
  pesoTotal: number
) {
  const v = estimarValoresGado(
    negocio.modalidade,
    pesoTotal,
    lote.rendimento_carcaca,
    lote.valor_unidade,
    negocio.tipo_gado
  );
  return { peso_calculo: v.pesoCalculo, peso_arroba: v.pesoArroba, valor_total: v.valorTotal };
}

/** R$ com 2 casas (meio centavo para cima), como a API. */
export const centavos = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

/**
 * Funrural, Senar e líquido estimados no aparelho, pela mesma regra da API: o imposto do
 * tipo de negócio sobre o bruto ("Livre" não tem nenhum) e líquido = bruto − impostos.
 * Sem alíquotas (negócio ainda só no aparelho), os três ficam null.
 */
export function estimarImpostos(
  negocio: { tipo_negocio: TipoNegocio; aliquota_funrural: number | null; aliquota_senar: number | null },
  bruto: number
): { funrural: number | null; senar: number | null; valor_total_liquido: number | null } {
  if (negocio.aliquota_funrural === null || negocio.aliquota_senar === null) {
    return { funrural: null, senar: null, valor_total_liquido: null };
  }
  const funrural = negocio.tipo_negocio === "Funrural" ? centavos((bruto * negocio.aliquota_funrural) / 100) : 0;
  const senar = negocio.tipo_negocio === "Desconto em folha" ? centavos((bruto * negocio.aliquota_senar) / 100) : 0;
  return { funrural, senar, valor_total_liquido: centavos(bruto - funrural - senar) };
}
