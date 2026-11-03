// Testes da regra da comissão (mesmos casos da API). Rodar com `npm test` (Node 23.6+,
// que executa o .ts removendo os tipos).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularComissao, formatarCriterioComissao, modoComissao, modoDoNegocio } from "./comissao.ts";

describe("modoComissao", () => {
  for (const [tipoGado, modalidade, modo] of [
    ["Gordo", "arroba", "por_arroba"],
    ["Gordo", "kg", "por_arroba"],
    ["Gordo", "cabeca", "percentual"],
    ["Reposicao", "arroba", "percentual"],
    ["Reposicao", "kg", "percentual"],
    ["Reposicao", "cabeca", "percentual"],
  ]) {
    it(`${tipoGado} + ${modalidade} → ${modo}`, () => {
      assert.equal(modoComissao(tipoGado, modalidade), modo);
    });
  }
});

describe("calcularComissao", () => {
  const base = { valorTotal: 10000, pesoTotalQuilos: 0, valorInformado: 2 };

  it("Gordo + arroba: R$ por arroba de peso vivo, sem arredondar a arroba", () => {
    // 2 × 350 ÷ 15 = 46,666… → 46,67
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "arroba", pesoTotalQuilos: 350 }), 46.67);
    // 3 animais de 350 kg
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "arroba", pesoTotalQuilos: 1050 }), 140);
  });

  it("Gordo + kg: mesma regra (peso vivo ÷ 15)", () => {
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "kg", pesoTotalQuilos: 350 }), 46.67);
  });

  it("Gordo + cabeca: percentual do valor total", () => {
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "cabeca", valorInformado: 1.5 }), 150);
  });

  for (const modalidade of ["arroba", "kg", "cabeca"]) {
    it(`Reposicao + ${modalidade}: percentual do valor total`, () => {
      assert.equal(
        calcularComissao({ ...base, tipoGado: "Reposicao", modalidade, pesoTotalQuilos: 350, valorInformado: 1.5 }),
        150
      );
    });
  }

  it("sem gados pesados a comissão por arroba é 0", () => {
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "arroba" }), 0);
  });

  it("sem valor informado → null", () => {
    assert.equal(calcularComissao({ ...base, tipoGado: "Gordo", modalidade: "arroba", valorInformado: null }), null);
  });

  it("arredonda só o resultado final (ROUND_HALF_UP), como a API", () => {
    const pct = (valorTotal) =>
      calcularComissao({ tipoGado: "Reposicao", modalidade: "kg", valorTotal, pesoTotalQuilos: 0, valorInformado: 0.5 });
    assert.equal(pct(1000.5), 5); // 5,0025
    assert.equal(pct(1001), 5.01); // 5,005
  });
});

describe("formatarCriterioComissao", () => {
  it("por arroba e percentual", () => {
    assert.equal(formatarCriterioComissao(2, "por_arroba"), "R$ 2,00/@");
    assert.equal(formatarCriterioComissao(1.5, "percentual"), "1,50%");
  });

  it("modoDoNegocio usa o da API e, sem ele, a regra local", () => {
    assert.equal(modoDoNegocio({ modo_comissao: "percentual", tipo_gado: "Gordo", modalidade: "arroba" }), "percentual");
    assert.equal(modoDoNegocio({ modo_comissao: null, tipo_gado: "Gordo", modalidade: "kg" }), "por_arroba");
  });
});
