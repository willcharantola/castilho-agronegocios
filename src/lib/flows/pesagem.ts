import { createGado } from "@/lib/api/gados";
import { concluirNegocio } from "@/lib/api/negocios";
import type { CreateGadoInput, Modalidade, TipoGado } from "@/lib/api/types";
import { estimarGado } from "@/lib/calculo-gado";
import { enviarOuEnfileirar } from "@/lib/offline/fila";
import type { ExibicaoGado } from "@/lib/offline/pendentes";
import { horaLocalAtual } from "@/lib/offline/rede";

// Pesagem pelo usuário Normal responsável (telas /negocios do perfil Normal). Os lotes já existem no
// servidor (só o Admin cria lotes), então as referências são sempre ids reais. Sem conexão,
// a cabeça e a conclusão entram na fila; na sincronização a API confere de novo se o
// negócio continua liberado para ele.

type NegocioDaPesagem = { negocio_id: number; modalidade: Modalidade; tipo_gado: TipoGado };

/** Lança uma cabeça no lote. Devolve `true` se já foi gravada no servidor. */
export async function lancarPesagem(
  negocio: NegocioDaPesagem,
  lote: { lote_id: number; rendimento_carcaca: number },
  pesoTotal: number,
) {
  // O preço do lote não chega ao Normal: o valor estimado fica 0 (não é exibido para ele).
  const exibicao: ExibicaoGado = {
    negocio_id: negocio.negocio_id,
    lote_id: lote.lote_id,
    ...estimarGado(negocio, { ...lote, valor_unidade: 0 }, pesoTotal),
  };
  const envio = await enviarOuEnfileirar(
    "gado",
    { lote_id: lote.lote_id, lote_uuid_local: null, peso_total: pesoTotal, data_pesagem: new Date().toISOString() },
    (payload, uuid) => createGado({ ...(payload as CreateGadoInput), uuid_origem: uuid }),
    { exibicao, extrasFila: { horario_pesagem: horaLocalAtual() } },
  );
  return envio.sincronizado;
}

/** Registra o fim da pesagem (hora local do aparelho). Devolve `true` se já foi ao servidor. */
export async function concluirPesagem(negocioId: number) {
  const envio = await enviarOuEnfileirar(
    "conclusao",
    { negocio_id: negocioId, negocio_uuid_local: null },
    (payload) => concluirNegocio(payload.negocio_id as number),
    { extrasFila: { hora_fim_pesagem: horaLocalAtual() } },
  );
  return envio.sincronizado;
}
