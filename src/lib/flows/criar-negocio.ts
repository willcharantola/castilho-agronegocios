import { createNegocio } from "@/lib/api/negocios";
import { getUsuario } from "@/lib/api-client";
import type { CreateNegocioInput } from "@/lib/api/types";
import { enviarOuEnfileirar, idTemporario, referencia } from "@/lib/offline/fila";
import type { ExibicaoNegocio } from "@/lib/offline/pendentes";
import type { NegocioFlowData } from "./negocio-flow";

/**
 * POST /negocios com os dados acumulados no fluxo de cadastro. Chamado pela tela de
 * informações (modalidades "kg" e "cabeca") ou pela de rendimentos ("arroba"), já que
 * os quatro percentuais são obrigatórios na criação. Devolve o id do negócio — negativo
 * (temporário) se ficou na fila offline.
 */
export async function criarNegocioDoFluxo(data: NegocioFlowData): Promise<number> {
  const { fazendaId, pecuaristaId, compradorId, modalidade, tipoGado, tipoLote, tipoNegocio } = data;
  if (!fazendaId || !pecuaristaId || !compradorId || !modalidade || !tipoGado || !tipoLote || !tipoNegocio) {
    throw new Error("Dados do negócio incompletos. Volte e preencha as informações.");
  }
  if (modalidade === "arroba" && !data.rendimentos) {
    throw new Error("Informe os rendimentos por categoria.");
  }
  const usuario = getUsuario();
  if (!usuario) throw new Error("Sessão inválida. Faça login novamente.");

  // Fazenda/pecuarista/comprador podem ter sido cadastrados offline (id negativo):
  // nesse caso o negócio também fica na fila, referenciando-os pelo uuid local.
  const exibicao: ExibicaoNegocio = {
    fazenda_id: fazendaId,
    pecuarista_id: pecuaristaId,
    comprador_id: compradorId,
    fazendaNome: data.fazendaNome,
    pecuaristaNome: data.pecuaristaNome,
    compradorNome: data.compradorNome,
  };
  const porCabeca = modalidade === "cabeca";
  const envio = await enviarOuEnfileirar(
    "negocio",
    {
      empresa_id: usuario.empresa_id,
      ...(await referencia("fazenda", fazendaId)),
      ...(await referencia("pecuarista", pecuaristaId)),
      ...(await referencia("comprador", compradorId)),
      modalidade,
      tipo_gado: tipoGado,
      tipo_lote: tipoLote,
      tipo_negocio: tipoNegocio,
      media_carimbo: data.mediaCarimbo,
      data_negocio: new Date(data.dataNegocio).toISOString(),
      porcentagem_comissao: data.porcentagemComissao ?? undefined,
      // Na modalidade "cabeca" o valor por cabeça ainda não foi informado: a API exige o
      // campo (NOT NULL), então cria com 0 e a tela quantidade-cabecas o preenche via PATCH.
      valor_unidade: porCabeca ? 0 : (data.valorUnidade ?? 0),
      observacao: data.observacao || undefined,
      // "kg"/"cabeca": a API grava 100 nos quatro percentuais.
      ...(modalidade === "arroba" ? data.rendimentos : {}),
    },
    (payload, uuid) => createNegocio({ ...(payload as unknown as CreateNegocioInput), uuid_origem: uuid }),
    { exibicao }
  );
  return envio.sincronizado ? envio.resultado.negocio_id : idTemporario(envio.registro);
}
