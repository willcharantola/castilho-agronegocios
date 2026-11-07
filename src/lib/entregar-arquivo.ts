import { saveAs } from "file-saver";
import type { AcaoAviso, TipoAviso } from "@/components/aviso";

type Avisar = (mensagem: string, tipo?: TipoAviso, acao?: AcaoAviso) => void;

/**
 * Entrega um arquivo gerado no aparelho. No celular, abre o compartilhamento nativo só com
 * o arquivo: o `saveAs` lá abre o PDF num endereço blob:, e compartilhar dali levava junto o
 * texto "blob" e o link. No computador (ou sem Web Share de arquivos), baixa direto.
 *
 * Devolve "pedir-toque" quando o navegador recusa o compartilhamento porque o toque que
 * iniciou a geração já expirou (a geração leva alguns segundos): quem chamou mostra um botão
 * e chama `compartilharArquivo` no clique dele.
 */
export async function entregarArquivo(arquivo: File): Promise<"ok" | "pedir-toque"> {
  if (!podeCompartilhar(arquivo)) {
    saveAs(arquivo, arquivo.name);
    return "ok";
  }
  try {
    await compartilharArquivo(arquivo);
    return "ok";
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "pedir-toque";
    throw err;
  }
}

/** Compartilha só o arquivo (sem title, text ou url). Cancelar a folha não é erro. */
export async function compartilharArquivo(arquivo: File) {
  try {
    await navigator.share({ files: [arquivo] });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    throw err;
  }
}

function podeCompartilhar(arquivo: File) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  // Windows/Mac também têm Web Share, mas lá o esperado é baixar o arquivo.
  const toque = window.matchMedia("(pointer: coarse)").matches;
  return toque && navigator.canShare({ files: [arquivo] });
}

/** Aviso com o botão "Compartilhar", para quando `entregarArquivo` devolve "pedir-toque". */
export function oferecerCompartilhamento(avisar: Avisar, arquivo: File) {
  avisar("Relatório pronto.", "sucesso", {
    rotulo: "Compartilhar",
    executar: () => {
      compartilharArquivo(arquivo).catch(() => saveAs(arquivo, arquivo.name));
    },
  });
}
