import type { Modalidade, RacaRendimento, RendimentosNegocio } from "@/lib/api/types";
import { CAMPO_RENDIMENTO } from "@/lib/labels";

const KG_PER_ARROBA = 15;

/** Percentual de rendimento da categoria do animal no negócio. */
export function rendimentoDaRaca(rendimentos: RendimentosNegocio, raca: RacaRendimento) {
  return rendimentos[CAMPO_RENDIMENTO[raca]];
}

/**
 * Prévia dos valores calculados de um gado — mesma fórmula do backend
 * (calcularValoresGado), que continua sendo a fonte autoritativa ao salvar.
 * `rendimento` é o percentual da categoria do animal no negócio (100 em "kg").
 * Usada no formulário (tempo real) e para exibir gados ainda pendentes de sincronização.
 */
export function estimarValoresGado(
  modalidade: Modalidade,
  pesoTotal: number,
  rendimento: number,
  valorUnidade: number
) {
  // Valores exatos, sem arredondamento (a pedido do cliente).
  const pesoCalculo = (pesoTotal * rendimento) / 100;
  const pesoArroba = pesoCalculo / KG_PER_ARROBA;
  switch (modalidade) {
    case "arroba":
      return { pesoCalculo, pesoArroba, valorTotal: pesoArroba * valorUnidade };
    case "kg":
      return { pesoCalculo, pesoArroba, valorTotal: valorUnidade * pesoTotal };
    case "cabeca":
      return { pesoCalculo: 0, pesoArroba: 0, valorTotal: valorUnidade };
  }
}
