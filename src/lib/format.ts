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
