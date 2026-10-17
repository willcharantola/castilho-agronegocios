import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { formatCurrency, formatDate, formatGenero, formatHora, formatNumber, formatPercent } from "@/lib/format";
import type { Fazenda, Gado, NegocioDetail } from "@/lib/api/types";

/**
 * Romaneio de pesagens: um negócio gera dois arquivos, um por modelo (solução
 * temporária até o cliente escolher qual usar — ver instrucoes-romaneio.md).
 *
 * Os modelos usam chaves duplas e nomes com hífen ({{nome-fazenda}}). Hoje eles
 * só têm os placeholders do cabeçalho e dos dados bancários; os demais dados
 * (totais, tabela de cabeças, grade de pesos) já são montados aqui com os nomes
 * abaixo e passam a sair no documento assim que os placeholders forem
 * adicionados aos .docx:
 *
 * - Totais (os dois modelos): {{total-kg}} {{total-arroba}} {{rend-arroba}}
 *   {{media-peso}} {{media-arroba}} {{valor-bruto}} {{funrural}} {{senar}} — lidos
 *   dos campos calculados pela API (peso_total_quilos, peso_total_arroba,
 *   rendimento_medio, peso_medio_quilos, peso_medio_arroba, valor_total, funrural,
 *   senar), nunca recalculados aqui.
 * - Modelo 1, linha da tabela "Cabeças Negociadas": {{#gados}} na primeira
 *   célula e {{/gados}} na última, com {{denominacao}} {{genero}} {{carimbo}}
 *   {{ano}} {{peso-total}} {{peso-calculo}} {{rend-carcaca}} {{peso-arroba}}
 *   {{data-pesagem}} {{hora-pesagem}} {{valor-total}}
 * - Modelo 2, grade: {{p1}}…{{p120}} (peso do animal) e {{t1}}…{{t6}} (soma da
 *   coluna); {{n1}}…{{n120}} trazem o número da posição já somando o bloco.
 */

const TEMPLATE_URL_MODELO1 = "/templates/modelo-romaneio1.docx";
const TEMPLATE_URL_MODELO2 = "/templates/modelo-romaneio2.docx";

/** Posições da grade do modelo 2: 6 colunas × 20 linhas. */
const POSICOES_GRADE = 120;
const LINHAS_POR_COLUNA = 20;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type DadosDocumento = Record<string, string | Record<string, string>[]>;

type ArquivoGerado = { nome: string; blob: Blob };

export type ResultadoRomaneios = {
  /** Mensagens para exibir na tela (ex.: negócio com mais de 120 animais). */
  avisos: string[];
};

/** Campo calculado pela API → texto; null (sem gados / sem valor) sai em branco. */
function campo(valor: number | null, formatar: (v: number) => string) {
  return valor !== null ? formatar(valor) : "";
}

function gadosOrdenados(negocio: NegocioDetail) {
  return [...negocio.gados].sort((a, b) => a.gado_id - b.gado_id);
}

function nomeFazenda(negocio: NegocioDetail, fazenda: Fazenda | undefined) {
  return fazenda?.nome_fazenda ?? `Fazenda #${negocio.fazenda_id}`;
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
    "valor-bruto": campo(negocio.valor_total, formatCurrency),
    funrural: campo(negocio.funrural, formatCurrency),
    senar: campo(negocio.senar, formatCurrency),

    // Dados bancários do pecuarista (o campo "Nome" reaproveita {{nome-pecuarista}}).
    "cpf-cnpj": pecuarista?.cpf_cnpj ?? "",
    banco: pecuarista?.banco ?? "",
    agencia: pecuarista?.agencia ?? "",
    conta: pecuarista?.conta ?? "",
    "chave-pix": pecuarista?.chave_pix ?? "",
  };
}

function linhaGado(gado: Gado): Record<string, string> {
  return {
    denominacao: gado.denominacao,
    genero: formatGenero(gado.genero),
    carimbo: String(gado.carimbo),
    ano: gado.ano_carimbo,
    "peso-total": formatNumber(gado.peso_total),
    "peso-calculo": formatNumber(gado.peso_calculo),
    "rend-carcaca": formatPercent(gado.rendimento_carcaca),
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

/**
 * Um objeto de dados por bloco de 120 animais. O cabeçalho e os totais são
 * sempre do negócio inteiro; {{t1}}–{{t6}} somam só as colunas do bloco. Sem
 * animais (modalidade "cabeca"), devolve um bloco com a grade vazia.
 */
export function montarDadosModelo2(negocio: NegocioDetail, fazenda: Fazenda | undefined): DadosDocumento[] {
  const cabecalho = montarDadosCabecalho(negocio, fazenda);
  const gados = gadosOrdenados(negocio);
  const totalBlocos = Math.max(1, Math.ceil(gados.length / POSICOES_GRADE));
  const blocos: DadosDocumento[] = [];

  for (let bloco = 0; bloco < totalBlocos; bloco++) {
    const dados: DadosDocumento = { ...cabecalho };
    const totaisColuna = [0, 0, 0, 0, 0, 0];
    const deslocamento = bloco * POSICOES_GRADE;

    for (let posicao = 1; posicao <= POSICOES_GRADE; posicao++) {
      const gado = gados[deslocamento + posicao - 1];
      dados[`n${posicao}`] = String(deslocamento + posicao);
      dados[`p${posicao}`] = gado ? formatNumber(gado.peso_total) : "";
      if (gado) totaisColuna[Math.floor((posicao - 1) / LINHAS_POR_COLUNA)] += gado.peso_total;
    }

    totaisColuna.forEach((total, i) => {
      dados[`t${i + 1}`] = total > 0 ? formatNumber(total) : "";
    });
    blocos.push(dados);
  }

  return blocos;
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
 * Gera os dois romaneios de cada negócio. Um negócio: baixa os .docx direto;
 * mais de um: junta tudo num .zip (PizZip, o mesmo usado para ler os modelos).
 */
export async function gerarRomaneios(
  negocios: NegocioDetail[],
  fazendasPorId: Record<number, Fazenda>
): Promise<ResultadoRomaneios> {
  const [modelo1, modelo2] = await Promise.all([
    baixarTemplate(TEMPLATE_URL_MODELO1),
    baixarTemplate(TEMPLATE_URL_MODELO2),
  ]);

  const arquivos: ArquivoGerado[] = [];
  const avisos: string[] = [];
  const nomesUsados = new Set<string>();

  // Dois negócios da mesma fazenda no mesmo dia teriam o mesmo nome de arquivo.
  function nomeUnico(nome: string) {
    let candidato = nome;
    for (let i = 2; nomesUsados.has(candidato); i++) candidato = nome.replace(/\.docx$/, `-${i}.docx`);
    nomesUsados.add(candidato);
    return candidato;
  }

  for (const negocio of negocios) {
    const fazenda = fazendasPorId[negocio.fazenda_id];
    const base = `${sanitizarNomeArquivo(nomeFazenda(negocio, fazenda))}-${negocio.data_negocio.slice(0, 10)}`;

    arquivos.push({
      nome: nomeUnico(`romaneio1-${base}.docx`),
      blob: renderizar(modelo1, montarDadosModelo1(negocio, fazenda)),
    });

    const blocos = montarDadosModelo2(negocio, fazenda);
    blocos.forEach((dados, i) => {
      const sufixo = i === 0 ? "" : `-parte${i + 1}`;
      arquivos.push({
        nome: nomeUnico(`romaneio2-${base}${sufixo}.docx`),
        blob: renderizar(modelo2, dados),
      });
    });

    if (blocos.length > 1) {
      // O modelo 2 tem a numeração 1–120 fixa no documento, então as partes
      // seguintes também aparecem numeradas a partir do 1.
      avisos.push(
        `${nomeFazenda(negocio, fazenda)} (${formatDate(negocio.data_negocio)}) tem ${negocio.gados.length} animais, ` +
          `mais que as ${POSICOES_GRADE} posições do romaneio 2: ele foi dividido em ${blocos.length} arquivos ` +
          `(cada parte numerada de 1 a ${POSICOES_GRADE}).`
      );
    }
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
