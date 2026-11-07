import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import {
  formatCurrency,
  formatDate,
  formatDecimalCurto,
  formatGenero,
  formatHora,
  formatNumber,
  formatFazenda,
  formatPercent,
} from "@/lib/format";
import type { Fazenda, Gado, Lote, NegocioDetail } from "@/lib/api/types";
import { centavos, estimarImpostos } from "@/lib/calculo-gado";
import { docxParaPdf } from "@/lib/docx-para-pdf";

/**
 * Romaneio de pesagens em PDF: o modelo 1 (.docx) é preenchido e convertido em PDF no
 * próprio navegador (ver docx-para-pdf). O modelo 2 (grade de 120 posições) está fora da
 * geração por enquanto; o arquivo continua em public/templates.
 *
 * O modelo usa chaves duplas e nomes com hífen ({{nome-fazenda}}). Os dados abaixo já são
 * montados aqui e saem no documento quando o placeholder existe no .docx:
 *
 * - Totais: {{total-kg}} {{total-arroba}} {{rend-arroba}}
 *   {{media-peso}} {{media-arroba}} {{valor-bruto}} {{funrural}} {{senar}} {{valor-liquido}}
 *   {{aliquota_funrural}} {{aliquota_senar}} (alíquotas em %, ex.: "1,5") — lidos
 *   dos campos calculados pela API (peso_total_quilos, peso_total_arroba,
 *   rendimento_medio, peso_medio_quilos, peso_medio_arroba, valor_total_bruto, funrural,
 *   senar, valor_total_liquido), nunca recalculados aqui. {{rend-arroba}} é o rendimento médio do
 *   negócio (ponderado pelo peso); funrural/senar já vêm conforme o tipo de negócio
 *   (zero sai "R$ 0,00").
 * - Cabeçalho, opcional: {{tipo-negocio}}.
 * - Modelo 1, linha da tabela "Cabeças Negociadas": {{#gados}} na primeira
 *   célula e {{/gados}} na última. Do LOTE da cabeça: {{denominacao}} (nome do lote),
 *   {{lote}} (idem, para uma coluna "Lote"), {{genero}}, {{carimbo}} (média do carimbo),
 *   {{ano}} (ano do carimbo) e {{rend-carcaca}} (rendimento de carcaça do lote). Da
 *   cabeça: {{peso-total}} {{peso-calculo}} {{peso-arroba}} {{data-pesagem}}
 *   {{hora-pesagem}} {{valor-total}}. Ordem: lote a lote (ordem de cadastro) e, dentro
 *   do lote, por gado_id.
 */

const TEMPLATE_URL_MODELO1 = "/templates/modelo-romaneio1.docx";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type DadosDocumento = Record<string, string | Record<string, string>[]>;

type ArquivoGerado = { nome: string; blob: Blob };

export type ResultadoRomaneios = {
  /** Mensagens para exibir na tela (hoje nenhuma: era o aviso do modelo 2). */
  avisos: string[];
};

/** Campo calculado pela API → texto; null (sem gados / sem valor) sai em branco. */
function campo(valor: number | null, formatar: (v: number) => string) {
  return valor !== null ? formatar(valor) : "";
}

/**
 * Ordem de cadastro pelo id: os gravados (id positivo) e depois os ainda na fila offline
 * (id negativo = −id local, que também cresce com o cadastro).
 */
const ordemDeCadastro = (id: number) => (id > 0 ? id : Number.MAX_SAFE_INTEGER / 2 - id);

/** Cabeças lote a lote (ordem de cadastro dos lotes) e, dentro do lote, na ordem de cadastro. */
function gadosOrdenados(negocio: NegocioDetail): { gado: Gado; lote: Lote }[] {
  return [...negocio.lotes]
    .sort((a, b) => ordemDeCadastro(a.lote_id) - ordemDeCadastro(b.lote_id))
    .flatMap((lote) =>
      [...lote.gados]
        .sort((a, b) => ordemDeCadastro(a.gado_id) - ordemDeCadastro(b.gado_id))
        .map((gado) => ({ gado, lote }))
    );
}

/**
 * Recorte do negócio para o romaneio de um lote só: as cabeças e os totais passam a ser os
 * do lote (calculados pela API). O lote não grava Funrural, Senar nem líquido: saem do
 * valor do lote com as alíquotas e o tipo do negócio, pela mesma regra da API. Os horários
 * são os da primeira e da última pesagem do lote. `null` se o lote não está no negócio.
 */
export function negocioDoLote(negocio: NegocioDetail, loteId: number): NegocioDetail | null {
  const lote = negocio.lotes.find((l) => l.lote_id === loteId);
  if (!lote) return null;
  const bruto = centavos(lote.valor_total_lote);
  const horarios = lote.gados
    .map((g) => g.horario_pesagem)
    .filter((h): h is string => h !== null)
    .sort();
  return {
    ...negocio,
    lotes: [lote],
    qtd_animais: lote.qtd_animais,
    valor_total_bruto: bruto,
    valor_medio: lote.valor_medio_cabeca_lote,
    ...estimarImpostos(negocio, bruto),
    peso_total_quilos: lote.peso_total_quilos,
    peso_total_arroba: lote.peso_total_arroba,
    peso_medio_quilos: lote.peso_medio_quilos,
    peso_medio_arroba: lote.peso_medio_arroba,
    mais_pesado_quilos: lote.mais_pesado_quilos,
    mais_leve_quilos: lote.mais_leve_quilos,
    mais_pesado_arroba: lote.mais_pesado_arroba,
    mais_leve_arroba: lote.mais_leve_arroba,
    rendimento_medio: lote.rendimento_medio,
    hora_inicio_pesagem: horarios[0] ?? null,
    hora_fim_pesagem: horarios[horarios.length - 1] ?? null,
  };
}

function nomeFazenda(negocio: NegocioDetail, fazenda: Fazenda | undefined) {
  return formatFazenda(fazenda?.nome_fazenda ?? `#${negocio.fazenda_id}`);
}

export function montarDadosCabecalho(negocio: NegocioDetail, fazenda: Fazenda | undefined): DadosDocumento {
  const { pecuarista } = negocio;

  return {
    "nome-fazenda": nomeFazenda(negocio, fazenda),
    "inscricao-estadual": fazenda?.inscricao_estadual ?? "",
    municipio: fazenda?.municipio ?? "",
    "nome-pecuarista": pecuarista?.nome_pecuarista ?? "",
    // Os dois .docx de romaneio ainda usam o placeholder antigo. Remover esta linha
    // quando os modelos passarem a usar {{nome-pecuarista}}.
    "nome-vendedor": pecuarista?.nome_pecuarista ?? "",
    "data-negocio": formatDate(negocio.data_negocio),
    "hora-inicio-pesagem": formatHora(negocio.hora_inicio_pesagem),
    "hora-fim-pesagem": formatHora(negocio.hora_fim_pesagem),
    "qtd-animais": negocio.qtd_animais !== null ? String(negocio.qtd_animais) : "",

    "total-kg": campo(negocio.peso_total_quilos, (v) => formatNumber(v)),
    "total-arroba": campo(negocio.peso_total_arroba, (v) => formatNumber(v)),
    "rend-arroba": campo(negocio.rendimento_medio, formatPercent),
    "media-peso": campo(negocio.peso_medio_quilos, (v) => formatNumber(v)),
    "media-arroba": campo(negocio.peso_medio_arroba, (v) => formatNumber(v)),
    "valor-bruto": campo(negocio.valor_total_bruto, formatCurrency),
    funrural: campo(negocio.funrural, formatCurrency),
    senar: campo(negocio.senar, formatCurrency),
    "valor-liquido": campo(negocio.valor_total_liquido, formatCurrency),
    // Alíquotas do próprio negócio, sem "%" (o modelo traz "{{aliquota_funrural}}% Funrural:").
    aliquota_funrural: campo(negocio.aliquota_funrural, formatDecimalCurto),
    aliquota_senar: campo(negocio.aliquota_senar, formatDecimalCurto),
    "tipo-negocio": negocio.tipo_negocio ?? "",

    // Dados bancários do pecuarista (o campo "Nome" reaproveita {{nome-pecuarista}}).
    "cpf-cnpj": pecuarista?.cpf_cnpj ?? "",
    // O modelo tem {{telefone-vendedor}}, mas o cadastro do pecuarista não tem telefone: sai em branco.
    "telefone-vendedor": "",
    banco: pecuarista?.banco ?? "",
    agencia: pecuarista?.agencia ?? "",
    conta: pecuarista?.conta ?? "",
    "chave-pix": pecuarista?.chave_pix ?? "",
  };
}

function linhaGado({ gado, lote }: { gado: Gado; lote: Lote }): Record<string, string> {
  return {
    denominacao: lote.nome_lote,
    lote: lote.nome_lote,
    genero: formatGenero(lote.genero),
    // Carimbo é opcional: vazio sai em branco.
    carimbo: lote.media_carimbo ?? "",
    ano: lote.ano_carimbo ?? "",
    "peso-total": formatNumber(gado.peso_total),
    "peso-calculo": formatNumber(gado.peso_calculo),
    "rend-carcaca": formatPercent(lote.rendimento_carcaca),
    "peso-arroba": formatNumber(gado.peso_arroba),
    "data-pesagem": formatDate(gado.data_pesagem),
    "hora-pesagem": formatHora(gado.horario_pesagem),
    "valor-total": gado.valor_total !== null ? formatCurrency(gado.valor_total) : "",
  };
}

export function montarDadosModelo1(negocio: NegocioDetail, fazenda: Fazenda | undefined): DadosDocumento {
  return {
    ...montarDadosCabecalho(negocio, fazenda),
    gados: gadosOrdenados(negocio).map(linhaGado),
  };
}

/** "Fazenda São João" → "fazenda-sao-joao", seguro para nome de arquivo. */
function sanitizarNomeArquivo(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fazenda"
  );
}

async function baixarTemplate(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o modelo do romaneio.");
  }
  return response.arrayBuffer();
}

function renderizar(template: ArrayBuffer, dados: DadosDocumento) {
  const doc = new Docxtemplater(new PizZip(template), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    // Campo sem valor sai em branco, nunca como "undefined".
    nullGetter: () => "",
  });
  doc.render(dados);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME });
}

/**
 * Gera o romaneio (PDF) de cada negócio. Um negócio: baixa o PDF direto; mais de um:
 * junta tudo num .zip (PizZip, o mesmo usado para ler o modelo). Com `loteId`, só aquele
 * lote entra no romaneio (ver negocioDoLote).
 */
export async function gerarRomaneios(
  negocios: NegocioDetail[],
  fazendasPorId: Record<number, Fazenda>,
  opcoes?: { loteId?: number }
): Promise<ResultadoRomaneios> {
  const modelo1 = await baixarTemplate(TEMPLATE_URL_MODELO1);

  const arquivos: ArquivoGerado[] = [];
  const avisos: string[] = [];
  const nomesUsados = new Set<string>();

  // Dois negócios da mesma fazenda no mesmo dia teriam o mesmo nome de arquivo.
  function nomeUnico(nome: string) {
    let candidato = nome;
    for (let i = 2; nomesUsados.has(candidato); i++) candidato = nome.replace(/\.pdf$/, `-${i}.pdf`);
    nomesUsados.add(candidato);
    return candidato;
  }

  for (const completo of negocios) {
    const negocio = opcoes?.loteId !== undefined ? negocioDoLote(completo, opcoes.loteId) : completo;
    if (!negocio) throw new Error("Lote não encontrado no negócio. Recarregue a tela e tente de novo.");
    const fazenda = fazendasPorId[negocio.fazenda_id];
    const lote = opcoes?.loteId !== undefined ? `-${sanitizarNomeArquivo(negocio.lotes[0].nome_lote)}` : "";
    const base = `${sanitizarNomeArquivo(nomeFazenda(negocio, fazenda))}${lote}-${negocio.data_negocio.slice(0, 10)}`;

    arquivos.push({
      nome: nomeUnico(`romaneio-${base}.pdf`),
      blob: await docxParaPdf(renderizar(modelo1, montarDadosModelo1(negocio, fazenda))),
    });
  }

  if (negocios.length === 1) {
    for (const arquivo of arquivos) saveAs(arquivo.blob, arquivo.nome);
  } else {
    const zip = new PizZip();
    for (const arquivo of arquivos) zip.file(arquivo.nome, await arquivo.blob.arrayBuffer());
    saveAs(zip.generate({ type: "blob", mimeType: "application/zip" }), `romaneios-${Date.now()}.zip`);
  }

  return { avisos };
}
