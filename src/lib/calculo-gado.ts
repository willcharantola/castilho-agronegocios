import type { Lote, Modalidade, TipoGado } from "@/lib/api/types";

const KG_PER_ARROBA = 15;

/** Quilos por arroba: 30 para Reposição na modalidade "kg"; 15 nos demais casos (como a API). */
export function kgPorArroba(modalidade: Modalidade, tipoGado: TipoGado) {
  return modalidade === "kg" && tipoGado === "Reposicao" ? 30 : KG_PER_ARROBA;
}

/**
 * Prévia dos valores calculados de uma cabeça — mesma fórmula do backend (calcularGado),
 * que continua sendo a fonte autoritativa ao salvar. `rendimento` é o do lote escolhido e
 * `valorUnidade`, o preço do negócio. Usada no formulário (tempo real) e para exibir
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
 * rendimento do lote, preço e tipo de gado do negócio.
 */
export function estimarGado(
  negocio: { modalidade: Modalidade; tipo_gado: TipoGado; valor_unidade: number },
  lote: Pick<Lote, "rendimento_carcaca">,
  pesoTotal: number
) {
  const v = estimarValoresGado(
    negocio.modalidade,
    pesoTotal,
    lote.rendimento_carcaca,
    negocio.valor_unidade,
    negocio.tipo_gado
  );
  return { peso_calculo: v.pesoCalculo, peso_arroba: v.pesoArroba, valor_total: v.valorTotal };
}
