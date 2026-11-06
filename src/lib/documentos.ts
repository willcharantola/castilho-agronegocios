// CPF, CNPJ e inscrição estadual: máscara enquanto digita e validação (as mesmas regras da
// API, que também confere e grava formatado).

/** Só os dígitos. */
const digitos = (valor: string) => valor.replace(/\D/g, "");

/** Mesmo dígito repetido (000.000.000-00) passa no cálculo, mas é inválido. */
const repetido = (d: string) => /^(\d)\1*$/.test(d);

/** Dígito verificador módulo 11 com os pesos dados (resto < 2 → 0). */
function dv(base: string, pesos: number[]) {
  const soma = [...base].reduce((total, c, i) => total + Number(c) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const d = digitos(valor);
  if (d.length !== 11 || repetido(d)) return false;
  const primeiro = dv(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = dv(d.slice(0, 9) + primeiro, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${primeiro}${segundo}`);
}

export function cnpjValido(valor: string): boolean {
  const d = digitos(valor);
  if (d.length !== 14 || repetido(d)) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const primeiro = dv(d.slice(0, 12), pesos.slice(1));
  const segundo = dv(d.slice(0, 12) + primeiro, pesos);
  return d.endsWith(`${primeiro}${segundo}`);
}

/** Máscara do CPF enquanto digita: "12345678909" → "123.456.789-09" (até 11 dígitos). */
export function mascaraCpf(valor: string): string {
  return digitos(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** Máscara do CNPJ enquanto digita: "12345678000190" → "12.345.678/0001-90" (até 14 dígitos). */
export function mascaraCnpj(valor: string): string {
  return digitos(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Inscrição estadual de MS: 9 dígitos, no formato 00.000.000-0. */
export const INSCRICAO_ESTADUAL = /^\d{2}\.\d{3}\.\d{3}-\d$/;

/** Máscara da inscrição estadual enquanto digita: "287666883" → "28.766.688-3". */
export function mascaraInscricaoEstadual(valor: string): string {
  return digitos(valor)
    .slice(0, 9)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)$/, ".$1-$2");
}
