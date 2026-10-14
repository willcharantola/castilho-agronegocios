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

/** Percentual já em pontos (5 → "5%", 2.5 → "2,5%"). */
export function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** The DB stores genero without accents ("Femea") — display it properly. */
export function formatGenero(genero: string) {
  return genero === "Femea" ? "Fêmea" : genero;
}

/** Colunas TIME chegam como ISO em 1970-01-01 (UTC) — devolve "HH:mm". */
export function formatHora(iso: string | null | undefined) {
  return iso ? iso.slice(11, 16) : "";
}

/** Formata uma data local como "YYYY-MM-DD", sem passar por UTC (evita o
 * clássico off-by-one de `toISOString()` perto da virada do dia). */
export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
