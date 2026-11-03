import PizZip from "pizzip";

const PT_POR_EMU = 1 / 12700;

/**
 * Corrige, só na cópia que vai para a conversão, duas coisas do Word que o docx-preview
 * ignora e que nos modelos do romaneio levam conteúdo para fora da página (cortado):
 * - recuo de tabela (`<w:tblInd w:w="-825">`: ele só lê `left`/`start`) — as tabelas são
 *   puxadas para a margem esquerda com recuo negativo; o valor é repetido em `w:start`;
 * - deslocamento horizontal das imagens ancoradas no cabeçalho (`<wp:posOffset>`), que
 *   alinha a faixa do logotipo à borda da página. Ele só o aplica sem quebra de texto, então
 *   os deslocamentos (em pt, na ordem do cabeçalho) voltam para serem aplicados no HTML.
 */
function prepararParaConversao(docx: ArrayBuffer) {
  const zip = new PizZip(docx);
  const documento = zip.file("word/document.xml")?.asText();
  if (documento) {
    zip.file(
      "word/document.xml",
      documento.replace(/<w:tblInd\b([^>]*?)\bw:w="([^"]+)"([^>]*?)\/>/g, (tag, antes, valor, depois) =>
        /\bw:(start|left)=/.test(tag) ? tag : `<w:tblInd${antes}w:w="${valor}" w:start="${valor}"${depois}/>`
      )
    );
  }

  const deslocamentosCabecalho = zip
    .file(/^word\/header\d*\.xml$/)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((arquivo) =>
      Array.from(arquivo.asText().matchAll(/<wp:anchor\b[\s\S]*?<\/wp:anchor>/g), ([ancora]) => {
        const offset = /<wp:positionH\b[^>]*>\s*<wp:posOffset>(-?\d+)<\/wp:posOffset>/.exec(ancora);
        return offset ? Number(offset[1]) * PT_POR_EMU : 0;
      })
    );

  return { arquivo: zip.generate({ type: "arraybuffer" }), deslocamentosCabecalho };
}

/** Aplica os deslocamentos das imagens do cabeçalho (ver prepararParaConversao) a cada página. */
function deslocarImagensDoCabecalho(pagina: HTMLElement, deslocamentos: number[]) {
  const ancoras = pagina.querySelectorAll<HTMLElement>(':scope > header [style*="position: relative"]');
  ancoras.forEach((ancora, i) => {
    if (deslocamentos[i]) ancora.style.left = `${deslocamentos[i]}pt`;
  });
}

/** A4 em pontos, para quando o documento não informa o tamanho da página. */
const A4_PT = { largura: 595.28, altura: 841.89 };

/** "595.3pt" → 595.3; outras unidades (ou vazio) → null. */
function emPontos(valor: string) {
  const match = /^([\d.]+)pt$/.exec(valor.trim());
  return match ? Number(match[1]) : null;
}

function esperarImagens(raiz: HTMLElement) {
  return Promise.all(
    Array.from(raiz.querySelectorAll("img")).map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  );
}

/**
 * Onde a página pode ser cortada sem partir uma linha ao meio: o fim de cada linha de
 * tabela e de cada parágrafo (px a partir do topo da página), em ordem.
 */
function pontosDeCorte(pagina: HTMLElement) {
  const topo = pagina.getBoundingClientRect().top;
  // Parágrafos dentro de células não contam: a célula vizinha pode ter mais linhas.
  const elementos = Array.from(pagina.querySelectorAll("tr, p")).filter((el) => el.tagName === "TR" || !el.closest("td"));
  const fins = elementos.map((el) => Math.ceil(el.getBoundingClientRect().bottom - topo));
  return [...new Set(fins)].sort((a, b) => a - b);
}

/**
 * O HTML não tem as quebras automáticas de página do Word: uma página mais alta que o papel
 * é dividida em trechos [início, fim) (px) que cabem numa folha, cortando entre linhas. Da
 * segunda folha em diante o trecho fica entre as margens de cima e de baixo.
 */
function fatiar(pagina: HTMLElement, folha: number, margemTopo: number, margemBase: number) {
  const cortes = pontosDeCorte(pagina);
  const fimConteudo = cortes.at(-1) ?? 0;
  if (fimConteudo <= folha - margemBase) return [{ inicio: 0, fim: Math.min(folha, pagina.offsetHeight) }];

  const fatias: { inicio: number; fim: number }[] = [];
  let inicio = 0;
  while (inicio < fimConteudo) {
    const espaco = fatias.length === 0 ? folha - margemBase : folha - margemTopo - margemBase;
    // Uma linha sozinha mais alta que a folha não tem onde ser cortada: corta no limite.
    const fim = cortes.filter((c) => c > inicio && c <= inicio + espaco).at(-1) ?? inicio + espaco;
    fatias.push({ inicio, fim: Math.min(fim, fimConteudo) });
    inicio = fim;
  }
  return fatias;
}

/**
 * Converte um .docx em PDF no próprio navegador (funciona sem servidor): o documento é
 * desenhado como HTML (docx-preview), cada página vira imagem (html2canvas-pro) e as
 * imagens formam o PDF (jsPDF). O texto do PDF não é selecionável. As bibliotecas só são
 * baixadas quando a função é chamada.
 */
export async function docxParaPdf(docx: Blob): Promise<Blob> {
  const [{ renderAsync }, { default: html2canvas }, { jsPDF }] = await Promise.all([
    import("docx-preview"),
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  // Fora da tela, mas no DOM: o layout precisa existir para ser fotografado.
  const palco = document.createElement("div");
  palco.setAttribute("aria-hidden", "true");
  palco.style.cssText = "position:fixed;top:0;left:-100000px;background:#fff;";
  document.body.appendChild(palco);

  try {
    const { arquivo, deslocamentosCabecalho } = prepararParaConversao(await docx.arrayBuffer());
    await renderAsync(arquivo, palco, undefined, {
      inWrapper: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      // Imagens em base64: o html2canvas lê sem depender de URLs temporárias.
      useBase64URL: true,
    });
    await document.fonts?.ready;
    await esperarImagens(palco);

    const paginas = Array.from(palco.querySelectorAll<HTMLElement>("section.docx"));
    if (paginas.length === 0) throw new Error("Não foi possível converter o romaneio em PDF.");

    let pdf: InstanceType<typeof jsPDF> | null = null;
    for (const pagina of paginas) {
      deslocarImagensDoCabecalho(pagina, deslocamentosCabecalho);
      const largura = emPontos(pagina.style.width) ?? A4_PT.largura;
      const altura = emPontos(pagina.style.minHeight) ?? A4_PT.altura;
      const orientacao = largura > altura ? "landscape" : "portrait";

      // px do HTML → pt do PDF e → px do canvas.
      const ptPorPx = largura / pagina.offsetWidth;
      const estilo = getComputedStyle(pagina);
      const margemTopo = parseFloat(estilo.paddingTop) || 0;
      const fatias = fatiar(pagina, altura / ptPorPx, margemTopo, parseFloat(estilo.paddingBottom) || 0);

      const canvas = await html2canvas(pagina, { scale: 2, backgroundColor: "#ffffff" });
      const escala = canvas.width / pagina.offsetWidth;

      fatias.forEach(({ inicio, fim }, i) => {
        const fatia = document.createElement("canvas");
        fatia.width = canvas.width;
        fatia.height = Math.max(1, Math.round((fim - inicio) * escala));
        fatia
          .getContext("2d")!
          .drawImage(canvas, 0, Math.round(inicio * escala), canvas.width, fatia.height, 0, 0, canvas.width, fatia.height);

        if (!pdf) pdf = new jsPDF({ unit: "pt", format: [largura, altura], orientation: orientacao });
        else pdf.addPage([largura, altura], orientacao);
        // A continuação de uma página começa abaixo da margem de cima, como no Word.
        const y = i === 0 ? 0 : margemTopo * ptPorPx;
        pdf.addImage(fatia.toDataURL("image/jpeg", 0.92), "JPEG", 0, y, largura, (fim - inicio) * ptPorPx);
      });
    }

    return pdf!.output("blob");
  } finally {
    palco.remove();
  }
}
