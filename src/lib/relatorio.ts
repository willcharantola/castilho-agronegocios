import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { formatCurrency, formatDate, formatGenero, formatNumber } from "@/lib/format";
import type { Negocio, NegocioDetail } from "@/lib/api/types";

const TEMPLATE_URL = "/templates/modelo-relatorio.docx";
const TEMPLATE_URL_NEGOCIO = "/templates/modelo-relatorio-negocio.docx";

async function carregarTemplate(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o modelo do relatório.");
  }
  const templateArrayBuffer = await response.arrayBuffer();
  return new Docxtemplater(new PizZip(templateArrayBuffer), {
    paragraphLoop: true,
    linebreaks: true,
    // O modelo usa chaves duplas ({{campo}}) em vez do padrão de chave
    // única do docxtemplater — confirmado inspecionando o document.xml.
    delimiters: { start: "{{", end: "}}" },
  });
}

/**
 * Colunas espelham exatamente o que a tela de listagem de negócios exibe
 * por card (fazenda, marchante, data, comissão, cabeças) — ver
 * `src/app/(app)/negocios/page.tsx`. Mudou o que aparece lá? mude aqui e
 * na tabela do `modelo-relatorio.docx` também.
 */
export async function gerarRelatorioNegocios(
  negocios: Negocio[],
  fazendasPorId: Record<number, string>,
  opcoes?: { titulo?: string; nomeArquivo?: string }
) {
  const doc = await carregarTemplate(TEMPLATE_URL);

  doc.render({
    "nome-relatorio": opcoes?.titulo ?? "Relatório de Negócios",
    "data-emissao": new Date().toLocaleDateString("pt-BR"),
    negocios: negocios.map((n) => ({
      fazenda: fazendasPorId[n.fazenda_id] ?? `Fazenda #${n.fazenda_id}`,
      marchante: n.marchante,
      data_negocio: formatDate(n.data_negocio),
      cabecas: n.qtd_animais !== null ? String(n.qtd_animais) : "—",
      comissao: formatCurrency(n.comissao),
    })),
  });

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(blob, opcoes?.nomeArquivo ?? `relatorio-negocios-${Date.now()}.docx`);
}

/**
 * Relatório de um único negócio — mesmo bloco de resumo do relatório em
 * lote (uma linha), mais uma segunda tabela com cada cabeça de gado
 * negociada nesse negócio. Colunas do gado espelham o que já é exibido em
 * `negocios/[id]/page.tsx` (denominação, gênero, peso p/ cálculo, peso da
 * arroba, valor total).
 */
export async function gerarRelatorioNegocio(negocio: NegocioDetail, fazendaNome: string) {
  const doc = await carregarTemplate(TEMPLATE_URL_NEGOCIO);

  doc.render({
    "nome-relatorio": `Relatório do Negócio — ${fazendaNome}`,
    "data-emissao": new Date().toLocaleDateString("pt-BR"),
    negocios: [
      {
        fazenda: fazendaNome,
        marchante: negocio.marchante,
        data_negocio: formatDate(negocio.data_negocio),
        cabecas: negocio.qtd_animais !== null ? String(negocio.qtd_animais) : "—",
        comissao: formatCurrency(negocio.comissao),
      },
    ],
    gados: negocio.gados.map((g) => ({
      denominacao: g.denominacao,
      genero: formatGenero(g.genero),
      peso_calculo: formatNumber(g.peso_calculo),
      peso_arroba: formatNumber(g.peso_arroba),
      valor_total: g.valor_total !== null ? formatCurrency(g.valor_total) : "—",
    })),
  });

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(blob, `relatorio-negocio-${negocio.negocio_id}.docx`);
}
