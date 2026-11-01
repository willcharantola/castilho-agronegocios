import type { Lote, Modalidade } from "@/lib/api/types";

const KG_PER_ARROBA = 15;

/**
 * Prévia dos valores calculados de uma cabeça — mesma fórmula do backend (calcularGado),
 * que continua sendo a fonte autoritativa ao salvar. `rendimento` e `valorUnidade` são
 * os do lote escolhido. Usada no formulário (tempo real) e para exibir cabeças ainda
 * pendentes de sincronização.
 */
export function estimarValoresGado(
  modalidade: Modalidade,
  pesoTotal: number,
  rendimento: number,
  valorUnidade: number
) {
  // Valores exatos, sem arredondamento (a pedido do cliente).
  switch (modalidade) {
    case "arroba": {
      const pesoCalculo = (pesoTotal * rendimento) / 100;
      const pesoArroba = pesoCalculo / KG_PER_ARROBA;
      return { pesoCalculo, pesoArroba, valorTotal: pesoArroba * valorUnidade };
    }
    case "kg":
      // Sem rendimento: o peso de cálculo é o próprio peso.
      return { pesoCalculo: pesoTotal, pesoArroba: pesoTotal / KG_PER_ARROBA, valorTotal: pesoTotal * valorUnidade };
    case "cabeca":
      return { pesoCalculo: 0, pesoArroba: 0, valorTotal: valorUnidade };
  }
}

/** Prévia de uma cabeça no formato gravado (guardada também para cabeças na fila offline). */
export function estimarGado(
  modalidade: Modalidade,
  lote: Pick<Lote, "rendimento_carcaca" | "valor_unidade">,
  pesoTotal: number
) {
  const v = estimarValoresGado(modalidade, pesoTotal, lote.rendimento_carcaca, lote.valor_unidade);
  return { peso_calculo: v.pesoCalculo, peso_arroba: v.pesoArroba, valor_total: v.valorTotal };
}
