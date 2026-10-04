import type { Modalidade } from "@/lib/api/types";

const KG_PER_ARROBA = 15;

/**
 * Prévia dos valores calculados de um gado — mesma fórmula do backend
 * (GadosService.calcularValores), que continua sendo a fonte autoritativa ao salvar.
 * Usada no formulário (tempo real) e para exibir gados ainda pendentes de sincronização.
 */
export function estimarValoresGado(
  modalidade: Modalidade,
  pesoTotal: number,
  rendimento: number,
  valorUnidade: number
) {
  switch (modalidade) {
    case "arroba": {
      const pesoCalculo = pesoTotal * (rendimento / 100);
      // Valor exato, sem arredondamento (a pedido do cliente).
      const pesoArroba = pesoCalculo > 0 ? pesoCalculo / KG_PER_ARROBA : 0;
      return { pesoCalculo, pesoArroba, valorTotal: pesoArroba * valorUnidade };
    }
    case "kg":
      return { pesoCalculo: 0, pesoArroba: 0, valorTotal: valorUnidade * pesoTotal };
    case "cabeca":
      return { pesoCalculo: 0, pesoArroba: 0, valorTotal: valorUnidade };
  }
}
