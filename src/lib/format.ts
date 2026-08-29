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
