import PizZip from "pizzip";

const PT_POR_EMU = 1 / 12700;

/** Marca d'água do Word (imagem VML no cabeçalho), tirada do documento para ser desenhada no PDF. */
type MarcaDagua = { dataUrl: string; larguraPt: number; alturaPt: number };

const TIPOS_IMAGEM: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };

/**
 * O docx-preview desenha a marca d'água (`<v:shape id="WordPictureWatermark…">`) onde está o
 * cabeçalho, ignorando o "centralizado na página" do Word (mso-position-*: center), e o
 * cabeçalho só aparece na primeira folha de uma página longa. Ela sai do cabeçalho aqui e é
 * desenhada depois, centralizada entre as margens, atrás do texto de cada folha do PDF.
 */
function extrairMarcaDagua(zip: PizZip): MarcaDagua | null {
  for (const arquivo of zip.file(/^word\/header\d*\.xml$/)) {
    const xml = arquivo.asText();
    const pict = /<w:pict\b(?:(?!<\/w:pict>)[\s\S])*?WordPictureWatermark[\s\S]*?<\/w:pict>/.exec(xml);
    if (!pict) continue;
    const largura = /width:\s*([\d.]+)pt/.exec(pict[0]);
    const altura = /height:\s*([\d.]+)pt/.exec(pict[0]);
    const relId = /<v:imagedata\b[^>]*\br:id="([^"]+)"/.exec(pict[0]);
    const rels = zip.file(arquivo.name.replace(/^word\/(.+)$/, "word/_rels/$1.rels"))?.asText() ?? "";
    const alvo = relId ? new RegExp(`Id="${relId[1]}"[^>]*Target="([^"]+)"`).exec(rels) : null;
    const imagem = alvo ? zip.file(`word/${alvo[1].replace(/^\.?\//, "")}`) : null;
    const tipo = alvo ? TIPOS_IMAGEM[alvo[1].split(".").pop()!.toLowerCase()] : undefined;
    if (!largura || !altura || !imagem || !tipo) return null;

    zip.file(arquivo.name, xml.replace(pict[0], ""));
    const base64 = btoa(Array.from(imagem.asUint8Array(), (byte) => String.fromCharCode(byte)).join(""));
    return { dataUrl: `data:${tipo};base64,${base64}`, larguraPt: Number(largura[1]), alturaPt: Number(altura[1]) };
  }
  return null;
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a marca d'água do romaneio."));
    img.src = src;
  });
}

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

  const marcaDagua = extrairMarcaDagua(zip);

  const deslocamentosCabecalho = zip
    .file(/^word\/header\d*\.xml$/)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((arquivo) =>
      Array.from(arquivo.asText().matchAll(/<wp:anchor\b[\s\S]*?<\/wp:anchor>/g), ([ancora]) => {
        const offset = /<wp:positionH\b[^>]*>\s*<wp:posOffset>(-?\d+)<\/wp:posOffset>/.exec(ancora);
        return offset ? Number(offset[1]) * PT_POR_EMU : 0;
      })
    );

  return { arquivo: zip.generate({ type: "arraybuffer" }), deslocamentosCabecalho, marcaDagua };
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
 * baixadas quando a função é chamada. Devolve também as imagens das folhas (JPEG em data
 * URL), usadas na prévia do relatório.
 */
export async function docxParaPdf(docx: Blob): Promise<{ pdf: Blob; folhas: string[] }> {
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
    const { arquivo, deslocamentosCabecalho, marcaDagua } = prepararParaConversao(await docx.arrayBuffer());
    const imagemMarca = marcaDagua ? await carregarImagem(marcaDagua.dataUrl) : null;
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
    const folhas: string[] = [];
    for (const pagina of paginas) {
      deslocarImagensDoCabecalho(pagina, deslocamentosCabecalho);
      const largura = emPontos(pagina.style.width) ?? A4_PT.largura;
      const altura = emPontos(pagina.style.minHeight) ?? A4_PT.altura;
      const orientacao = largura > altura ? "landscape" : "portrait";

      // px do HTML → pt do PDF e → px do canvas.
      const ptPorPx = largura / pagina.offsetWidth;
      const estilo = getComputedStyle(pagina);
      const margemTopo = parseFloat(estilo.paddingTop) || 0;
      const margemBase = parseFloat(estilo.paddingBottom) || 0;
      const margemEsquerda = parseFloat(estilo.paddingLeft) || 0;
      const margemDireita = parseFloat(estilo.paddingRight) || 0;
      const fatias = fatiar(pagina, altura / ptPorPx, margemTopo, margemBase);

      // Fundo transparente: cada folha recebe primeiro o branco e a marca d'água, depois o texto.
      pagina.style.background = "transparent";
      const canvas = await html2canvas(pagina, { scale: 2, backgroundColor: null });
      const escala = canvas.width / pagina.offsetWidth;
      const pxPorPt = escala / ptPorPx;

      fatias.forEach(({ inicio, fim }, i) => {
        // A folha inteira (não só o trecho), para a marca d'água nunca ser cortada.
        const folha = document.createElement("canvas");
        folha.width = canvas.width;
        folha.height = Math.round(altura * pxPorPt);
        const ctx = folha.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, folha.width, folha.height);

        if (imagemMarca && marcaDagua) {
          // Centro da área entre as margens (mso-position-*-relative: margin), como no Word.
          const centroX = (margemEsquerda + (pagina.offsetWidth - margemEsquerda - margemDireita) / 2) * escala;
          const centroY = (margemTopo + (altura / ptPorPx - margemTopo - margemBase) / 2) * escala;
          const w = marcaDagua.larguraPt * pxPorPt;
          const h = marcaDagua.alturaPt * pxPorPt;
          ctx.drawImage(imagemMarca, centroX - w / 2, centroY - h / 2, w, h);
        }

        // A continuação de uma página começa abaixo da margem de cima, como no Word.
        const y = i === 0 ? 0 : Math.round(margemTopo * escala);
        const alturaTrecho = Math.max(1, Math.round((fim - inicio) * escala));
        ctx.drawImage(canvas, 0, Math.round(inicio * escala), canvas.width, alturaTrecho, 0, y, canvas.width, alturaTrecho);

        if (!pdf) pdf = new jsPDF({ unit: "pt", format: [largura, altura], orientation: orientacao });
        else pdf.addPage([largura, altura], orientacao);
        const imagem = folha.toDataURL("image/jpeg", 0.92);
        folhas.push(imagem);
        pdf.addImage(imagem, "JPEG", 0, 0, largura, altura);
      });
    }

    return { pdf: pdf!.output("blob"), folhas };
  } finally {
    palco.remove();
  }
}
