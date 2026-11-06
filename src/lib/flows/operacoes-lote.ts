import { createGado, updateGado } from "@/lib/api/gados";
import { createLote, deleteLote, updateLote } from "@/lib/api/lotes";
import type { CreateGadoInput, CreateLoteInput, Modalidade, TipoGado, UpdateLoteInput } from "@/lib/api/types";
import { estimarGado } from "@/lib/calculo-gado";
import { atualizarPendente, ehIdTemporario, enviarOuEnfileirar, idTemporario, referencia } from "@/lib/offline/fila";
import type { ExibicaoGado, ExibicaoLote, ExibicaoLoteAlteracao, LoteComPendencia } from "@/lib/offline/pendentes";
import { descartar } from "@/lib/offline/sync";
import { horaLocalAtual } from "@/lib/offline/rede";

// Operações de lote e de cabeça usadas pelas telas do negócio. Online vão direto à API;
// sem conexão (ou com o negócio/lote ainda só no aparelho) entram na fila offline, que
// sincroniza na ordem negócio → lotes → gados.

type NegocioRef = { negocio_id: number; modalidade: Modalidade; tipo_gado: TipoGado };

export function mensagemLoteComCabecas(qtd: number) {
  return (
    `Este lote tem ${qtd} ${qtd === 1 ? "cabeça pesada" : "cabeças pesadas"}. ` +
    "Remova ou mova as cabeças antes de excluir"
  );
}

/** Cria o lote; devolve o id (negativo se ficou na fila). */
export async function criarLote(negocio: NegocioRef, input: CreateLoteInput): Promise<number> {
  const exibicao: ExibicaoLote = { negocio_id: negocio.negocio_id, modalidade: negocio.modalidade };
  const envio = await enviarOuEnfileirar(
    "lote",
    { ...(await referencia("negocio", negocio.negocio_id)), ...input },
    ({ negocio_id, ...campos }, uuid) =>
      createLote(negocio_id as number, { ...(campos as CreateLoteInput), uuid_origem: uuid }),
    { exibicao }
  );
  return envio.sincronizado ? envio.resultado.lote_id : idTemporario(envio.registro);
}

/**
 * Edita o lote. Ainda na fila: altera o próprio cadastro pendente. Já no servidor: PATCH
 * (a API recalcula as cabeças, o lote e o negócio), ou fila de atualização offline.
 */
export async function editarLote(negocio: NegocioRef, loteId: number, input: UpdateLoteInput) {
  if (ehIdTemporario(loteId)) {
    await atualizarPendente(-loteId, input);
    return;
  }
  const exibicao: ExibicaoLoteAlteracao = { negocio_id: negocio.negocio_id, lote_id: loteId };
  await enviarOuEnfileirar(
    "lote_atualizacao",
    { lote_id: loteId, ...input },
    ({ lote_id, ...campos }) => updateLote(lote_id as number, campos),
    { exibicao }
  );
}

/** Exclui o lote — bloqueado se tiver cabeças (a API também responde 409). */
export async function excluirLote(negocio: NegocioRef, lote: LoteComPendencia) {
  if (lote.gados.length > 0) throw new Error(mensagemLoteComCabecas(lote.gados.length));
  if (ehIdTemporario(lote.lote_id)) {
    await descartar(-lote.lote_id);
    return;
  }
  const exibicao: ExibicaoLoteAlteracao = { negocio_id: negocio.negocio_id, lote_id: lote.lote_id };
  await enviarOuEnfileirar(
    "lote_exclusao",
    { lote_id: lote.lote_id },
    (payload) => deleteLote(payload.lote_id as number),
    { exibicao }
  );
}

/**
 * Registra uma cabeça no lote. A data e o horário da pesagem são automáticos; sem
 * conexão, a cabeça vai para a fila com a hora capturada agora no aparelho.
 * Devolve `true` se já foi gravada no servidor.
 */
export async function cadastrarGado(negocio: NegocioRef, lote: LoteComPendencia, pesoTotal: number) {
  const exibicao: ExibicaoGado = {
    negocio_id: negocio.negocio_id,
    lote_id: lote.lote_id,
    ...estimarGado(negocio, lote, pesoTotal),
  };
  const envio = await enviarOuEnfileirar(
    "gado",
    {
      ...(await referencia("lote", lote.lote_id)),
      peso_total: pesoTotal,
      data_pesagem: new Date().toISOString(),
    },
    (payload, uuid) => createGado({ ...(payload as CreateGadoInput), uuid_origem: uuid }),
    { exibicao, extrasFila: { horario_pesagem: horaLocalAtual() } }
  );
  return envio.sincronizado;
}

/**
 * Edita uma cabeça (peso e/ou lote). Na fila: altera o cadastro pendente. No servidor:
 * PATCH — trocar de lote recalcula os dois lotes envolvidos.
 */
export async function editarGado(
  negocio: NegocioRef,
  gadoId: number,
  lote: LoteComPendencia,
  pesoTotal: number
) {
  if (ehIdTemporario(gadoId)) {
    const exibicao: ExibicaoGado = {
      negocio_id: negocio.negocio_id,
      lote_id: lote.lote_id,
      ...estimarGado(negocio, lote, pesoTotal),
    };
    await atualizarPendente(
      -gadoId,
      { ...(await referencia("lote", lote.lote_id)), peso_total: pesoTotal },
      exibicao
    );
    return;
  }
  if (ehIdTemporario(lote.lote_id)) {
    throw new Error("O lote escolhido ainda não foi sincronizado. Sincronize antes de mover esta cabeça.");
  }
  await updateGado(gadoId, { lote_id: lote.lote_id, peso_total: pesoTotal });
}
