/**
 * Datas do sistema. Regra única para não haver dia a menos/a mais:
 *
 * - `data_negocio` é uma DATA DE CALENDÁRIO: o banco guarda a meia-noite UTC do dia
 *   ("2026-11-24T00:00:00.000Z" = dia 24). Nunca converter para o fuso do aparelho — em
 *   Cuiabá (UTC-4) a meia-noite UTC cai às 20h do dia anterior. Só a parte da data conta.
 * - `data_pesagem` é um INSTANTE (UTC): é exibida no fuso da empresa.
 * - "Hoje" é o dia no fuso da empresa, calculado no momento do uso.
 *
 * Sem dependências do app: usado também pelos testes (node --test).
 */

/** Fuso da empresa (Mato Grosso do Sul / Mato Grosso). */
export const FUSO_EMPRESA = "America/Cuiaba";

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * "YYYY-MM-DD" de uma data de negócio — aceita "2026-11-24" ou o ISO completo da API
 * ("2026-11-24T00:00:00.000Z"). Sem fuso: são os 10 primeiros caracteres.
 */
export function diaDoNegocio(valor: string | null | undefined): string | null {
  const m = valor ? DATA_ISO.exec(valor) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Data do negócio em "dd/mm/aaaa", sem converter fuso. Valor inválido → "—". */
export function formatarDataNegocio(valor: string | null | undefined): string {
  const dia = diaDoNegocio(valor);
  if (!dia) return "—";
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

const DATA_HORA_EMPRESA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_EMPRESA,
  dateStyle: "short",
  timeStyle: "medium",
});

const DATA_EMPRESA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_EMPRESA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function instante(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Instante da pesagem (UTC) no fuso da empresa: "24/11/2026 10:30:51". Inválido → "—". */
export function formatarDataHoraPesagem(valor: string | Date | null | undefined): string {
  const data = instante(valor);
  // O pt-BR separa data e hora com vírgula ("24/11/2026, 10:30:51").
  return data ? DATA_HORA_EMPRESA.format(data).replace(", ", " ") : "—";
}

/** Só o dia da pesagem, no fuso da empresa: "24/11/2026". Inválido → "—". */
export function formatarDataPesagem(valor: string | Date | null | undefined): string {
  const data = instante(valor);
  return data ? DATA_EMPRESA.format(data) : "—";
}

/** Hoje no fuso da empresa, "YYYY-MM-DD" (o formato do <input type="date">). */
export function hojeEmCuiaba(agora: Date = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO_EMPRESA });
}

/** Primeiro dia do mês corrente no fuso da empresa, "YYYY-MM-DD". */
export function inicioDoMesEmCuiaba(agora: Date = new Date()): string {
  return `${hojeEmCuiaba(agora).slice(0, 8)}01`;
}
