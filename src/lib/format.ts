export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Até 2 casas, sem zeros desnecessários (1.5 → "1,5", 0.2 → "0,2", 2 → "2"). */
export function formatDecimalCurto(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Percentual já em pontos (5 → "5%", 2.5 → "2,5%"). */
export function formatPercent(value: number) {
  return `${formatDecimalCurto(value)}%`;
}

/** The DB stores genero without accents ("Femea") — display it properly. */
export function formatGenero(genero: string) {
  return genero === "Femea" ? "Fêmea" : genero;
}

/** Datas (negócio, pesagem, "hoje"): ver lib/datas.ts. */

/** Colunas TIME chegam como ISO em 1970-01-01 (UTC) — devolve "HH:mm". */
export function formatHora(iso: string | null | undefined) {
  return iso ? iso.slice(11, 16) : "";
}

/** Nome da fazenda para exibição, com "Fazenda" na frente (sem repetir se o cadastro já começar assim). */
export function formatFazenda(nome: string) {
  const limpo = nome.trim();
  if (limpo === "" || /^fazenda(\s|$)/i.test(limpo)) return limpo;
  return `Fazenda ${limpo}`;
}
