"use client";

import { Dialog } from "@/components/ui/dialog";
import { GadoForm, formValuesParaInput, gadoParaFormInput } from "@/components/gado-form";
import { updateGado } from "@/lib/api/gados";
import { estimarValoresGado } from "@/lib/calculo-gado";
import { atualizarPendente, ehIdTemporario } from "@/lib/offline/fila";
import type { Gado, Modalidade } from "@/lib/api/types";

/**
 * Edição de um gado em modal, usada durante o cadastro do negócio (/negocios/novo/gado).
 * Um gado cadastrado offline (id negativo) é editado direto na fila do aparelho.
 */
export function GadoEditDialog({
  gado,
  modalidade,
  valorUnidade,
  onClose,
  onSaved,
}: {
  /** Gado em edição; `null` fecha o modal. */
  gado: Gado | null;
  modalidade: Modalidade;
  valorUnidade: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  return (
    <Dialog open={gado !== null} onOpenChange={(open) => !open && onClose()} title="Editar Gado">
      {gado ? (
        <GadoForm
          // Remonta o formulário ao trocar de gado, para recarregar os valores iniciais.
          key={gado.gado_id}
          idPrefix="editar-"
          modalidade={modalidade}
          valorUnidade={valorUnidade}
          defaultValues={gadoParaFormInput(gado)}
          submitLabel="Salvar Alterações"
          submittingLabel="Salvando..."
          onSubmit={async (values) => {
            const input = formValuesParaInput(values);
            if (ehIdTemporario(gado.gado_id)) {
              const v = estimarValoresGado(modalidade, input.peso_total, input.rendimento_carcaca, valorUnidade);
              await atualizarPendente(-gado.gado_id, input, {
                peso_calculo: v.pesoCalculo,
                peso_arroba: v.pesoArroba,
                valor_total: v.valorTotal,
              });
            } else {
              await updateGado(gado.gado_id, input);
            }
            await onSaved();
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}
