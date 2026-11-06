import { compradorParaApi, createNegocio, updateNegocio } from "@/lib/api/negocios";
import { getUsuario } from "@/lib/api-client";
import type { CreateNegocioInput, TipoComprador } from "@/lib/api/types";
import { atualizarPendente, ehIdTemporario, enviarOuEnfileirar, idTemporario, referencia } from "@/lib/offline/fila";
import type { ExibicaoNegocio } from "@/lib/offline/pendentes";
import type { NegocioFlowData } from "./negocio-flow";

/**
 * Comprador no payload da fila: a coluna do tipo escolhido (id real ou referência local) e
 * a outra explicitamente vazia, para um PATCH trocar frigorífico ↔ pecuarista. Na hora de
 * enviar, `compradorParaApi` monta `comprador: { tipo, id }`.
 */
async function referenciaComprador(tipo: TipoComprador, id: number) {
  return tipo === "pecuarista"
    ? { comprador_id: null, comprador_uuid_local: null, ...(await referencia("comprador_pecuarista", id)) }
    : { comprador_pecuarista_id: null, comprador_pecuarista_uuid_local: null, ...(await referencia("comprador", id)) };
}

/**
 * Grava as informações do negócio acumuladas no fluxo: POST /negocios na primeira vez;
 * se o negócio já existe (o usuário voltou à tela de informações), atualiza o mesmo
 * negócio em vez de criar outro. Devolve o id — negativo (temporário) se está na fila.
 */
export async function salvarNegocioDoFluxo(data: NegocioFlowData): Promise<number> {
  const { fazendaId, pecuaristaId, compradorId, modalidade, tipoGado, tipoNegocio, valorUnidade } = data;
  const compradorTipo = data.compradorTipo || "frigorifico";
  if (!fazendaId || !pecuaristaId || !compradorId || !modalidade || !tipoGado || !tipoNegocio || valorUnidade == null) {
    throw new Error("Dados do negócio incompletos. Volte e preencha as informações.");
  }
  if (compradorTipo === "pecuarista" && compradorId === pecuaristaId) {
    throw new Error("O comprador não pode ser o próprio vendedor. Volte e escolha outro comprador.");
  }
  const usuario = getUsuario();
  if (!usuario) throw new Error("Sessão inválida. Faça login novamente.");

  const informacoes = {
    modalidade,
    tipo_gado: tipoGado,
    tipo_negocio: tipoNegocio,
    valor_unidade: valorUnidade,
    data_negocio: new Date(data.dataNegocio).toISOString(),
    porcentagem_comissao: data.porcentagemComissao ?? undefined,
    observacao: data.observacao || undefined,
  };

  if (data.negocioId) {
    // Pecuarista e fazenda trocados zeram o negócio do fluxo; o comprador pode mudar aqui.
    const comInformacoes = { ...(await referenciaComprador(compradorTipo, compradorId)), ...informacoes };
    if (ehIdTemporario(data.negocioId)) {
      // Ainda só no aparelho: corrige o próprio cadastro pendente.
      await atualizarPendente(-data.negocioId, comInformacoes, {
        comprador_id: compradorId,
        compradorTipo,
        compradorNome: data.compradorNome,
      });
    } else {
      // Trocar a modalidade pode ser recusada pela API (ex.: para "cabeca" com cabeças pesadas).
      await enviarOuEnfileirar(
        "negocio_atualizacao",
        { negocio_id: data.negocioId, ...comInformacoes },
        ({ negocio_id, ...campos }) => updateNegocio(negocio_id as number, compradorParaApi(campos))
      );
    }
    return data.negocioId;
  }

  // Fazenda/pecuarista/comprador podem ter sido cadastrados offline (id negativo):
  // nesse caso o negócio também fica na fila, referenciando-os pelo uuid local.
  const exibicao: ExibicaoNegocio = {
    fazenda_id: fazendaId,
    pecuarista_id: pecuaristaId,
    comprador_id: compradorId,
    compradorTipo,
    fazendaNome: data.fazendaNome,
    pecuaristaNome: data.pecuaristaNome,
    compradorNome: data.compradorNome,
  };
  const envio = await enviarOuEnfileirar(
    "negocio",
    {
      empresa_id: usuario.empresa_id,
      ...(await referencia("fazenda", fazendaId)),
      ...(await referencia("pecuarista", pecuaristaId)),
      ...(await referenciaComprador(compradorTipo, compradorId)),
      ...informacoes,
    },
    (payload, uuid) =>
      createNegocio({ ...(compradorParaApi(payload) as unknown as CreateNegocioInput), uuid_origem: uuid }),
    { exibicao }
  );
  return envio.sincronizado ? envio.resultado.negocio_id : idTemporario(envio.registro);
}
