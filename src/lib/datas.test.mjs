// Testes das datas (lib/datas.ts). Rodar com `npm test` (Node 23.6+, que executa o .ts
// removendo os tipos). Cada caso roda com o aparelho em fusos diferentes: o resultado não
// pode depender do fuso do aparelho.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  diaDoNegocio,
  formatarDataHoraPesagem,
  formatarDataNegocio,
  formatarDataPesagem,
  hojeEmCuiaba,
  inicioDoMesEmCuiaba,
} from "./datas.ts";

const FUSOS = ["America/Cuiaba", "UTC", "America/Sao_Paulo", "Asia/Tokyo"];
const TZ_ORIGINAL = process.env.TZ;

afterEach(() => {
  if (TZ_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_ORIGINAL;
});

for (const fuso of FUSOS) {
  describe(`aparelho em ${fuso}`, () => {
    it("data do negócio (meia-noite UTC) mostra o próprio dia", () => {
      process.env.TZ = fuso;
      assert.equal(formatarDataNegocio("2026-11-24T00:00:00.000Z"), "24/11/2026");
      assert.equal(formatarDataNegocio("2026-11-24"), "24/11/2026");
      assert.equal(diaDoNegocio("2026-11-24T00:00:00.000Z"), "2026-11-24");
    });

    it("data da pesagem (instante UTC) sai no horário de Cuiabá", () => {
      process.env.TZ = fuso;
      assert.equal(formatarDataHoraPesagem("2026-11-24T14:30:51.000Z"), "24/11/2026 10:30:51");
      assert.equal(formatarDataPesagem("2026-11-24T14:30:51.000Z"), "24/11/2026");
      // 02:00 UTC do dia 25 ainda é dia 24 em Cuiabá.
      assert.equal(formatarDataPesagem("2026-11-25T02:00:00.000Z"), "24/11/2026");
    });

    it("negócio criado às 21h em Cuiabá fica com o dia de hoje", () => {
      process.env.TZ = fuso;
      // 24/11/2026 21:00 em Cuiabá (UTC-4) = 25/11/2026 01:00 UTC.
      const as21h = new Date("2026-11-25T01:00:00.000Z");
      assert.equal(hojeEmCuiaba(as21h), "2026-11-24");
      // O que vai para a API (criar-negocio.ts): a própria data, "YYYY-MM-DD".
      assert.equal(diaDoNegocio(hojeEmCuiaba(as21h)), "2026-11-24");
      assert.equal(inicioDoMesEmCuiaba(as21h), "2026-11-01");
    });
  });
}

describe("valores inválidos", () => {
  it("mostram traço em vez de quebrar", () => {
    assert.equal(formatarDataNegocio(null), "—");
    assert.equal(formatarDataNegocio("ontem"), "—");
    assert.equal(formatarDataHoraPesagem(undefined), "—");
    assert.equal(formatarDataPesagem("x"), "—");
  });
});
