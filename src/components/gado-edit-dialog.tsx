"use client";

import { Dialog } from "@/components/ui/dialog";
import { GadoForm, estimarGado, formValuesParaInput, gadoParaFormInput } from "@/components/gado-form";
import { updateGado } from "@/lib/api/gados";
import { atualizarPendente, ehIdTemporario } from "@/lib/offline/fila";
import type { Gado, Negocio } from "@/lib/api/types";

/**
 * Edição de um gado em modal, usada durante o cadastro do negócio (/negocios/novo/gado).
 * Um gado cadastrado offline (id negativo) é editado direto na fila do aparelho.
 */
export function GadoEditDialog({
  gado,
  negocio,
  onClose,
  onSaved,
}: {
  /** Gado em edição; `null` fecha o modal. */
  gado: Gado | null;
  /** Modalidade, valor por unidade e rendimentos por categoria do negócio. */
  negocio: Negocio;
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
          modalidade={negocio.modalidade}
          valorUnidade={negocio.valor_unidade}
          rendimentos={negocio}
          defaultValues={gadoParaFormInput(gado)}
          submitLabel="Salvar Alterações"
          submittingLabel="Salvando..."
          onSubmit={async (values) => {
            const input = formValuesParaInput(values);
            if (ehIdTemporario(gado.gado_id)) {
              await atualizarPendente(-gado.gado_id, input, estimarGado(negocio, input));
            } else {
              // Trocar a categoria faz a API recalcular o animal com o outro percentual.
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
