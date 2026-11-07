/**
 * Compartilhamento nativo de um arquivo gerado no aparelho. No celular, baixar com `saveAs`
 * abre o PDF num endereço blob:, e compartilhar dali levava junto o texto "blob" e o link;
 * aqui vai só o arquivo. O navegador exige um toque recente: chame no clique de um botão.
 */
export async function compartilharArquivo(arquivo: File) {
  try {
    await navigator.share({ files: [arquivo] });
  } catch (err) {
    // Cancelar a folha de compartilhamento não é erro.
    if (err instanceof DOMException && err.name === "AbortError") return;
    throw err;
  }
}

/** Celular/tablet com Web Share de arquivos. Windows/Mac também têm, mas lá o esperado é baixar. */
export function podeCompartilhar(arquivo: File) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches && navigator.canShare({ files: [arquivo] });
}
