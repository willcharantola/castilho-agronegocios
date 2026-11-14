import { ApiError } from "@/lib/api-client";

/** `fetch` rejeita com TypeError quando não há rede (sem resposta do servidor). */
export function ehErroDeRede(err: unknown): boolean {
  return !(err instanceof ApiError) && err instanceof TypeError;
}

/** `navigator.onLine` só reflete a interface de rede, mas `false` é confiável. */
export function semConexao(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** Hora local do aparelho, "HH:mm:ss" — para horários de registros feitos offline. */
export function horaLocalAtual(): string {
  const agora = new Date();
  return [agora.getHours(), agora.getMinutes(), agora.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function novoUuid(): string {
  return crypto.randomUUID();
}

/** Mensagem para exibir num formulário, trocando o "Failed to fetch" do navegador. */
export function mensagemDeErro(err: unknown, padrao = "Erro ao salvar."): string {
  if (ehErroDeRede(err)) return "Sem conexão com a internet. Tente novamente quando estiver online.";
  return err instanceof Error ? err.message : padrao;
}

/**
 * Endereço da tela do negócio. Um negócio ainda não sincronizado (id temporário, negativo)
 * usa a rota fixa /negocios/detalhe?id=…: ela fica salva no aparelho desde a instalação e
 * abre offline, enquanto /negocios/[id] só abre offline para ids já visitados.
 */
export function hrefNegocio(negocioId: number) {
  return negocioId > 0 ? `/negocios/${negocioId}` : `/negocios/detalhe?id=${negocioId}`;
}
